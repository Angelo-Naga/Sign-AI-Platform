"""
配置管理模块
管理应用的所有配置，包括数据库、Redis、模型路径等
"""
import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field
from fastapi import WebSocket


class Settings(BaseSettings):
    """应用配置类"""
    
    # 应用基础配置
    APP_NAME: str = "SignAI Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = Field(default=True, description="调试模式")
    
    # 数据库配置
    DATABASE_URL: str = Field(
        default="sqlite:///./signai.db",
        description="数据库连接URL"
    )
    DATABASE_ECHO: bool = Field(default=False, description="是否输出SQL日志")
    
    # Redis 配置
    REDIS_HOST: str = Field(default="localhost", description="Redis主机地址")
    REDIS_PORT: int = Field(default=6379, description="Redis端口")
    REDIS_DB: int = Field(default=0, description="Redis数据库编号")
    REDIS_PASSWORD: Optional[str] = Field(default=None, description="Redis密码")
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis连接URL"
    )
    
    # 模型路径配置
    MODEL_BASE_PATH: str = Field(
        default="./models",
        description="模型基础路径"
    )
    SIGN_LANGUAGE_MODEL_PATH: str = Field(
        default="./models/sign_language",
        description="手语识别模型路径"
    )
    VOICE_RECOGNITION_MODEL_PATH: str = Field(
        default="./models/whisper",
        description="语音识别模型路径"
    )
    VOICE_CLONE_MODEL_PATH: str = Field(
        default="./models/voice_clone",
        description="声音克隆模型路径"
    )
    TRANSLATION_MODEL_PATH: str = Field(
        default="./models/translation",
        description="翻译模型路径"
    )
    
    # API 配置
    API_PREFIX: str = "/api"
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"],
        description="允许的CORS源"
    )
    CORS_ALLOW_CREDENTIALS: bool = Field(default=True, description="允许凭据")
    CORS_ALLOW_METHODS: List[str] = Field(
        default=["*"],
        description="允许的HTTP方法"
    )
    CORS_ALLOW_HEADERS: List[str] = Field(
        default=["*"],
        description="允许的HTTP头"
    )
    
    # JWT 配置
    SECRET_KEY: str = Field(
        default="your-secret-key-change-in-production",
        description="JWT密钥"
    )
    ALGORITHM: str = Field(default="HS256", description="JWT算法")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        description="访问令牌过期时间（分钟）"
    )
    
    # 文件上传配置
    MAX_UPLOAD_SIZE: int = Field(default=10 * 1024 * 1024, description="最大上传大小（字节）")
    ALLOWED_VIDEO_FORMATS: List[str] = Field(
        default=["mp4", "avi", "mov", "mkv"],
        description="允许的视频格式"
    )
    ALLOWED_AUDIO_FORMATS: List[str] = Field(
        default=["mp3", "wav", "ogg", "m4a"],
        description="允许的音频格式"
    )
    
    # WebSocket 配置
    WS_HEARTBEAT_INTERVAL: int = Field(default=30, description="WebSocket心跳间隔（秒）")
    WS_MAX_CONNECTIONS: int = Field(default=100, description="最大WebSocket连接数")
    
    # 日志配置
    LOG_LEVEL: str = Field(default="INFO", description="日志级别")
    LOG_FILE: str = Field(default="./logs/app.log", description="日志文件路径")
    
    # 翻译配置
    DEFAULT_SOURCE_LANG: str = Field(default="zh", description="默认源语言")
    DEFAULT_TARGET_LANG: str = Field(default="en", description="默认目标语言")
    
    class Config:
        """配置类"""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# 全局配置实例
settings = Settings()


class ConnectionManager:
    """
    WebSocket 连接管理器
    管理所有活跃的 WebSocket 连接，支持广播消息
    """
    
    def __init__(self):
        """初始化连接管理器"""
        self.active_connections: dict[str, WebSocket] = {}
        self.connection_count: int = 0
        
    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        """
        接受新的 WebSocket 连接
        
        Args:
            websocket: WebSocket 连接对象
            client_id: 客户端唯一标识
        """
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.connection_count += 1
        
    def disconnect(self, client_id: str) -> None:
        """
        断开 WebSocket 连接
        
        Args:
            client_id: 客户端唯一标识
        """
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            self.connection_count -= 1
            
    async def send_personal_message(self, message: dict, client_id: str) -> bool:
        """
        发送个人消息给指定客户端
        
        Args:
            message: 消息内容（字典格式）
            client_id: 客户端唯一标识
            
        Returns:
            bool: 是否发送成功
        """
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(message)
                return True
            except Exception:
                # 发送失败，移除连接
                self.disconnect(client_id)
                return False
        return False
        
    async def broadcast(self, message: dict, exclude_client_id: Optional[str] = None) -> None:
        """
        广播消息给所有连接的客户端
        
        Args:
            message: 消息内容（字典格式）
            exclude_client_id: 要排除的客户端ID（可选）
        """
        disconnected_clients = []
        for client_id, connection in self.active_connections.items():
            if exclude_client_id and client_id == exclude_client_id:
                continue
            try:
                await connection.send_json(message)
            except Exception:
                disconnected_clients.append(client_id)
                
        # 清理断开的连接
        for client_id in disconnected_clients:
            self.disconnect(client_id)
            
    def get_connection_count(self) -> int:
        """
        获取当前活跃连接数
        
        Returns:
            int: 活跃连接数
        """
        return self.connection_count
        
    def is_connected(self, client_id: str) -> bool:
        """
        检查客户端是否连接
        
        Args:
            client_id: 客户端唯一标识
            
        Returns:
            bool: 是否连接
        """
        return client_id in self.active_connections
        
    def get_all_client_ids(self) -> List[str]:
        """
        获取所有连接的客户端ID
        
        Returns:
            List[str]: 客户端ID列表
        """
        return list(self.active_connections.keys())


# 全局 WebSocket 连接管理器实例
manager = ConnectionManager()