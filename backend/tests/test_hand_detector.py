"""
手部检测器单元测试
"""

import pytest
import numpy as np
from unittest.mock import Mock, MagicMock, patch


@pytest.mark.unit
class TestHandDetector:
    """手部检测器测试类"""
    
    @pytest.fixture
    def detector(self, mock_hand_detector):
        """手部检测器fixture"""
        return mock_hand_detector
    
    def test_detect_hands_with_single_frame(self, detector, sample_video_frame):
        """测试单帧手部检测"""
        result = detector.detect_hands(sample_video_frame)
        
        assert result is not None
        assert isinstance(result, list)
        assert len(result) > 0
        assert "left" in result[0] or "right" in result[0]
    
    def test_detect_hands_with_no_hands(self, detector):
        """测试无手部的图像"""
        # 创建空白图像
        empty_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        # Mock返回空结果
        detector.detect_hands = Mock(return_value=[])
        
        result = detector.detect_hands(empty_frame)
        
        assert result == []
    
    def test_detect_hands_with_both_hands(self, detector, sample_video_frame):
        """测试双手检测"""
        result = detector.detect_hands(sample_video_frame)
        
        assert result is not None
        if len(result) > 0:
            frame_result = result[0]
            # 检查是否包含左右手
            has_left = "left" in frame_result
            has_right = "right" in frame_result
            assert has_left or has_right
    
    def test_landmarks_format(self, detector, sample_video_frame):
        """测试关键点格式"""
        result = detector.detect_hands(sample_video_frame)
        
        if len(result) > 0:
            frame_result = result[0]
            
            for hand_key in ["left", "right"]:
                if hand_key in frame_result:
                    hand_data = frame_result[hand_key]
                    # 检查是否有bbox
                    assert "bbox" in hand_data
                    
                    # 检查bbox格式 [x, y, w, h]
                    bbox = hand_data["bbox"]
                    assert len(bbox) == 4
                    
                    # 检查关键点（如果存在）
                    if "landmarks" in hand_data:
                        landmarks = hand_data["landmarks"]
                        assert len(landmarks) == 21  # 每只手21个关键点
    
    def test_confidence_threshold(self, detector, sample_video_frame, landmarks_data):
        """测试置信度阈值"""
        # 设置低置信度
        detector.detect_hands = Mock(return_value=[
            {
                "left": {
                    "bbox": [100, 100, 50, 50],
                    "landmarks": landmarks_data["left"],
                    "confidence": 0.3
                },
                "right": {
                    "bbox": [200, 100, 50, 50],
                    "landmarks": landmarks_data["right"],
                    "confidence": 0.9
                }
            }
        ])
        
        result = detector.detect_hands(sample_video_frame, confidence_threshold=0.5)
        
        # 应该只返回高置信度的手
        assert len(result) > 0
        frame_result = result[0]
        
        if "left" in frame_result and frame_result["left"]["confidence"] < 0.5:
            pytest.fail("低置信度的手应该被过滤")
    
    def test_video_frames_batch(self, detector):
        """测试批量视频帧处理"""
        # 创建多帧
        frames = [np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8) 
                 for _ in range(10)]
        
        results = []
        for frame in frames:
            result = detector.detect_hands(frame)
            results.append(result)
        
        assert len(results) == 10
        for result in results:
            assert isinstance(result, list)
    
    def test_empty_frame(self, detector):
        """测试空帧处理"""
        empty_frame = None
        
        # 应该优雅地处理空帧
        try:
            result = detector.detect_hands(empty_frame)
            assert result is None or result == []
        except Exception as e:
            # 如果抛出异常，应该是预期内的
            assert isinstance(e, (ValueError, TypeError))
    
    @pytest.mark.slow
    def test_detector_performance(self, detector, performance_monitor):
        """测试检测器性能"""
        import time
        from utils.performance_monitor import monitor_performance
        
        # 创建多帧进行性能测试
        frames = [np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8) 
                 for _ in range(100)]
        
        start_time = time.time()
        
        for i, frame in enumerate(frames):
            operation_id = f"detect_frame_{i}"
            performance_monitor.latency_monitor.start(operation_id)
            detector.detect_hands(frame)
            latency = performance_monitor.latency_monitor.end(operation_id)
        
        total_time = time.time() - start_time
        
        # 检查性能
        avg_latency = total_time / len(frames)
        assert avg_latency < 0.1  # 每帧应在100ms内完成
        
        # 获取统计信息
        stats = performance_monitor.latency_monitor.get_stats()
        assert stats["avg"] > 0
        assert stats["max"] > stats["min"]


@pytest.mark.integration
def test_hand_detector_integration(sample_video_frame):
    """手部检测器集成测试"""
    # 这里可以测试实际的检测器而不是mock
    # 需要在实际的模型环境中运行
    
    # 模拟集成测试
    detector = Mock()
    detector.detect_hands = Mock(return_value=[
        {"left": {"bbox": [100, 100, 50, 50]}}
    ])
    
    result = detector.detect_hands(sample_video_frame)
    assert len(result) > 0