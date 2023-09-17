import { createDnsServer } from './dns'
import { createHttpServer } from './http'

const serverHostIP = '43.156.28.183'
const dnsRequestRecord = new Map<string, string>()

const dnsServer = createDnsServer({
  onRequest(domain, remoteInfo) {
    const lowDomain = domain.toLowerCase()
    dnsRequestRecord.set(lowDomain, remoteInfo.address)
    console.log(`dns server request resolved: ${lowDomain} => ${serverHostIP}`)
    return serverHostIP
  }
})

const httpServer = createHttpServer({
  onRequest(host) {
    const domain = host.toLowerCase().replace(/:.+$/, '')
    const dnsQueryIP = dnsRequestRecord.get(domain)
    console.log(`http server handle request: ${domain} => ${dnsQueryIP}`)
    dnsRequestRecord.delete(domain)
    return dnsQueryIP || 'undefined'
  }
})

dnsServer.listen(53)
httpServer.listen(80)
