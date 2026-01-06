# ============================================
# 手语AI平台前端 Dockerfile
# ============================================
# 多阶段构建：基础阶段 -> 构建阶段 -> 生产阶段
# 最终镜像大小小，安全性高

# ============================================
# 阶段 1: 基础阶段（依赖安装）
# ============================================
FROM node:18-alpine AS base

# 设置工作目录
WORKDIR /app

# 设置 Node 环境为生产环境
ENV NODE_ENV=production

# 复制 package 文件
COPY package.json package-lock.json ./

# 安装依赖（使用淘宝镜像加速）
RUN npm config set registry https://registry.npmmirror.com/ && \
    npm ci --only=production && \
    npm cache clean --force

# ============================================
# 阶段 2: 构建阶段（Vite 构建）
# ============================================
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 设置构建环境变量
ENV NODE_ENV=production
ENV VITE_API_URL=http://backend:8000
ENV VITE_WS_URL=ws://backend:8000/ws

# 复制 package 文件
COPY package.json package-lock.json ./

# 安装所有依赖（包括开发依赖）
RUN npm config set registry https://registry.npmmirror.com/ && \
    npm ci && \
    npm cache clean --force

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# ============================================
# 阶段 3: 生产阶段（Nginx 部署）
# ============================================
FROM nginx:1.25-alpine AS production

# 安装必要的工具
RUN apk add --no-cache curl tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata

# 创建非 root 用户
RUN addgroup -g 1001 -S nginx && \
    adduser -S -D -H -u 1001 -s /sbin/nologin -G nginx nginx && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# 从构建阶段复制构建产物
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# 复制自定义 Nginx 配置（如果存在）
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf

# 创建必要的目录
RUN mkdir -p /var/log/nginx /var/cache/nginx /tmp/nginx && \
    chown -R nginx:nginx /var/log/nginx /var/cache/nginx /tmp/nginx

# 创建健康检查文件
RUN echo "OK" > /usr/share/nginx/html/health

# 暴露端口
EXPOSE 80 443

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# 切换到非 root 用户
USER nginx

# 启动 Nginx（使用前台模式）
CMD ["nginx", "-g", "daemon off;"]

# ============================================
# 镜像标签和元数据
# ============================================
LABEL maintainer="sign-ai-platform"
LABEL description="Sign AI Platform Frontend - Production Build"
LABEL version="1.0.0"