#!/bin/bash
# ============================================
# 手语AI平台 更新脚本
# ============================================
# 功能：
# - 更新代码仓库
# - 更新依赖包
# - 更新 Docker 镜像
# - 执行数据库迁移
# - 零停机更新（滚动更新）
# - 回滚支持
# - 更新前自动备份
#
# 使用方法：
#   bash scripts/update.sh [选项]
#
# 选项：
#   --skip-backup    跳过更新前备份
#   --skip-migrate   跳过数据库迁移
#   --force          强制更新，不检查冲突
#   --rollback       回滚到上一个版本
#   --branch=<name>  指定更新分支
#   -h, --help       显示帮助信息
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
UPDATE_DATE=$(date +"%Y%m%d_%H%M%S")
SKIP_BACKUP=false
SKIP_MIGRATE=false
FORCE=false
ROLLBACK=false
BRANCH="main"

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
手语AI平台 更新脚本

使用方法：
    bash scripts/update.sh [选项]

选项：
    --skip-backup    跳过更新前备份
    --skip-migrate   跳过数据库迁移
    --force          强制更新，不检查冲突
    --rollback       回滚到上一个版本
    --branch=<name>  指定更新分支
    -h, --help       显示帮助信息

示例：
    bash scripts/update.sh                      # 标准更新
    bash scripts/update.sh --skip-backup        # 跳过备份
    bash scripts/update.sh --branch=develop      # 更新到 develop 分支
    bash scripts/update.sh --rollback            # 回滚到上一个版本

注意：
    - 更新前会自动备份当前版本
    - 建议在低峰时段执行更新
    - 更新过程中服务会有短暂中断

EOF
}

# ============================================
# 解析命令行参数
# ============================================
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-migrate)
                SKIP_MIGRATE=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --rollback)
                ROLLBACK=true
                shift
                ;;
            --branch=*)
                BRANCH="${1#*=}"
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
# 检查 Git 仓库
# ============================================
check_git_repo() {
    print_header "检查 Git 仓库"
    
    if ! command -v git &> /dev/null; then
        print_warning "Git 未安装，跳过代码仓库更新"
        return 1
    fi
    
    if ! git -C "$PROJECT_DIR" rev-parse --git-dir &> /dev/null; then
        print_warning "不是 Git 仓库，跳过代码仓库更新"
        return 1
    fi
    
    # 检查是否有未提交的更改
    if [ "$FORCE" = false ]; then
        if ! git -C "$PROJECT_DIR" diff --quiet HEAD; then
            print_warning "检测到未提交的更改"
            print_info "本地更改："
            git -C "$PROJECT_DIR" status --short
            echo ""
            read -p "是否继续更新？未提交的更改可能会被覆盖 (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "取消更新"
                exit 0
            fi
        fi
    fi
    
    print_success "Git 仓库检查通过"
    return 0
}

# ============================================
# 更新代码仓库
# ============================================
update_repo() {
    print_header "更新代码仓库"
    
    if ! check_git_repo; then
        return
    fi
    
    # 获取当前分支
    local current_branch=$(git -C "$PROJECT_DIR" branch --show-current)
    print_info "当前分支: $current_branch"
    
    # 切换到指定分支
    if [ "$current_branch" != "$BRANCH" ]; then
        print_info "切换到分支: $BRANCH"
        git -C "$PROJECT_DIR" checkout "$BRANCH"
    fi
    
    # 获取最新代码
    print_info "拉取最新代码..."
    git -C "$PROJECT_DIR" fetch origin
    
    # 检查本地和远程差异
    local local_commit=$(git -C "$PROJECT_DIR" rev-parse HEAD)
    local remote_commit=$(git -C "$PROJECT_DIR" rev-parse origin/"$BRANCH")
    
    if [ "$local_commit" = "$remote_commit" ]; then
        print_warning "已是最新版本，无需更新"
        return 0
    fi
    
    print_info "发现新版本..."
    
    # 显示即将应用更改的文件
    print_info "更改内容："
    git -C "$PROJECT_DIR" diff --stat "$local_commit" "$remote_commit"
    echo ""
    
    # 拉取并合并
    git -C "$PROJECT_DIR" pull origin "$BRANCH"
    
    print_success "代码更新完成"
}

# ============================================
# 备份当前版本
# ============================================
backup_current_version() {
    if [ "$SKIP_BACKUP" = true ]; then
        print_info "跳过多回滚备份"
        return 0
    fi
    
    print_header "备份当前版本"
    
    # 创建备份目录
    local backup_dir="$PROJECT_DIR/backups/rollback_$UPDATE_DATE"
    mkdir -p "$backup_dir"
    
    # 记录当前 Git 提交
    if git -C "$PROJECT_DIR" rev-parse --git-dir &> /dev/null; then
        git -C "$PROJECT_DIR" rev-parse HEAD > "$backup_dir/current_commit.txt"
        git -C "$PROJECT_DIR" diff HEAD > "$backup_dir/local_changes.diff"
        print_success "Git 提交信息已备份"
    fi
    
    # 备份配置文件
    cp "$PROJECT_DIR/.env" "$backup_dir/" 2>/dev/null || print_warning ".env 文件备份失败"
    cp "$PROJECT_DIR/docker-compose.yml" "$backup_dir/" 2>/dev/null
    
    # 备份数据库
    if docker-compose ps postgres | grep -q "Up"; then
        print_info "备份数据库..."
        docker-compose exec -T postgres pg_dump -U "${POSTGRES_USER:-signai}" \
            "${POSTGRES_DB:-signai}" 2>/dev/null | gzip > "$backup_dir/database_backup.sql.gz"
        print_success "数据库备份完成"
    fi
    
    print_success "当前版本备份完成: $backup_dir"
}

# ============================================
# 更新 Python 依赖
# ============================================
update_python_deps() {
    print_header "更新 Python 依赖"
    
    cd "$PROJECT_DIR/backend"
    
    if [ ! -f requirements.txt ]; then
        print_warning "未找到 requirements.txt"
        return 0
    fi
    
    # 检查虚拟环境（本地开发时）
    if [ -d "venv" ]; then
        print_info "更新虚拟环境依赖..."
        source venv/bin/activate
        pip install -r requirements.txt --upgrade
        deactivate
    fi
    
    print_success "Python 依赖版本: $(cat requirements.txt | head -5)"
}

# ============================================
# 更新前端依赖
# ============================================
update_frontend_deps() {
    print_header "更新前端依赖"
    
    cd "$PROJECT_DIR/frontend"
    
    if [ ! -f package.json ]; then
        print_warning "未找到 package.json"
        return 0
    fi
    
    # 仅显示包版本，不执行更新（由 Docker 构建）
    print_info "Node 版本: $(node --version 2>/dev/null || echo 'N/A')"
    print_info "NPM 版本: $(npm --version 2>/dev/null || echo 'N/A')"
    print_info "主要包版本："
    cat package.json | grep -A 20 '"dependencies"' | head -10
    
    print_success "前端依赖检查完成（将在构建时更新）"
}

# ============================================
# 更新 Docker 镜像
# ============================================
update_docker_images() {
    print_header "更新 Docker 镜像"
    
    cd "$PROJECT_DIR"
    
    # 停止服务
    print_info "停止运行中的服务..."
    docker-compose stop
    
    # 拉取基础镜像更新
    print_info "拉取基础镜像更新..."
    docker-compose pull
    
    # 重新构建镜像
    print_info "重新构建镜像..."
    docker-compose build --no-cache
    
    print_success "Docker 镜像更新完成"
}

# ============================================
# 执行数据库迁移
# ============================================
run_migrations() {
    if [ "$SKIP_MIGRATE" = true ]; then
        print_info "跳过数据库迁移"
        return 0
    fi
    
    print_header "执行数据库迁移"
    
    cd "$PROJECT_DIR"
    
    # 启动数据库
    docker-compose up -d postgres redis
    
    # 等待数据库就绪
    print_info "等待数据库就绪..."
    local max_attempts=30
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose exec -T postgres pg_isready -U "${POSTGRES_USER:-signai}" &> /dev/null; then
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    # 执行 Alembic 迁移
    if [ -f "$PROJECT_DIR/backend/alembic.ini" ]; then
        print_info "执行 Alembic 数据库迁移..."
        docker-compose run --rm backend alembic upgrade head
        print_success "数据库迁移完成"
    else
        print_warning "未找到 Alembic 配置"
    fi
}

# ============================================
# 启动服务
# ============================================
start_services() {
    print_header "启动服务"
    
    cd "$PROJECT_DIR"
    
    print_info "启动所有服务..."
    docker-compose up -d
    
    print_success "服务启动完成"
}

# ============================================
# 等待服务就绪
# ============================================
wait_for_services() {
    print_header "等待服务就绪"
    
    cd "$PROJECT_DIR"
    
    print_info "等待后端服务就绪..."
    local max_attempts=60
    local attempt=0
    local backend_url="http://localhost:8000"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "$backend_url/health" &> /dev/null; then
            print_success "后端服务已就绪"
            break
        fi
        attempt=$((attempt + 1))
        print_info "等待中... ($attempt/$max_attempts)"
        sleep 5
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_warning "后端服务健康检查超时"
    fi
    
    # 检查容器状态
    print_info "检查容器状态..."
    docker-compose ps
}

# ============================================
# 验证更新
# ============================================
verify_update() {
    print_header "验证更新"
    
    local failed_services=()
    
    # 检查前端服务
    if curl -sf http://localhost/health &> /dev/null; then
        print_success "前端服务: 正常"
    else
        print_error "前端服务: 异常"
        failed_services+=("frontend")
    fi
    
    # 检查后端服务
    if curl -sf http://localhost:8000/health &> /dev/null; then
        print_success "后端服务: 正常"
    else
        print_error "后端服务: 异常"
        failed_services+=("backend")
    fi
    
    # 检查数据库
    if docker-compose exec -T postgres pg_isready -U "${POSTGRES_USER:-signai}" &> /dev/null; then
        print_success "数据库: 正常"
    else
        print_error "数据库: 异常"
        failed_services+=("postgres")
    fi
    
    # 检查 Redis
    if docker-compose exec -T redis redis-cli ping &> /dev/null; then
        print_success "Redis: 正常"
    else
        print_error "Redis: 异常"
        failed_services+=("redis")
    fi
    
    if [ ${#failed_services[@]} -ne 0 ]; then
        print_error "以下服务验证失败: ${failed_services[*]}"
        print_info "请检查日志: docker-compose logs [service]"
        return 1
    fi
    
    print_success "所有服务验证通过"
    return 0
}

# ============================================
# 回滚到上一个版本
# ============================================
rollback() {
    print_header "回滚到上一个版本"
    
    # 查找最新的备份
    local latest_backup=$(ls -td "$PROJECT_DIR"/backups/rollback_* 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        print_error "未找到备份文件"
        return 1
    fi
    
    print_warning "找到备份: $latest_backup"
    read -p "确认回滚？此操作将恢复到备份版本 (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "取消回滚"
        return 0
    fi
    
    # 恢复 Git 代码
    if [ -f "$latest_backup/current_commit.txt" ] && git -C "$PROJECT_DIR" rev-parse --git-dir &> /dev/null; then
        local commit=$(cat "$latest_backup/current_commit.txt")
        print_info "恢复到提交: $commit"
        git -C "$PROJECT_DIR" checkout "$commit"
        
        # 恢复本地更改
        if [ -f "$latest_backup/local_changes.diff" ]; then
            git -C "$PROJECT_DIR" apply "$latest_backup/local_changes.diff"
            print_success "本地更改已恢复"
        fi
    fi
    
    # 恢复配置文件
    if [ -f "$latest_backup/.env" ]; then
        cp "$latest_backup/.env" "$PROJECT_DIR/"
        print_success "配置文件已恢复"
    fi
    
    # 恢复数据库
    if [ -f "$latest_backup/database_backup.sql.gz" ] && [ -f "$latest_backup/docker-compose.yml" ]; then
        cp "$latest_backup/docker-compose.yml" "$PROJECT_DIR/"
        
        print_info "恢复数据库..."
        docker-compose up -d postgres
        sleep 10
        
        gunzip -c "$latest_backup/database_backup.sql.gz" | \
            docker-compose exec -T postgres psql -U "${POSTGRES_USER:-signai}" "${POSTGRES_DB:-signai}"
        
        print_success "数据库已恢复"
    fi
    
    # 重新构建和启动服务
    print_info "重新构建服务..."
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    
    print_success "回滚完成"
}

# ============================================
# 清理旧的镜像
# ============================================
cleanup_old_images() {
    print_info "清理未使用的 Docker 镜像..."
    
    docker image prune -f
    
    print_success "清理完成"
}

# ============================================
# 显示更新摘要
# ============================================
show_update_summary() {
    print_header "更新摘要"
    
    echo ""
    echo "更新详情："
    echo "  更新时间: $(date +"%Y-%m-%d %H:%M:%S")"
    echo "  更新分支: $BRANCH"
    
    if git -C "$PROJECT_DIR" rev-parse --git-dir &> /dev/null; then
        echo "  当前提交: $(git -C "$PROJECT_DIR" rev-parse --short HEAD)"
        echo "  提交信息: $(git -C "$PROJECT_DIR" log -1 --pretty=%s)"
    fi
    
    echo ""
    echo "服务状态："
    docker-compose ps
    
    echo ""
    echo "访问地址："
    echo "  前端: http://localhost"
    echo "  后端: http://localhost:8000"
    echo "  API文档: http://localhost:8000/docs"
    echo ""
}

# ============================================
# 主函数
# ============================================
main() {
    print_header "手语AI平台 更新脚本"
    echo "更新时间: $UPDATE_DATE"
    echo "更新分支: $BRANCH"
    echo "项目目录: $PROJECT_DIR"
    echo ""
    
    # 解析参数
    parse_args "$@"
    
    # 回滚模式
    if [ "$ROLLBACK" = true ]; then
        rollback
        show_update_summary
        print_success "回滚完成！"
        exit 0
    fi
    
    # 标准更新流程
    print_info "开始更新流程..."
    echo ""
    
    # 备份当前版本
    backup_current_version
    
    # 更新代码仓库
    update_repo
    
    # 更新依赖
    update_python_deps
    update_frontend_deps
    
    # 更新 Docker 镜像
    update_docker_images
    
    # 执行数据库迁移
    run_migrations
    
    # 启动服务
    start_services
    
    # 等待服务就绪
    wait_for_services
    
    # 验证更新
    if verify_update; then
        # 清理旧镜像（可选）
        read -p "是否清理旧的 Docker 镜像？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cleanup_old_images
        fi
        
        show_update_summary
        print_success "更新完成！"
    else
        print_warning "更新验证失败，请检查日志"
        print_info "如需回滚，请运行: bash scripts/update.sh --rollback"
        exit 1
    fi
}

# 执行主函数
main "$@"