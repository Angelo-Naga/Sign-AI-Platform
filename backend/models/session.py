"""
会话模型模块
定义用户会话相关的数据库模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from models.database import Base


class Session(Base):
    """
    用户会话模型
    
    存储用户登录会话信息，用于会话管理和追踪
    """
    
    __tablename__ = "user_sessions"
    
    # 基础字段
    id = Column(Integer, primary_key=True, index=True, comment="会话ID")
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="用户ID")
    
    # 会话信息
    session_token = Column(String(255), unique=True, index=True, nullable=False, comment="会话令牌")
    refresh_token = Column(String(255), unique=True, index=True, nullable=True, comment="刷新令牌")
    
    # 设备和位置信息
    device_type = Column(String(50), nullable=True, comment="设备类型")
    device_name = Column(String(255), nullable=True, comment="设备名称")
    browser = Column(String(100), nullable=True, comment="浏览器类型")
    os = Column(String(50), nullable=True, comment="操作系统")
    ip_address = Column(String(50), nullable=True, comment="IP地址")
    location = Column(String(255), nullable=True, comment="位置信息")
    
    # 状态字段
    is_active = Column(Boolean, default=True, nullable=False, comment="是否活跃")
    user_agent = Column(Text, nullable=True, comment="用户代理信息")
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="创建时间")
    expires_at = Column(DateTime, nullable=False, comment="过期时间")
    last_activity = Column(DateTime, default=datetime.utcnow, nullable=False, comment="最后活动时间")
    
    # 关系
    user = relationship("User", back_populates="sessions")
    
    # 索引
    __table_args__ = (
        Index('idx_session_user_active', 'user_id', 'is_active'),
        Index('idx_session_expires', 'expires_at'),
        Index('idx_session_token_active', 'session_token', 'is_active'),
    )
    
    def __repr__(self) -> str:
        """字符串表示"""
        return f"<Session(id={self.id}, user_id={self.user_id}, is_active={self.is_active})>"
    
    def is_expired(self) -> bool:
        """
        检查会话是否已过期
        
        Returns:
            bool: 是否已过期
        """
        return datetime.utcnow() > self.expires_at
    
    def update_last_activity(self) -> None:
        """更新最后活动时间"""
        self.last_activity = datetime.utcnow()
    
    def to_dict(self) -> dict:
        """
        转换为字典格式
        
        Returns:
            dict: 会话信息的字典表示
        """
        return {
            "id": self.id,
            "user_id": self.user_id,
            "session_token": self.session_token,
            "refresh_token": self.refresh_token,
            "device_type": self.device_type,
            "device_name": self.device_name,
            "browser": self.browser,
            "os": self.os,
            "ip_address": self.ip_address,
            "location": self.location,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "last_activity": self.last_activity.isoformat() if self.last_activity else None,
        }
    
    def to_safe_dict(self) -> dict:
        """
        转换为安全的字典格式（不包含敏感信息）
        
        Returns:
            dict: 会话信息的安全字典表示
        """
        return {
            "id": self.id,
            "device_type": self.device_type,
            "device_name": self.device_name,
            "browser": self.browser,
            "os": self.os,
            "ip_address": self.ip_address,
            "location": self.location,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "last_activity": self.last_activity.isoformat() if self.last_activity else None,
            "is_expired": self.is_expired(),
        }


# 导出的模型
__all__ = ["Session"]