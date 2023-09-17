# 使用 Node.js 的基础镜像
FROM node:18

# 在容器内部创建项目文件夹
WORKDIR /usr/local/src/app

# 复制项目源代码到容器内部
COPY . .

# 安装项目依赖
RUN npm install

RUN npm run build

# 暴露服务端口（如果项目需要）
EXPOSE 53 80

# 定义容器启动时运行的命令
CMD [ "npm", "start" ]
