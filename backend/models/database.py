"""
数据库连接模块
管理 SQLAlchemy 数据库连接和会话
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import logging

from api.config import settings

# 配置日志
logger = logging.getLogger(__name__)

# 创建数据库引擎
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    pool_pre_ping=True,  # 启用连接池预检查
    pool_recycle=3600,   # 1小时后回收连接
    connect_args={
        "check_same_thread": False  # 仅用于 SQLite
    } if settings.DATABASE_URL.startswith("sqlite") else {}
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基类
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    获取数据库会话
    
    依赖注入函数，用于在 FastAPI 路由中获取数据库会话
    
    Yields:
        Session: SQLAlchemy 会话对象
        
    Example:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"数据库会话错误: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    """
    初始化数据库
    
    创建所有表结构。建议在生产环境使用 Alembic 进行迁移管理。
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("数据库表结构初始化成功")
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
        raise


def drop_db() -> None:
    """
    删除所有数据库表
    
    警告：此操作将删除所有数据！仅用于开发环境。
    """
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("数据库表已删除")
    except Exception as e:
        logger.error(f"删除数据库表失败: {e}")
        raise


def reset_db() -> None:
    """
    重置数据库
    
    删除所有表并重新创建。警告：此操作将删除所有数据！
    """
    try:
        drop_db()
        init_db()
        logger.info("数据库已重置")
    except Exception as e:
        logger.error(f"重置数据库失败: {e}")
        raise


# 导出的对象和函数
__all__ = [
    "engine",
    "SessionLocal",
    "Base",
    "get_db",
    "init_db",
    "drop_db",
    "reset_db"
]