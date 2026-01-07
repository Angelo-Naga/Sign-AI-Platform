"""
API 路由模块
导出所有 API 路由
"""

# 导入各个功能模块的路由
from .sign_language import router as sign_language_router
from .voice import router as voice_router
from .clone import router as clone_router
from .translation import router as translation_router

# 导出所有路由
__all__ = [
    "sign_language_router",
    "voice_router",
    "clone_router",
    "translation_router",
]