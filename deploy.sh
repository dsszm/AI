#!/bin/bash
set -e

echo "======================================"
echo "  Console AI 一键部署脚本"
echo "======================================"

PROJECT_DIR="/opt/console-ai"
DOMAIN="dsszm.cn"

echo ""
echo "[1/7] 检查系统环境..."
if command -v yum &> /dev/null; then
    PKG_MANAGER="yum"
    echo "  检测到 CentOS/RHEL 系统"
elif command -v apt &> /dev/null; then
    PKG_MANAGER="apt"
    echo "  检测到 Ubuntu/Debian 系统"
elif command -v apk &> /dev/null; then
    PKG_MANAGER="apk"
    echo "  检测到 Alpine 系统"
else
    echo "❌ 不支持的系统"
    exit 1
fi

echo ""
echo "[2/7] 安装基础依赖..."
if [ "$PKG_MANAGER" = "apt" ]; then
    apt update
    apt install -y curl git wget
elif [ "$PKG_MANAGER" = "yum" ]; then
    yum install -y curl git wget
elif [ "$PKG_MANAGER" = "apk" ]; then
    apk add curl git wget
fi

echo ""
echo "[3/7] 安装 Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | bash
    systemctl start docker
    systemctl enable docker
    echo "  Docker 安装完成"
else
    echo "  Docker 已安装"
fi

echo ""
echo "[4/7] 安装 Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    if ! docker compose version &> /dev/null; then
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        echo "  Docker Compose 安装完成"
    else
        echo "  Docker Compose (v2) 已安装"
    fi
else
    echo "  Docker Compose 已安装"
fi

echo ""
echo "[5/7] 克隆项目代码..."
mkdir -p /opt
cd /opt
if [ -d "$PROJECT_DIR" ]; then
    echo "  项目已存在，更新代码..."
    cd "$PROJECT_DIR"
    git pull
else
    echo "  克隆项目..."
    git clone https://github.com/dsszm/AI.git "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

echo ""
echo "[6/7] 配置环境变量..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "  已创建 .env 文件，请后续手动配置"
else
    echo "  .env 已存在"
fi

echo ""
echo "[7/7] 启动服务..."
mkdir -p ssl api/data api/data/uploads

if [ -f "ssl/fullchain.pem" ] && [ -f "ssl/privkey.pem" ]; then
    echo "  检测到 SSL 证书，启用 HTTPS"
    HAS_SSL=true
else
    echo "  未检测到 SSL 证书，使用 HTTP"
    HAS_SSL=false
fi

DOCKER_COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
fi

$DOCKER_COMPOSE_CMD up -d --build

echo ""
echo "======================================"
echo "  ✅ 部署完成！"
echo "======================================"
echo ""
echo "  项目目录: $PROJECT_DIR"
echo "  访问地址: http://$DOMAIN"
echo ""
echo "  常用命令:"
echo "    cd $PROJECT_DIR"
echo "    docker-compose ps        # 查看状态"
echo "    docker-compose logs -f   # 查看日志"
echo "    docker-compose restart  # 重启服务"
echo "    docker-compose down     # 停止服务"
echo ""
if [ "$HAS_SSL" = false ]; then
    echo "  ⚠️  未配置 SSL 证书"
    echo "  请将证书放入 ssl/ 目录后重启:"
    echo "    cp fullchain.pem ssl/"
    echo "    cp privkey.pem ssl/"
    echo "    docker-compose restart nginx"
    echo ""
fi
echo "======================================"