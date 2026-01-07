"""
性能监控模块
实时监控系统性能指标，包括FPS、延迟、内存使用等
"""

import time
import threading
import psutil
from typing import Dict, List, Any, Optional, Callable
from collections import deque
from datetime import datetime
import json
from functools import wraps

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


class FPSMonitor:
    """FPS监控器 - 监控帧率"""
    
    def __init__(self, window_size: int = 30):
        self.window_size = window_size
        self.frame_times: deque = deque(maxlen=window_size)
        self.lock = threading.Lock()
        self.last_frame_time: Optional[float] = None
        self.frame_count = 0
    
    def tick(self):
        """记录一帧的时间戳"""
        current_time = time.time()
        with self.lock:
            if self.last_frame_time is not None:
                frame_time = current_time - self.last_frame_time
                self.frame_times.append(frame_time)
            self.last_frame_time = current_time
            self.frame_count += 1
    
    def get_fps(self) -> float:
        """获取当前FPS"""
        with self.lock:
            if len(self.frame_times) == 0:
                return 0.0
            
            avg_frame_time = sum(self.frame_times) / len(self.frame_times)
            return 1.0 / avg_frame_time if avg_frame_time > 0 else 0.0
    
    def get_avg_fps(self, seconds: int = 5) -> float:
        """获取指定时间窗口内的平均FPS"""
        with self.lock:
            if len(self.frame_times) == 0:
                return 0.0
            
            # 计算最近的帧数
            frames_to_count = min(int(seconds / (sum(self.frame_times) / len(self.frame_times))), 
                                 len(self.frame_times))
            
            recent_times = list(self.frame_times)[-frames_to_count:]
            if not recent_times:
                return 0.0
            
            avg_time = sum(recent_times) / len(recent_times)
            return 1.0 / avg_time if avg_time > 0 else 0.0
    
    def reset(self):
        """重置监控器"""
        with self.lock:
            self.frame_times.clear()
            self.last_frame_time = None
            self.frame_count = 0


class LatencyMonitor:
    """延迟监控器 - 监控操作延迟"""
    
    def __init__(self, history_size: int = 100):
        self.history_size = history_size
        self.latencies: deque = deque(maxlen=history_size)
        self.lock = threading.Lock()
        self.start_times: Dict[str, float] = {}
    
    def start(self, operation_id: str):
        """开始计时"""
        self.start_times[operation_id] = time.time()
    
    def end(self, operation_id: str) -> Optional[float]:
        """结束计时并返回延迟"""
        if operation_id not in self.start_times:
            return None
        
        start_time = self.start_times.pop(operation_id)
        latency = time.time() - start_time
        
        with self.lock:
            self.latencies.append(latency)
        
        return latency
    
    def get_stats(self) -> Dict[str, float]:
        """获取延迟统计信息"""
        with self.lock:
            if len(self.latencies) == 0:
                return {
                    "avg": 0.0,
                    "min": 0.0,
                    "max": 0.0,
                    "p50": 0.0,
                    "p95": 0.0,
                    "p99": 0.0
                }
            
            latencies = sorted(list(self.latencies))
            count = len(latencies)
            
            return {
                "avg": sum(latencies) / count,
                "min": latencies[0],
                "max": latencies[-1],
                "p50": latencies[int(count * 0.50)],
                "p95": latencies[int(count * 0.95)],
                "p99": latencies[int(count * 0.99)]
            }
    
    def reset(self):
        """重置监控器"""
        with self.lock:
            self.latencies.clear()
        self.start_times.clear()


class MemoryMonitor:
    """内存使用监控器"""
    
    def __init__(self, history_size: int = 60):
        self.history_size = history_size
        self.memory_history: deque = deque(maxlen=history_size)
        self.lock = threading.Lock()
        self.process = psutil.Process()
    
    def record(self):
        """记录当前内存使用情况"""
        try:
            memory_info = {
                "timestamp": datetime.now().isoformat(),
                "rss": self.process.memory_info().rss,
                "vms": self.process.memory_info().vms,
                "percent": self.process.memory_percent()
            }
            
            with self.lock:
                self.memory_history.append(memory_info)
                
        except Exception as e:
            print(f"记录内存信息失败: {e}")
    
    def get_current(self) -> Dict[str, Any]:
        """获取当前内存使用情况"""
        try:
            mem_info = self.process.memory_info()
            return {
                "rss": mem_info.rss,
                "vms": mem_info.vms,
                "percent": self.process.memory_percent(),
                "rss_mb": mem_info.rss / (1024 * 1024),
                "vms_mb": mem_info.vms / (1024 * 1024)
            }
        except Exception as e:
            print(f"获取内存信息失败: {e}")
            return {}
    
    def get_history(self) -> List[Dict[str, Any]]:
        """获取内存使用历史"""
        with self.lock:
            return list(self.memory_history)
    
    def get_memory_trend(self) -> Dict[str, float]:
        """获取内存使用趋势"""
        with self.lock:
            if len(self.memory_history) < 2:
                return {"trend": "stable", "change_mb": 0.0}
            
            latest = self.memory_history[-1]["rss"]
            earliest = self.memory_history[0]["rss"]
            change = latest - earliest
            change_mb = change / (1024 * 1024)
            
            if abs(change_mb) < 1:
                trend = "stable"
            elif change_mb > 0:
                trend = "increasing"
            else:
                trend = "decreasing"
            
            return {
                "trend": trend,
                "change_bytes": change,
                "change_mb": change_mb
            }


class GPUMonitor:
    """GPU利用率监控器"""
    
    def __init__(self, history_size: int = 60):
        self.history_size = history_size
        self.gpu_history: deque = deque(maxlen=history_size)
        self.lock = threading.Lock()
    
    def record(self):
        """记录GPU使用情况"""
        if not TORCH_AVAILABLE or not torch.cuda.is_available():
            return
        
        try:
            gpu_info = {
                "timestamp": datetime.now().isoformat(),
                "devices": []
            }
            
            for i in range(torch.cuda.device_count()):
                device_info = {
                    "device": i,
                    "memory_allocated": torch.cuda.memory_allocated(i),
                    "memory_reserved": torch.cuda.memory_reserved(i),
                    "memory_total": torch.cuda.get_device_properties(i).total_memory,
                    "utilization": torch.cuda.memory_allocated(i) / 
                                  torch.cuda.get_device_properties(i).total_memory
                }
                gpu_info["devices"].append(device_info)
            
            with self.lock:
                self.gpu_history.append(gpu_info)
                
        except Exception as e:
            print(f"记录GPU信息失败: {e}")
    
    def get_current(self) -> Dict[str, Any]:
        """获取当前GPU使用情况"""
        if not TORCH_AVAILABLE or not torch.cuda.is_available():
            return {"available": False}
        
        try:
            result = {"available": True, "devices": []}
            
            for i in range(torch.cuda.device_count()):
                props = torch.cuda.get_device_properties(i)
                allocated = torch.cuda.memory_allocated(i)
                reserved = torch.cuda.memory_reserved(i)
                
                device_info = {
                    "device": i,
                    "name": props.name,
                    "memory_allocated_mb": allocated / (1024 * 1024),
                    "memory_reserved_mb": reserved / (1024 * 1024),
                    "memory_total_mb": props.total_memory / (1024 * 1024),
                    "memory_free_mb": (props.total_memory - reserved) / (1024 * 1024),
                    "utilization": allocated / props.total_memory
                }
                result["devices"].append(device_info)
            
            return result
            
        except Exception as e:
            print(f"获取GPU信息失败: {e}")
            return {"available": False, "error": str(e)}
    
    def get_history(self) -> List[Dict[str, Any]]:
        """获取GPU使用历史"""
        with self.lock:
            return list(self.gpu_history)


class PerformanceMetrics:
    """性能指标收集器"""
    
    def __init__(self):
        self.metrics: Dict[str, Any] = {}
        self.lock = threading.Lock()
    
    def set(self, key: str, value: Any):
        """设置指标值"""
        with self.lock:
            self.metrics[key] = {
                "value": value,
                "timestamp": datetime.now().isoformat()
            }
    
    def increment(self, key: str, amount: int = 1):
        """递增指标值"""
        with self.lock:
            if key not in self.metrics:
                self.metrics[key] = {
                    "value": 0,
                    "timestamp": datetime.now().isoformat()
                }
            self.metrics[key]["value"] += amount
            self.metrics[key]["timestamp"] = datetime.now().isoformat()
    
    def get(self, key: str) -> Optional[Any]:
        """获取指标值"""
        with self.lock:
            return self.metrics.get(key, {}).get("value")
    
    def get_all(self) -> Dict[str, Any]:
        """获取所有指标"""
        with self.lock:
            return self.metrics.copy()
    
    def reset(self):
        """重置所有指标"""
        with self.lock:
            self.metrics.clear()


class PerformanceReporter:
    """性能报告生成器"""
    
    def __init__(self):
        self.fps_monitor = FPSMonitor()
        self.latency_monitor = LatencyMonitor()
        self.memory_monitor = MemoryMonitor()
        self.gpu_monitor = GPUMonitor()
        self.metrics = PerformanceMetrics()
    
    def generate_report(self) -> Dict[str, Any]:
        """生成性能报告"""
        return {
            "timestamp": datetime.now().isoformat(),
            "fps": {
                "current": self.fps_monitor.get_fps(),
                "avg_5s": self.fps_monitor.get_avg_fps(5)
            },
            "latency": self.latency_monitor.get_stats(),
            "memory": self.memory_monitor.get_current(),
            "memory_trend": self.memory_monitor.get_memory_trend(),
            "gpu": self.gpu_monitor.get_current(),
            "custom_metrics": self.metrics.get_all()
        }
    
    def save_report(self, filepath: str):
        """保存性能报告到文件"""
        report = self.generate_report()
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
    
    def start_background_monitoring(self, interval: float = 1.0):
        """启动后台监控"""
        def monitor_loop():
            while True:
                self.memory_monitor.record()
                self.gpu_monitor.record()
                time.sleep(interval)
        
        thread = threading.Thread(target=monitor_loop, daemon=True)
        thread.start()


# 装饰器用于监控函数性能
def monitor_performance(monitor: PerformanceReporter, operation_name: str):
    """性能监控装饰器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            # 开始记录
            monitor.latency_monitor.start(operation_name)
            
            try:
                result = func(*args, **kwargs)
                
                # 记录成功
                latency = monitor.latency_monitor.end(operation_name)
                monitor.metrics.increment(f"{operation_name}_count")
                monitor.metrics.set(f"{operation_name}_last_latency", latency)
                
                return result
                
            except Exception as e:
                # 记录失败
                monitor.metrics.increment(f"{operation_name}_errors")
                raise
        
        return wrapper
    return decorator


# 全局性能监控器实例
global_monitor = PerformanceReporter()