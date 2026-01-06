#!/bin/bash
# ============================================
# 手语AI平台 初始化脚本
# ============================================
# 功能：
# - 检查系统环境
# - 安装系统依赖
# - 配置 Docker 环境
# - 初始化项目结构
# - 生成密钥和证书
# - 准备数据库初始化
# - 下载预训练模型（可选）
#
# 使用方法：
#   bash scripts/setup.sh [选项]
#
# 选项：
#   --skip-models     跳过模型下载
#   --skip-ssl        跳过 SSL 证书生成
#   --dev             开发环境设置
#   --prod            生产环境设置（默认）
#   -h, --help        显示帮助信息
# ============================================

set -e
set -u

# ============================================
# 颜色定义
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================
# 配置变量
# ============================================
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_MODELS=false
SKIP_SSL=false
SETUP_MODE="prod"

# ============================================
# 打印函数
# ============================================
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
}

# ============================================
# 显示帮助信息
# ============================================
show_help() {
    cat << EOF
手语AI平台 初始化脚本

使用方法：
    bash scripts/setup.sh [选项]

选项：
    --skip-models     跳过模型下载
    --skip-ssl        跳过 SSL 证书生成
    --dev             开发环境设置
    --prod            生产环境设置（默认）
    -h, --help        显示帮助信息

说明：
    该脚本会在首次部署时运行，用于初始化整个项目的
    环境配置和依赖准备。在生产环境中建议在生产服务器
    上手动运行此脚本。

EOF
}

# ============================================
# 解析命令行参数
# ============================================
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-models)
                SKIP_MODELS=true
                shift
                ;;
            --skip-ssl)
                SKIP_SSL=true
                shift
                ;;
            --dev)
                SETUP_MODE="dev"
                shift
                ;;
            --prod)
                SETUP_MODE="prod"
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                print_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# ============================================
# 检查操作系统
# ============================================
check_os() {
    print_header "检查操作系统"
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        print_success "检测到 Linux 系统"
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        print_success "检测到 macOS 系统"
        OS="macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        print_success "检测到 Windows 系统"
        OS="windows"
    else
        print_error "未知操作系统: $OSTYPE"
        exit 1
    fi
    
    # 显示系统信息
    print_info "操作系统: $(uname -a)"
}

# ============================================
# 检查系统依赖
# ============================================
check_system_deps() {
    print_header "检查系统依赖"
    
    local deps=("curl" "wget")
    
    if [[ "$OS" == "linux" ]]; then
        deps+=("git" "unzip")
    elif [[ "$OS" == "macos" ]]; then
        deps+=("git")
    fi
    
    for dep in "${deps[@]}"; do
        if command -v "$dep" &> /dev/null; then
            print_success "$dep 已安装"
        else
            print_warning "$dep 未安装"
        fi
    done
}

# ============================================
# 检查 Docker 环境
# ============================================
check_docker() {
    print_header "检查 Docker 环境"
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装"
        print_info "请访问 https://docs.docker.com/get-docker/ 安装 Docker"
        exit 1
    else
        local docker_version=$(docker --version | awk '{print $3}' | sed 's/,//')
        print_success "Docker 已安装: $docker_version"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装"
        print_info "请访问 https://docs.docker.com/compose/install/ 安装 Docker Compose"
        exit 1
    else
        local compose_version=$(docker-compose --version | awk '{print $4}' | sed 's/,//')
        print_success "Docker Compose 已安装: $compose_version"
    fi
    
    # 检查 Docker 服务状态
    if ! docker info &> /dev/null; then
        print_error "Docker 服务未运行"
        print_info "请启动 Docker 服务"
        exit 1
    fi
    
    print_success "Docker 环境检查通过"
}

# ============================================
# 检查系统资源
# ============================================
check_resources() {
    print_header "检查系统资源"
    
    # 检查可用内存（Linux/macOS）
    if [[ "$OS" == "linux" ]]; then
        local total_mem=$(free -g | awk '/^Mem:/{print $2}')
        local avail_mem=$(free -g | awk '/^Mem:/{print $7}')
        print_info "总内存: ${total_mem}GB, 可用内存: ${avail_mem}GB"
        
        if (( avail_mem < 4 )); then
            print_warning "可用内存不足 4GB，建议至少 4GB 内存"
        fi
    elif [[ "$OS" == "macos" ]]; then
        local total_mem=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024/1024)}')
        print_info "总内存: ${total_mem}GB"
    fi
    
    # 检查磁盘空间
    local avail_disk=$(df -BG "$PROJECT_DIR" | awk 'NR==2 {print $4}' | sed 's/G//')
    print_info "可用磁盘空间: ${avail_disk}GB"
    
    if (( avail_disk < 10 )); then
        print_warning "可用磁盘空间不足 10GB，建议至少 10GB"
    fi
}

# ============================================
# 创建项目目录结构
# ============================================
create_directories() {
    print_header "创建项目目录结构"
    
    local dirs=(
        "backend/logs"
        "backend/uploads"
        "backend/temp"
        "backend/cache"
        "frontend/ssl"
        "models"
        "models/stgcn"
        "models/whisper"
        "models/vocoder"
        "models/speaker_encoder"
        "backups"
        "backups/database"
        "backups/files"
        "monitoring"
        "monitoring/grafana-dashboards"
        "monitoring/grafana-provisioning"
        "monitoring/grafana-provisioning/datasources"
        "monitoring/grafana-provisioning/dashboards"
        "scripts"
        "temp"
        "logs"
    )
    
    for dir in "${dirs[@]}"; do
        local full_dir="$PROJECT_DIR/$dir"
        if [ ! -d "$full_dir" ]; then
            mkdir -p "$full_dir"
            print_success "创建目录: $dir"
        else
            print_info "目录已存在: $dir"
        fi
    done
}

# ============================================
# 配置环境变量
# ============================================
setup_env() {
    print_header "配置环境变量"
    
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        if [ -f "$PROJECT_DIR/.env.example" ]; then
            cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
            print_success "从 .env.example 创建 .env 文件"
        else
            print_error ".env.example 文件不存在"
            exit 1
        fi
    else
        print_info ".env 文件已存在"
    fi
    
    # 生成随机密钥
    print_info "生成安全密钥..."
    
    local secret_key=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
    local jwt_secret_key=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
    local db_password=$(openssl rand -base64 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    
    # 更新 .env 文件
    sed -i "s/SECRET_KEY=.*/SECRET_KEY=$secret_key/" "$PROJECT_DIR/.env"
    sed -i "s/JWT_SECRET_KEY=.*/JWT_SECRET_KEY=$jwt_secret_key/" "$PROJECT_DIR/.env"
    sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$db_password/" "$PROJECT_DIR/.env"
    sed -i "s/DATABASE_URL=.*/DATABASE_URL=postgresql:\/\/signai:$db_password@postgres:5432\/signai/" "$PROJECT_DIR/.env"
    
    print_success "环境变量配置完成"
}

# ============================================
# 生成 SSL 证书（开发环境自签名证书）
# ============================================
generate_ssl_cert() {
    if [ "$SKIP_SSL" = true ]; then
        print_info "跳过 SSL 证书生成"
        return
    fi
    
    print_header "生成 SSL 证书"
    
    local ssl_dir="$PROJECT_DIR/frontend/ssl"
    
    if [ -f "$ssl_dir/cert.pem" ] && [ -f "$ssl_dir/key.pem" ]; then
        print_info "SSL 证书已存在"
        return
    fi
    
    print_info "生成自签名 SSL 证书（仅用于开发环境）"
    
    openssl req -x509 -newkey rsa:4096 -keyout "$ssl_dir/key.pem" -out "$ssl_dir/cert.pem" \
        -days 365 -nodes -subj "/C=CN/ST=Beijing/L=Beijing/O=SignAI/CN=localhost" 2>/dev/null || {
        print_warning "SSL 证书生成失败，请手动安装 OpenSSL"
        print_info "SSL 目录: $ssl_dir"
        return
    }
    
    # 设置权限
    chmod 600 "$ssl_dir/key.pem"
    chmod 644 "$ssl_dir/cert.pem"
    
    print_success "SSL 证书生成完成"
}

# ============================================
# 创建 Redis 配置文件
# ============================================
create_redis_conf() {
    print_header "创建 Redis 配置文件"
    
    local redis_conf="$PROJECT_DIR/scripts/redis.conf"
    
    if [ ! -f "$redis_conf" ]; then
        cat > "$redis_conf" << 'EOF'
# Redis 配置文件
# 手语AI平台

# 绑定地址
bind 0.0.0.0

# 端口
port 6379

# 后台运行
daemonize no

# 数据库数量
databases 16

# 持久化配置
save 900 1
save 300 10
save 60 10000

# RDB 文件名
dbfilename dump.rdb

# 工作目录
dir /data

# 最大内存限制
maxmemory 256mb
maxmemory-policy allkeys-lru

# 日志级别
loglevel notice

# 慢查询日志
slowlog-log-slower-than 10000
slowlog-max-len 128
EOF
        print_success "Redis 配置文件创建完成"
    else
        print_info "Redis 配置文件已存在"
    fi
}

# ============================================
# 创建数据库初始化脚本
# ============================================
create_db_init() {
    print_header "创建数据库初始化脚本"
    
    local init_sql="$PROJECT_DIR/scripts/init-db.sql"
    
    if [ ! -f "$init_sql" ]; then
        cat > "$init_sql" << 'EOF'
-- 手语AI平台 数据库初始化脚本
-- 该脚本在 PostgreSQL 容器首次启动时自动执行

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建数据库用户（如果尚不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'signai') THEN
        CREATE ROLE signai WITH LOGIN PASSWORD 'signai_password';
    END IF;
END
$$;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE signai TO signai;
GRANT ALL ON SCHEMA public TO signai;

-- 创建初始表结构（由 Alembic 管理）
-- 这里只做数据库基础的初始化，表结构由迁移脚本创建

-- 完成
EOF
        print_success "数据库初始化脚本创建完成"
    else
        print_info "数据库初始化脚本已存在"
    fi
}

# ============================================
# 下载模型文件（可选）
# ============================================
download_models() {
    if [ "$SKIP_MODELS" = true ]; then
        print_info "跳过模型下载"
        return
    fi
    
    print_header "下载预训练模型"
    
    print_warning "模型下载可能需要较长时间和大量存储空间"
    echo "是否现在下载模型文件？(y/N): "
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_info "跳过模型下载"
        return
    fi
    
    local models_dir="$PROJECT_DIR/models"
    
    print_info "STGCN 手语识别模型..."
    print_warning "请手动下载 STGCN 模型并放置到 $models_dir/stgcn/ 目录"
    
    print_info "Whisper 语音模型..."
    print_warning "请在首次运行时，Whisper 会自动从 Hugging Face 下载"
    
    print_info "Vocoder 模型..."
    print_warning "请手动下载 Vocoder 模型并放置到 $models_dir/vocoder/ 目录"
    
    print_info "Speaker Encoder 模型..."
    print_warning "请手动下载 Speaker Encoder 模型并放置到 $models_dir/speaker_encoder/ 目录"
    
    print_warning "模型下载说明："
    echo "  由于模型文件较大，建议手动下载"
    echo "  请参考项目文档中的模型下载指南"
}

# ============================================
# 配置 Git
# ============================================
setup_git() {
    print_header "配置 Git"
    
    if command -v git &> /dev/null; then
        # 检查是否是 Git 仓库
        if ! git -C "$PROJECT_DIR" rev-parse --git-dir &> /dev/null; then
            print_info "初始化 Git 仓库"
            git -C "$PROJECT_DIR" init
            
            # 创建 .gitignore（如果不存在）
            if [ ! -f "$PROJECT_DIR/.gitignore" ]; then
                cat > "$PROJECT_DIR/.gitignore" << 'EOF'
# 环境变量
.env
.env.local
.env.*.local

# 日志
logs/
*.log

# 数据库
*.db
*.sqlite

# 上传文件
backend/uploads/
backend/temp/

# 缓存
__pycache__/
*.pyc
node_modules/

# 模型文件
models/*.pth
models/*.pt
models/*.pkl

# 备份文件
backups/
*.backup

# 临时文件
temp/
tmp/

# SSL 证书
*.pem
*.key
*.crt

# IDE
.vscode/
.idea/
EOF
                print_success ".gitignore 文件创建完成"
            fi
        else
            print_info "Git 仓库已存在"
        fi
    else
        print_warning "Git 未安装，跳过 Git 配置"
    fi
}

# ============================================
# 创建监控配置
# ============================================
setup_monitoring() {
    print_header "配置监控系统"
    
    # Grafana 数据源配置
    local datasources_dir="$PROJECT_DIR/monitoring/grafana-provisioning/datasources"
    mkdir -p "$datasources_dir"
    
    local datasources_file="$datasources_dir/datasources.yml"
    if [ ! -f "$datasources_file" ]; then
        cat > "$datasources_file" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
EOF
        print_success "Grafana 数据源配置完成"
    fi
    
    # Grafana 仪表板配置
    local dashboards_dir="$PROJECT_DIR/monitoring/grafana-provisioning/dashboards"
    mkdir -p "$dashboards_dir"
    
    local dashboards_file="$dashboards_dir/dashboards.yml"
    if [ ! -f "$dashboards_file" ]; then
        cat > "$dashboards_file" << 'EOF'
apiVersion: 1

providers:
  - name: 'Default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF
        print_success "Grafana 仪表板配置完成"
    fi
}

# ============================================
# 创建 README
# ============================================
create_readme() {
    print_header "创建部署说明文档"
    
    local deploy_readme="$PROJECT_DIR/DEPLOY.md"
    
    if [ ! -f "$deploy_readme" ]; then
        cat > "$deploy_readme" << 'EOF'
# 手语AI平台 部署指南

## 快速开始

### 1. 初始化项目

```bash
bash scripts/setup.sh
```

### 2. 配置环境变量

编辑 `.env` 文件，修改必要的配置：
```bash
vim .env
```

### 3. 部署服务

```bash
bash scripts/deploy.sh
```

### 4. 访问应用

- 前端: http://localhost
- 后端API: http://localhost:8000
- API文档: http://localhost:8000/docs
- Flower: http://localhost:5555
- Grafana: http://localhost:3001

## 生产环境部署

### 系统要求

- 操作系统: Linux (推荐 Ubuntu 20.04+)
- 内存: 至少 4GB RAM，推荐 8GB+
- 磁盘: 至少 10GB 可用空间
- CPU: 4核心以上
- 网络: 稳定的互联网连接

### 部署步骤

1. 克隆代码仓库
2. 运行初始化脚本
3. 修改环境变量
4. 配置 SSL 证书（推荐使用 Let's Encrypt）
5. 执行部署脚本
6. 验证服务状态

### SSL 证书配置

使用 Let's Encrypt：

```bash
# 安装 certbot
apt-get install certbot

# 生成证书
certbot certonly --standalone -d your-domain.com

# 复制证书到项目
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem frontend/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem frontend/ssl/key.pem
```

## 监控和维护

### 服务状态检查

```bash
docker-compose ps
```

### 查看日志

```bash
docker-compose logs -f [service]
```

### 备份数据

```bash
bash scripts/backup.sh
```

### 更新服务

```bash
bash scripts/update.sh
```

## 故障排查

### 数据库连接失败

检查数据库容器状态：
```bash
docker-compose logs postgres
```

### Redis 连接失败

检查 Redis 容器状态：
```bash
docker-compose logs redis
```

### 服务无法启动

查看详细日志：
```bash
docker-compose logs
```

## 更多信息

请参考项目根目录的 README.md 文件。
EOF
        print_success "部署说明文档创建完成"
    fi
}

# ============================================
# 显示总结信息
# ============================================
show_summary() {
    print_header "初始化完成"
    
    echo ""
    echo -e "${GREEN}===========================================${NC}"
    echo -e "${GREEN}  手语AI平台初始化完成！${NC}"
    echo -e "${GREEN}===========================================${NC}"
    echo ""
    echo "下一步操作："
    echo "  1. 编辑 .env 文件，配置环境变量"
    echo "     vim .env"
    echo ""
    echo "  2. 下载预训练模型到 models/ 目录"
    echo "     参考: DEPLOY.md 中的模型下载说明"
    echo ""
    echo "  3. 运行部署脚本"
    echo "     bash scripts/deploy.sh"
    echo ""
    echo "文件位置："
    echo "  项目目录: $PROJECT_DIR"
    echo "  配置文件: $PROJECT_DIR/.env"
    echo "  日志目录: $PROJECT_DIR/logs"
    echo "  备份目录: $PROJECT_DIR/backups"
    echo ""
    echo "帮助文档："
    echo "  部署指南: $PROJECT_DIR/DEPLOY.md"
    echo "  项目文档: $PROJECT_DIR/README.md"
    echo ""
}

# ============================================
# 主函数
# ============================================
main() {
    print_header "手语AI平台 初始化脚本"
    echo "初始化模式: $SETUP_MODE"
    echo "项目目录: $PROJECT_DIR"
    echo ""
    
    # 解析参数
    parse_args "$@"
    
    # 检查系统
    check_os
    check_system_deps
    check_docker
    check_resources
    
    # 创建目录结构
    create_directories
    
    # 配置环境
    setup_env
    
    # 生成 SSL 证书
    generate_ssl_cert
    
    # 创建配置文件
    create_redis_conf
    create_db_init
    setup_monitoring
    
    # 配置 Git
    setup_git
    
    # 下载模型（可选）
    download_models
    
    # 创建文档
    create_readme
    
    # 显示总结
    show_summary
    
    print_success "初始化完成！"
}

# 执行主函数
main "$@"