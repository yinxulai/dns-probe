import * as dgram from 'dgram'

interface DnsServer {
  listen: (port?: number) => void
}

interface CreateDnsServerOptions {
  onRequest: (domain: string, remoteInfo: dgram.RemoteInfo) => string
}

function parseDomainFromQuery(query: Buffer): string {
  let position = 12 // skip the header
  let labels = []

  while (position <= query.length && query.readUInt8(position) !== 0) { // check buffer bounds and end of labels marked by 0
    const length = query.readUInt8(position)
    position++

    // Add check for buffer bounds
    if (position + length > query.length) {
      throw new Error('Invalid DNS query: Reached end of buffer while parsing domain name labels')
    }

    const label = query.slice(position, position + length)
    labels.push(label.toString())

    position += length
  }

  return labels.join(".").toLowerCase()
}

export function createDnsServer(options: CreateDnsServerOptions): DnsServer {
  const server = dgram.createSocket('udp4')

  server.on('message', (msg, rinfo) => {
    if (msg.length < 12) {
      console.log('Message too short, potentially not a valid DNS query.')
      return
    }

    if ((msg.readUInt16BE(2) & 0x800F) !== 0x0000) {
      console.log('Not a standard query, potentially not a valid DNS query.')
      return
    }

    const domainName = parseDomainFromQuery(msg)

    console.log(`Received a query request: ${domainName}`)

    const ip = options.onRequest(domainName, rinfo)

    if (!ip) {
      console.log(`DNS Record not found for domain: ${domainName}`)
      return
    }

    // 获取查询消息中的 Additional records 数量
    const numAdditionalRecords = msg.readUInt16BE(10)
    // 计算 Additional records 的长度
    const additionalRecordsLength = numAdditionalRecords * 16 // 每个 Additional record 的长度为 16 字节

    const response = Buffer.alloc(msg.length + 16 + additionalRecordsLength)
    msg.copy(response)

    response.writeUInt16BE(0x8000, 2)

    response.writeUInt16BE(1, 6)
    response.writeUInt16BE(0, 8)
    response.writeUInt16BE(numAdditionalRecords, 10) // 设置额外资源记录数

    response.writeUInt16BE(0xC00C, msg.length)
    response.writeUInt16BE(0x0001, msg.length + 2)
    response.writeUInt16BE(0x0001, msg.length + 4)
    response.writeUInt32BE(3600, msg.length + 6)
    response.writeUInt16BE(0x0004, msg.length + 10)

    const ipParts = ip.split('.').map(part => parseInt(part))
    response.writeUInt8(ipParts[0], msg.length + 12)
    response.writeUInt8(ipParts[1], msg.length + 13)
    response.writeUInt8(ipParts[2], msg.length + 14)
    response.writeUInt8(ipParts[3], msg.length + 15)

    // 处理 Additional records
    const additionalRecordsStart = msg.length + 16
    for (let i = 0; i < numAdditionalRecords; i++) {
      const srcStart = msg.length + (i * 16) // 查询消息中某个 Additional record 的起始位置
      const destStart = additionalRecordsStart + (i * 16) // 响应消息中对应 Additional record 的起始位置

      // 从查询消息中复制 Additional record 到响应消息中
      msg.copy(response, destStart, srcStart, srcStart + 16)
    }

    server.send(response, rinfo.port, rinfo.address, (err) => {
      if (err) return console.log(`Error sending response: ${err}`)
      console.log(`Success sending response: resolved ip ${ip}`)
      console.log(response.toString('hex'))
    })
  })

  function listen(port = 53) {
    server.bind(port, () => {
      console.log(`dns server listening on port ${port}`)
    })
  }

  return { listen }
}

// 一个正常的请求报文
// 0000   8d ac 01 20 00 01 00 00 00 00 00 01 10 64 6e 73   ... .........dns
// 0010   2d 70 72 6f 62 65 2d 73 65 72 76 65 72 08 79 69   -probe-server.yi
// 0020   6e 78 75 6c 61 69 03 63 6f 6d 00 00 01 00 01 00   nxulai.com......
// 0030   00 29 10 00 00 00 00 00 00 00                     .)........

// 一个正常的响应报文
// 0000   8d ac 81 80 00 01 00 01 00 00 00 01 10 64 6e 73   .............dns
// 0010   2d 70 72 6f 62 65 2d 73 65 72 76 65 72 08 79 69   -probe-server.yi
// 0020   6e 78 75 6c 61 69 03 63 6f 6d 00 00 01 00 01 c0   nxulai.com......
// 0030   0c 00 01 00 01 00 00 01 42 00 04 2b 9c 1c b7 

// 我的请求报文
// 0000   b7 f7 01 20 00 01 00 00 00 00 00 01 10 64 6e 73   ... .........dns
// 0010   2d 70 72 6f 62 65 2d 73 65 72 76 65 72 08 79 69   -probe-server.yi
// 0020   6e 78 75 6c 61 69 03 63 6f 6d 00 00 01 00 01 00   nxulai.com......
// 0030   00 29 10 00 00 00 00 00 00 00                     .)........

// 我的响应报文
// 0000   b7 f7 80 00 00 01 00 01 00 00 00 00 10 64 6e 73   .............dns
// 0010   2d 70 72 6f 62 65 2d 73 65 72 76 65 72 08 79 69   -probe-server.yi
// 0020   6e 78 75 6c 61 69 03 63 6f 6d 00 00 01 00 01 00   nxulai.com......
// 0030   00 29 10 00 00 00 00 00 00 00 c0 0c 00 01 00 01   .)..............
// 0040   00 00 0e 10 00 04 2b 9c 1c b7                     ......+...
