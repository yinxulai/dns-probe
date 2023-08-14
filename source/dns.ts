import * as dgram from 'dgram'

interface DnsServer {
  listen: (port?: number) => void
}

interface CreateDnsServerOptions {
  onRequest: (domain: string, remoteInfo: dgram.RemoteInfo) => string
}

export function createDnsServer(options: CreateDnsServerOptions): DnsServer {
  // 创建一个 UDP socket 运行在 53 端口，接收 DNS 查询。
  const server = dgram.createSocket('udp4')

  server.on('message', (msg, rinfo) => {
    const domainNameEndPosition = 12 + msg.readUInt8(12) + 1
    const domainName = msg.slice(13, domainNameEndPosition).toString()

    const ip = options.onRequest(domainName, rinfo)

    if (!ip) {
      console.log(`DNS Record not found for domain: ${domainName}`)
      return
    }

    const response = Buffer.alloc(msg.length + 12)
    msg.copy(response)

    // 设置标志为响应 (0x8000) 且没有错误 (0x0000)
    response.writeUInt16BE(0x8000, 2)

    // 添加 DNS 回答部分。
    response.writeUInt16BE(1, 6) // 设置回答数量为 1。
    response.writeUInt16BE(0, 8) // 设置授权资源记录数为 0。
    response.writeUInt16BE(0, 10) // 设置额外资源记录数为 0。

    // 回答部分。
    response.writeUInt16BE(0xC00C, msg.length) // 设置名称。
    response.writeUInt16BE(0x0001, msg.length + 2) // 设置类型为 A。
    response.writeUInt16BE(0x0001, msg.length + 4) // 设置类别为 IN。
    response.writeUInt32BE(3600, msg.length + 6) // 设置 TTL 为 3600 秒。
    response.writeUInt16BE(0x0004, msg.length + 10) // 设置数据的长度为 4。

    const ipParts = ip.split('.').map(part => parseInt(part))
    response.writeUInt8(ipParts[0], msg.length + 12)
    response.writeUInt8(ipParts[1], msg.length + 13)
    response.writeUInt8(ipParts[2], msg.length + 14)
    response.writeUInt8(ipParts[3], msg.length + 15)

    server.send(response, rinfo.port, rinfo.address, (err) => {
      if (err) console.log(`Error sending response: ${err}`)
    })
  })

  server.on('listening', () => {
    const address = server.address()
    console.log(`dns server listening ${address.address}:${address.port}`)
  })

  function listen(port = 53) {
    server.bind(port)
  }

  return { listen }
}
