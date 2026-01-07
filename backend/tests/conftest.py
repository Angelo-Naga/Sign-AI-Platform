"""
pytest配置文件
定义fixtures和测试配置
"""

import pytest
import torch
from pathlib import Path
import sys
from unittest.mock import Mock, patch, MagicMock

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


@pytest.fixture
def mock_model():
    """创建模拟模型"""
    model = Mock()
    model.to = Mock(return_value=model)
    model.half = Mock(return_value=model)
    return model


@pytest.fixture
def mock_hand_detector():
    """创建模拟手部检测器"""
    detector = Mock()
    detector.detect_hands = Mock(return_value=[
        {"left": {"bbox": [100, 100, 50, 50]}, "right": {"bbox": [200, 100, 50, 50]}}
    ])
    return detector


@pytest.fixture
def mock_sign_recognizer():
    """创建模拟手语识别器"""
    recognizer = Mock()
    recognizer.recognize = Mock(return_value={
        "sign": "你好",
        "confidence": 0.95,
        "landmarks": [0.1, 0.2, 0.3]
    })
    return recognizer


@pytest.fixture
def mock_whisper_asr():
    """创建模拟语音识别器"""
    asr = Mock()
    asr.transcribe = Mock(return_value={
        "text": "你好，世界",
        "language": "zh",
        "segments": []
    })
    return asr


@pytest.fixture
def mock_tts_engine():
    """创建模拟语音合成引擎"""
    tts = Mock()
    tts.synthesize = Mock(return_value=bytes([0, 1, 2, 3]))
    return tts


@pytest.fixture
def mock_voice_cloner():
    """创建模拟声音克隆器"""
    cloner = Mock()
    cloner.clone_voice = Mock(return_value={
        "success": True,
        "audio_bytes": bytes([0, 1, 2, 3])
    })
    cloner.save_speaker_embedding = Mock(return_value=True)
    return cloner


@pytest.fixture
def mock_translator():
    """创建模拟翻译器"""
    translator = Mock()
    translator.translate = Mock(return_value={
        "text": "Hello, World",
        "source_lang": "zh",
        "target_lang": "en"
    })
    return translator


@pytest.fixture
def sample_audio_data():
    """创建示例音频数据"""
    import numpy as np
    # 创建1秒的16kHz单声道音频
    sample_rate = 16000
    duration = 1.0
    audio = np.random.randn(int(sample_rate * duration)).astype(np.float32)
    return {
        "audio": audio,
        "sample_rate": sample_rate,
        "duration": duration
    }


@pytest.fixture
def sample_video_frame():
    """创建示例视频帧"""
    import numpy as np
    # 创建640x480 RGB图像
    frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    return frame


@pytest.fixture
def landmarks_data():
    """创建关键点数据"""
    # 模拟手部关键点数据
    left_hand = [
        {"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)
    ]
    right_hand = [
        {"x": 0.8, "y": 0.2, "z": 0.0} for _ in range(21)
    ]
    return {
        "left": left_hand,
        "right": right_hand
    }


@pytest.fixture
def temp_dir(tmp_path):
    """创建临时目录"""
    import tempfile
    import os
    
    temp_dir = tmp_path / "test_data"
    temp_dir.mkdir()
    return temp_dir


@pytest.fixture
def mock_database():
    """创建模拟数据库"""
    db = MagicMock()
    db.session = MagicMock()
    db.add = MagicMock()
    db.commit = MagicMock()
    db.query = MagicMock()
    db.delete = MagicMock()
    db.rollback = MagicMock()
    return db


@pytest.fixture
def mock_redis():
    """创建模拟Redis客户端"""
    redis = Mock()
    redis.get = Mock(return_value=None)
    redis.set = Mock(return_value=True)
    redis.delete = Mock(return_value=True)
    redis.exists = Mock(return_value=False)
    return redis


@pytest.fixture
def app_config():
    """应用配置"""
    return {
        "host": "0.0.0.0",
        "port": 8000,
        "debug": False,
        "model_path": "models/",
        "cache_enabled": True,
        "gpu_enabled": False,
        "batch_size": 4
    }


@pytest.fixture
def performance_monitor():
    """性能监控器fixture"""
    from utils.performance_monitor import PerformanceReporter
    return PerformanceReporter()


@pytest.fixture
def performance_optimizer():
    """性能优化器fixture"""
    from utils.performance_optimizer import PerformanceOptimizer
    return PerformanceOptimizer()


# Pytest标记
pytest_plugins = ["pytest_asyncio"]


# 测试配置
def pytest_configure(config):
    """配置pytest"""
    config.addinivalue_line(
        "markers", "slow: 标记慢速测试"
    )
    config.addinivalue_line(
        "markers", "gpu: 标记需要GPU的测试"
    )
    config.addinivalue_line(
        "markers", "integration: 标记集成测试"
    )
    config.addinivalue_line(
        "markers", "unit: 标记单元测试"
    )


# 异步测试支持
@pytest.fixture
def event_loop():
    """创建事件循环"""
    import asyncio
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()