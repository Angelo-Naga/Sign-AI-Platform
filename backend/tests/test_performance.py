"""
性能测试模块
包含并发性能测试、内存泄漏检测、响应时间测试、吞吐量测试
"""

import pytest
import time
import threading
import gc
import psutil
import numpy as np
from typing import List
from unittest.mock import Mock
from concurrent.futures import ThreadPoolExecutor, as_completed


@pytest.mark.slow
class TestPerformance:
    """性能测试类"""
    
    @pytest.fixture
    def mock_detector(self):
        """创建模拟检测器"""
        detector = Mock()
        detector.detect_hands = Mock(return_value=[
            {"left": {"bbox": [100, 100, 50, 50]}}
        ])
        return detector
    
    @pytest.fixture
    def mock_recognizer(self):
        """创建模拟识别器"""
        recognizer = Mock()
        recognizer.recognize = Mock(return_value={
            "sign": "你好",
            "confidence": 0.95
        })
        return recognizer
    
    def test_concurrent_detection(self, mock_detector):
        """测试并发手部检测性能"""
        num_workers = 10
        num_requests = 100
        
        # 准备测试数据
        frames = [np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8) 
                 for _ in range(num_requests)]
        
        start_time = time.time()
        
        # 并发执行检测
        with ThreadPoolExecutor(max_workers=num_workers) as executor:
            futures = [executor.submit(mock_detector.detect_hands, frame) 
                      for frame in frames]
            results = [future.result() for future in as_completed(futures)]
        
        end_time = time.time()
        
        # 验证结果
        assert len(results) == num_requests
        for result in results:
            assert result is not None
        
        total_time = end_time - start_time
        avg_time = total_time / num_requests
        throughput = num_requests / total_time
        
        # 性能要求
        assert avg_time < 0.1, f"平均检测时间 {avg_time:.3f}s 超过100ms"
        assert throughput > 10, f"吞吐量 {throughput:.2f} req/s 太低"
        
        print(f"并发检测性能: {num_requests}个请求, {total_time:.2f}s, "
              f"平均{avg_time*1000:.2f}ms, 吞吐量{throughput:.2f} req/s")
    
    def test_concurrent_recognition(self, mock_recognizer):
        """测试并发手语识别性能"""
        num_workers = 10
        num_requests = 100
        
        # 准备测试数据
        samples = [
            {"left": [{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)],
             "right": [{"x": 0.8, "y": 0.2, "z": 0.0} for _ in range(21)]}
            for _ in range(num_requests)
        ]
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=num_workers) as executor:
            futures = [executor.submit(mock_recognizer.recognize, sample) 
                      for sample in samples]
            results = [future.result() for future in as_completed(futures)]
        
        end_time = time.time()
        
        # 验证结果
        assert len(results) == num_requests
        for result in results:
            assert result is not None
            assert "sign" in result
        
        total_time = end_time - start_time
        avg_time = total_time / num_requests
        throughput = num_requests / total_time
        
        # 性能要求
        assert avg_time < 0.05, f"平均识别时间 {avg_time:.3f}s 超过50ms"
        
        print(f"并发识别性能: {num_requests}个请求, {total_time:.2f}s, "
              f"平均{avg_time*1000:.2f}ms, 吞吐量{throughput:.2f} req/s")
    
    def test_memory_leak_detection(self, mock_detector, performance_monitor):
        """内存泄漏检测"""
        process = psutil.Process()
        
        # 记录初始内存
        initial_memory = process.memory_info().rss
        
        # 执行大量操作
        for _ in range(1000):
            frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
            mock_detector.detect_hands(frame)
            
            # 每100次操作强制垃圾回收
            if _ % 100 == 0:
                gc.collect()
        
        # 强制垃圾回收
        gc.collect()
        
        # 记录最终内存
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        memory_increase_mb = memory_increase / (1024 * 1024)
        
        # 内存增长应该在合理范围内（< 100MB）
        assert memory_increase_mb < 100, \
            f"可能存在内存泄漏，内存增长了{memory_increase_mb:.2f}MB"
        
        print(f"内存使用: 初始 {initial_memory/(1024*1024):.2f}MB, "
              f"最终 {final_memory/(1024*1024):.2f}MB, "
              f"增长 {memory_increase_mb:.2f}MB")
    
    def test_response_time_percentiles(self, mock_detector):
        """测试响应时间百分位数"""
        num_requests = 1000
        response_times: List[float] = []
        
        for _ in range(num_requests):
            frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
            
            start = time.time()
            mock_detector.detect_hands(frame)
            elapsed = time.time() - start
            
            response_times.append(elapsed)
        
        # 计算百分位数
        response_times.sort()
        p50 = response_times[int(num_requests * 0.50)]
        p90 = response_times[int(num_requests * 0.90)]
        p95 = response_times[int(num_requests * 0.95)]
        p99 = response_times[int(num_requests * 0.99)]
        
        # 性能要求
        assert p50 < 0.05, f"P50响应时间 {p50:.3f}s 超过50ms"
        assert p90 < 0.1, f"P90响应时间 {p90:.3f}s 超过100ms"
        assert p95 < 0.15, f"P95响应时间 {p95:.3f}s 超过150ms"
        assert p99 < 0.3, f"P99响应时间 {p99:.3f}s 超过300ms"
        
        print(f"响应时间百分位数: P50={p50*1000:.2f}ms, "
              f"P90={p90*1000:.2f}ms, P95={p95*1000:.2f}ms, "
              f"P99={p99*1000:.2f}ms")
    
    def test_throughput_stress(self, mock_recognizer):
        """吞吐量压力测试"""
        # 逐步增加负载测试吞吐量
        batch_sizes = [10, 50, 100, 200, 500]
        
        for batch_size in batch_sizes:
            samples = [
                {"left": [{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)],
                 "right": [{"x": 0.8, "y": 0.2, "z": 0.0} for _ in range(21)]}
                for _ in range(batch_size)
            ]
            
            start_time = time.time()
            
            with ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(mock_recognizer.recognize, sample) 
                          for sample in samples]
                results = [future.result() for future in as_completed(futures)]
            
            end_time = time.time()
            total_time = end_time - start_time
            throughput = batch_size / total_time
            
            # 验证结果
            assert len(results) == batch_size
            
            print(f"批量大小 {batch_size}: 总时间 {total_time:.2f}s, "
                  f"吞吐量 {throughput:.2f} req/s")
            
            # 性能应该随着批量大小增加而提升（至某个点）
            if batch_size <= 200:
                assert throughput > 10, f"批量{batch_size}吞吐量太低"
    
    def test_cache_performance(self):
        """缓存性能测试"""
        from utils.performance_optimizer import LRUCache
        
        cache = LRUCache(capacity=1000)
        
        # 测试缓存命中
        cache.put("key1", "value1")
        
        # 缓存命中测试
        start = time.time()
        for _ in range(10000):
            cache.get("key1")
        cache_hit_time = time.time() - start
        
        # 缓存未命中测试
        start = time.time()
        for _ in range(10000):
            cache.get("nonexistent")
        cache_miss_time = time.time() - start
        
        print(f"缓存性能: 命中 {cache_hit_time*100:.4f}ms/10000次, "
              f"未命中 {cache_miss_time*100:.4f}ms/10000次")
        
        # 缓存操作应该很快
        assert cache_hit_time < 0.1, "缓存命中时间太长"
    
    def test_batch_processing_performance(self):
        """批量处理性能测试"""
        from utils.performance_optimizer import BatchInferenceOptimizer
        
        batch_optimizer = BatchInferenceOptimizer(batch_size=10)
        
        model = Mock()
        model.__call__ = Mock(return_value=np.array([[1, 2, 3]] * 10))
        
        # 测试批量处理
        num_inputs = 100
        inputs = [np.random.randn(3) for _ in range(num_inputs)]
        
        results = []
        start_time = time.time()
        
        for i, input_data in enumerate(inputs):
            def callback(output):
                results.append(output)
            
            batch_result = batch_optimizer.add_to_batch(input_data, callback)
            if batch_result:
                batch_data, callbacks = batch_result
                outputs = model(batch_data)
                for output, callback in zip(outputs, callbacks):
                    callback(output)
        
        # 清理剩余的
        batch_optimizer.flush(model)
        
        end_time = time.time()
        
        assert len(results) == num_inputs
        print(f"批量处理{num_inputs}个输入: {end_time-start_time:.3f}s")


@pytest.mark.slow
class TestMemoryOptimization:
    """内存优化测试"""
    
    def test_memory_pool_efficiency(self):
        """内存池效率测试"""
        from utils.performance_optimizer import MemoryPool
        
        memory_pool = MemoryPool(max_size=1024 * 1024 * 100)  # 100MB
        
        # 分配多个张量
        num_tensors = 50
        tensors = [torch.randn(1000, 1000) for _ in range(num_tensors)]
        
        allocated_count = 0
        for i, tensor in enumerate(tensors):
            success = memory_pool.allocate(f"tensor_{i}", tensor)
            if success:
                allocated_count += 1
        
        usage = memory_pool.get_usage()
        print(f"内存池: 已分配{allocated_count}/{num_tensors}张量, "
              f"利用率 {usage['utilization']*100:.1f}%")
        
        assert allocated_count > 0, "内存池未能分配任何张量"
    
    def test_quantization_memory_savings(self):
        """量化内存节省测试"""
        import torch
        import torch.nn as nn
        
        # 创建简单模型
        model = nn.Sequential(
            nn.Linear(1000, 1000),
            nn.ReLU(),
            nn.Linear(1000, 100)
        )
        
        from utils.performance_optimizer import ModelQuantizer
        
        # FP32内存
        fp32_size = sum(p.element_size() * p.nelement() 
                       for p in model.parameters())
        
        # 量化为FP16
        quantizer = ModelQuantizer(model)
        model_fp16 = quantizer.quantize_to_fp16()
        fp16_size = sum(p.element_size() * p.nelement() 
                       for p in model_fp16.parameters() if p.dtype == torch.float16)
        
        memory_saving = (fp32_size - fp16_size) / fp32_size
        
        print(f"FP32: {fp32_size/1024/1024:.2f}MB, "
              f"FP16: {fp16_size/1024/1024:.2f}MB, "
              f"节省 {memory_saving*100:.1f}%")
        
        # 应该节省约50%内存
        assert memory_saving > 0.4, "FP16量化未能显著节省内存"


@pytest.mark.slow
class TestGPUPerformance:
    """GPU性能测试"""
    
    @pytest.mark.gpu
    def test_gpu_utilization(self):
        """GPU利用率测试"""
        if not torch.cuda.is_available():
            pytest.skip("GPU不可用")
        
        from utils.performance_optimizer import GPUMemoryOptimizer
        
        gpu_info = GPUMemoryOptimizer.get_gpu_memory_info()
        print(f"GPU信息: {gpu_info}")
        
        assert gpu_info["available"], "GPU信息不可用"
    
    @pytest.mark.gpu
    def test_gpu_memory_management(self):
        """GPU内存管理测试"""
        if not torch.cuda.is_available():
            pytest.skip("GPU不可用")
        
        from utils.performance_optimizer import GPUMemoryOptimizer
        
        # 清理缓存
        GPUMemoryOptimizer.clear_gpu_cache()
        
        # 创建张量
        tensor1 = torch.randn(10000, 10000).cuda()
        allocated_after1 = torch.cuda.memory_allocated()
        
        tensor2 = torch.randn(10000, 10000).cuda()
        allocated_after2 = torch.cuda.memory_allocated()
        
        # 删除张量
        del tensor1
        del tensor2
        
        # 清理缓存
        torch.cuda.empty_cache()
        allocated_after_cleanup = torch.cuda.memory_allocated()
        
        print(f"GPU内存使用: 分配1后 {allocated_after1/1024/1024:.2f}MB, "
              f"分配2后 {allocated_after2/1024/1024:.2f}MB, "
              f"清理后 {allocated_after_cleanup/1024/1024:.2f}MB")
        
        # 清理后内存应该减少
        assert allocated_after_cleanup < allocated_after2, "GPU内存未正确释放"