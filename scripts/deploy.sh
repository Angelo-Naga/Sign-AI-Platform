#!/bin/bash
# ============================================
# 手语AI平台 一键部署脚本
# ============================================
# 功能：
# - 检查环境依赖
# - 初始化配置文件
# - 构建和启动所有服务
# - 执行数据库迁移
# - 验证服务健康状态
#
# 使用方法：
#   bash scripts/deploy.sh [选项]
#
# 选项：
#   --skip-deps       跳过依赖检查
#   --skip-migration  跳过数据库迁移
#   --dev             开发模式部署
#   --prod            生产模式部署（默认）
#   -h, --help        显示帮助信息
# ============================================

set -e  # 遇到错误立即退出
set -u  # 使用未定义的变量时退出

# ============================================
# 颜色定义
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 配置变量
# ============================================
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_DEPS=false
SKIP_MIGRATION=false
DEPLOY_MODE="prod"

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
手语AI平台 一键部署脚本

使用方法：
    bash scripts/deploy.sh [选项]

选项：
    --skip-deps       跳过依赖检查
    --skip-migration  跳过数据库迁移
    --dev             开发模式部署
    --prod            生产模式部署（默认）
    -h, --help        显示帮助信息

示例：
    bash scripts/deploy.sh                # 生产模式部署
    bash scripts/deploy.sh --dev          # 开发模式部署
    bash scripts/deploy.sh --skip-mig    # 跳过数据库迁移

EOF
}

# ============================================
# 解析命令行参数
# ============================================
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --skip-migration)
                SKIP_MIGRATION=true
                shift
                ;;
            --dev)
                DEPLOY_MODE="dev"
                shift
                ;;
            --prod)
                DEPLOY_MODE="prod"
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
# 检查依赖
# ============================================
check_dependencies() {
    print_header "检查依赖环境"
    
    local deps=("docker" "docker-compose" "curl")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        else
            print_success "$dep 已安装"
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "缺少以下依赖: ${missing_deps[*]}"
        print_info "请先安装缺失的依赖后再运行部署脚本"
        exit 1
    fi
    
    # 检查 Docker 服务是否运行
    if ! docker info &> /dev/null; then
        print_error "Docker 服务未运行，请先启动 Docker 服务"
        exit 1
    fi
    
    print_success "依赖检查通过"
}

# ============================================
# 检查环境变量文件
# ============================================
check_env_file() {
    print_header "检查环境变量配置"
    
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        print_warning ".env 文件不存在"
        if [ -f "$PROJECT_DIR/.env.example" ]; then
            print_info "从 .env.example 创建 .env 文件"
            cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
            print_warning "请根据实际情况修改 .env 文件中的配置"
            
            # 生成随机密钥
            generate_secrets
        else
            print_error ".env.example 文件不存在"
            exit 1
        fi
    else
        print_success ".env 文件已存在"
    fi
    
    # 检查必需的环境变量
    source "$PROJECT_DIR/.env"
    
    local required_vars=("SECRET_KEY" "JWT_SECRET_KEY")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ] || [[ "${!var}" =~ change-in-production ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_warning "以下环境变量使用默认值或未设置: ${missing_vars[*]}"
        print_warning "请在 .env 文件中设置强密钥以提高安全性"
    fi
}

# ============================================
# 生成随机密钥
# ============================================
generate_secrets() {
    print_info "生成随机密钥"
    
    local secret_key=$(openssl rand -hex 32)
    local jwt_secret_key=$(openssl rand -hex 32)
    
    # 更新 .env 文件
    sed -i "s/SECRET_KEY=.*/SECRET_KEY=$secret_key/" "$PROJECT_DIR/.env"
    sed -i "s/JWT_SECRET_KEY=.*/JWT_SECRET_KEY=$jwt_secret_key/" "$PROJECT_DIR/.env"
    
    print_success "密钥生成完成"
}

# ============================================
# 创建必要的目录
# ============================================
create_directories() {
    print_header "创建必要的目录"
    
    local dirs=(
        "backend/logs"
        "backend/uploads"
        "backend/temp"
        "frontend/ssl"
        "models"
        "backups"
        "monitoring/grafana-dashboards"
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
# 停止现有服务
# ============================================
stop_existing_services() {
    print_header "停止现有服务"
    
    cd "$PROJECT_DIR"
    
    if docker-compose ps -q | grep -q .; then
        print_info "停止现有 Docker 容器"
        docker-compose down
        print_success "服务已停止"
    else
        print_info "没有运行中的服务"
    fi
}

# ============================================
# 清理旧镜像（可选）
# ============================================
cleanup_old_images() {
    print_header "清理旧镜像"
    
    cd "$PROJECT_DIR"
    
    # 询问用户是否清理
    read -p "是否清理未使用的 Docker 镜像？(y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker image prune -a -f
        print_success "镜像清理完成"
    else
        print_info "跳过镜像清理"
    fi
}

# ============================================
# 构建服务镜像
# ============================================
build_services() {
    print_header "构建服务镜像"
    
    cd "$PROJECT_DIR"
    
    print_info "开始构建所有服务镜像..."
    docker-compose build --no-cache
    
    print_success "镜像构建完成"
}

# ============================================
# 启动服务
# ============================================
start_services() {
    print_header "启动服务"
    
    cd "$PROJECT_DIR"
    
    if [ "$DEPLOY_MODE" = "dev" ]; then
        print_info "以开发模式启动服务"
        docker-compose up -d
    else
        print_info "以生产模式启动服务"
        docker-compose -f docker-compose.yml up -d
    fi
    
    print_success "服务启动完成"
}

# ============================================
# 等待服务就绪
# ============================================
wait_for_services() {
    print_header "等待服务就绪"
    
    local max_attempts=30
    local attempt=0
    
    # 等待 PostgreSQL
    print_info "等待 PostgreSQL 就绪..."
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose exec -T postgres pg_isready -U signai &> /dev/null; then
            print_success "PostgreSQL 已就绪"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "PostgreSQL 启动超时"
        exit 1
    fi
    
    # 等待 Redis
    print_info "等待 Redis 就绪..."
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose exec -T redis redis-cli ping &> /dev/null; then
            print_success "Redis 已就绪"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "Redis 启动超时"
        exit 1
    fi
    
    # 等待后端服务
    print_info "等待后端服务就绪..."
    attempt=0
    local backend_url="${BACKEND_URL:-http://localhost:8000}"
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "$backend_url/health" &> /dev/null; then
            print_success "后端服务已就绪"
            break
        fi
        attempt=$((attempt + 1))
        sleep 3
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_warning "后端服务健康检查超时，可能需要更长时间启动"
    fi
}

# ============================================
# 执行数据库迁移
# ============================================
run_migrations() {
    if [ "$SKIP_MIGRATION" = true ]; then
        print_info "跳过数据库迁移"
        return
    fi
    
    print_header "执行数据库迁移"
    
    cd "$PROJECT_DIR"
    
    # 运行 Alembic 迁移
    if [ -f "$PROJECT_DIR/backend/alembic.ini" ]; then
        docker-compose exec -T backend alembic upgrade head
        print_success "数据库迁移完成"
    else
        print_warning "未找到 Alembic 配置，跳过数据库迁移"
    fi
}

# ============================================
# 创建初始数据
# ============================================
create_initial_data() {
    print_header "创建初始数据"
    
    cd "$PROJECT_DIR"
    
    # 创建初始管理员用户
    print_info "创建初始管理员用户"
    docker-compose exec -T backend python -c "
from api.database import SessionLocal
from models.user import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
db = SessionLocal()

if not db.query(User).filter(User.username == 'admin').first():
    admin = User(
        username='admin',
        email='admin@example.com',
        hashed_password=pwd_context.hash('admin123'),
        is_active=True,
        is_superuser=True
    )
    db.add(admin)
    db.commit()
    print('Admin user created: username=admin, password=admin123')
else:
    print('Admin user already exists')

db.close()
"
    
    print_success "初始数据创建完成"
}

# ============================================
# 健康检查
# ============================================
health_check() {
    print_header "服务健康检查"
    
    cd "$PROJECT_DIR"
    
    local services=("frontend" "backend" "postgres" "redis")
    local unhealthy_services=()
    
    for service in "${services[@]}"; do
        if docker-compose ps "$service" | grep -q "Up"; then
            print_success "$service: 运行中"
        else
            print_error "$service: 未运行"
            unhealthy_services+=("$service")
        fi
    done
    
    # 检查容器健康状态
    print_info "检查容器健康状态..."
    docker-compose ps
    
    if [ ${#unhealthy_services[@]} -ne 0 ]; then
        print_error "以下服务未正常运行: ${unhealthy_services[*]}"
        print_info "请查看日志: docker-compose logs [service]"
        exit 1
    fi
    
    print_success "所有服务运行正常"
}

# ============================================
# 显示访问信息
# ============================================
show_access_info() {
    print_header "部署完成"
    
    echo ""
    echo -e "${GREEN}===========================================${NC}"
    echo -e "${GREEN}  手语AI平台部署成功！${NC}"
    echo -e "${GREEN}===========================================${NC}"
    echo ""
    echo "服务访问地址："
    echo -e "  前端服务: ${BLUE}http://localhost${NC}"
    echo -e "  后端API:  ${BLUE}http://localhost:8000${NC}"
    echo -e "  API 文档:  ${BLUE}http://localhost:8000/docs${NC}"
    echo ""
    echo "监控服务："
    echo -e "  Flower:   ${BLUE}http://localhost:5555${NC} (Celery 任务监控)"
    echo -e "  Grafana:  ${BLUE}http://localhost:3001${NC} (用户名: admin, 密码: grafana_password)"
    echo -e "  Prometheus: ${BLUE}http://localhost:9090${NC}"
    echo ""
    echo "常用命令："
    echo "  查看日志:   docker-compose logs -f [service]"
    echo "  停止服务:   docker-compose down"
    echo "  重启服务:   docker-compose restart [service]"
    echo "  查看状态:   docker-compose ps"
    echo ""
    echo "默认管理员账号："
    echo "  用户名: admin"
    echo "  密码:   admin123"
    echo "  请在生产环境中立即修改默认密码！"
    echo ""
}

# ============================================
# 主函数
# ============================================
main() {
    print_header "手语AI平台 部署脚本"
    echo "部署模式: $DEPLOY_MODE"
    echo "项目目录: $PROJECT_DIR"
    echo ""
    
    # 解析参数
    parse_args "$@"
    
    # 检查依赖
    if [ "$SKIP_DEPS" = false ]; then
        check_dependencies
    fi
    
    # 检查环境变量
    check_env_file
    
    # 创建必要目录
    create_directories
    
    # 停止现有服务
    stop_existing_services
    
    # 构建服务
    build_services
    
    # 启动服务
    start_services
    
    # 等待服务就绪
    wait_for_services
    
    # 执行数据库迁移
    run_migrations
    
    # 创建初始数据
    create_initial_data
    
    # 健康检查
    health_check
    
    # 显示访问信息
    show_access_info
    
    print_success "部署完成！"
}

# ============================================
# 执行主函数
# ============================================
main "$@"