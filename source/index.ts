import { createDnsServer } from './dns'
import { createHttpServer } from './http'

const serverHostIP = '43.156.28.183'
const dnsRequestRecord = new Map<string, string>()

const dnsServer = createDnsServer({
  onRequest(domain, remoteInfo) {
    dnsRequestRecord.set(domain.toLowerCase(), remoteInfo.address)
    return serverHostIP
  }
})

const httpServer = createHttpServer({
  onRequest(host) {
    const domain = host.toLowerCase().replace(/:.+$/, '')
    const dnsQueryIP = dnsRequestRecord.get(domain)
    console.log(`${domain} => ${dnsQueryIP}`)
    dnsRequestRecord.delete(domain)
    return dnsQueryIP || 'undefined'
  }
})

dnsServer.listen(53)
httpServer.listen(9000)
