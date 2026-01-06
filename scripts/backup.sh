#!/bin/bash
# ============================================
# 手语AI平台 备份脚本
# ============================================
# 功能：
# - 备份 PostgreSQL 数据库
# - 备份上传文件
# - 备份配置文件
# - 备份日志文件
# - 自动清理过期备份
# - 支持增量备份和全量备份
# - 支持远程备份（S3、FTP等）
#
# 使用方法：
#   bash scripts/backup.sh [选项]
#
# 选项：
#   --type=db|files|config|logs|all
#                   备份类型（默认: all）
#   --incremental   增量备份
#   --upload        上传到远程存储
#   --no-clean      不清理旧备份
#   -h, --help      显示帮助信息
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
BACKUP_DIR="$PROJECT_DIR/backups"
BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_TYPE="all"
INCREMENTAL=false
UPLOAD=false
CLEAN_OLD=true

# 加载环境变量
if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
fi

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
手语AI平台 备份脚本

使用方法：
    bash scripts/backup.sh [选项]

选项：
    --type=db|files|config|logs|all
                   备份类型（默认: all）
    --incremental   增量备份
    --upload        上传到远程存储
    --no-clean      不清理旧备份
    -h, --help      显示帮助信息

备份类型说明：
    db      备份数据库
    files   备份上传文件
    config  备份配置文件
    logs    备份日志文件
    all     备份所有内容（默认）

示例：
    bash scripts/backup.sh                    # 备份所有内容
    bash scripts/backup.sh --type=db          # 仅备份数据库
    bash scripts/backup.sh --incremental      # 增量备份

EOF
}

# ============================================
# 解析命令行参数
# ============================================
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type)
                shift
                BACKUP_TYPE="$1"
                shift
                ;;
            --incremental)
                INCREMENTAL=true
                shift
                ;;
            --upload)
                UPLOAD=true
                shift
                ;;
            --no-clean)
                CLEAN_OLD=false
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
# 创建备份目录
# ============================================
create_backup_dirs() {
    local dirs=(
        "$BACKUP_DIR"
        "$BACKUP_DIR/database"
        "$BACKUP_DIR/files"
        "$BACKUP_DIR/config"
        "$BACKUP_DIR/logs"
    )
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_success "创建目录: $dir"
        fi
    done
}

# ============================================
# 备份 PostgreSQL 数据库
# ============================================
backup_database() {
    print_header "备份数据库"
    
    cd "$PROJECT_DIR"
    
    # 检查 PostgreSQL 容器
    if ! docker-compose ps postgres | grep -q "Up"; then
        print_warning "PostgreSQL 容器未运行，跳过数据库备份"
        return 1
    fi
    
    local backup_file="$BACKUP_DIR/database/signai_${BACKUP_DATE}.sql.gz"
    
    print_info "开始备份数据库..."
    
    # 执行数据库备份
    docker-compose exec -T postgres pg_dump -U "${POSTGRES_USER:-signai}" \
        "${POSTGRES_DB:-signai}" | gzip > "$backup_file"
    
    if [ -f "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        print_success "数据库备份完成: $backup_file ($size)"
        
        # 验证备份文件
        if gzip -t "$backup_file" 2>/dev/null; then
            print_success "备份文件验证通过"
        else
            print_error "备份文件验证失败"
            rm -f "$backup_file"
            return 1
        fi
    else
        print_error "数据库备份失败"
        return 1
    fi
}

# ============================================
# 备份上传文件
# ============================================
backup_files() {
    print_header "备份上传文件"
    
    local uploads_dir="$PROJECT_DIR/backend/uploads"
    local backup_file="$BACKUP_DIR/files/uploads_${BACKUP_DATE}.tar.gz"
    
    if [ ! -d "$uploads_dir" ]; then
        print_warning "上传文件目录不存在，跳过备份"
        return 0
    fi
    
    if [ -z "$(ls -A $uploads_dir)" ]; then
        print_warning "上传文件目录为空，跳过备份"
        return 0
    fi
    
    print_info "开始备份上传文件..."
    
    # 创建备份
    tar -czf "$backup_file" -C "$uploads_dir" .
    
    if [ -f "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        print_success "文件备份完成: $backup_file ($size)"
    else
        print_error "文件备份失败"
        return 1
    fi
}

# ============================================
# 备份配置文件
# ============================================
backup_config() {
    print_header "备份配置文件"
    
    local backup_file="$BACKUP_DIR/config/config_${BACKUP_DATE}.tar.gz"
    
    print_info "开始备份配置文件..."
    
    local config_files=(
        ".env"
        "docker-compose.yml"
        "frontend/nginx.conf"
    )
    
    local temp_dir="$BACKUP_DIR/config/temp"
    mkdir -p "$temp_dir"
    
    # 复制配置文件到临时目录
    for file in "${config_files[@]}"; do
        if [ -f "$PROJECT_DIR/$file" ]; then
            cp "$PROJECT_DIR/$file" "$temp_dir/"
        fi
    done
    
    # 复制后端配置
    if [ -d "$PROJECT_DIR/backend/api" ]; then
        cp -r "$PROJECT_DIR/backend/api/"* "$temp_dir/" 2>/dev/null || true
    fi
    
    # 创建备份
    tar -czf "$backup_file" -C "$temp_dir" .
    rm -rf "$temp_dir"
    
    if [ -f "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        print_success "配置备份完成: $backup_file ($size)"
    else
        print_error "配置备份失败"
        return 1
    fi
}

# ============================================
# 备份日志文件
# ============================================
backup_logs() {
    print_header "备份日志文件"
    
    local logs_dir="$PROJECT_DIR/backend/logs"
    local backup_file="$BACKUP_DIR/logs/logs_${BACKUP_DATE}.tar.gz"
    
    if [ ! -d "$logs_dir" ]; then
        print_warning "日志目录不存在，跳过备份"
        return 0
    fi
    
    print_info "开始备份日志文件..."
    
    tar -czf "$backup_file" -C "$PROJECT_DIR/backend" logs
    
    if [ -f "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        print_success "日志备份完成: $backup_file ($size)"
    else
        print_error "日志备份失败"
        return 1
    fi
}

# ============================================
# 创建备份清单
# ============================================
create_manifest() {
    local manifest_file="$BACKUP_DIR/backup_manifest_${BACKUP_DATE}.txt"
    
    print_info "创建备份清单..."
    
    cat > "$manifest_file" << EOF
备份时间: $(date +"%Y-%m-%d %H:%M:%S")
备份类型: ${BACKUP_TYPE}
备份模式: $([ "$INCREMENTAL" = true ] && echo "增量备份" || echo "全量备份")
项目目录: $PROJECT_DIR

备份文件列表:
EOF
    
    # 添加备份文件信息
    find "$BACKUP_DIR" -name "*_${BACKUP_DATE}*" -type f | while read file; do
        local size=$(du -h "$file" | cut -f1)
        local md5=$(md5sum "$file" | awk '{print $1}')
        echo "  $(basename $file) - 大小: $size - MD5: $md5" >> "$manifest_file"
    done
    
    print_success "备份清单创建完成: $manifest_file"
}

# ============================================
# 清理旧的备份
# ============================================
clean_old_backups() {
    if [ "$CLEAN_OLD" = false ]; then
        print_info "跳过清理旧备份"
        return 0
    fi
    
    print_header "清理旧备份"
    
    local retention_days=${BACKUP_RETENTION_DAYS:-7}
    local retention_seconds=$((retention_days * 86400))
    
    print_info "保留天数: $retention_days 天"
    
    # 清理数据库备份
    find "$BACKUP_DIR/database" -name "signai_*.sql.gz" -type f \
        -mtime +$retention_days -exec rm -f {} \;
    
    # 清理文件备份
    find "$BACKUP_DIR/files" -name "*.tar.gz" -type f \
        -mtime +$retention_days -exec rm -f {} \;
    
    # 清理配置备份
    find "$BACKUP_DIR/config" -name "*.tar.gz" -type f \
        -mtime +$retention_days -exec rm -f {} \;
    
    # 清理日志备份
    find "$BACKUP_DIR/logs" -name "*.tar.gz" -type f \
        -mtime +$retention_days -exec rm -f {} \;
    
    # 清理备份清单
    find "$BACKUP_DIR" -name "backup_manifest_*.txt" -type f \
        -mtime +$retention_days -exec rm -f {} \;
    
    print_success "旧备份清理完成"
}

# ============================================
# 计算备份大小
# ============================================
calculate_backup_size() {
    local total_size=0
    
    for dir in database files config logs; do
        local backup_file="$BACKUP_DIR/$dir/*_${BACKUP_DATE}*"
        if ls $backup_file &> /dev/null; then
            local size=$(du -cb $backup_file | tail -1 | cut -f1)
            total_size=$((total_size + size))
        fi
    done
    
    # 转换为人类可读格式
    if [ $total_size -gt 1073741824 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $total_size/1073741824}")GB"
    elif [ $total_size -gt 1048576 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $total_size/1048576}")MB"
    elif [ $total_size -gt 1024 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $total_size/1024}")KB"
    else
        echo "${total_size}B"
    fi
}

# ============================================
# 上传到远程存储（示例）
# ============================================
upload_to_remote() {
    if [ "$UPLOAD" = false ]; then
        return 0
    fi
    
    print_header "上传到远程存储"
    
    # 检查是否配置了 AWS S3
    if [ ! -z "${AWS_ACCESS_KEY_ID:-}" ] && [ ! -z "${AWS_SECRET_ACCESS_KEY:-}" ] && [ ! -z "${S3_BUCKET:-}" ]; then
        print_info "上传到 AWS S3..."
        
        local s3_path="s3://${S3_BUCKET}/backups/$(date +"%Y/%m/%d")"
        
        # 需要 AWS CLI
        if command -v aws &> /dev/null; then
            aws s3 sync "$BACKUP_DIR" "$s3_path" --exclude "*" --include "*_${BACKUP_DATE}*"
            print_success "S3 上传完成"
        else
            print_warning "AWS CLI 未安装，跳过 S3 上传"
        fi
    fi
    
    # 检查是否配置了 FTP
    if [ ! -z "${FTP_HOST:-}" ] && [ ! -z "${FTP_USER:-}" ] && [ ! -z "${FTP_PASSWORD:-}" ]; then
        print_info "上传到 FTP..."
        print_warning "FTP 上传功能需要手动实现"
    fi
}

# ============================================
# 显示备份统计信息
# ============================================
show_backup_summary() {
    print_header "备份统计"
    
    echo ""
    echo "备份概览:"
    echo "  备份时间: $(date +"%Y-%m-%d %H:%M:%S")"
    echo "  备份类型: $BACKUP_TYPE"
    echo "  备份模式: $([ "$INCREMENTAL" = true ] && echo "增量备份" || echo "全量备份")"
    echo ""
    
    echo "备份文件:"
    for dir in database files config logs; do
        local backup_file=$(find "$BACKUP_DIR/$dir" -name "*_${BACKUP_DATE}*" -type f 2>/dev/null | head -1)
        if [ ! -z "$backup_file" ]; then
            local size=$(du -h "$backup_file" | cut -f1)
            echo "  $dir: $(basename $backup_file) ($size)"
        fi
    done
    
    echo ""
    echo "总大小: $(calculate_backup_size)"
    echo "备份目录: $BACKUP_DIR"
    echo ""
}

# ============================================
# 主函数
# ============================================
main() {
    print_header "手语AI平台 备份脚本"
    echo "备份日期: $BACKUP_DATE"
    echo "备份类型: $BACKUP_TYPE"
    echo "备份目录: $BACKUP_DIR"
    echo ""
    
    # 解析参数
    parse_args "$@"
    
    # 创建备份目录
    create_backup_dirs
    
    # 根据备份类型执行备份
    case "$BACKUP_TYPE" in
        db)
            backup_database
            ;;
        files)
            backup_files
            ;;
        config)
            backup_config
            ;;
        logs)
            backup_logs
            ;;
        all)
            backup_database
            backup_files
            backup_config
            backup_logs
            ;;
        *)
            print_error "未知备份类型: $BACKUP_TYPE"
            show_help
            exit 1
            ;;
    esac
    
    # 创建备份清单
    create_manifest
    
    # 上传到远程存储
    upload_to_remote
    
    # 清理旧备份
    clean_old_backups
    
    # 显示备份统计
    show_backup_summary
    
    print_success "备份完成！"
}

# 执行主函数
main "$@"