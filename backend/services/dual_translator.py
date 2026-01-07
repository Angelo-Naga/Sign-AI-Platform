"""
双向翻译器模块
整合所有翻译组件，提供完整的手语-文本翻译功能
包括手语→语音/文字和语音→文字→手语的双向翻译
支持实时翻译、批量处理、翻译缓存和质量评估
"""

import logging
import time
import hashlib
import json
from typing import Dict, List, Tuple, Optional, Union, Any
from dataclasses import dataclass, field
from pathlib import Path
import threading
from functools import lru_cache

from .sign_grammar import SignGrammarProcessor, SignLanguage, GrammarAnalyzer
from .sign_to_text import SignToTextService, SignGesture, TextSegment
from .text_to_sign import TextToSignService, SignSequence, SignAction
from .seq2seq_translator import Seq2SeqTransformer, Translator, TranslatorConfig
from ..utils.translation_dict import TranslationDict, SignVocabulary

logger = logging.getLogger(__name__)


@dataclass
class TranslationResult:
    """翻译结果数据类"""
    source: str  # 源内容
    target: str  # 翻译结果
    direction: str  # 翻译方向 ('sign_to_text' 或 'text_to_sign')
    confidence: float  # 置信度
    duration: float  # 翻译耗时（秒）
    metadata: Dict = field(default_factory=dict)  # 元数据


@dataclass
class BatchTranslationResult:
    """批量翻译结果数据类"""
    results: List[TranslationResult]  # 单个翻译结果列表
    total_count: int  # 总数
    success_count: int  # 成功数
    failure_count: int  # 失败数
    total_duration: float  # 总耗时


class TranslationCache:
    """翻译缓存类"""
    
    def __init__(self, cache_size: int = 1000, ttl: int = 3600):
        """
        初始化翻译缓存
        
        参数:
            cache_size: 缓存大小
            ttl: 生存时间（秒）
        """
        self.cache_size = cache_size
        self.ttl = ttl
        self.cache: Dict[str, Tuple[Any, float]] = {}
        self.lock = threading.RLock()
        
        logger.info(f"初始化翻译缓存，大小: {cache_size}, TTL: {ttl}s")
    
    def _generate_key(self, content: str, direction: str) -> str:
        """
        生成缓存键
        
        参数:
            content: 内容
            direction: 翻译方向
            
        返回:
            缓存键
        """
        raw = f"{direction}:{content}"
        return hashlib.md5(raw.encode('utf-8')).hexdigest()
    
    def get(self, content: str, direction: str) -> Optional[Any]:
        """
        获取缓存
        
        参数:
            content: 内容
            direction: 翻译方向
            
        返回:
            缓存结果或None
        """
        key = self._generate_key(content, direction)
        current_time = time.time()
        
        with self.lock:
            if key in self.cache:
                result, timestamp = self.cache[key]
                # 检查是否过期
                if current_time - timestamp < self.ttl:
                    logger.debug(f"缓存命中: {direction} - {content[:30]}...")
                    return result
                else:
                    del self.cache[key]
        
        return None
    
    def set(self, content: str, direction: str, result: Any):
        """
        设置缓存
        
        参数:
            content: 内容
            direction: 翻译方向
            result: 结果
        """
        key = self._generate_key(content, direction)
        current_time = time.time()
        
        with self.lock:
            # 如果缓存已满，移除最旧的条目
            if len(self.cache) >= self.cache_size:
                oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k][1])
                del self.cache[oldest_key]
            
            self.cache[key] = (result, current_time)
            logger.debug(f"缓存设置: {direction} - {content[:30]}...")
    
    def clear(self):
        """清空缓存"""
        with self.lock:
            self.cache.clear()
        logger.info("翻译缓存已清空")
    
    def get_stats(self) -> Dict:
        """获取缓存统计信息"""
        with self.lock:
            return {
                'cache_size': len(self.cache),
                'max_size': self.cache_size,
                'ttl': self.ttl
            }


class TranslationQualityEvaluator:
    """翻译质量评估器"""
    
    def __init__(self):
        """初始化评估器"""
        self.metrics = {
            'bleu_scores': [],
            'edit_distances': [],
            'semantic_similarity_scores': []
        }
        logger.info("初始化翻译质量评估器")
    
    def evaluate_bleu(
        self,
        reference: str,
        hypothesis: str,
        n: int = 4
    ) -> float:
        """
        计算BLEU分数
        
        参数:
            reference: 参考文本
            hypothesis: 假设文本
            n: n-gram大小
            
        返回:
            BLEU分数
        """
        if not reference or not hypothesis:
            return 0.0
        
        # 简单的BLEU实现
        ref_words = reference.split()
        hyp_words = hypothesis.split()
        
        if not hyp_words:
            return 0.0
        
        # 计算不同n-gram的精度
        precisions = []
        for i in range(1, min(n, len(hyp_words)) + 1):
            ref_ngrams = set()
            hyp_ngrams = set()
            
            for j in range(len(ref_words) - i + 1):
                ref_ngrams.add(' '.join(ref_words[j:j+i]))
            
            for j in range(len(hyp_words) - i + 1):
                hyp_ngrams.add(' '.join(hyp_words[j:j+i]))
            
            if not hyp_ngrams:
                precisions.append(0.0)
                continue
            
            matches = len(ref_ngrams & hyp_ngrams)
            precision = matches / len(hyp_ngrams)
            precisions.append(precision)
        
        # 几何平均
        if not precisions:
            return 0.0
        
        from functools import reduce
        import operator
        
        geometric_mean = reduce(operator.mul, precisions) ** (1.0 / len(precisions))
        
        # 简洁性惩罚
        brevity_penalty = 1.0
        if len(hyp_words) < len(ref_words):
            brevity_penalty = np.exp(1 - len(ref_words) / len(hyp_words))
        
        return geometric_mean * brevity_penalty
    
    def evaluate_edit_distance(
        self,
        reference: str,
        hypothesis: str
    ) -> float:
        """
        计算编辑距离
        
        参数:
            reference: 参考文本
            hypothesis: 假设文本
            
        返回:
            归一化编辑距离
        """
        # 最小编辑距离（Levenshtein距离）
        m, n = len(reference), len(hypothesis)
        
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        
        for i in range(m + 1):
            dp[i][0] = i
        for j in range(n + 1):
            dp[0][j] = j
        
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if reference[i-1] == hypothesis[j-1]:
                    dp[i][j] = dp[i-1][j-1]
                else:
                    dp[i][j] = 1 + min(
                        dp[i-1][j],  # 删除
                        dp[i][j-1],  # 插入
                        dp[i-1][j-1]  # 替换
                    )
        
        # 归一化
        max_len = max(m, n)
        normalized_distance = dp[m][n] / max_len if max_len > 0 else 0.0
        
        return 1.0 - normalized_distance  # 返回相似度分数
    
    def evaluate_translation(
        self,
        source: str,
        translation: str,
        reference: Optional[str] = None
    ) -> Dict:
        """
        评估翻译质量
        
        参数:
            source: 源文本
            translation: 翻译结果
            reference: 参考翻译（可选）
            
        返回:
            评估结果字典
        """
        evaluation = {
            'length_diff': abs(len(source) - len(translation)),
            'source_length': len(source),
            'translation_length': len(translation)
        }
        
        if reference:
            # 如果有参考翻译，计算BLEU和编辑距离
            bleu_score = self.evaluate_bleu(reference, translation)
            edit_similarity = self.evaluate_edit_distance(reference, translation)
            
            evaluation['bleu_score'] = bleu_score
            evaluation['edit_similarity'] = edit_similarity
            
            self.metrics['bleu_scores'].append(bleu_score)
            self.metrics['edit_distances'].append(edit_similarity)
        
        # 计算语义相似度（简化版，实际应使用预训练模型）
        semantic_similarity = self._semantic_similarity(source, translation)
        evaluation['semantic_similarity'] = semantic_similarity
        self.metrics['semantic_similarity_scores'].append(semantic_similarity)
        
        return evaluation
    
    def _semantic_similarity(self, text1: str, text2: str) -> float:
        """
        计算语义相似度（简化版）
        
        参数:
            text1: 文本1
            text2: 文本2
            
        返回:
            相似度分数
        """
        # 简化的词重叠方法
        words1 = set(text1.split())
        words2 = set(text2.split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = len(words1 & words2)
        union = len(words1 | words2)
        
        return intersection / union if union > 0 else 0.0
    
    def get_average_metrics(self) -> Dict:
        """获取平均评估指标"""
        import numpy as np
        
        averages = {}
        for metric_name, values in self.metrics.items():
            if values:
                averages[metric_name] = float(np.mean(values))
            else:
                averages[metric_name] = 0.0
        
        return averages
    
    def reset_metrics(self):
        """重置评估指标"""
        self.metrics = {
            'bleu_scores': [],
            'edit_distances': [],
            'semantic_similarity_scores': []
        }
        logger.info("评估指标已重置")


class DualTranslator:
    """
    双向翻译器主类
    整合所有翻译组件，提供统一的翻译接口
    """
    
    def __init__(
        self,
        dict_path: Optional[str] = None,
        sign_language: SignLanguage = SignLanguage.CSL,
        cache_size: int = 1000,
        enable_ml_model: bool = False,
        device: str = 'cpu'
    ):
        """
        初始化双向翻译器
        
        参数:
            dict_path: 翻译字典路径
            sign_language: 手语类型
            cache_size: 缓存大小
            enable_ml_model: 是否启用ML模型
            device: 神经网络设备
        """
        self.sign_language = sign_language
        self.device = device
        
        # 初始化翻译字典
        self.translation_dict = TranslationDict(dict_path)
        self.sign_vocab = SignVocabulary()
        
        # 初始化语法处理器
        self.grammar_processor = SignGrammarProcessor(sign_language)
        self.grammar_analyzer = GrammarAnalyzer(self.grammar_processor)
        
        # 初始化手语到文本服务
        self.sign_to_text_service = SignToTextService(
            translation_dict=self.translation_dict,
            grammar_processor=self.grammar_processor,
            window_size=5,
            confidence_threshold=0.6,
            min_duration=0.3
        )
        
        # 初始化文本到手语服务
        self.text_to_sign_service = TextToSignService(
            translation_dict=self.translation_dict,
            grammar_processor=self.grammar_processor,
            sign_vocab_handler=self.sign_vocab,
            use_stopwords=True,
            pause_duration=0.3
        )
        
        # 初始化ML模型（可选）
        self.ml_translator = None
        if enable_ml_model:
            self._init_ml_translator()
        
        # 初始化缓存
        self.cache = TranslationCache(cache_size=cache_size)
        
        # 初始化质量评估器
        self.evaluator = TranslationQualityEvaluator()
        
        # 统计信息
        self.stats = {
            'sign_to_text_count': 0,
            'text_to_sign_count': 0,
            'total_translations': 0,
            'cache_hits': 0,
            'cache_misses': 0
        }
        
        logger.info("初始化双向翻译器完成")
    
    def _init_ml_translator(self):
        """初始化ML翻译模型"""
        try:
            config = TranslatorConfig(
                vocab_size=len(self.translation_dict.sign_vocab) + 100,
                d_model=256,
                nhead=4,
                num_encoder_layers=4,
                num_decoder_layers=4,
                dim_feedforward=1024
            )
            
            # 创建模型（需要预训练权重才能工作）
            self.ml_translator = None  # 实际应用中应加载预训练模型
            logger.info("ML翻译模型初始化尝试完成")
        except Exception as e:
            logger.warning(f"ML翻译模型初始化失败: {e}")
            self.ml_translator = None
    
    def sign_to_text(
        self,
        sign_sequence: List[Dict],
        use_cache: bool = True,
        apply_grammar: bool = True
    ) -> TranslationResult:
        """
        手语到文本翻译
        
        参数:
            sign_sequence: 手语序列
            use_cache: 是否使用缓存
            apply_grammar: 是否应用语法规则
            
        返回:
            翻译结果
        """
        # 序列化为字符串以生成缓存键
        sequence_str = json.dumps(sign_sequence, sort_keys=True)
        
        # 检查缓存
        if use_cache:
            cached_result = self.cache.get(sequence_str, 'sign_to_text')
            if cached_result:
                self.stats['cache_hits'] += 1
                return cached_result
            self.stats['cache_misses'] += 1
        
        # 执行翻译
        start_time = time.time()
        result_dict = self.sign_to_text_service.translate(
            sign_sequence,
            apply_grammar=apply_grammar
        )
        duration = time.time() - start_time
        
        # 创建翻译结果对象
        result = TranslationResult(
            source=f"[{len(sign_sequence)} signs]",
            target=result_dict['text'],
            direction='sign_to_text',
            confidence=result_dict['confidence'],
            duration=duration,
            metadata={
                'segments': result_dict['segments'],
                'gesture_count': result_dict['gesture_count'],
                'processing_time': result_dict['processing_time']
            }
        )
        
        # 更新统计
        self.stats['sign_to_text_count'] += 1
        self.stats['total_translations'] += 1
        
        # 设置缓存
        if use_cache:
            self.cache.set(sequence_str, 'sign_to_text', result)
        
        logger.info(
            f"手语->文本翻译: {result.target} "
            f"(置信度: {result.confidence:.2f}, 耗时: {duration:.3f}s)"
        )
        
        return result
    
    def text_to_sign(
        self,
        text: str,
        use_cache: bool = True,
        apply_grammar: bool = True,
        rhythm: Optional[str] = None
    ) -> TranslationResult:
        """
        文本到手语翻译
        
        参数:
            text: 输入文本
            use_cache: 是否使用缓存
            apply_grammar: 是否应用语法规则
            rhythm: 节奏模式
            
        返回:
            翻译结果
        """
        # 检查缓存
        if use_cache:
            cached_result = self.cache.get(text, 'text_to_sign')
            if cached_result:
                self.stats['cache_hits'] += 1
                return cached_result
            self.stats['cache_misses'] += 1
        
        # 执行翻译
        start_time = time.time()
        sequence = self.text_to_sign_service.translate(
            text,
            apply_grammar=apply_grammar,
            rhythm=rhythm
        )
        duration = time.time() - start_time
        
        # 创建翻译结果对象
        result = TranslationResult(
            source=text,
            target=f"[{len(sequence.actions)} sign actions]",
            direction='text_to_sign',
            confidence=1.0,  # 文本到手语暂不计算置信度
            duration=duration,
            metadata={
                'sequence': sequence,
                'action_count': len(sequence.actions),
                'total_duration': sequence.total_duration,
                'animation_params': self.text_to_sign_service.export_animation_parameters(sequence)
            }
        )
        
        # 更新统计
        self.stats['text_to_sign_count'] += 1
        self.stats['total_translations'] += 1
        
        # 设置缓存
        if use_cache:
            self.cache.set(text, 'text_to_sign', result)
        
        logger.info(
            f"文本->手语翻译: {text} -> {len(sequence.actions)}个动作 "
            f"(时长: {sequence.total_duration:.2f}s, 耗时: {duration:.3f}s)"
        )
        
        return result
    
    def translate(
        self,
        input_data: Union[str, List[Dict]],
        direction: str = 'auto',
        **kwargs
    ) -> TranslationResult:
        """
        自动翻译（根据输入类型自动选择方向）
        
        参数:
            input_data: 输入数据（字符串或手语序列）
            direction: 翻译方向 ('auto', 'sign_to_text', 'text_to_sign')
            **kwargs: 其他参数
            
        返回:
            翻译结果
        """
        # 自动检测方向
        if direction == 'auto':
            if isinstance(input_data, str):
                direction = 'text_to_sign'
            elif isinstance(input_data, list):
                direction = 'sign_to_text'
            else:
                raise ValueError(f"无法识别的输入类型: {type(input_data)}")
        
        # 执行翻译
        if direction == 'sign_to_text':
            return self.sign_to_text(input_data, **kwargs)
        elif direction == 'text_to_sign':
            return self.text_to_sign(input_data, **kwargs)
        else:
            raise ValueError(f"无效的翻译方向: {direction}")
    
    def batch_translate(
        self,
        inputs: List[Union[str, List[Dict]]],
        direction: str = 'auto',
        **kwargs
    ) -> BatchTranslationResult:
        """
        批量翻译
        
        参数:
            inputs: 输入列表
            direction: 翻译方向
            **kwargs: 其他参数
            
        返回:
            批量翻译结果
        """
        start_time = time.time()
        results = []
        success_count = 0
        failure_count = 0
        
        for input_data in inputs:
            try:
                result = self.translate(input_data, direction=direction, **kwargs)
                results.append(result)
                success_count += 1
            except Exception as e:
                logger.error(f"批量翻译失败: {e}")
                failure_count += 1
        
        total_duration = time.time() - start_time
        
        batch_result = BatchTranslationResult(
            results=results,
            total_count=len(inputs),
            success_count=success_count,
            failure_count=failure_count,
            total_duration=total_duration
        )
        
        logger.info(
            f"批量翻译完成: {success_count}/{len(inputs)}成功, "
            f"耗时: {total_duration:.3f}s"
        )
        
        return batch_result
    
    def evaluate_translation_quality(
        self,
        source: Union[str, List[Dict]],
        translation: str,
        reference: Optional[str] = None
    ) -> Dict:
        """
        评估翻译质量
        
        参数:
            source: 源内容
            translation: 翻译结果
            reference: 参考翻译（可选）
            
        返回:
            评估结果
        """
        source_text = source if isinstance(source, str) else "[sign sequence]"
        return self.evaluator.evaluate_translation(
            source_text,
            translation,
            reference
        )
    
    def get_translation_statistics(self) -> Dict:
        """
        获取翻译统计信息
        
        返回:
            统计信息字典
        """
        cache_stats = self.cache.get_stats()
        quality_stats = self.evaluator.get_average_metrics()
        
        return {
            'translations': {
                'total': self.stats['total_translations'],
                'sign_to_text': self.stats['sign_to_text_count'],
                'text_to_sign': self.stats['text_to_sign_count']
            },
            'cache': {
                'hits': self.stats['cache_hits'],
                'misses': self.stats['cache_misses'],
                'hit_rate': (
                    self.stats['cache_hits'] / (self.stats['cache_hits'] + self.stats['cache_misses'])
                    if (self.stats['cache_hits'] + self.stats['cache_misses']) > 0 else 0.0
                ),
                **cache_stats
            },
            'quality': quality_stats,
            'services': {
                'sign_to_text': self.sign_to_text_service.get_statistics(),
                'text_to_sign': self.text_to_sign_service.get_statistics()
            }
        }
    
    def reset_statistics(self):
        """重置所有统计信息"""
        self.stats = {
            'sign_to_text_count': 0,
            'text_to_sign_count': 0,
            'total_translations': 0,
            'cache_hits': 0,
            'cache_misses': 0
        }
        self.sign_to_text_service.reset_statistics()
        self.text_to_sign_service.reset_statistics()
        self.evaluator.reset_metrics()
        logger.info("所有统计信息已重置")
    
    def clear_cache(self):
        """清空翻译缓存"""
        self.cache.clear()
    
    def save_translation_dict(self, path: str):
        """
        保存翻译字典
        
        参数:
            path: 保存路径
        """
        self.translation_dict.save_dict(path)
    
    def load_translation_dict(self, path: str):
        """
        加载翻译字典
        
        参数:
            path: 字典路径
        """
        self.translation_dict.load_dict(path)
        logger.info("翻译字典已重新加载")
    
    def add_vocabulary(self, word: str, word_type: str):
        """
        添加词汇到语法处理器
        
        参数:
            word: 词汇
            word_type: 词汇类型
        """
        self.grammar_processor.add_vocabulary(word, word_type)
    
    def search_sign_vocabulary(self, keyword: str) -> List[Dict]:
        """
        搜索手语词汇
        
        参数:
            keyword: 搜索关键词
            
        返回:
            匹配的手语列表
        """
        return self.sign_vocab.search_sign(keyword)
    
    def get_grammar_suggestions(self, sentence: str) -> List[str]:
        """
        获取语法改进建议
        
        参数:
            sentence: 输入句子
            
        返回:
            建议列表
        """
        return self.grammar_analyzer.suggest_sign_modifications(sentence)
    
    def analyze_sentence_complexity(self, sentence: str) -> int:
        """
        分析句子复杂度
        
        参数:
            sentence: 输入句子
            
        返回:
            复杂度分数（1-5）
        """
        return self.grammar_analyzer.analyze_sentence_complexity(sentence)