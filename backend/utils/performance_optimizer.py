"""
性能优化模块
提供模型量化、剪枝、批量推理优化、缓存管理等功能
"""

import torch
import torch.nn as nn
from functools import lru_cache
from typing import Dict, List, Any, Optional, Callable
import threading
import time
from collections import OrderedDict
import numpy as np


class ModelQuantizer:
    """模型量化器 - 支持FP16和INT8量化"""
    
    def __init__(self, model: nn.Module):
        self.model = model
        self.is_fp16 = False
        self.is_int8 = False
    
    def quantize_to_fp16(self) -> nn.Module:
        """
        将模型量化为FP16格式
        可以减少内存占用，提升推理速度（在支持半精度计算的GPU上）
        """
        if self.is_fp16:
            return self.model
        
        try:
            self.model = self.model.half()
            self.is_fp16 = True
            return self.model
        except Exception as e:
            print(f"FP16量化失败: {e}")
            return self.model
    
    def quantize_to_int8(self, calibration_data: Optional[List] = None) -> nn.Module:
        """
        将模型量化为INT8格式
        需要校准数据来确定量化参数
        """
        if self.is_int8:
            return self.model
        
        try:
            # 动态量化
            self.model = torch.quantization.quantize_dynamic(
                self.model,
                {nn.Linear, nn.Conv2d, nn.LSTM, nn.GRU},
                dtype=torch.qint8
            )
            self.is_int8 = True
            return self.model
        except Exception as e:
            print(f"INT8量化失败: {e}")
            return self.model
    
    def restore(self) -> nn.Module:
        """恢复模型到原始精度"""
        if self.is_fp16 or self.is_int8:
            # 量化后无法完全恢复，需要重新加载原始模型
            print("警告: 量化模型无法完全恢复，请重新加载原始模型")
        return self.model


class ModelPruner:
    """模型剪枝工具 - 移除不重要的权重以减少模型大小"""
    
    @staticmethod
    def prune_linear(
        layer: nn.Linear,
        sparsity: float = 0.2
    ) -> nn.Linear:
        """
        剪枝线性层
        sparsity: 剪枝比例，0.2表示移除20%的权重
        """
        # 随机剪枝
        mask = torch.rand_like(layer.weight) > sparsity
        with torch.no_grad():
            layer.weight.data *= mask.float()
        return layer
    
    @staticmethod
    def prune_conv2d(
        layer: nn.Conv2d,
        sparsity: float = 0.2
    ) -> nn.Conv2d:
        """
        剪枝卷积层
        """
        mask = torch.rand_like(layer.weight) > sparsity
        with torch.no_grad():
            layer.weight.data *= mask.float()
        return layer
    
    @staticmethod
    def prune_model(
        model: nn.Module,
        sparsity: float = 0.2
    ) -> nn.Module:
        """
        对整个模型进行剪枝
        """
        for name, module in model.named_modules():
            if isinstance(module, nn.Linear):
                ModelPruner.prune_linear(module, sparsity)
            elif isinstance(module, nn.Conv2d):
                ModelPruner.prune_conv2d(module, sparsity)
        return model


class BatchInferenceOptimizer:
    """批量推理优化器"""
    
    def __init__(self, batch_size: int = 4):
        self.batch_size = batch_size
        self.buffer: List[Any] = []
        self.lock = threading.Lock()
    
    def add_to_batch(self, data: Any, callback: Callable) -> Optional[List]:
        """
        添加数据到批量缓冲区
        当缓冲区满时执行批量推理
        """
        with self.lock:
            self.buffer.append((data, callback))
            
            if len(self.buffer) >= self.batch_size:
                batch_data = [item[0] for item in self.buffer]
                callbacks = [item[1] for item in self.buffer]
                self.buffer.clear()
                return batch_data, callbacks
            
            return None
    
    def process_batch(
        self,
        model: nn.Module,
        batch_data: List[Any],
        callbacks: List[Callable]
    ):
        """批量处理数据"""
        try:
            # 堆叠数据为批量
            batch_tensor = torch.stack(batch_data)
            
            # 批量推理
            with torch.no_grad():
                outputs = model(batch_tensor)
            
            # 分发结果
            for output, callback in zip(outputs, callbacks):
                callback(output)
                
        except Exception as e:
            print(f"批量推理失败: {e}")
    
    def flush(self, model: nn.Module):
        """清空缓冲区并执行推理"""
        with self.lock:
            if self.buffer:
                batch_data = [item[0] for item in self.buffer]
                callbacks = [item[1] for item in self.buffer]
                self.buffer.clear()
                self.process_batch(model, batch_data, callbacks)


class LRUCache:
    """LRU缓存实现"""
    
    def __init__(self, capacity: int = 1000):
        self.capacity = capacity
        self.cache: OrderedDict = OrderedDict()
        self.lock = threading.Lock()
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存值"""
        with self.lock:
            if key in self.cache:
                # 移动到末尾表示最近使用
                self.cache.move_to_end(key)
                return self.cache[key]
            return None
    
    def put(self, key: str, value: Any):
        """设置缓存值"""
        with self.lock:
            if key in self.cache:
                self.cache.move_to_end(key)
            self.cache[key] = value
            
            # 超过容量时删除最久未使用的
            if len(self.cache) > self.capacity:
                self.cache.popitem(last=False)
    
    def clear(self):
        """清空缓存"""
        with self.lock:
            self.cache.clear()
    
    def size(self) -> int:
        """获取缓存大小"""
        return len(self.cache)


class MemoryPool:
    """内存池管理"""
    
    def __init__(self, max_size: int = 1024 * 1024 * 1024):  # 1GB
        self.max_size = max_size
        self.allocated: Dict[str, torch.Tensor] = {}
        self.lock = threading.Lock()
    
    def allocate(self, name: str, tensor: torch.Tensor) -> bool:
        """
        分配内存
        返回是否分配成功
        """
        with self.lock:
            current_size = sum(t.element_size() * t.nelement() 
                             for t in self.allocated.values())
            tensor_size = tensor.element_size() * tensor.nelement()
            
            if current_size + tensor_size > self.max_size:
                # 内存不足，尝试清理
                self._free_unused()
                current_size = sum(t.element_size() * t.nelement() 
                                 for t in self.allocated.values())
                
                if current_size + tensor_size > self.max_size:
                    print(f"内存池已满，无法分配 {tensor_size} bytes")
                    return False
            
            self.allocated[name] = tensor
            return True
    
    def get(self, name: str) -> Optional[torch.Tensor]:
        """获取张量"""
        with self.lock:
            return self.allocated.get(name)
    
    def free(self, name: str):
        """释放张量"""
        with self.lock:
            if name in self.allocated:
                del self.allocated[name]
    
    def _free_unused(self):
        """清理未使用的张量（简化实现）"""
        # 实际应用中可以根据使用情况清理
        pass
    
    def get_usage(self) -> Dict[str, Any]:
        """获取内存使用情况"""
        with self.lock:
            used = sum(t.element_size() * t.nelement() 
                      for t in self.allocated.values())
            return {
                "used": used,
                "max": self.max_size,
                "utilization": used / self.max_size,
                "count": len(self.allocated)
            }


class GPUMemoryOptimizer:
    """GPU内存优化"""
    
    @staticmethod
    def get_gpu_memory_info() -> Dict[str, Any]:
        """获取GPU内存信息"""
        if not torch.cuda.is_available():
            return {"available": False}
        
        info = {
            "available": True,
            "count": torch.cuda.device_count(),
            "devices": []
        }
        
        for i in range(torch.cuda.device_count()):
            memory_allocated = torch.cuda.memory_allocated(i)
            memory_reserved = torch.cuda.memory_reserved(i)
            memory_total = torch.cuda.get_device_properties(i).total_memory
            
            info["devices"].append({
                "device": i,
                "memory_allocated": memory_allocated,
                "memory_reserved": memory_reserved,
                "memory_total": memory_total,
                "memory_free": memory_total - memory_reserved,
                "utilization": memory_allocated / memory_total
            })
        
        return info
    
    @staticmethod
    def clear_gpu_cache():
        """清理GPU缓存"""
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    
    @staticmethod
    def optimize_model_for_gpu(
        model: nn.Module,
        device: Optional[torch.device] = None
    ) -> nn.Module:
        """优化模型在GPU上的性能"""
        if device is None:
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # 转移到GPU
        model = model.to(device)
        
        # 启用cuDNN自动调优
        if torch.cuda.is_available():
            torch.backends.cudnn.benchmark = True
            torch.backends.cudnn.deterministic = False
        
        return model
    
    @staticmethod
    def set_memory_fraction(fraction: float = 0.9):
        """
        设置GPU内存分配比例
        fraction: 0-1之间，表示可以使用的GPU内存比例
        """
        if torch.cuda.is_available() and 0 < fraction <= 1:
            torch.cuda.set_per_process_memory_fraction(fraction)


class PerformanceOptimizer:
    """性能优化主类 - 整合所有优化功能"""
    
    def __init__(self):
        self.quantizer: Optional[ModelQuantizer] = None
        self.pruner = ModelPruner()
        self.batch_optimizer: Optional[BatchInferenceOptimizer] = None
        self.cache = LRUCache()
        self.memory_pool = MemoryPool()
        self.gpu_optimizer = GPUMemoryOptimizer()
    
    def setup_model_optimization(
        self,
        model: nn.Module,
        quantization: str = "fp16",  # "fp16", "int8", or None
        prune: bool = False,
        prune_sparsity: float = 0.2
    ) -> nn.Module:
        """
        设置模型优化
        """
        self.quantizer = ModelQuantizer(model)
        
        # 模型量化
        if quantization == "fp16":
            model = self.quantizer.quantize_to_fp16()
        elif quantization == "int8":
            model = self.quantizer.quantize_to_int8()
        
        # 模型剪枝
        if prune:
            model = self.pruner.prune_model(model, prune_sparsity)
        
        # GPU优化
        model = self.gpu_optimizer.optimize_model_for_gpu(model)
        
        return model
    
    def enable_batch_inference(self, batch_size: int = 4):
        """启用批量推理"""
        self.batch_optimizer = BatchInferenceOptimizer(batch_size)
    
    def get_performance_report(self) -> Dict[str, Any]:
        """获取性能报告"""
        return {
            "cache": {
                "size": self.cache.size(),
                "capacity": self.cache.capacity
            },
            "memory_pool": self.memory_pool.get_usage(),
            "gpu": self.gpu_optimizer.get_gpu_memory_info()
        }


# 全局优化器实例
global_optimizer = PerformanceOptimizer()