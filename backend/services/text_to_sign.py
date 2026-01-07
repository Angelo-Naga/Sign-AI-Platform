"""
文本到手语服务模块
将文本转换为手语动作序列
包括分词、词性标注、词汇转换、动作序列生成和时序安排
"""

import logging
import re
from typing import Dict, List, Tuple, Optional, Union
from dataclasses import dataclass, field
import time
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class Token:
    """词元数据类"""
    text: str  # 词元文本
    pos: str  # 词性
    is_stopword: bool = False  # 是否为停用词
    confidence: float = 1.0  # 置信度


@dataclass
class SignAction:
    """手语动作数据类"""
    action_id: str  # 动作ID
    action_name: str  # 动作名称
    text_source: str  # 源文本
    duration: float  # 持续时间（秒）
    intensity: float = 1.0  # 强度 (0.0 - 1.0)
    hand_shape: Optional[str] = None  # 手型
    movement: Optional[str] = None  # 运动方式
    location: Optional[str] = None  # 位置
    non_manual: Optional[Dict] = None  # 非手动成分（表情等）
    start_time: float = 0.0  # 开始时间
    end_time: float = 1.0  # 结束时间
    confidence: float = 1.0  # 置信度


@dataclass
class SignSequence:
    """
    手语序列数据类
    包含完整的手语动作序列
    """
    actions: List[SignAction]  # 动作列表
    source_text: str  # 源文本
    total_duration: float  # 总时长
    metadata: Dict = field(default_factory=dict)  # 元数据


class TextTokenizer:
    """
    文本分词器
    处理中文分词和词性标注
    """
    
    # 简单的中文词性标记
    POS_TAGS = {
        # 代词
        '我': 'pronoun', '你': 'pronoun', '他': 'pronoun', '她': 'pronoun',
        '我们': 'pronoun', '你们': 'pronoun', '他们': 'pronoun',
        '这': 'pronoun', '那': 'pronoun',
        
        # 时间词
        '今天': 'time', '明天': 'time', '昨天': 'time',
        '现在': 'time', '刚才': 'time', '晚上': 'time', '早上': 'time',
        
        # 动词
        '来': 'verb', '去': 'verb', '看': 'verb', '听': 'verb',
        '说': 'verb', '做': 'verb', '吃': 'verb', '喝': 'verb',
        '喜欢': 'verb', '爱': 'verb', '想': 'verb', '要': 'verb',
        
        # 名词
        '书': 'noun', '手': 'noun', '眼睛': 'noun', '耳朵': 'noun',
        '家': 'noun', '学校': 'noun', '医院': 'noun', '朋友': 'noun',
    }
    
    # 停用词词表
    STOPWORDS = {
        '的', '了', '在', '是', '我', '有', '和', '就', '不', '人',
        '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
    }
    
    def __init__(self, use_stopwords: bool = True):
        """
        初始化分词器
        
        参数:
            use_stopwords: 是否使用停用词过滤
        """
        self.use_stopwords = use_stopwords
        logger.info("初始化文本分词器")
    
    def tokenize(self, text: str) -> List[Token]:
        """
        分词并标注词性
        
        参数:
            text: 输入文本
            
        返回:
            词元列表
        """
        # 清理文本
        text = text.strip()
        
        # 移除标点符号（保留基本的中文标点）
        text = re.sub(r'[^\w\s\u4e00-\u9fff]', '', text)
        
        if not text:
            return []
        
        # 简单的中文分词（按字符，实际应用中应使用jieba等分词器）
        chars = list(text)
        
        # 合并多字词（简化版）
        words = []
        i = 0
        while i < len(chars):
            # 检查2-3字组合
            if i < len(chars) - 1:
                two_char = chars[i] + chars[i+1]
                if two_char in ['早上', '晚上', '今天', '明天', '我们', '你们']:
                    words.append(two_char)
                    i += 2
                    continue
            
            # 单字
            if chars[i].strip():
                words.append(chars[i])
            i += 1
        
        # 创建词元
        tokens = []
        for word in words:
            pos = self.POS_TAGS.get(word, 'unknown')
            is_stopword = word in self.STOPWORDS if self.use_stopwords else False
            
            token = Token(
                text=word,
                pos=pos,
                is_stopword=is_stopword,
                confidence=1.0
            )
            tokens.append(token)
        
        # 过滤停用词
        if self.use_stopwords:
            tokens = [t for t in tokens if not t.is_stopword or t.pos == 'time']
        
        logger.debug(f"分词结果: {[t.text for t in tokens]}")
        
        return tokens
    
    def get_pos_tags(self, tokens: List[Token]) -> List[str]:
        """获取词性标签列表"""
        return [t.pos for t in tokens]


class TextToSignMapper:
    """
    文本到手语映射器
    处理文本到手语词汇的转换
    """
    
    def __init__(self, translation_dict):
        """
        初始化映射器
        
        参数:
            translation_dict: 翻译字典实例
        """
        self.translation_dict = translation_dict
        self.cache: Dict[str, List[Tuple[str, float]]] = {}
        
        logger.info("初始化文本到手语映射器")
    
    def map_text_to_sign(
        self,
        text: str,
        pos: str = 'unknown',
        top_k: int = 1
    ) -> List[Tuple[str, float]]:
        """
        映射文本到手语
        
        参数:
            text: 文本词汇
            pos: 词性标签
            top_k: 返回前k个结果
            
        返回:
            手语ID和权重的元组列表
        """
        # 检查缓存
        cache_key = f"{text}_{pos}_{top_k}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # 获取映射
        mappings = self.translation_dict.get_sign_from_text(text, top_k=top_k)
        
        # 如果没有精确匹配，尝试模糊匹配
        if not mappings:
            # 使用字典中的模糊匹配
            similar_texts = []
            for vocab_text in self.translation_dict.text_vocab:
                if text in vocab_text or vocab_text in text:
                    similar_texts.append(vocab_text)
            
            if similar_texts:
                for similar_text in similar_texts[:top_k]:
                    similar_mappings = self.translation_dict.get_sign_from_text(
                        similar_text, top_k=1
                    )
                    mappings.extend(similar_mappings)
        
        # 缓存结果
        self.cache[cache_key] = mappings
        
        return mappings
    
    def batch_map_tokens(
        self,
        tokens: List[Token],
        top_k: int = 1
    ) -> List[List[Tuple[str, float]]]:
        """
        批量映射词元到手语
        
        参数:
            tokens: 词元列表
            top_k: 每个词元返回前k个手语
            
        返回:
            映射结果列表
        """
        mappings = []
        
        for token in tokens:
            token_mappings = self.map_text_to_sign(
                token.text,
                token.pos,
                top_k=top_k
            )
            mappings.append(token_mappings)
        
        return mappings
    
    def select_best_sign(
        self,
        candidate_signs: List[Tuple[str, float]],
        context: Optional[List[Token]] = None
    ) -> Optional[str]:
        """
        根据上下文选择最佳手语
        
        参数:
            candidate_signs: 候选手语列表
            context: 上下文词元
            
        返回:
            选中的手语ID
        """
        if not candidate_signs:
            return None
        
        # 如果只有一个候选，直接返回
        if len(candidate_signs) == 1:
            return candidate_signs[0][0]
        
        # 基于权重选择（可扩展为更复杂的选择逻辑）
        return candidate_signs[0][0]


class SignActionGenerator:
    """
    手语动作生成器
    生成具体的手语动作参数
    """
    
    # 动作时长配置（秒）
    DEFAULT_DURATIONS = {
        'pronoun': 0.8,
        'verb': 1.2,
        'noun': 1.0,
        'time': 1.0,
        'place': 0.9,
        'unknown': 1.0
    }
    
    def __init__(self, sign_vocab_handler=None):
        """
        初始化动作生成器
        
        参数:
            sign_vocab_handler: 手语词汇处理器
        """
        self.sign_vocab = sign_vocab_handler
        
        # 动作模板
        self.action_templates = self._initialize_templates()
        
        logger.info("初始化手语动作生成器")
    
    def _initialize_templates(self) -> Dict:
        """
        初始化动作模板
        
        返回:
            动作模板字典
        """
        templates = {
            # 代词
            '我': {
                'hand_shape': 'index_finger',
                'movement': 'point_to_chest',
                'location': 'chest',
                'duration': 0.8
            },
            '你': {
                'hand_shape': 'index_finger',
                'movement': 'point_forward',
                'location': 'front',
                'duration': 0.8
            },
            '他': {
                'hand_shape': 'index_finger',
                'movement': 'point_side',
                'location': 'side_right',
                'duration': 0.8
            },
            
            # 动词
            '来': {
                'hand_shape': 'open_hand',
                'movement': 'curl_towards_body',
                'location': 'front',
                'duration': 1.0
            },
            '去': {
                'hand_shape': 'open_hand',
                'movement': 'push_away',
                'location': 'front',
                'duration': 1.0
            },
            '看': {
                'hand_shape': 'flat_hand_near_eye',
                'movement': 'point_direction',
                'location': 'head_height',
                'duration': 1.0
            },
            '听': {
                'hand_shape': 'cupped_hand',
                'movement': 'pull_towards_ear',
                'location': 'near_ear',
                'duration': 1.0
            },
            '说': {
                'hand_shape': 'index_finger',
                'movement': 'move_near_mouth',
                'location': 'mouth',
                'duration': 1.2
            },
            
            # 名词
            '书': {
                'hand_shape': 'open_hands_like_book',
                'movement': 'open_and_close',
                'location': 'front_chest',
                'duration': 1.0
            },
            '朋友': {
                'hand_shape': 'hooked_index_fingers',
                'movement': 'interlock',
                'location': 'shoulder_height',
                'duration': 1.2
            },
            '家': {
                'hand_shape': 'flat_hands',
                'movement': 'form_roof',
                'location': 'head_height',
                'duration': 1.0
            },
            
            # 时间
            '今天': {
                'hand_shape': 'flat_hand',
                'movement': 'point_down',
                'location': 'shoulder',
                'duration': 0.9
            },
            '现在': {
                'hand_shape': 'fist',
                'movement': 'tap_chest',
                'location': 'chest',
                'duration': 0.8
            },
        }
        
        return templates
    
    def generate_action(
        self,
        sign_id: str,
        text_source: str,
        pos: str = 'unknown',
        context: Optional[Dict] = None
    ) -> SignAction:
        """
        生成手语动作
        
        参数:
            sign_id: 手语ID
            text_source: 源文本
            pos: 词性
            context: 上下文信息
            
        返回:
            手语动作对象
        """
        # 获取动作模板
        template = self.action_templates.get(text_source, {})
        
        # 确定时长
        duration = template.get(
            'duration',
            self.DEFAULT_DURATIONS.get(pos, 1.0)
        )
        
        # 创建动作
        action = SignAction(
            action_id=sign_id,
            action_name=f"sign_{text_source}",
            text_source=text_source,
            duration=duration,
            hand_shape=template.get('hand_shape'),
            movement=template.get('movement'),
            location=template.get('location'),
            non_manual=self._generate_non_manual(text_source, pos),
            confidence=1.0
        )
        
        return action
    
    def _generate_non_manual(
        self,
        text: str,
        pos: str
    ) -> Dict:
        """
        生成非手动成分（表情、肢体语言等）
        
        参数:
            text: 文本
            pos: 词性
            
        返回:
            非手动成分字典
        """
        non_manual = {}
        
        # 问号表情
        if text in ['什么', '哪里', '谁', '为什么', '怎么', '吗', '吧']:
            non_manual['eyebrow'] = 'raise'
            non_manual['head'] = 'tilt_side'
            non_manual['facial_expression'] = 'questioning'
        elif pos == 'time':
            non_manual['body_posture'] = 'neutral'
        elif pos == 'verb':
            non_manual['body_posture'] = 'slight_lean_forward'
        
        return non_manual
    
    def batch_generate_actions(
        self,
        sign_mappings: List[Tuple[str, float]],
        tokens: List[Token]
    ) -> List[SignAction]:
        """
        批量生成动作
        
        参数:
            sign_mappings: 手语映射列表
            tokens: 词元列表
            
        返回:
            动作列表
        """
        actions = []
        
        for i, (token, mapping) in enumerate(zip(tokens, sign_mappings)):
            if mapping:
                sign_id, confidence = mapping[0]
                action = self.generate_action(
                    sign_id=sign_id,
                    text_source=token.text,
                    pos=token.pos
                )
                action.confidence = confidence
                actions.append(action)
        
        return actions


class SequenceScheduler:
    """
    序列调度器
    安排手语动作的时序和节奏
    """
    
    def __init__(self, pause_duration: float = 0.3):
        """
        初始化调度器
        
        参数:
            pause_duration: 动作间停顿时长（秒）
        """
        self.pause_duration = pause_duration
        logger.info(f"初始化序列调度器，停顿时长: {pause_duration}s")
    
    def schedule(
        self,
        actions: List[SignAction],
        start_time: float = 0.0
    ) -> List[SignAction]:
        """
        安排动作时序
        
        参数:
            actions: 动作列表
            start_time: 开始时间
            
        返回:
            更新后的动作列表
        """
        current_time = start_time
        
        for action in actions:
            action.start_time = current_time
            action.end_time = current_time + action.duration
            current_time = action.end_time + self.pause_duration
        
        return actions
    
    def add_rhythm(
        self,
        actions: List[SignAction],
        rhythm_pattern: Optional[str] = None
    ) -> List[SignAction]:
        """
        添加节奏控制
        
        参数:
            actions: 动作列表
            rhythm_pattern: 节奏模式（如 "moderate", "fast", "slow"）
            
        返回:
            调整后的动作列表
        """
        if not actions:
            return actions
        
        # 根据节奏模式调整时长和强度
        multiplier = 1.0
        intensity = 1.0
        
        if rhythm_pattern == "fast":
            multiplier = 0.8
            intensity = 1.1
        elif rhythm_pattern == "slow":
            multiplier = 1.2
            intensity = 0.9
        elif rhythm_pattern == "expressive":
            multiplier = 1.1
            intensity = 1.2
        
        for action in actions:
            action.duration = action.duration * multiplier
            action.intensity = action.intensity * intensity
        
        return actions
    
    def get_total_duration(self, actions: List[SignAction]) -> float:
        """
        获取总时长
        
        参数:
            actions: 动作列表
            
        返回:
            总时长
        """
        if not actions:
            return 0.0
        return actions[-1].end_time - actions[0].start_time


class TextToSignService:
    """
    文本到手语服务
    整合所有组件提供完整的文本到手语翻译服务
    """
    
    def __init__(
        self,
        translation_dict,
        grammar_processor=None,
        sign_vocab_handler=None,
        use_stopwords: bool = True,
        pause_duration: float = 0.3
    ):
        """
        初始化文本到手语服务
        
        参数:
            translation_dict: 翻译字典
            grammar_processor: 语法处理器
            sign_vocab_handler: 手语词汇处理器
            use_stopwords: 是否使用停用词
            pause_duration: 动作间停顿
        """
        self.translation_dict = translation_dict
        self.grammar_processor = grammar_processor
        
        # 初始化子组件
        self.tokenizer = TextTokenizer(use_stopwords=use_stopwords)
        self.mapper = TextToSignMapper(translation_dict)
        self.action_generator = SignActionGenerator(sign_vocab_handler)
        self.scheduler = SequenceScheduler(pause_duration=pause_duration)
        
        # 统计信息
        self.stats = {
            'total_translated': 0,
            'total_words': 0,
            'total_actions': 0,
            'average_duration': 0.0
        }
        
        logger.info("初始化文本到手语服务完成")
    
    def translate(
        self,
        text: str,
        apply_grammar: bool = True,
        rhythm: Optional[str] = None
    ) -> SignSequence:
        """
        翻译文本到手语序列
        
        参数:
            text: 输入文本
            apply_grammar: 是否应用语法规则
            rhythm: 节奏模式
            
        返回:
            手语序列对象
        """
        start_time = time.time()
        
        # 应用语法转换（调整词序）
        processed_text = text
        if apply_grammar and self.grammar_processor:
            processed_text = self.grammar_processor.convert_to_sign_language_word_order(text)
        
        # 分词
        tokens = self.tokenizer.tokenize(processed_text)
        
        if not tokens:
            return SignSequence(
                actions=[],
                source_text=text,
                total_duration=0.0,
                metadata={'status': 'empty_input'}
            )
        
        # 映射到手语
        sign_mappings = self.mapper.batch_map_tokens(tokens, top_k=1)
        
        # 生成动作
        actions = []
        for i, token in enumerate(tokens):
            if sign_mappings[i] and sign_mappings[i][0]:
                sign_id, confidence = sign_mappings[i][0]
                action = self.action_generator.generate_action(
                    sign_id=sign_id,
                    text_source=token.text,
                    pos=token.pos
                )
                action.confidence = confidence
                actions.append(action)
        
        # 安排时序
        actions = self.scheduler.schedule(actions)
        
        # 添加节奏控制
        if rhythm:
            actions = self.scheduler.add_rhythm(actions, rhythm)
        
        # 计算总时长
        total_duration = self.scheduler.get_total_duration(actions)
        
        # 更新统计
        self.stats['total_translated'] += 1
        self.stats['total_words'] += len(tokens)
        self.stats['total_actions'] += len(actions)
        if total_duration > 0:
            self.stats['average_duration'] = (
                (self.stats['average_duration'] * (self.stats['total_translated'] - 1) +
                 total_duration) / self.stats['total_translated']
            )
        
        processing_time = time.time() - start_time
        
        # 创建序列对象
        sequence = SignSequence(
            actions=actions,
            source_text=text,
            total_duration=total_duration,
            metadata={
                'processed_text': processed_text,
                'token_count': len(tokens),
                'action_count': len(actions),
                'processing_time': processing_time,
                'grammar_applied': apply_grammar,
                'rhythm': rhythm
            }
        )
        
        logger.info(
            f"文本翻译完成: {text} -> {len(actions)}个手语动作 "
            f"(时长: {total_duration:.2f}s, 耗时: {processing_time:.3f}s)"
        )
        
        return sequence
    
    def translate_batch(
        self,
        texts: List[str],
        apply_grammar: bool = True
    ) -> List[SignSequence]:
        """
        批量翻译
        
        参数:
            texts: 文本列表
            apply_grammar: 是否应用语法
            
        返回:
            手语序列列表
        """
        sequences = []
        
        for text in texts:
            sequence = self.translate(text, apply_grammar=apply_grammar)
            sequences.append(sequence)
        
        return sequences
    
    def export_animation_parameters(
        self,
        sequence: SignSequence
    ) -> List[Dict]:
        """
        导出动画参数
        
        参数:
            sequence: 手语序列
            
        返回:
            动画参数列表
        """
        animation_params = []
        
        for action in sequence.actions:
            param = {
                'action_id': action.action_id,
                'action_name': action.action_name,
                'text_source': action.text_source,
                'start_time': action.start_time,
                'end_time': action.end_time,
                'duration': action.duration,
                'intensity': action.intensity,
                'hand_shape': action.hand_shape,
                'movement': action.movement,
                'location': action.location,
                'non_manual': action.non_manual,
                'confidence': action.confidence
            }
            animation_params.append(param)
        
        return animation_params
    
    def to_dict(self, sequence: SignSequence) -> Dict:
        """
        将序列转换为字典格式
        
        参数:
            sequence: 手语序列
            
        返回:
            序列字典
        """
        return {
            'source_text': sequence.source_text,
            'processed_text': sequence.metadata.get('processed_text', ''),
            'total_duration': sequence.total_duration,
            'action_count': len(sequence.actions),
            'actions': self.export_animation_parameters(sequence),
            'metadata': sequence.metadata
        }
    
    def get_statistics(self) -> Dict:
        """
        获取服务统计信息
        
        返回:
            统计信息字典
        """
        return {
            'total_translated': self.stats['total_translated'],
            'total_words': self.stats['total_words'],
            'total_actions': self.stats['total_actions'],
            'average_duration': self.stats['average_duration'],
            'average_words_per_translation': (
                self.stats['total_words'] / self.stats['total_translated']
                if self.stats['total_translated'] > 0 else 0
            ),
            'average_actions_per_translation': (
                self.stats['total_actions'] / self.stats['total_translated']
                if self.stats['total_translated'] > 0 else 0
            )
        }
    
    def reset_statistics(self):
        """重置统计信息"""
        self.stats = {
            'total_translated': 0,
            'total_words': 0,
            'total_actions': 0,
            'average_duration': 0.0
        }
        logger.info("统计信息已重置")