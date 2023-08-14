import { createDnsServer } from './dns'
import { createHttpServer } from './http'

const serverHostIP = '43.156.28.183'
const serverDomain = 'dns-probe.yinxulai.com'
const dnsRequestRecord = new Map<string, string>()

const dnsServer = createDnsServer({
  onRequest(domain, remoteInfo) {
    if (!domain.endsWith(serverDomain)) return '127.0.0.1'
    dnsRequestRecord.set(domain, remoteInfo.address)
    return serverHostIP
  }
})

const httpServer = createHttpServer({
  onRequest(host) {
    const dnsQueryIP = dnsRequestRecord.get(host)
    dnsRequestRecord.delete(host)
    return dnsQueryIP || 'undefined'
  }
})

dnsServer.listen()
httpServer.listen(9000)
