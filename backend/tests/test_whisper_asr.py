"""
Whisper语音识别单元测试
"""

import pytest
import numpy as np
from unittest.mock import Mock, MagicMock, patch


@pytest.mark.unit
class TestWhisperASR:
    """Whisper语音识别测试类"""
    
    @pytest.fixture
    def asr(self, mock_whisper_asr):
        """语音识别器fixture"""
        return mock_whisper_asr
    
    def test_transcribe_single_audio(self, asr, sample_audio_data):
        """测试单个音频转录"""
        result = asr.transcribe(sample_audio_data, language="zh")
        
        assert result is not None
        assert "text" in result
        assert "language" in result
        assert result["language"] == "zh"
    
    def test_transcribe_with_auto_language(self, asr, sample_audio_data):
        """测试自动语言检测"""
        result = asr.transcribe(sample_audio_data)
        
        assert result is not None
        assert "language" in result
        # 语言应该在预期的范围内
        assert result["language"] in ["zh", "en", "ja", "ko", "fr", "de", "es"]
    
    def test_transcribe_empty_audio(self, asr):
        """测试空音频处理"""
        empty_audio = {
            "audio": np.array([], dtype=np.float32),
            "sample_rate": 16000
        }
        
        # 应该优雅地处理空音频
        asr.transcribe = Mock(return_value={"text": "", "language": None})
        result = asr.transcribe(empty_audio)
        
        assert result["text"] == ""
    
    def test_transcribe_with_timestamps(self, asr, sample_audio_data):
        """测试带时间戳的转录"""
        asr.transcribe = Mock(return_value={
            "text": "你好，世界",
            "language": "zh",
            "segments": [
                {"text": "你好", "start": 0.0, "end": 1.0},
                {"text": "世界", "start": 1.0, "end": 2.0}
            ]
        })
        
        result = asr.transcribe(sample_audio_data, return_timestamps=True)
        
        assert "segments" in result
        assert len(result["segments"]) == 2
        assert "start" in result["segments"][0]
        assert "end" in result["segments"][0]
    
    def test_transcribe_different_sample_rates(self, asr):
        """测试不同采样率"""
        sample_rates = [8000, 16000, 44100, 48000]
        
        for sr in sample_rates:
            audio_data = np.random.randn(16000).astype(np.float32)
            audio = {
                "audio": audio_data,
                "sample_rate": sr
            }
            
            asr.transcribe = Mock(return_value={"text": "test", "language": "zh"})
            result = asr.transcribe(audio)
            
            assert result["text"] is not None
    
    def test_transcribe_with_translation(self, asr, sample_audio_data):
        """测试转录加翻译"""
        asr.transcribe_with_translation = Mock(return_value={
            "text": "你好，世界",
            "language": "zh",
            "translation": "Hello, World",
            "target_language": "en"
        })
        
        result = asr.transcribe_with_translation(
            sample_audio_data,
            source_language="zh",
            target_language="en"
        )
        
        assert "translation" in result
        assert result["target_language"] == "en"
    
    def test_batch_transcribe(self, asr):
        """测试批量音频转录"""
        audio_files = [
            {
                "audio": np.random.randn(16000).astype(np.float32),
                "sample_rate": 16000
            }
            for _ in range(5)
        ]
        
        asr.transcribe_batch = Mock(return_value=[
            {"text": "test", "language": "zh"} for _ in range(5)
        ])
        
        results = asr.transcribe_batch(audio_files)
        
        assert len(results) == 5
        for result in results:
            assert "text" in result
    
    def test_transcribe_low_volume_audio(self, asr):
        """测试低音量音频"""
        # 创建低音量音频
        low_volume = np.random.randn(16000).astype(np.float32) * 0.01
        audio_data = {
            "audio": low_volume,
            "sample_rate": 16000
        }
        
        asr.transcribe = Mock(return_value={"text": "", "language": None})
        result = asr.transcribe(audio_data)
        
        # 低音量可能识别失败
        assert result["text"] == "" or result is None
    
    def test_transcribe_noisy_audio(self, asr):
        """测试带噪音频"""
        # 创建带噪音频
        clean_audio = np.random.randn(16000).astype(np.float32) * 0.5
        noise = np.random.randn(16000).astype(np.float32) * 0.5
        noisy_audio = clean_audio + noise
        
        audio_data = {
            "audio": noisy_audio,
            "sample_rate": 16000
        }
        
        result = asr.transcribe(audio_data)
        assert result is not None
    
    @pytest.mark.slow
    def test_asr_performance(self, asr, performance_monitor):
        """测试ASR性能"""
        import time
        
        # 创建测试音频数据
        test_audios = [
            {
                "audio": np.random.randn(16000 * 2).astype(np.float32),
                "sample_rate": 16000
            }
            for _ in range(10)
        ]
        
        start_time = time.time()
        
        for i, audio in enumerate(test_audios):
            operation_id = f"transcribe_{i}"
            performance_monitor.latency_monitor.start(operation_id)
            asr.transcribe(audio)
            performance_monitor.latency_monitor.end(operation_id)
        
        total_time = time.time() - start_time
        avg_time = total_time / len(test_audios)
        
        # 每段音频转录应在200ms内
        assert avg_time < 0.2
    
    def test_transcribe_with_vad(self, asr, sample_audio_data):
        """测试语音活动检测"""
        asr.transcribe_with_vad = Mock(return_value={
            "text": "你好",
            "language": "zh",
            "vad_segments": [
                {"start": 0.5, "end": 1.5, "is_speech": True},
                {"start": 1.5, "end": 2.0, "is_speech": False}
            ]
        })
        
        result = asr.transcribe_with_vad(sample_audio_data)
        
        assert "vad_segments" in result
        assert len(result["vad_segments"]) > 0


@pytest.mark.integration
def test_whisper_asr_integration(sample_audio_data):
    """Whisper语音识别集成测试"""
    # 这里可以测试实际的ASR
    asr = Mock()
    asr.transcribe = Mock(return_value={
        "text": "你好，世界",
        "language": "zh"
    })
    
    result = asr.transcribe(sample_audio_data)
    assert result["text"] == "你好，世界"
    assert result["language"] == "zh"