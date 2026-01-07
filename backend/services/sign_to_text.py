"""
手语到文本服务模块
将手语识别结果转换为可读文本
包括序列化、时序处理、词汇映射和句子构建
"""

import logging
import numpy as np
from typing import Dict, List, Tuple, Optional, Union
from dataclasses import dataclass, field
from collections import deque
import time

logger = logging.getLogger(__name__)


@dataclass
class SignGesture:
    """手语手势数据类"""
    sign_id: str  # 手语ID
    text: str  # 对应文本
    confidence: float  # 置信度
    timestamp: float  # 时间戳
    start_time: float  # 手势开始时间
    end_time: float  # 手势结束时间
    landmarks: Optional[List[float]] = None  # 关键点
    additional_info: Dict = field(default_factory=dict)


@dataclass
class TextSegment:
    """文本片段数据类"""
    text: str  # 文本内容
    confidence: float  # 置信度
    start_time: float  # 开始时间
    end_time: float  # 结束时间
    sign_count: int = 0  # 包含的手语数量


class SequenceSmoother:
    """
    序列平滑处理器
    处理手语识别的时序平滑和去抖动
    """
    
    def __init__(
        self,
        window_size: int = 5,
        min_duration: float = 0.3,
        confidence_threshold: float = 0.6
    ):
        """
        初始化序列平滑器
        
        参数:
            window_size: 滑动窗口大小
            min_duration: 最小手势持续时间（秒）
            confidence_threshold: 置信度阈值
        """
        self.window_size = window_size
        self.min_duration = min_duration
        self.confidence_threshold = confidence_threshold
        self.window = deque(maxlen=window_size)
        
        logger.info(
            f"初始化序列平滑器: window_size={window_size}, "
            f"min_duration={min_duration}s, confidence_threshold={confidence_threshold}"
        )
    
    def smooth_sequence(
        self,
        gestures: List[SignGesture]
    ) -> List[SignGesture]:
        """
        平滑手势序列
        
        参数:
            gestures: 原始手势列表
            
        返回:
            平滑后的手势列表
        """
        if not gestures:
            return []
        
        smoothed = []
        i = 0
        
        while i < len(gestures):
            gesture = gestures[i]
            
            # 过滤低置信度手势
            if gesture.confidence < self.confidence_threshold:
                i += 1
                continue
            
            # 查找连续相似手势
            similar_gestures = [gesture]
            j = i + 1
            
            while j < len(gestures):
                next_gesture = gestures[j]
                
                # 检查是否为同一手势且时间接近
                if (next_gesture.sign_id == gesture.sign_id and
                    (next_gesture.timestamp - gesture.timestamp) < 1.0):
                    similar_gestures.append(next_gesture)
                    j += 1
                else:
                    break
            
            # 根据持续时间决定是否保留
            duration = similar_gestures[-1].end_time - similar_gestures[0].start_time
            
            if duration >= self.min_duration:
                # 合并为一个手势
                merged = self._merge_gestures(similar_gestures)
                smoothed.append(merged)
                i = j
            else:
                i += 1
        
        return smoothed
    
    def _merge_gestures(
        self,
        gestures: List[SignGesture]
    ) -> SignGesture:
        """
        合并相似手势
        
        参数:
            gestures: 待合并的手势列表
            
        返回:
            合并后的手势
        """
        # 使用平均置信度
        avg_confidence = np.mean([g.confidence for g in gestures])
        
        # 使用第一个手势的核心信息
        merged = SignGesture(
            sign_id=gestures[0].sign_id,
            text=gestures[0].text,
            confidence=float(avg_confidence),
            timestamp=gestures[0].timestamp,
            start_time=gestures[0].start_time,
            end_time=gestures[-1].end_time,
            landmarks=np.mean([g.landmarks for g in gestures if g.landmarks is not None],
                             axis=0).tolist() if any(g.landmarks is not None for g in gestures) else None
        )
        
        return merged
    
    def filter_by_moving_average(
        self,
        gestures: List[SignGesture],
        threshold: float = 0.3
    ) -> List[SignGesture]:
        """
        使用移动平均过滤手势
        
        参数:
            gestures: 手势列表
            threshold: 阈值
            
        返回:
            过滤后的手势列表
        """
        if not gestures:
            return []
        
        filtered = []
        
        for i, gesture in enumerate(gestures):
            # 获取窗口内的手势
            start = max(0, i - self.window_size // 2)
            end = min(len(gestures), i + self.window_size // 2 + 1)
            window_gestures = gestures[start:end]
            
            # 计算同一手势在窗口内的频率
            same_sign_count = sum(
                1 for g in window_gestures
                if g.sign_id == gesture.sign_id
            )
            
            # 如果频率足够高，保留该手势
            if same_sign_count >= len(window_gestures) * threshold:
                filtered.append(gesture)
        
        return filtered


class SignToTextMapper:
    """
    手语到文本映射器
    处理手语词汇到文本词汇的映射
    """
    
    def __init__(self, translation_dict):
        """
        初始化映射器
        
        参数:
            translation_dict: 翻译字典实例
        """
        self.translation_dict = translation_dict
        self.cache: Dict[str, List[Tuple[str, float]]] = {}
        
        logger.info("初始化手语到文本映射器")
    
    def map_gesture_to_text(
        self,
        sign_id: str,
        top_k: int = 1
    ) -> List[Tuple[str, float]]:
        """
        映射手势到文本
        
        参数:
            sign_id: 手语ID
            top_k: 返回前k个结果
            
        返回:
            文本和权重的元组列表
        """
        # 检查缓存
        cache_key = f"{sign_id}_{top_k}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # 获取映射
        mappings = self.translation_dict.get_text_from_sign(sign_id, top_k=top_k)
        
        # 如果没有精确匹配，尝试模糊匹配
        if not mappings:
            similar_signs = self.translation_dict.fuzzy_match_sign(sign_id)
            if similar_signs:
                for similar_sign in similar_signs[:top_k]:
                    similar_mappings = self.translation_dict.get_text_from_sign(
                        similar_sign, top_k=1
                    )
                    mappings.extend(similar_mappings)
        
        # 缓存结果
        self.cache[cache_key] = mappings
        
        return mappings
    
    def disambiguate_text(
        self,
        candidate_texts: List[Tuple[str, float]],
        context: Optional[List[str]] = None
    ) -> str:
        """
        根据上下文消除歧义
        
        参数:
            candidate_texts: 候选文本列表
            context: 上下文信息
            
        返回:
            消歧后的文本
        """
        if not candidate_texts:
            return ""
        
        # 如果只有一个候选，直接返回
        if len(candidate_texts) == 1:
            return candidate_texts[0][0]
        
        # 基于权重和上下文选择最佳候选
        best_text = candidate_texts[0][0]
        best_score = candidate_texts[0][1]
        
        for text, confidence in candidate_texts[1:]:
            score = confidence
            
            # 上下文相似度加权
            if context:
                context_match = sum(1 for ctx in context if ctx in text)
                score += context_match * 0.1
            
            if score > best_score:
                best_score = score
                best_text = text
        
        return best_text
    
    def batch_map_gestures(
        self,
        gestures: List[SignGesture],
        context_window: int = 3
    ) -> List[SignGesture]:
        """
        批量映射手势到文本
        
        参数:
            gestures: 手势列表
            context_window: 上下文窗口大小
            
        返回:
            更新后的手势列表
        """
        mapped = []
        
        for i, gesture in enumerate(gestures):
            # 获取上下文
            start = max(0, i - context_window)
            end = min(len(gestures), i + context_window + 1)
            context = [g.text for g in gestures[start:end] if g.text]
            
            # 映射手势
            mappings = self.map_gesture_to_text(gesture.sign_id, top_k=3)
            
            if mappings:
                # 消歧
                text = self.disambiguate_text(mappings, context)
                gesture.text = text
                mapped.append(gesture)
            else:
                # 保留原始文本（如果有）
                if gesture.text:
                    mapped.append(gesture)
        
        return mapped


class TextBuilder:
    """
    文本构建器
    构建最终的可读文本
    """
    
    def __init__(self, punctuation: bool = True):
        """
        初始化文本构建器
        
        参数:
            punctuation: 是否添加标点符号
        """
        self.punctuation = punctuation
        self.sentence_endings = ['。', '？', '！', '.', '?', '!']
        
        logger.info("初始化文本构建器")
    
    def build_sentence(
        self,
        segments: List[TextSegment],
        join_char: str = ""
    ) -> str:
        """
        构建句子
        
        参数:
            segments: 文本片段列表
            join_char: 连接字符
            
        返回:
            完整句子
        """
        if not segments:
            return ""
        
        # 提取文本
        texts = [seg.text.strip() for seg in segments if seg.text.strip()]
        
        # 过滤重复
        filtered_texts = [texts[0]] if texts else []
        for i in range(1, len(texts)):
            if texts[i] != texts[i-1]:
                filtered_texts.append(texts[i])
        
        # 连接文本
        sentence = join_char.join(filtered_texts)
        
        # 添加标点符号
        if self.punctuation and sentence and not any(
            sentence.endswith(p) for p in self.sentence_endings
        ):
            # 简单的标点添加规则
            if self._is_question(sentence):
                sentence += '？'
            else:
                sentence += '。'
        
        return sentence
    
    def _is_question(self, sentence: str) -> bool:
        """
        判断是否为疑问句
        
        参数:
            sentence: 句子
            
        返回:
            是否为疑问句
        """
        question_words = ['什么', '哪里', '谁', '为什么', '怎么', '几', '多少', '吗', '吧']
        return any(word in sentence for word in question_words)
    
    def format_with_punctuation(
        self,
        text: str
    ) -> str:
        """
        格式化文本并添加标点
        
        参数:
            text: 原始文本
            
        返回:
            格式化后的文本
        """
        if not text:
            return text
        
        # 移除多余空格
        text = ' '.join(text.split())
        
        # 添加标点
        if self.punctuation:
            if not any(text.endswith(p) for p in self.sentence_endings):
                if self._is_question(text):
                    text += '？'
                else:
                    text += '。'
        
        return text


class SignToTextService:
    """
    手语到文本服务
    整合所有组件提供完整的手语翻译服务
    """
    
    def __init__(
        self,
        translation_dict,
        grammar_processor=None,
        window_size: int = 5,
        confidence_threshold: float = 0.6,
        min_duration: float = 0.3
    ):
        """
        初始化手语到文本服务
        
        参数:
            translation_dict: 翻译字典
            grammar_processor: 语法处理器
            window_size: 平滑窗口大小
            confidence_threshold: 置信度阈值
            min_duration: 最小手势持续时间
        """
        self.translation_dict = translation_dict
        self.grammar_processor = grammar_processor
        
        # 初始化子组件
        self.smoother = SequenceSmoother(
            window_size=window_size,
            min_duration=min_duration,
            confidence_threshold=confidence_threshold
        )
        
        self.mapper = SignToTextMapper(translation_dict)
        self.builder = TextBuilder(punctuation=True)
        
        # 统计信息
        self.stats = {
            'total_processed': 0,
            'total_gestures': 0,
            'average_confidence': 0.0
        }
        
        logger.info("初始化手语到文本服务完成")
    
    def translate(
        self,
        sign_sequence: List[Dict],
        apply_grammar: bool = True
    ) -> Dict:
        """
        翻译手语序列到文本
        
        参数:
            sign_sequence: 手语序列
            apply_grammar: 是否应用语法规则
            
        返回:
            翻译结果字典
        """
        start_time = time.time()
        
        # 转换为手势对象
        gestures = self._convert_to_gestures(sign_sequence)
        
        # 统计
        self.stats['total_processed'] += 1
        self.stats['total_gestures'] += len(gestures)
        
        if not gestures:
            return {
                'text': '',
                'confidence': 0.0,
                'segments': [],
                'processing_time': time.time() - start_time,
                'gesture_count': 0
            }
        
        # 平滑序列
        smoothed_gestures = self.smoother.smooth_sequence(gestures)
        
        # 映射到手势文本
        mapped_gestures = self.mapper.batch_map_gestures(smoothed_gestures)
        
        # 构建文本片段
        segments = self._create_segments(mapped_gestures)
        
        # 构建句子
        text = self.builder.build_sentence(segments)
        
        # 应用语法规则
        if apply_grammar and self.grammar_processor:
            text = self.grammar_processor.convert_from_sign_language_word_order(text)
        
        # 计算平均置信度
        avg_confidence = np.mean([g.confidence for g in smoothed_gestures]) if smoothed_gestures else 0.0
        self.stats['average_confidence'] = (
            (self.stats['average_confidence'] * (self.stats['total_processed'] - 1) + avg_confidence) /
            self.stats['total_processed']
        )
        
        processing_time = time.time() - start_time
        
        result = {
            'text': text,
            'confidence': float(avg_confidence),
            'segments': [
                {
                    'text': seg.text,
                    'confidence': seg.confidence,
                    'start_time': seg.start_time,
                    'end_time': seg.end_time
                }
                for seg in segments
            ],
            'processing_time': processing_time,
            'gesture_count': len(smoothed_gestures)
        }
        
        logger.info(
            f"手语翻译完成: {len(gestures)}个手势 -> {text} "
            f"(置信度: {avg_confidence:.2f}, 耗时: {processing_time:.3f}s)"
        )
        
        return result
    
    def _convert_to_gestures(
        self,
        sign_sequence: List[Dict]
    ) -> List[SignGesture]:
        """
        将原始数据转换为手势对象
        
        参数:
            sign_sequence: 原始手语序列
            
        返回:
            手势对象列表
        """
        gestures = []
        
        for item in sign_sequence:
            gesture = SignGesture(
                sign_id=item.get('sign_id', ''),
                text=item.get('text', ''),
                confidence=item.get('confidence', 0.5),
                timestamp=item.get('timestamp', time.time()),
                start_time=item.get('start_time', time.time() - 0.5),
                end_time=item.get('end_time', time.time() + 0.5),
                landmarks=item.get('landmarks', None),
                additional_info=item.get('additional_info', {})
            )
            gestures.append(gesture)
        
        return gestures
    
    def _create_segments(
        self,
        gestures: List[SignGesture]
    ) -> List[TextSegment]:
        """
        创建文本片段
        
        参数:
            gestures: 手势列表
            
        返回:
            文本片段列表
        """
        segments = []
        
        for gesture in gestures:
            if gesture.text:
                segment = TextSegment(
                    text=gesture.text,
                    confidence=gesture.confidence,
                    start_time=gesture.start_time,
                    end_time=gesture.end_time,
                    sign_count=1
                )
                segments.append(segment)
        
        return segments
    
    def translate_stream(
        self,
        gesture_stream: List[Dict],
        apply_grammar: bool = True
    ) -> Dict:
        """
        流式翻译（增量处理）
        
        参数:
            gesture_stream: 手势流列表
            apply_grammar: 是否应用语法规则
            
        返回:
            实时翻译结果
        """
        if not gesture_stream:
            return {
                'text': '',
                'confidence': 0.0,
                'is_complete': True
            }
        
        # 获取最新的几个手势进行实时翻译
        recent_count = min(10, len(gesture_stream))
        recent_gestures = gesture_stream[-recent_count:]
        
        # 如果手势数量足够，进行翻译
        if len(recent_gestures) >= 3:
            # 移除最后一个手势（可能不完整）
            processing_gestures = recent_gestures[:-1] if len(recent_gestures) >= 4 else recent_gestures
            
            # 确定是否完整（基于时间间隔）
            is_complete = (
                time.time() - processing_gestures[-1]['timestamp'] > 1.0
                if processing_gestures else True
            )
            
            result = self.translate(processing_gestures, apply_grammar=apply_grammar)
            result['is_complete'] = is_complete
            
            return result
        
        return {
            'text': '',
            'confidence': 0.0,
            'is_complete': False
        }
    
    def get_statistics(self) -> Dict:
        """
        获取服务统计信息
        
        返回:
            统计信息字典
        """
        return {
            'total_processed': self.stats['total_processed'],
            'total_gestures': self.stats['total_gestures'],
            'average_confidence': self.stats['average_confidence'],
            'average_gestures_per_translation': (
                self.stats['total_gestures'] / self.stats['total_processed']
                if self.stats['total_processed'] > 0 else 0
            )
        }
    
    def reset_statistics(self):
        """重置统计信息"""
        self.stats = {
            'total_processed': 0,
            'total_gestures': 0,
            'average_confidence': 0.0
        }
        logger.info("统计信息已重置")