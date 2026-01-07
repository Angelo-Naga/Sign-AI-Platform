# -*- coding: utf-8 -*-
"""
FastAPI 主应用文件
SignAI 平台后端核心服务的入口点
"""
import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# 导入配置和路由
from api.config import settings
from api.websocket import websocket_router
from api.routes import (
    sign_language_router,
    voice_router,
    clone_router,
    translation_router
)

# 导入数据库
from models import init_db

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(settings.LOG_FILE, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    
    在应用启动和关闭时执行相应的操作
    """
    # 启动时执行
    logger.info("=" * 50)
    logger.info(f"启动 {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("=" * 50)
    
    # 初始化数据库
    try:
        init_db()
        logger.info("数据库初始化成功")
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
        raise
    
    # 其他启动逻辑可以在这里添加
    logger.info("应用启动完成")
    
    yield
    
    # 关闭时执行
    logger.info("应用正在关闭...")
    logger.info("应用已关闭")


# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="手语识别与翻译平台的后端 API 服务",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)


# ==================== 中间件配置 ====================

# CORS 中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# GZip 压缩中间件
app.add_middleware(GZipMiddleware, minimum_size=1000)


# ==================== 全局异常处理 ====================

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    """
    HTTP 异常处理器
    
    Args:
        request: 请求对象
        exc: 异常对象
        
    Returns:
        JSONResponse: 标准化的错误响应
    """
    logger.error(f"HTTP 异常: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """
    请求验证异常处理器
    
    Args:
        request: 请求对象
        exc: 验证异常对象
        
    Returns:
        JSONResponse: 标准化的验证错误响应
    """
    logger.error(f"请求验证失败: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "请求参数验证失败",
            "details": exc.errors(),
            "status_code": 422
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """
    通用异常处理器
    
    Args:
        request: 请求对象
        exc: 异常对象
        
    Returns:
        JSONResponse: 标准化的错误响应
    """
    logger.error(f"未处理的异常: {type(exc).__name__} - {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "服务器内部错误",
            "status_code": 500
        }
    )


# ==================== 根路由和健康检查 ====================

@app.get("/", tags=["根路由"])
async def root():
    """
    根路由
    
    返回应用基本信息
    """
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "message": "欢迎使用 SignAI 平台 API"
    }


@app.get("/health", tags=["系统"])
async def health_check():
    """
    健康检查端点
    
    用于监控服务状态
    """
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


@app.get("/config", tags=["系统"])
async def get_config():
    """
    获取公开配置信息
    
    返回不需要保密的配置信息
    """
    return {
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
        "debug": settings.DEBUG,
        "api_prefix": settings.API_PREFIX,
        "cors_origins": settings.CORS_ORIGINS,
        "default_source_lang": settings.DEFAULT_SOURCE_LANG,
        "default_target_lang": settings.DEFAULT_TARGET_LANG
    }


# ==================== 静态文件服务 ====================

# 静态文件挂载 - 用于3D模型和资源文件
import os
from fastapi.staticfiles import StaticFiles

try:
    # 创建静态文件目录（如果不存在）
    static_dirs = ['static/models', 'static/draco', 'static/animations']
    for static_dir in static_dirs:
        full_path = os.path.join(os.path.dirname(__file__), static_dir)
        if not os.path.exists(full_path):
            os.makedirs(full_path, exist_ok=True)
    
    # 挂载静态文件目录
    app.mount("/models", StaticFiles(directory="static/models"), name="models")
    app.mount("/draco", StaticFiles(directory="static/draco"), name="draco")
    app.mount("/animations", StaticFiles(directory="static/animations"), name="animations")
    logger.info("静态文件服务已启动: /models, /draco, /animations")
except Exception as e:
    logger.error(f"静态文件服务配置失败: {e}")


# ==================== 路由挂载 ====================

# WebSocket 路由
app.include_router(websocket_router, prefix="/api/ws")

# API 路由
app.include_router(sign_language_router, prefix="/api")
app.include_router(voice_router, prefix="/api")
app.include_router(clone_router, prefix="/api")
app.include_router(translation_router, prefix="/api")


# ==================== 启动说明 ====================

if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"正在启动 {settings.APP_NAME}...")
    logger.info(f"API 文档地址: http://localhost:8000/docs")
    logger.info(f"健康检查地址: http://localhost:8000/health")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )


# 导出应用实例（用于测试和导入）
__all__ = ["app"]