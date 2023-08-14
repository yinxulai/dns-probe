import * as dgram from 'dgram'

interface DnsServer {
  listen: (port?: number) => void
}

interface CreateDnsServerOptions {
  onRequest: (domain: string, remoteInfo: dgram.RemoteInfo) => string
}

function parseDomainFromQuery(query: Buffer): string {
  let position = 12; // skip the header
  let labels = [];

  while (query.readUInt8(position) !== 0) { // end of labels marked by 0
    const length = query.readUInt8(position);
    position++;

    const label = query.slice(position, position + length);
    labels.push(label.toString());

    position += length;
  }

  return labels.join(".");
}

export function createDnsServer(options: CreateDnsServerOptions): DnsServer {
  // 创建一个 UDP socket 接收 DNS 查询
  const server = dgram.createSocket('udp4')

  server.on('message', (msg, rinfo) => {
    // DNS 请求检查
    if (msg.length < 12) {
      console.log('Message too short, potentially not a valid DNS query.')
      return
    }

    // 二进制位 0-15（包含）是 DNS 事务 ID
    // const transactionID = msg.readUInt16BE(0)

    // 二进制位 16-31 是标志，其中第一位是 QR（查询/响应）标志，0 代表查询，1 代表响应
    // 后面四位为 OPCODE，0 代表标准查询
    // 若查询类型不是标准查询，可能不是有效的 DNS 查询，无法处理
    if ((msg.readUInt16BE(2) & 0x800F) !== 0x0000) {
      console.log('Not a standard query, potentially not a valid DNS query.')
      return
    }

    // 将提取出来的域名转化为字符串格式
    const domainName = parseDomainFromQuery(msg)

    console.log(`Received a query request: ${domainName}`)

    const ip = options.onRequest(domainName, rinfo)

    // 如果 ip 不存在，打印一条消息并返回
    if (!ip) {
      console.log(`DNS Record not found for domain: ${domainName}`)
      return
    }

    const response = Buffer.alloc(msg.length + 16)
    // 在响应中复制查询消息
    msg.copy(response)

    // 设置标志为响应 (0x8000) 且没有错误 (0x0000)
    response.writeUInt16BE(0x8000, 2)

    // 添加 DNS 回答部分
    response.writeUInt16BE(1, 6) // 设置回答数量为 1
    response.writeUInt16BE(0, 8) // 设置授权资源记录数为 0
    response.writeUInt16BE(0, 10) // 设置额外资源记录数为 0

    // 回答部分
    response.writeUInt16BE(0xC00C, msg.length) // 设置 Name，对应回答的域名偏移
    response.writeUInt16BE(0x0001, msg.length + 2) // 设置类型为 A
    response.writeUInt16BE(0x0001, msg.length + 4) // 设置类别为 IN
    response.writeUInt32BE(3600, msg.length + 6) // 设置 TTL 为 3600 秒
    response.writeUInt16BE(0x0004, msg.length + 10) // 设置数据的长度为 4

    // 将 IP 地址拆解为 4 部分（IPv4），然后写入响应中
    const ipParts = ip.split('.').map(part => parseInt(part))
    response.writeUInt8(ipParts[0], msg.length + 12)
    response.writeUInt8(ipParts[1], msg.length + 13)
    response.writeUInt8(ipParts[2], msg.length + 14)
    response.writeUInt8(ipParts[3], msg.length + 15)

    // 将响应发送回查询的地址和端口
    server.send(response, rinfo.port, rinfo.address, (err) => {
      if (err) return console.log(`Error sending response: ${err}`)
      console.log(`Success sending response: resolved ip ${ip}`)
    })
  })

  // 可以自行指定监听的端口，缺省情况下，我们监听默认 DNS 服务端口 53
  function listen(port = 53) {
    server.bind(port, () => {
      console.log(`dns server listening on port ${port}`)
    })
  }

  return { listen }
}

// 一个正常的响应报文
// 0000   a8 a1 59 a6 7f e1 94 83 c4 1d a8 5f 08 00 45 00   ..Y........_..E.
// 0010   00 65 06 17 40 00 40 11 5b 43 08 08 08 08 c0 a8   .e..@.@.[C......
// 0020   08 76 00 35 e1 63 00 51 a4 ce fb 69 85 80 00 01   .v.5.c.Q...i....
// 0030   00 01 00 00 00 01 06 70 6f 72 74 61 6c 05 71 69   .......portal.qi
// 0040   6e 69 75 03 63 6f 6d 00 00 01 00 01 c0 0c 00 01   niu.com.........
// 0050   00 01 00 00 00 01 00 04 c6 12 43 1a 00 00 29 04   ..........C...).
// 0060   d0 00 00 00 01 00 0c 00 0a 00 08 8f 68 35 e6 d6   ............h5..
// 0070   c2 55 b0                                          .U.
