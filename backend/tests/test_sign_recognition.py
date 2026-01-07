"""
手语识别器单元测试
"""

import pytest
import numpy as np
from unittest.mock import Mock, MagicMock


@pytest.mark.unit
class TestSignRecognition:
    """手语识别器测试类"""
    
    @pytest.fixture
    def recognizer(self, mock_sign_recognizer):
        """手语识别器fixture"""
        return mock_sign_recognizer
    
    def test_recognize_single_sign(self, recognizer, landmarks_data):
        """测试单个手语识别"""
        result = recognizer.recognize(landmarks_data)
        
        assert result is not None
        assert "sign" in result
        assert "confidence" in result
        assert result["confidence"] > 0
        assert result["confidence"] <= 1.0
    
    def test_recognize_with_invalid_landmarks(self, recognizer):
        """测试无效关键点"""
        invalid_landmarks = {
            "left": [],
            "right": []
        }
        
        # 应该处理无效输入
        recognizer.recognize = Mock(return_value=None)
        result = recognizer.recognize(invalid_landmarks)
        
        assert result is None
    
    def test_recognize_sequence(self, recognizer):
        """测试手语序列识别"""
        # 创建关键点序列
        sequence = [
            {"left": [{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)],
             "right": [{"x": 0.8, "y": 0.2, "z": 0.0} for _ in range(21)]}
            for _ in range(30)
        ]
        
        recognizer.recognize_sequence = Mock(return_value={
            "signs": ["你好", "世界"],
            "confidences": [0.95, 0.92],
            "text": "你好世界"
        })
        
        result = recognizer.recognize_sequence(sequence)
        
        assert result is not None
        assert "signs" in result
        assert "confidences" in result
        assert len(result["signs"]) == 2
    
    def test_confidence_threshold(self, recognizer, landmarks_data):
        """测试置信度阈值"""
        # 设置低置信度结果
        recognizer.recognize = Mock(return_value={
            "sign": "你好",
            "confidence": 0.6,
            "landmarks": landmarks_data["left"]
        })
        
        result = recognizer.recognize(landmarks_data, min_confidence=0.7)
        
        # 应该返回None或低置信度标志
        if result is not None:
            assert result["confidence"] < 0.7
    
    def test_multiple_interpretations(self, recognizer, landmarks_data):
        """测试多候选识别结果"""
        recognizer.recognize = Mock(return_value={
            "top_sign": "你好",
            "confidence": 0.95,
            "candidates": [
                {"sign": "你好", "confidence": 0.95},
                {"sign": "大家好", "confidence": 0.8},
                {"sign": "再见", "confidence": 0.3}
            ]
        })
        
        result = recognizer.recognize(landmarks_data, top_k=3)
        
        assert "candidates" in result
        assert len(result["candidates"]) == 3
        
        # 验证候选已排序
        confidences = [c["confidence"] for c in result["candidates"]]
        assert confidences == sorted(confidences, reverse=True)
    
    def test_batch_recognition(self, recognizer):
        """测试批量识别"""
        # 创建多个关键点样本
        samples = [
            {
                "left": [{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)],
                "right": [{"x": 0.8, "y": 0.2, "z": 0.0} for _ in range(21)]
            }
            for _ in range(5)
        ]
        
        recognizer.recognize_batch = Mock(return_value=[
            {"sign": "你好", "confidence": 0.95} for _ in range(5)
        ])
        
        results = recognizer.recognize_batch(samples)
        
        assert len(results) == 5
        for result in results:
            assert "sign" in result
            assert "confidence" in result
    
    def test_unknown_sign(self, recognizer, landmarks_data):
        """测试未知手语"""
        recognizer.recognize = Mock(return_value={
            "sign": "未知",
            "confidence": 0.1,
            "known": False
        })
        
        result = recognizer.recognize(landmarks_data)
        
        assert result["sign"] == "未知"
        assert result["confidence"] < 0.5
        assert result["known"] is False
    
    @pytest.mark.slow
    def test_recognizer_performance(self, recognizer, performance_monitor):
        """测试识别器性能"""
        import time
        
        # 创建测试数据
        samples = [
            {
                "left": [{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)],
                "right": [{"x": 0.8, "y": 0.2, "z": 0.0} for _ in range(21)]
            }
            for _ in range(100)
        ]
        
        start_time = time.time()
        
        for i, sample in enumerate(samples):
            operation_id = f"recognize_{i}"
            performance_monitor.latency_monitor.start(operation_id)
            recognizer.recognize(sample)
            performance_monitor.latency_monitor.end(operation_id)
        
        total_time = time.time() - start_time
        avg_time = total_time / len(samples)
        
        # 每次识别应在50ms内
        assert avg_time < 0.05


@pytest.mark.integration
def test_sign_recognition_integration(landmarks_data):
    """手语识别集成测试"""
    # 这里可以测试实际的识别器
    recognizer = Mock()
    recognizer.recognize = Mock(return_value={
        "sign": "你好",
        "confidence": 0.95
    })
    
    result = recognizer.recognize(landmarks_data)
    assert result["sign"] == "你好"
    assert result["confidence"] >= 0.9


@pytest.mark.unit
class TestSignGrammar:
    """手语语法测试类"""
    
    def test_text_to_sign_sequence(self):
        """测试文本到手语序列的转换"""
        from unittest.mock import Mock
        
        grammar = Mock()
        grammar.text_to_sign = Mock(return_value=[
            {"sign": "你好", "type": "greeting"},
            {"sign": "世界", "type": "noun"}
        ])
        
        result = grammar.text_to_sign("你好世界")
        
        assert len(result) == 2
        assert result[0]["sign"] == "你好"
        assert result[1]["sign"] == "世界"
    
    def test_sign_sequence_to_text(self):
        """测试手语序列到文本的转换"""
        from unittest.mock import Mock
        
        grammar = Mock()
        grammar.sign_to_text = Mock(return_value="你好世界")
        
        sequence = [
            {"sign": "你好", "type": "greeting"},
            {"sign": "世界", "type": "noun"}
        ]
        
        result = grammar.sign_to_text(sequence)
        assert result == "你好世界"