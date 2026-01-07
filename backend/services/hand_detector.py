"""
手部关键点检测器模块
基于 MediaPipe Hands 实现21个手部关键点检测
"""

import cv2
import mediapipe as mp
import numpy as np
from typing import Optional, Tuple, List
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HandDetector:
    """手部关键点检测器类"""
    
    # 手部关键点数量
    NUM_KEYPOINTS = 21
    
    def __init__(
        self, 
        max_num_hands: int = 2,
        min_detection_confidence: float = 0.7,
        min_tracking_confidence: float = 0.5,
        model_complexity: int = 1
    ):
        """
        初始化手部检测器
        
        Parameters:
        -----------
        max_num_hands: int
            最大检测手数，默认为2
        min_detection_confidence: float
            最小检测置信度阈值，范围[0.0, 1.0]
        min_tracking_confidence: float
            最小跟踪置信度阈值
        model_complexity: int
            模型复杂度：0为轻量级，1为完整模型
        """
        try:
            # 初始化 MediaPipe Hands
            self.mp_hands = mp.solutions.hands
            self.hands = self.mp_hands.Hands(
                max_num_hands=max_num_hands,
                min_detection_confidence=min_detection_confidence,
                min_tracking_confidence=min_tracking_confidence,
                model_complexity=model_complexity
            )
            self.mp_drawing = mp.solutions.drawing_utils
            
            logger.info("手部检测器初始化成功")
            
        except Exception as e:
            logger.error(f"手部检测器初始化失败: {str(e)}")
            raise
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        预处理图像帧
        
        Parameters:
        -----------
        image: np.ndarray
            原始BGR格式图像
            
        Returns:
        --------
        np.ndarray
            预处理后的RGB格式图像
        """
        try:
            # 转换颜色空间：BGR -> RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # 确保图像格式正确
            if image_rgb.dtype != np.uint8:
                image_rgb = (image_rgb * 255).astype(np.uint8)
            
            return image_rgb
            
        except Exception as e:
            logger.error(f"图像预处理失败: {str(e)}")
            raise
    
    def extract_keypoints(
        self, 
        image: np.ndarray,
        normalize: bool = True
    ) -> Tuple[Optional[np.ndarray], float]:
        """
        提取手部关键点
        
        Parameters:
        -----------
        image: np.ndarray
            输入图像帧
        normalize: bool
            是否对关键点进行归一化
            
        Returns:
        --------
        Tuple[Optional[np.ndarray], float]
            (关键点坐标数组, 置信度)
            关键点形状为 (21, 2) 或 (21, 3) 如果包含深度信息
            如果未检测到手，返回 (None, 0.0)
        """
        try:
            # 预处理图像
            image_rgb = self.preprocess_image(image)
            
            # 执行手部检测
            results = self.hands.process(image_rgb)
            
            # 检查是否检测到手部
            if results.multi_hand_landmarks is None:
                logger.warning("未检测到手部关键点")
                return None, 0.0
            
            # 获取第一只手的关键点（优先选择左手或置信度更高的手）
            hand_landmarks = results.multi_hand_landmarks[0]
            
            # 提取21个关键点的x, y坐标
            keypoints = []
            for landmark in hand_landmarks.landmark:
                keypoints.append([landmark.x, landmark.y])
            
            keypoints_array = np.array(keypoints, dtype=np.float32)
            
            # 归一化处理
            if normalize:
                keypoints_array = self._normalize_keypoints(keypoints_array)
            
            # 计算平均置信度
            confidence = self._calculate_confidence(hand_landmarks)
            
            logger.debug(f"成功提取手部关键点，置信度: {confidence:.4f}")
            
            return keypoints_array, confidence
            
        except Exception as e:
            logger.error(f"关键点提取失败: {str(e)}")
            return None, 0.0
    
    def extract_keypoints_batch(
        self, 
        images: List[np.ndarray],
        normalize: bool = True
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        批量提取多帧图像的手部关键点
        
        Parameters:
        -----------
        images: List[np.ndarray]
            图像帧列表
        normalize: bool
            是否对关键点进行归一化
            
        Returns:
        --------
        Tuple[np.ndarray, np.ndarray]
            (关键点数组, 置信度数组)
            关键点数组形状: (num_frames, 21, 2)
            置信度数组形状: (num_frames,)
        """
        keypoints_list = []
        confidences = []
        
        for idx, image in enumerate(images):
            keypoints, confidence = self.extract_keypoints(image, normalize)
            
            if keypoints is not None:
                keypoints_list.append(keypoints)
                confidences.append(confidence)
            else:
                # 如果检测失败，用零向量填充
                logger.warning(f"第 {idx} 帧检测失败，使用零向量填充")
                keypoints_list.append(np.zeros((self.NUM_KEYPOINTS, 2), dtype=np.float32))
                confidences.append(0.0)
        
        return np.array(keypoints_list), np.array(confidences)
    
    def _normalize_keypoints(self, keypoints: np.ndarray) -> np.ndarray:
        """
        归一化关键点坐标
        
        Parameters:
        -----------
        keypoints: np.ndarray
            原始关键点坐标 (21, 2)
            
        Returns:
        --------
        np.ndarray
            归一化后的关键点坐标 (21, 2)
        """
        try:
            # 以手腕（第0个点）作为原点
            wrist = keypoints[0]
            keypoints_centered = keypoints - wrist
            
            # 计算缩放因子（使用中指根部到指尖的距离作为基准）
            base_point = keypoints[9]  # 中指根部
            tip_point = keypoints[12]  # 中指指尖
            scale = np.linalg.norm(tip_point - base_point)
            
            if scale < 1e-6:  # 避免除零
                scale = 1.0
            
            # 归一化坐标
            keypoints_normalized = keypoints_centered / scale
            
            return keypoints_normalized
            
        except Exception as e:
            logger.error(f"关键点归一化失败: {str(e)}")
            return keypoints
    
    def _calculate_confidence(self, hand_landmarks) -> float:
        """
        计算手部检测的置信度
        
        Parameters:
        -----------
        hand_landmarks
            MediaPipe手部关键点对象
            
        Returns:
        --------
        float
            平均置信度分数
        """
        try:
            # 使用可见性作为置信度指标
            confidences = [landmark.visibility for landmark in hand_landmarks.landmark]
            return float(np.mean(confidences))
        except:
            return 0.5  # 默认置信度
    
    def visualize_keypoints(
        self, 
        image: np.ndarray, 
        keypoints: np.ndarray
    ) -> np.ndarray:
        """
        在图像上可视化关键点
        
        Parameters:
        -----------
        image: np.ndarray
            原始图像
        keypoints: np.ndarray
            归一化的关键点坐标 (21, 2)
            
        Returns:
        --------
        np.ndarray
            绘制关键点后的图像
        """
        try:
            # 恢复到像素坐标
            h, w = image.shape[:2]
            pixel_keypoints = keypoints.astype(np.float32)
            
            # 简单地将归一化坐标映射回像素坐标
            # 注意：这里假设关键点是归一化到手腕原点的
            # 实际可视化时可能需要使用原始坐标
            for i, (x, y) in enumerate(pixel_keypoints):
                px = int(x * w)
                py = int(y * h)
                cv2.circle(image, (px, py), 5, (0, 255, 0), -1)
                cv2.putText(
                    image, 
                    str(i), 
                    (px + 5, py - 5), 
                    cv2.FONT_HERSHEY_SIMPLEX, 
                    0.5, 
                    (0, 255, 0), 
                    1
                )
            
            return image
            
        except Exception as e:
            logger.error(f"关键点可视化失败: {str(e)}")
            return image
    
    def draw_hand_landmarks(
        self, 
        image: np.ndarray,
        hand_landmarks
    ) -> np.ndarray:
        """
        使用 MediaPipe 的绘制工具绘制手部关键点和连接线
        
        Parameters:
        -----------
        image: np.ndarray
            原始图像
        hand_landmarks
            MediaPipe 手部关键点对象
            
        Returns:
        --------
        np.ndarray
            绘制后的图像
        """
        try:
            # 转换为 RGB 以便 MediaPipe 绘制
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            self.mp_drawing.draw_landmarks(
                image_rgb,
                hand_landmarks,
                self.mp_hands.HAND_CONNECTIONS
            )
            # 转回 BGR
            return cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
        except Exception as e:
            logger.error(f"绘制手部关键点失败: {str(e)}")
            return image
    
    def __del__(self):
        """析构函数，释放资源"""
        try:
            if hasattr(self, 'hands'):
                self.hands.close()
                logger.debug("手部检测器资源已释放")
        except:
            pass