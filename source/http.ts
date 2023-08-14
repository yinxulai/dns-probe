// 导入内置的 http 模块
import http from 'http'

interface HttpServer {
  listen: (port: number) => void
}

export function createHttpServer(): HttpServer {
  // 创建一个 http 服务器
  const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    // 处理根 URL ("/") 的 GET 请求
    if (req.url === '/' && req.method === 'GET') {
      res.statusCode = 200 // 状态码，200 表示成功
      res.setHeader('Content-Type', 'text/plain') // 设置响应头
      res.end('Hello, this is a basic http server') // 发送响应数据
    } else {
      // 其他未处理的情况，返回 404 页面未找到错误
      res.statusCode = 404
      res.end('Page not found')
    }
  })

  function listen(port: number) {
    // 使服务器监听 8080 端口的连接
    server.listen(8080, () => {
      console.log('Server running at http://localhost:8080/')
    })
  }

  return { listen }
}
