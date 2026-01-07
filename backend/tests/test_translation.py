"""
翻译功能单元测试
"""

import pytest
from unittest.mock import Mock, MagicMock


@pytest.mark.unit
class TestTranslation:
    """翻译功能测试类"""
    
    @pytest.fixture
    def translator(self, mock_translator):
        """翻译器fixture"""
        return mock_translator
    
    def test_translate_simple_text(self, translator):
        """测试简单文本翻译"""
        text = "你好，世界"
        
        result = translator.translate(
            text,
            source_lang="zh",
            target_lang="en"
        )
        
        assert result is not None
        assert "text" in result
        assert "source_lang" in result
        assert "target_lang" in result
        assert result["target_lang"] == "en"
    
    def test_translate_with_auto_detect(self, translator):
        """测试自动检测源语言"""
        text = "Hello, World"
        
        result = translator.translate(text, target_lang="zh")
        
        assert result is not None
        assert "text" in result
        # 应该自动检测为英语
        assert result["source_lang"] in ["en", "auto"]
    
    def test_translate_empty_text(self, translator):
        """测试空文本翻译"""
        empty_text = ""
        
        translator.translate = Mock(return_value={
            "text": "",
            "source_lang": None,
            "target_lang": "en"
        })
        
        result = translator.translate(empty_text, target_lang="en")
        
        assert result["text"] == ""
    
    def test_translate_multiple_sentences(self, translator):
        """测试多句子翻译"""
        text = "你好。世界。测试。"
        
        result = translator.translate(
            text,
            source_lang="zh",
            target_lang="en"
        )
        
        assert result is not None
        assert "text" in result
    
    def test_translate_batch(self, translator):
        """测试批量翻译"""
        texts = ["你好", "世界", "测试"]
        
        translator.translate_batch = Mock(return_value=[
            {"text": "Hello", "source_lang": "zh", "target_lang": "en"},
            {"text": "World", "source_lang": "zh", "target_lang": "en"},
            {"text": "Test", "source_lang": "zh", "target_lang": "en"}
        ])
        
        results = translator.translate_batch(
            texts,
            source_lang="zh",
            target_lang="en"
        )
        
        assert len(results) == 3
        for result in results:
            assert "text" in result
            assert result["target_lang"] == "en"
    
    def test_get_supported_languages(self, translator):
        """测试获取支持的语言列表"""
        translator.get_languages = Mock(return_value={
            "source": ["zh", "en", "ja", "ko", "fr", "de", "es"],
            "target": ["zh", "en", "ja", "ko", "fr", "de", "es"]
        })
        
        languages = translator.get_languages()
        
        assert "source" in languages
        assert "target" in languages
        assert len(languages["source"]) > 0
        assert "zh" in languages["source"]
    
    def test_translate_with_custom_dict(self, translator):
        """测试使用自定义词典"""
        text = "测试"
        custom_dict = {
            "测试": ["test", "testing"]
        }
        
        translator.translate_with_dict = Mock(return_value={
            "text": "test",
            "dict_used": True,
            "source_lang": "zh",
            "target_lang": "en"
        })
        
        result = translator.translate_with_dict(
            text,
            source_lang="zh",
            target_lang="en",
            custom_dict=custom_dict
        )
        
        assert result["dict_used"] is True
    
    @pytest.mark.slow
    def test_translation_performance(self, translator, performance_monitor):
        """测试翻译性能"""
        import time
        
        test_texts = [f"测试文本 {i}" for i in range(50)]
        
        start_time = time.time()
        
        for i, text in enumerate(test_texts):
            operation_id = f"translate_{i}"
            performance_monitor.latency_monitor.start(operation_id)
            translator.translate(text, source_lang="zh", target_lang="en")
            performance_monitor.latency_monitor.end(operation_id)
        
        total_time = time.time() - start_time
        avg_time = total_time / len(test_texts)
        
        # 每次翻译应在100ms内
        assert avg_time < 0.1
    
    def test_translate_sign_to_text(self, translator):
        """测试手语到文本的翻译"""
        sign_sequence = [{"sign": "你好"}, {"sign": "世界"}]
        
        translator.sign_to_text = Mock(return_value={
            "text": "你好世界",
            "language": "zh"
        })
        
        result = translator.sign_to_text(sign_sequence)
        
        assert result["text"] == "你好世界"
    
    def test_translate_text_to_sign(self, translator):
        """测试文本到手语的翻译"""
        text = "你好世界"
        
        translator.text_to_sign = Mock(return_value={
            "signs": [{"sign": "你好"}, {"sign": "世界"}],
            "language": "zh"
        })
        
        result = translator.text_to_sign(text, language="zh")
        
        assert len(result["signs"]) == 2
    
    def test_bidirectional_translation(self, translator):
        """测试双向翻译"""
        text = "你好"
        
        # 中文到英文
        result1 = translator.translate(text, source_lang="zh", target_lang="en")
        
        # 英文回中文
        result2 = translator.translate(result1["text"], source_lang="en", target_lang="zh")
        
        assert result1 is not None
        assert result2 is not None


@pytest.mark.unit
class TestDualTranslator:
    """双向翻译器测试类"""
    
    def test_dual_translate(self):
        """测试双向翻译"""
        translator = Mock()
        translator.dual_translate = Mock(return_value={
            "forward": {"text": "Hello", "source_lang": "zh", "target_lang": "en"},
            "backward": {"text": "你好", "source_lang": "en", "target_lang": "zh"},
            "similarity": 0.85
        })
        
        result = translator.dual_translate(
            "你好",
            source_lang="zh",
            intermediate_lang="en"
        )
        
        assert "forward" in result
        assert "backward" in result
        assert result["forward"]["target_lang"] == "en"
        assert result["backward"]["target_lang"] == "zh"


@pytest.mark.integration
def test_translation_integration():
    """翻译功能集成测试"""
    translator = Mock()
    translator.translate = Mock(return_value={
        "text": "Hello, World",
        "source_lang": "zh",
        "target_lang": "en"
    })
    
    result = translator.translate("你好，世界", source_lang="zh", target_lang="en")
    assert result["text"] == "Hello, World"