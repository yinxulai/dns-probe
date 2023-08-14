// 导入内置的 http 模块
import http from 'http'

interface HttpServer {
  listen: (port: number) => void
}

interface CreateHttpServerOptions {
  onRequest: (host: string) => string
}

export function createHttpServer(options: CreateHttpServerOptions): HttpServer {
  // 创建一个 http 服务器
  const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')

    // 处理根 URL ("/") 的 GET 请求
    if (req.url === '/' && req.method === 'GET') {
      res.statusCode = 200 // 状态码，200 表示成功
      res.setHeader('Content-Type', 'text/plain') // 设置响应头
      res.end(options.onRequest(req.headers.host!)) // 发送响应数据
    }
  })

  function listen(port: number) {
    server.listen(port, () => {
      console.log(`http server listening http://localhost:${port}`)
    })
  }

  return { listen }
}
