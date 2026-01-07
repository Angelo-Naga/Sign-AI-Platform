"""
声音克隆器单元测试
"""

import pytest
import numpy as np
from unittest.mock import Mock, MagicMock


@pytest.mark.unit
class TestVoiceCloner:
    """声音克隆器测试类"""
    
    @pytest.fixture
    def cloner(self, mock_voice_cloner):
        """声音克隆器fixture"""
        return mock_voice_cloner
    
    def test_clone_voice(self, cloner, sample_audio_data):
        """测试声音克隆"""
        result = cloner.clone_voice(
            sample_audio_data,
            target_text="测试文本"
        )
        
        assert result is not None
        assert "success" in result
        assert "audio_bytes" in result
    
    def test_clone_voice_with_empty_audio(self, cloner):
        """测试空音频克隆"""
        empty_audio = {
            "audio": np.array([], dtype=np.float32),
            "sample_rate": 16000
        }
        
        cloner.clone_voice = Mock(return_value={
            "success": False,
            "error": "Empty audio"
        })
        
        result = cloner.clone_voice(empty_audio)
        
        assert result["success"] is False
    
    def test_extract_speaker_embedding(self, cloner, sample_audio_data):
        """测试说话人特征提取"""
        cloner.extract_embedding = Mock(return_value={
            "embedding": np.random.randn(256).tolist(),
            "success": True
        })
        
        result = cloner.extract_embedding(sample_audio_data)
        
        assert result["success"] is True
        assert "embedding" in result
        assert len(result["embedding"]) > 0
    
    def test_save_speaker_profile(self, cloner):
        """测试保存说话人配置"""
        speaker_id = "test_speaker_001"
        embedding = np.random.randn(256).tolist()
        
        cloner.save_speaker_embedding = Mock(return_value=True)
        
        result = cloner.save_speaker_embedding(speaker_id, embedding)
        
        assert result is True
    
    def test_load_speaker_profile(self, cloner):
        """测试加载说话人配置"""
        speaker_id = "test_speaker_001"
        
        cloner.load_speaker_embedding = Mock(return_value={
            "speaker_id": speaker_id,
            "embedding": np.random.randn(256).tolist(),
            "name": "测试说话人"
        })
        
        result = cloner.load_speaker_embedding(speaker_id)
        
        assert result is not None
        assert result["speaker_id"] == speaker_id
    
    def test_list_speaker_profiles(self, cloner):
        """测试列出所有说话人配置"""
        cloner.list_speakers = Mock(return_value=[
            {"speaker_id": "001", "name": "说话人1"},
            {"speaker_id": "002", "name": "说话人2"}
        ])
        
        result = cloner.list_speakers()
        
        assert len(result) == 2
        assert "speaker_id" in result[0]
    
    def test_delete_speaker_profile(self, cloner):
        """测试删除说话人配置"""
        speaker_id = "test_speaker_001"
        
        cloner.delete_speaker = Mock(return_value=True)
        
        result = cloner.delete_speaker(speaker_id)
        
        assert result is True
    
    def test_clone_with_voice_settings(self, cloner, sample_audio_data):
        """测试带语音设置的克隆"""
        voice_settings = {
            "speed": 1.0,
            "pitch": 1.0,
            "emotion": "happy"
        }
        
        result = cloner.clone_voice(
            sample_audio_data,
            target_text="测试",
            voice_settings=voice_settings
        )
        
        assert result is not None
        assert "success" in result
    
    @pytest.mark.slow
    def test_cloner_performance(self, cloner, performance_monitor):
        """测试克隆器性能"""
        import time
        
        # 创建测试音频
        test_audios = [
            {
                "audio": np.random.randn(16000 * 5).astype(np.float32),
                "sample_rate": 16000
            }
            for _ in range(5)
        ]
        
        start_time = time.time()
        
        for i, audio in enumerate(test_audios):
            operation_id = f"clone_{i}"
            performance_monitor.latency_monitor.start(operation_id)
            cloner.clone_voice(audio, target_text=f"测试{i}")
            performance_monitor.latency_monitor.end(operation_id)
        
        total_time = time.time() - start_time
        avg_time = total_time / len(test_audios)
        
        # 每次克隆应在500ms内
        assert avg_time < 0.5
    
    def test_batch_clone(self, cloner):
        """测试批量克隆"""
        texts = ["测试1", "测试2", "测试3"]
        sample_audio = {
            "audio": np.random.randn(16000).astype(np.float32),
            "sample_rate": 16000
        }
        
        cloner.clone_batch = Mock(return_value=[
            {"success": True, "audio_bytes": bytes([0] * 1000)}
            for _ in texts
        ])
        
        results = cloner.clone_batch(sample_audio, texts)
        
        assert len(results) == 3
        for result in results:
            assert result["success"] is True


@pytest.mark.integration
def test_voice_cloner_integration(sample_audio_data):
    """声音克隆器集成测试"""
    cloner = Mock()
    cloner.clone_voice = Mock(return_value={
        "success": True,
        "audio_bytes": bytes([0, 1, 2, 3])
    })
    
    result = cloner.clone_voice(sample_audio_data, "测试")
    assert result["success"] is True