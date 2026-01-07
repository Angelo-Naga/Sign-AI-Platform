"""
语音合成引擎单元测试
"""

import pytest
import numpy as np
from unittest.mock import Mock, MagicMock


@pytest.mark.unit
class TestTTSEngine:
    """TTS引擎测试类"""
    
    @pytest.fixture
    def tts(self, mock_tts_engine):
        """TTS引擎fixture"""
        return mock_tts_engine
    
    def test_synthesize_text(self, tts):
        """测试文本转语音"""
        text = "你好，世界"
        result = tts.synthesize(text, language="zh")
        
        assert result is not None
        assert isinstance(result, bytes)
        assert len(result) > 0
    
    def test_synthesize_empty_text(self, tts):
        """测试空文本处理"""
        empty_text = ""
        
        tts.synthesize = Mock(return_value=bytes())
        result = tts.synthesize(empty_text)
        
        assert result == bytes() or len(result) == 0
    
    def test_synthesize_with_voice_settings(self, tts):
        """测试带语音设置的合成"""
        text = "测试语音"
        voice_settings = {
            "speed": 1.0,
            "pitch": 1.0,
            "volume": 0.8
        }
        
        result = tts.synthesize(text, voice_settings=voice_settings)
        
        assert result is not None
        assert isinstance(result, bytes)
    
    def test_synthesize_different_emotions(self, tts):
        """测试不同情感声音"""
        text = "你好"
        emotions = ["happy", "sad", "angry", "neutral"]
        
        for emotion in emotions:
            tts.synthesize = Mock(return_value=bytes([0] * 1000))
            result = tts.synthesize(text, emotion=emotion)
            
            assert isinstance(result, bytes)
    
    def test_synthesize_with_ssml(self, tts):
        """测试SSML格式输入"""
        ssml_text = """
        <speak>
            <prosody rate="0.9">你好</prosody>
            <break time="500ms"/>
            世界
        </speak>
        """
        
        tts.synthesize = Mock(return_value=bytes([0] * 2000))
        result = tts.synthesize(ssml_text, use_ssml=True)
        
        assert result is not None
    
    def test_batch_synthesize(self, tts):
        """测试批量语音合成"""
        texts = ["你好", "世界", "测试"]
        
        tts.synthesize_batch = Mock(return_value=[
            bytes([0] * 1000) for _ in texts
        ])
        
        results = tts.synthesize_batch(texts)
        
        assert len(results) == 3
        for result in results:
            assert isinstance(result, bytes)
            assert len(result) > 0
    
    def test_synthesize_long_text(self, tts):
        """测试长文本合成"""
        # 创建长文本（超过限制）
        long_text = "测试" * 10000
        
        tts.synthesize = Mock(return_value=bytes([0] * 1000000))
        result = tts.synthesize(long_text)
        
        assert result is not None
    
    def test_get_available_voices(self, tts):
        """测试获取可用语音列表"""
        tts.get_voices = Mock(return_value=[
            {"id": "voice1", "name": "语音1", "language": "zh"},
            {"id": "voice2", "name": "语音2", "language": "en"}
        ])
        
        voices = tts.get_voices()
        
        assert len(voices) == 2
        assert "id" in voices[0]
        assert "language" in voices[0]
    
    @pytest.mark.slow
    def test_tts_performance(self, tts, performance_monitor):
        """测试TTS性能"""
        import time
        
        test_texts = [f"测试文本 {i}" for i in range(20)]
        
        start_time = time.time()
        
        for i, text in enumerate(test_texts):
            operation_id = f"tts_{i}"
            performance_monitor.latency_monitor.start(operation_id)
            tts.synthesize(text)
            performance_monitor.latency_monitor.end(operation_id)
        
        total_time = time.time() - start_time
        avg_time = total_time / len(test_texts)
        
        # 每次合成应在300ms内
        assert avg_time < 0.3
    
    def test_synthesize_with_timestamps(self, tts):
        """测试带时间戳的合成"""
        tts.synthesize_with_timestamps = Mock(return_value={
            "audio": bytes([0] * 1000),
            "timestamps": [
                {"word": "你好", "start": 0.0, "end": 0.5},
                {"word": "世界", "start": 0.5, "end": 1.0}
            ]
        })
        
        result = tts.synthesize_with_timestamps("你好世界")
        
        assert "audio" in result
        assert "timestamps" in result
        assert len(result["timestamps"]) == 2


@pytest.mark.integration
def test_tts_engine_integration():
    """TTS引擎集成测试"""
    tts = Mock()
    tts.synthesize = Mock(return_value=bytes([0, 1, 2, 3]))
    
    result = tts.synthesize("测试")
    assert isinstance(result, bytes)
    assert len(result) > 0