"""
手语识别服务模块
整合手部关键点检测和ST-GCN模型，实现完整的视频手语识别流程
"""

import cv2
import numpy as np
import torch
from typing import Optional, List, Tuple, Dict, Any
from collections import deque
import logging
import threading
import time

from .hand_detector import HandDetector
from .stgcn_model import create_stgcn_model, STGCN
from utils.sign_vocab import SignVocab
from utils.model_loader import ModelLoader

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SignRecognitionService:
    """手语识别服务类"""
    
    # 默认配置
    DEFAULT_WINDOW_SIZE = 30  # 滑动窗口大小（帧数）
    DEFAULT_STRIDE = 1  # 滑动窗口步长
    DEFAULT_CONFIDENCE_THRESHOLD = 0.5  # 置信度阈值
    DEFAULT_SMOOTHING_WINDOW = 5  # 结果平滑窗口大小
    
    def __init__(
        self,
        vocab_path: Optional[str] = None,
        model_path: Optional[str] = None,
        device: Optional[str] = None,
        window_size: int = DEFAULT_WINDOW_SIZE,
        confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
        enable_batching: bool = True
    ):
        """
        初始化手语识别服务
        
        Parameters:
        -----------
        vocab_path: str, optional
            词汇表文件路径
        model_path: str, optional
            预训练模型路径
        device: str, optional
            设备类型 ('cuda' 或 'cpu')
        window_size: int
            视频帧序列窗口大小
        confidence_threshold: float
            识别结果置信度阈值
        enable_batching: bool
            是否启用批量推理优化
        """
        try:
            # 设备选择
            if device is None:
                self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
            else:
                self.device = device
            
            logger.info(f"使用设备: {self.device}")
            
            # 初始化词汇表
            self.vocab = SignVocab(vocab_path)
            num_classes = len(self.vocab)
            
            # 初始化模型加载器
            self.model_loader = ModelLoader(device=self.device)
            
            # 初始化ST-GCN模型
            self.model = self.model_loader.load_stgcn_model(
                model_path=model_path,
                num_classes=num_classes
            )
            self.model.eval()
            
            # 初始化手部检测器
            self.hand_detector = HandDetector()
            
            # 视频帧窗口管理
            self.window_size = window_size
            self.frame_buffer = deque(maxlen=window_size)
            self.confidence_buffer = deque(maxlen=window_size)
            self.prediction_history = deque(maxlen=self.DEFAULT_SMOOTHING_WINDOW)
            
            # 配置参数
            self.confidence_threshold = confidence_threshold
            self.enable_batching = enable_batching
            
            # 线程锁（用于多线程环境）
            self.lock = threading.Lock()
            
            # 统计信息
            self.total_frames = 0
            self.total_predictions = 0
            self.total_time = 0.0
            
            logger.info("手语识别服务初始化成功")
            
        except Exception as e:
            logger.error(f"手语识别服务初始化失败: {str(e)}")
            raise
    
    def process_frame(
        self, 
        frame: np.ndarray,
        return_features: bool = False
    ) -> Dict[str, Any]:
        """
        处理单帧图像
        
        Parameters:
        -----------
        frame: np.ndarray
            输入图像帧（BGR格式）
        return_features: bool
            是否返回提取的特征
            
        Returns:
        --------
        Dict[str, Any]
            包含识别结果和信息的字典
            {
                'success': bool,
                'prediction': str or None,
                'confidence': float,
                'keypoints': np.ndarray or None,
                'features': np.ndarray or None
            }
        """
        try:
            start_time = time.time()
            
            with self.lock:
                # 提取手部关键点
                keypoints, confidence = self.hand_detector.extract_keypoints(frame)
                
                if keypoints is None:
                    logger.warning("未检测到手部")
                    return {
                        'success': False,
                        'prediction': None,
                        'confidence': 0.0,
                        'keypoints': None,
                        'features': None
                    }
                
                # 更新帧缓冲区
                self.frame_buffer.append(keypoints)
                self.confidence_buffer.append(confidence)
                self.total_frames += 1
                
                # 检查是否有足够的帧进行识别
                if len(self.frame_buffer) < self.window_size:
                    logger.debug(f"帧缓冲区不足，当前: {len(self.frame_buffer)}/{self.window_size}")
                    return {
                        'success': True,
                        'prediction': None,
                        'confidence': 0.0,
                        'keypoints': keypoints,
                        'features': np.array(self.frame_buffer) if return_features else None
                    }
                
                # 执行识别
                result = self._recognize_from_buffer()
                
                # 记录时间
                elapsed_time = time.time() - start_time
                self.total_time += elapsed_time
                
                if return_features:
                    result['features'] = np.array(self.frame_buffer)
                
                result['keypoints'] = keypoints
                
                return result
            
        except Exception as e:
            logger.error(f"处理帧失败: {str(e)}")
            return {
                'success': False,
                'prediction': None,
                'confidence': 0.0,
                'keypoints': None,
                'features': None
            }
    
    def process_video(
        self,
        video_path: str,
        batch_size: Optional[int] = None,
        return_frame_results: bool = False
    ) -> Dict[str, Any]:
        """
        处理视频文件
        
        Parameters:
        -----------
        video_path: str
            视频文件路径
        batch_size: int, optional
            批次大小，None表示使用默认值
        return_frame_results: bool
            是否返回每一帧的识别结果
            
        Returns:
        --------
        Dict[str, Any]
            {
                'success': bool,
                'predictions': List[str],
                'confidences': List[float],
                'frame_results': List[Dict] or None
            }
        """
        try:
            logger.info(f"开始处理视频: {video_path}")
            
            # 打开视频文件
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"无法打开视频文件: {video_path}")
            
            # 获取视频信息
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            
            logger.info(f"视频信息 - 总帧数: {total_frames}, FPS: {fps:.2f}")
            
            predictions = []
            confidences = []
            frame_results = [] if return_frame_results else None
            
            frame_count = 0
            batch_size = batch_size if batch_size is not None else self.DEFAULT_STRIDE
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # 处理帧
                result = self.process_frame(frame)
                
                if result['success'] and result['prediction'] is not None:
                    predictions.append(result['prediction'])
                    confidences.append(result['confidence'])
                
                if return_frame_results:
                    frame_results.append(result)
                
                frame_count += 1
                
                # 显示进度
                if frame_count % 30 == 0:
                    logger.info(f"已处理: {frame_count}/{total_frames} 帧")
            
            cap.release()
            
            logger.info(f"视频处理完成，共识别: {len(predictions)} 个手势")
            
            return {
                'success': True,
                'predictions': predictions,
                'confidences': confidences,
                'frame_results': frame_results
            }
            
        except Exception as e:
            logger.error(f"处理视频失败: {str(e)}")
            return {
                'success': False,
                'predictions': [],
                'confidences': [],
                'frame_results': None
            }
    
    def _recognize_from_buffer(self) -> Dict[str, Any]:
        """
        从帧缓冲区进行识别
        
        Returns:
        --------
        Dict[str, Any]
            识别结果
        """
        try:
            # 准备输入数据
            buffer_array = np.array(self.frame_buffer)  # (window_size, 21, 2)
            
            # 转换为PyTorch张量
            input_tensor = torch.from_numpy(buffer_array).float()
            input_tensor = input_tensor.unsqueeze(0)  # (1, window_size, 21, 2)
            input_tensor = input_tensor.to(self.device)
            
            # 预测
            with torch.no_grad():
                probabilities = self.model.predict(input_tensor, return_probabilities=True)
            
            # 获取预测结果
            confidence, predicted_idx = torch.max(probabilities, dim=1)
            confidence = confidence.item()
            predicted_idx = predicted_idx.item()
            
            # 置信度过滤
            if confidence < self.confidence_threshold:
                logger.info(f"置信度过低: {confidence:.4f} < {self.confidence_threshold}")
                return {
                    'success': True,
                    'prediction': None,
                    'confidence': confidence
                }
            
            # 获取词汇
            prediction = self.vocab.idx_to_word(predicted_idx)
            
            # 结果平滑处理
            smoothed_prediction = self._apply_smoothing(prediction, confidence)
            
            self.total_predictions += 1
            
            logger.debug(f"预测结果: {prediction}, 置信度: {confidence:.4f}")
            
            return {
                'success': True,
                'prediction': smoothed_prediction,
                'confidence': confidence
            }
            
        except Exception as e:
            logger.error(f"识别失败: {str(e)}")
            return {
                'success': False,
                'prediction': None,
                'confidence': 0.0
            }
    
    def _apply_smoothing(
        self, 
        prediction: str, 
        confidence: float
    ) -> str:
        """
        应用结果平滑处理
        
        Parameters:
        -----------
        prediction: str
            当前预测结果
        confidence: float
            置信度
            
        Returns:
        --------
        str
            平滑后的预测结果
        """
        # 将预测结果添加到历史记录
        self.prediction_history.append((prediction, confidence))
        
        # 如果历史记录不足，直接返回
        if len(self.prediction_history) < self.DEFAULT_SMOOTHING_WINDOW:
            return prediction
        
        # 统计预测结果
        prediction_counts = {}
        confidence_sum = {}
        
        for pred, conf in self.prediction_history:
            if pred is not None:
                prediction_counts[pred] = prediction_counts.get(pred, 0) + 1
                confidence_sum[pred] = confidence_sum.get(pred, 0.0) + conf
        
        # 选择出现次数最多的预测
        if not prediction_counts:
            return prediction
        
        best_prediction = max(prediction_counts, key=lambda x: prediction_counts[x])
        
        # 如果最频繁的预测出现次数超过阈值，返回它
        if prediction_counts[best_prediction] >= self.DEFAULT_SMOOTHING_WINDOW // 2:
            return best_prediction
        
        return prediction
    
    def reset_buffer(self):
        """重置帧缓冲区"""
        with self.lock:
            self.frame_buffer.clear()
            self.confidence_buffer.clear()
            self.prediction_history.clear()
            logger.info("帧缓冲区已重置")
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        获取统计信息
        
        Returns:
        --------
        Dict[str, Any]
            统计信息字典
        """
        with self.lock:
            avg_time = self.total_time / self.total_frames if self.total_frames > 0 else 0.0
            fps = 1.0 / avg_time if avg_time > 0 else 0.0
            
            return {
                'total_frames': self.total_frames,
                'total_predictions': self.total_predictions,
                'total_time': self.total_time,
                'average_time_per_frame': avg_time,
                'fps': fps,
                'buffer_size': len(self.frame_buffer),
                'device': self.device
            }
    
    def set_confidence_threshold(self, threshold: float):
        """
        设置置信度阈值
        
        Parameters:
        -----------
        threshold: float
            新的置信度阈值
        """
        if 0.0 <= threshold <= 1.0:
            self.confidence_threshold = threshold
            logger.info(f"置信度阈值设置为: {threshold}")
        else:
            logger.warning(f"无效的置信度阈值: {threshold}，必须在[0, 1]范围内")
    
    def set_window_size(self, size: int):
        """
        设置窗口大小
        
        Parameters:
        -----------
        size: int
            新的窗口大小
        """
        if size > 0:
            self.window_size = size
            # 重置缓冲区
            self.reset_buffer()
            logger.info(f"窗口大小设置为: {size}")
        else:
            logger.warning(f"无效的窗口大小: {size}")


class RealTimeSignRecognizer:
    """实时手语识别器（用于WebCam等实时流）"""
    
    def __init__(
        self,
        recognition_service: SignRecognitionService,
        display: bool = False,
        save_path: Optional[str] = None
    ):
        """
        初始化实时识别器
        
        Parameters:
        -----------
        recognition_service: SignRecognitionService
            手语识别服务实例
        display: bool
            是否显示实时画面
        save_path: str, optional
            保存视频的路径
        """
        self.service = recognition_service
        self.display = display
        self.save_path = save_path
        self.writer = None
        self.running = False
        
        logger.info("实时手语识别器初始化完成")
    
    def start(self, camera_index: int = 0):
        """
        启动实时识别
        
        Parameters:
        -----------
        camera_index: int
            摄像头索引
        """
        try:
            # 打开摄像头
            cap = cv2.VideoCapture(camera_index)
            if not cap.isOpened():
                raise ValueError(f"无法打开摄像头: {camera_index}")
            
            # 设置视频 writer
            if self.save_path:
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                self.writer = cv2.VideoWriter(
                    self.save_path,
                    fourcc,
                    30.0,
                    (640, 480)
                )
            
            self.running = True
            logger.info("实时识别已启动")
            
            while self.running:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # 处理帧
                result = self.service.process_frame(frame)
                
                # 显示结果
                if self.display or self.save_path:
                    self._draw_result(frame, result)
                
                if self.display:
                    cv2.imshow('Sign Language Recognition', frame)
                    
                    # 按 'q' 退出
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                
                if self.writer:
                    self.writer.write(frame)
            
            # 清理资源
            cap.release()
            if self.writer:
                self.writer.release()
            cv2.destroyAllWindows()
            
            logger.info("实时识别已停止")
            
        except Exception as e:
            logger.error(f"实时识别错误: {str(e)}")
            self.running = False
    
    def stop(self):
        """停止实时识别"""
        self.running = False
        logger.info("正在停止实时识别...")
    
    def _draw_result(self, frame: np.ndarray, result: Dict[str, Any]):
        """
        在图像上绘制识别结果
        
        Parameters:
        -----------
        frame: np.ndarray
            原始图像
        result: Dict[str, Any]
            识别结果
        """
        height, width = frame.shape[:2]
        
        # 绘制置信度
        confidence = result.get('confidence', 0.0)
        cv2.putText(
            frame,
            f"Confidence: {confidence:.4f}",
            (10, height - 100),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )
        
        # 绘制预测结果
        prediction = result.get('prediction', '...')
        if prediction:
            cv2.putText(
                frame,
                f"Prediction: {prediction}",
                (10, height - 60),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2
            )
        else:
            cv2.putText(
                frame,
                "Detecting...",
                (10, height - 60),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 0),
                2
            )
        
        # 绘制统计信息
        stats = self.service.get_statistics()
        cv2.putText(
            frame,
            f"FPS: {stats['fps']:.1f}",
            (10, height - 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2
        )


# 导出工厂函数
def create_sign_recognition_service(
    vocab_path: Optional[str] = None,
    model_path: Optional[str] = None,
    device: Optional[str] = None,
    **kwargs
) -> SignRecognitionService:
    """
    创建手语识别服务实例
    
    Parameters:
    -----------
    vocab_path: str, optional
        词汇表文件路径
    model_path: str, optional
        预训练模型路径
    device: str, optional
        设备类型
    **kwargs
        其他配置参数
        
    Returns:
    --------
    SignRecognitionService
        手语识别服务实例
    """
    return SignRecognitionService(
        vocab_path=vocab_path,
        model_path=model_path,
        device=device,
        **kwargs
    )