"""
情感分析模块
提供文本情感分析、情感强度评分、语调建议生成等功能
支持批量处理和实时流式处理
"""

import logging
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import re
import numpy as np

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmotionType(Enum):
    """情感类型枚举"""
    POSITIVE = "positive"      # 积极
    NEGATIVE = "negative"      # 消极
    NEUTRAL = "neutral"        # 中性
    
    def __str__(self):
        return self.value


@dataclass
class EmotionScore:
    """情感评分"""
    emotion: EmotionType  # 情感类型
    confidence: float  # 置信度 (0.0 - 1.0)
    intensity: float  # 强度 (0.0 - 1.0)
    details: Dict[str, float]  # 详细情绪分布


@dataclass
class ToneSuggestion:
    """语调建议"""
    emotion: str  # 情感标签
    voice_style: str  # 语音风格
    pitch_adjustment: str  # 音调调整
    rate_adjustment: str  # 语速调整
    volume_adjustment: str  # 音量调整
    description: str  # 描述


class EmotionAnalyzer:
    """情感分析器类"""
    
    # 情感词典（简化版）
    POSITIVE_WORDS = {
        'zh': [
            '开心', '快乐', '高兴', '愉快', '幸福', '兴奋', '喜欢', '爱',
            '好', '优秀', '棒', '太棒了', '精彩', '美丽', '漂亮', '成功',
            '满意', '舒服', '温暖', '感动', '感激', '感谢', '希望', '期待',
            '爱', '喜欢', '赞同', '支持', '恭喜', '祝福', '顺利', '顺利',
            '哈哈', '呵呵', '太好了', '很棒', '不错', '太棒', '厉害', '强'
        ],
        'en': [
            'happy', 'joy', 'glad', 'pleased', 'great', 'excellent',
            'wonderful', 'beautiful', 'success', 'love', 'like',
            'thank', 'hope', 'excited', 'exciting', 'awesome', 'amazing',
            'good', 'nice', 'great', 'perfect', 'fantastic', 'love',
            'best', 'brilliant', 'congratulations'
        ]
    }
    
    NEGATIVE_WORDS = {
        'zh': [
            '难过', '悲伤', '痛苦', '伤心', '失望', '生气', '愤怒', '讨厌',
            '难过', '糟糕', '糟糕', '不好', '差', '失败', '遗憾', '可惜',
            '痛苦', '担心', '焦虑', '害怕', '恐惧', '讨厌', '厌恶', '恨',
            '哭', '伤心', '郁闷', '烦恼', '愤怒', '生气', '恼火', '不爽',
            '很差', '太差', '烂', '糟糕', '糟糕透顶', '失望', '气死'
        ],
        'en': [
            'sad', 'unhappy', 'pain', 'disappointed', 'angry', 'hate',
            'bad', 'terrible', 'fail', 'failure', 'worry', 'afraid',
            'fear', 'cry', 'depressed', 'anxious', 'frustrated',
            'upset', 'annoyed', 'terrible', 'horrible', 'awful'
        ]
    }
    
    # 情感标签映射
    EMOTION_LABELS = {
        'positive': {
            'joy': '快乐',
            'love': '喜爱',
            'excitement': '兴奋',
            'satisfaction': '满意',
            'gratitude': '感激'
        },
        'negative': {
            'anger': '愤怒',
            'sadness': '悲伤',
            'fear': '恐惧',
            'disappointment': '失望',
            'frustration': '沮丧'
        },
        'neutral': {
            'calm': '平静',
            'indifferent': '冷漠',
            'confused': '困惑',
            'thinking': '思考',
            'waiting': '等待'
        }
    }
    
    # 语调建议配置
    TONE_SUGGESTIONS = {
        'positive': ToneSuggestion(
            emotion='positive',
            voice_style='cheerful',
            pitch_adjustment='+2Hz',
            rate_adjustment='+10%',
            volume_adjustment='+5%',
            description='积极情绪：语调轻快，音调适中偏高，语速稍快'
        ),
        'negative': ToneSuggestion(
            emotion='negative',
            voice_style='sad',
            pitch_adjustment='-2Hz',
            rate_adjustment='-10%',
            volume_adjustment='-5%',
            description='消极情绪：语调低沉，音调偏低，语速较慢'
        ),
        'neutral': ToneSuggestion(
            emotion='neutral',
            voice_style='neutral',
            pitch_adjustment='+0Hz',
            rate_adjustment='+0%',
            volume_adjustment='+0%',
            description='中性情绪：语调平稳，音调自然，语速适中'
        )
    }
    
    def __init__(self, language: str = "zh"):
        """初始化情感分析器
        
        Args:
            language: 语言代码 (zh, en)
        """
        self.language = language
        logger.info(f"情感分析器初始化，语言: {language}")
    
    def _extract_words(self, text: str) -> List[str]:
        """提取文本中的词汇
        
        Args:
            text: 输入文本
            
        Returns:
            词汇列表
        """
        # 中文分词（简单版，按字符）
        if self.language == 'zh':
            words = [char for char in text if char.strip()]
        else:
            # 英文分词
            words = re.findall(r'\b\w+\b', text.lower())
        
        return words
    
    def _calculate_emotion_scores(self, words: List[str]) -> Dict[str, float]:
        """计算情感评分
        
        Args:
            words: 词汇列表
            
        Returns:
            情感评分字典
        """
        positive_count = 0
        negative_count = 0
        
        positive_dict = self.POSITIVE_WORDS.get(self.language, [])
        negative_dict = self.NEGATIVE_WORDS.get(self.language, [])
        
        for word in words:
            if word in positive_dict:
                positive_count += 1
            elif word in negative_dict:
                negative_count += 1
        
        total = positive_count + negative_count
        
        if total == 0:
            return {
                'positive': 0.0,
                'negative': 0.0,
                'neutral': 1.0
            }
        
        positive_score = positive_count / total
        negative_score = negative_count / total
        neutral_score = max(0.0, 1.0 - (positive_score + negative_score))
        
        # 归一化
        total_score = positive_score + negative_score + neutral_score
        if total_score > 0:
            positive_score /= total_score
            negative_score /= total_score
            neutral_score /= total_score
        
        return {
            'positive': positive_score,
            'negative': negative_score,
            'neutral': neutral_score
        }
    
    def _calculate_intensity(self, scores: Dict[str, float], word_count: int) -> float:
        """计算情感强度
        
        Args:
            scores: 情感评分
            word_count: 词汇总数
            
        Returns:
            强度值 (0.0 - 1.0)
        """
        if word_count == 0:
            return 0.0
        
        # 获取主要情感
        max_emotion = max(scores, key=scores.get)
        base_intensity = scores[max_emotion]
        
        # 根据词汇数量调整强度
        length_factor = min(word_count / 20.0, 1.0)
        
        intensity = base_intensity * (0.5 + 0.5 * length_factor)
        
        return min(intensity, 1.0)
    
    def _detect_specific_emotion(
        self,
        text: str,
        emotion_type: EmotionType
    ) -> str:
        """检测具体情感
        
        Args:
            text: 输入文本
            emotion_type: 情感类型
            
        Returns:
            具体情感标签
        """
        emotion_labels = self.EMOTION_LABELS.get(emotion_type.value, {})
        
        # 简化版：随机返回一个情感标签
        # 实际项目中可以使用更复杂的规则或机器学习模型
        if emotion_labels:
            labels = list(emotion_labels.values())
            return labels[0] if labels else emotion_type.value
        
        return emotion_type.value
    
    def analyze(self, text: str) -> EmotionScore:
        """分析文本情感
        
        Args:
            text: 输入文本
            
        Returns:
            EmotionScore 情感评分
        """
        try:
            # 预处理文本
            text = text.strip()
            if not text:
                return EmotionScore(
                    emotion=EmotionType.NEUTRAL,
                    confidence=0.0,
                    intensity=0.0,
                    details={'positive': 0.0, 'negative': 0.0, 'neutral': 1.0}
                )
            
            # 提取词汇
            words = self._extract_words(text)
            word_count = len(words)
            
            # 计算情感评分
            scores = self._calculate_emotion_scores(words)
            
            # 确定主导情感
            max_emotion = max(scores, key=scores.get)
            if max_emotion == 'positive':
                emotion = EmotionType.POSITIVE
            elif max_emotion == 'negative':
                emotion = EmotionType.NEGATIVE
            else:
                emotion = EmotionType.NEUTRAL
            
            # 计算置信度
            confidence = scores[emotion]
            
            # 计算强度
            intensity = self._calculate_intensity(scores, word_count)
            
            logger.info(f"情感分析完成: {text[:30]}... -> {emotion.value} "
                       f"(置信度={confidence:.2f}, 强度={intensity:.2f})")
            
            return EmotionScore(
                emotion=emotion,
                confidence=confidence,
                intensity=intensity,
                details=scores
            )
            
        except Exception as e:
            logger.error(f"情感分析失败: {str(e)}")
            raise RuntimeError(f"情感分析失败: {str(e)}")
    
    def batch_analyze(self, texts: List[str]) -> List[EmotionScore]:
        """批量分析文本情感
        
        Args:
            texts: 文本列表
            
        Returns:
            情感评分列表
        """
        results = []
        
        try:
            for i, text in enumerate(texts):
                result = self.analyze(text)
                results.append(result)
                
                if (i + 1) % 100 == 0:
                    logger.info(f"已处理 {i + 1}/{len(texts)} 条文本")
            
            logger.info(f"批量情感分析完成: {len(texts)} 条")
            
            return results
            
        except Exception as e:
            logger.error(f"批量情感分析失败: {str(e)}")
            raise RuntimeError(f"批量情感分析失败: {str(e)}")
    
    def get_tone_suggestion(self, emotion_type: EmotionType) -> ToneSuggestion:
        """获取语调建议
        
        Args:
            emotion_type: 情感类型
            
        Returns:
            ToneSuggestion 语调建议
        """
        try:
            suggestion = self.TONE_SUGGESTIONS.get(emotion_type.value)
            
            if suggestion is None:
                suggestion = self.TONE_SUGGESTIONS['neutral']
            
            return suggestion
            
        except Exception as e:
            logger.error(f"获取语调建议失败: {str(e)}")
            return self.TONE_SUGGESTIONS['neutral']
    
    def get_emotion_label(self, emotion_type: EmotionType, text: str) -> str:
        """获取情感标签
        
        Args:
            emotion_type: 情感类型
            text: 输入文本（用于检测具体情感）
            
        Returns:
            情感标签
        """
        try:
            # 检测具体情感
            specific_emotion = self._detect_specific_emotion(text, emotion_type)
            
            return specific_emotion
            
        except Exception as e:
            logger.error(f"获取情感标签失败: {str(e)}")
            return emotion_type.value
    
    def get_emotion_summary(
        self,
        scores: List[EmotionScore]
    ) -> Dict[str, Any]:
        """获取情感分析摘要
        
        Args:
            scores: 情感评分列表
            
        Returns:
            摘要信息
        """
        try:
            if not scores:
                return {
                    'total': 0,
                    'positive_count': 0,
                    'negative_count': 0,
                    'neutral_count': 0,
                    'avg_intensity': 0.0,
                    'dominant_emotion': 'neutral'
                }
            
            # 统计各情感数量
            positive_count = sum(1 for s in scores if s.emotion == EmotionType.POSITIVE)
            negative_count = sum(1 for s in scores if s.emotion == EmotionType.NEGATIVE)
            neutral_count = sum(1 for s in scores if s.emotion == EmotionType.NEUTRAL)
            
            # 计算平均强度
            avg_intensity = np.mean([s.intensity for s in scores])
            
            # 确定主导情感
            emotion_counts = {
                'positive': positive_count,
                'negative': negative_count,
                'neutral': neutral_count
            }
            dominant_emotion = max(emotion_counts, key=emotion_counts.get)
            
            summary = {
                'total': len(scores),
                'positive_count': positive_count,
                'negative_count': negative_count,
                'neutral_count': neutral_count,
                'positive_ratio': positive_count / len(scores),
                'negative_ratio': negative_count / len(scores),
                'neutral_ratio': neutral_count / len(scores),
                'avg_intensity': float(avg_intensity),
                'dominant_emotion': dominant_emotion
            }
            
            logger.info(f"情感摘要: {summary}")
            
            return summary
            
        except Exception as e:
            logger.error(f"获取情感摘要失败: {str(e)}")
            raise RuntimeError(f"获取情感摘要失败: {str(e)}")
    
    def set_language(self, language: str) -> None:
        """设置语言
        
        Args:
            language: 语言代码
        """
        self.language = language
        logger.info(f"语言已设置为: {language}")


# 全局单例
_emotion_analyzer: Optional[EmotionAnalyzer] = None


def get_emotion_analyzer(language: str = "zh") -> EmotionAnalyzer:
    """获取情感分析器单例
    
    Args:
        language: 语言代码
        
    Returns:
        EmotionAnalyzer 实例
    """
    global _emotion_analyzer
    
    if _emotion_analyzer is None:
        _emotion_analyzer = EmotionAnalyzer(language)
    else:
        _emotion_analyzer.set_language(language)
    
    return _emotion_analyzer