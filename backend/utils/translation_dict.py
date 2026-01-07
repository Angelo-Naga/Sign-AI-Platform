"""
翻译字典模块
提供手语与文本之间的双向映射字典
包含手语词汇表、专业术语库和频次统计
"""

import json
import logging
from typing import Dict, List, Tuple, Optional, Set
from collections import defaultdict, Counter
from pathlib import Path
import pickle

logger = logging.getLogger(__name__)


class TranslationDict:
    """
    翻译字典类
    管理手语词汇与文本词汇的双向映射
    """
    
    def __init__(self, dict_path: Optional[str] = None):
        """
        初始化翻译字典
        
        参数:
            dict_path: 字典文件路径，如果为None则初始化空字典
        """
        self.sign_to_text: Dict[str, List[str]] = defaultdict(list)
        self.text_to_sign: Dict[str, List[str]] = defaultdict(list)
        self.sign_vocab: Set[str] = set()
        self.text_vocab: Set[str] = set()
        self.frequency: Counter = Counter()
        self.terminology: Dict[str, Dict] = defaultdict(dict)
        
        if dict_path and Path(dict_path).exists():
            self.load_dict(dict_path)
        else:
            self._initialize_basic_vocab()
    
    def _initialize_basic_vocab(self):
        """
        初始化基础词汇表
        包含常用的手语词汇和对应的中文词汇
        """
        # 基础问候和表示词
        basic_mappings = [
            # 手语 -> 文本映射
            ("你好", ["你好", "您好"]),
            ("再见", ["再见", "拜拜"]),
            ("谢谢", ["谢谢", "感谢"]),
            ("对不起", ["对不起", "抱歉"]),
            ("没关系", ["没关系", "不客气"]),
            
            # 人称代词
            ("我", ["我", "咱们"]),
            ("你", ["你", "你们"]),
            ("他", ["他", "她", "他们"]),
            ("我们", ["我们", "咱们"]),
            
            # 基本动词
            ("来", ["来", "过来"]),
            ("去", ["去", "走"]),
            ("吃", ["吃", "吃饭"]),
            ("喝", ["喝", "喝水"]),
            ("看", ["看", "看见", "看"]),
            ("听", ["听", "听见"]),
            ("说", ["说", "讲"]),
            ("做", ["做", "干"]),
            
            # 时间词
            ("现在", ["现在", "此刻"]),
            ("今天", ["今天", "今日"]),
            ("明天", ["明天", "明日"]),
            ("昨天", ["昨天", "昨日"]),
            ("早晨", ["早晨", "早上"]),
            ("晚上", ["晚上", "夜间"]),
            
            # 数字
            ("一", ["1", "一"]),
            ("二", ["2", "二"]),
            ("三", ["3", "三"]),
            ("四", ["4", "四"]),
            ("五", ["5", "五"]),
            ("十", ["10", "十"]),
            
            # 常见动词
            ("爱", ["爱", "喜欢"]),
            ("喜欢", ["喜欢", "爱"]),
            ("帮助", ["帮助", "帮忙"]),
            ("学习", ["学习", "学"]),
            ("工作", ["工作", "上班"]),
            
            # 基本疑问词
            ("什么", ["什么"]),
            ("哪里", ["哪里", "什么地方"]),
            ("为什么", ["为什么", "干嘛"]),
            ("怎么样", ["怎么样", "如何"]),
            ("几", ["几", "多少"]),
        ]
        
        for sign, texts in basic_mappings:
            for text in texts:
                self.add_mapping(sign, text)
        
        logger.info(f"初始化基础词汇表完成，共 {len(self.sign_vocab)} 个手语词汇，{len(self.text_vocab)} 个文本词汇")
    
    def add_mapping(self, sign: str, text: str, frequency: int = 1):
        """
        添加手语到文本的映射
        
        参数:
            sign: 手语动作标识（通常是手语名称或动作序列标识）
            text: 对应的文本词汇
            frequency: 词频，用于后续的权重计算
        """
        if sign not in self.sign_to_text or text not in self.sign_to_text[sign]:
            self.sign_to_text[sign].append(text)
            self.text_to_sign[text].append(sign)
            self.sign_vocab.add(sign)
            self.text_vocab.add(text)
        
        self.frequency[(sign, text)] += frequency
    
    def add_terminology(self, term: str, category: str, signs: List[str], 
                       definition: str = "", examples: List[str] = []):
        """
        添加专业术语
        
        参数:
            term: 专业术语文本
            category: 术语类别（如：医疗、法律、教育等）
            signs: 对应的手语动作列表
            definition: 术语定义
            examples: 使用示例
        """
        self.terminology[term] = {
            'category': category,
            'signs': signs,
            'definition': definition,
            'examples': examples
        }
        
        # 添加到基本映射
        for sign in signs:
            self.add_mapping(sign, term, frequency=5)  # 术语给予更高权重
        
        logger.info(f"添加专业术语: {term} (类别: {category})")
    
    def get_text_from_sign(self, sign: str, top_k: int = 1) -> List[Tuple[str, float]]:
        """
        从手语获取对应的文本，按频次排序
        
        参数:
            sign: 手语标识
            top_k: 返回前k个结果
            
        返回:
            文本列表及对应的归一化权重
        """
        if sign not in self.sign_to_text:
            return []
        
        texts = self.sign_to_text[sign]
        # 计算每个文本的权重（基于词频）
        weights = [(text, self.frequency[(sign, text)]) for text in texts]
        # 归归一化
        total = sum(w for _, w in weights)
        if total > 0:
            weights = [(t, w/total) for t, w in weights]
        else:
            weights = [(t, 1.0/len(texts)) for t in texts]
        
        # 按权重排序
        weights.sort(key=lambda x: x[1], reverse=True)
        
        return weights[:top_k]
    
    def get_sign_from_text(self, text: str, top_k: int = 1) -> List[Tuple[str, float]]:
        """
        从文本获取对应的手语，按频次排序
        
        参数:
            text: 文本词汇
            top_k: 返回前k个结果
            
        返回:
            手语列表及对应的归一化权重
        """
        if text not in self.text_to_sign:
            return []
        
        signs = self.text_to_sign[text]
        # 计算每个手语的权重
        weights = [(sign, self.frequency[(sign, text)]) for sign in signs]
        # 归一化
        total = sum(w for _, w in weights)
        if total > 0:
            weights = [(s, w/total) for s, w in weights]
        else:
            weights = [(s, 1.0/len(signs)) for s in signs]
        
        # 按权重排序
        weights.sort(key=lambda x: x[1], reverse=True)
        
        return weights[:top_k]
    
    def get_terminology(self, term: str) -> Optional[Dict]:
        """
        获取专业术语信息
        
        参数:
            term: 术语文本
            
        返回:
            术语信息字典，如果术语不存在则返回None
        """
        return self.terminology.get(term)
    
    def search_terminology_by_category(self, category: str) -> List[Dict]:
        """
        按类别搜索专业术语
        
        参数:
            category: 术语类别
            
        返回:
            该类别下的所有术语列表
        """
        return [
            {**info, 'term': term}
            for term, info in self.terminology.items()
            if info['category'] == category
        ]
    
    def update_frequency(self, sign: str, text: str, delta: int = 1):
        """
        更新词频
        
        参数:
            sign: 手语标识
            text: 文本词汇
            delta: 频次增量
        """
        if (sign, text) in self.frequency:
            self.frequency[(sign, text)] += delta
    
    def save_dict(self, path: str):
        """
        保存字典到文件
        
        参数:
            path: 保存路径
        """
        data = {
            'sign_to_text': dict(self.sign_to_text),
            'text_to_sign': dict(self.text_to_sign),
            'sign_vocab': list(self.sign_vocab),
            'text_vocab': list(self.text_vocab),
            'frequency': dict(self.frequency),
            'terminology': dict(self.terminology)
        }
        
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            logger.info(f"翻译字典已保存到: {path}")
        except Exception as e:
            logger.error(f"保存翻译字典失败: {e}")
            raise
    
    def load_dict(self, path: str):
        """
        从文件加载字典
        
        参数:
            path: 字典文件路径
        """
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.sign_to_text = defaultdict(list, data['sign_to_text'])
            self.text_to_sign = defaultdict(list, data['text_to_sign'])
            self.sign_vocab = set(data['sign_vocab'])
            self.text_vocab = set(data['text_vocab'])
            self.frequency = Counter(data['frequency'])
            self.terminology = defaultdict(dict, data['terminology'])
            
            logger.info(f"翻译字典已从 {path} 加载，共 {len(self.sign_vocab)} 个手语词汇")
        except Exception as e:
            logger.error(f"加载翻译字典失败: {e}")
            raise
    
    def get_statistics(self) -> Dict:
        """
        获取字典统计信息
        
        返回:
            包含统计信息的字典
        """
        return {
            'total_sign_vocab': len(self.sign_vocab),
            'total_text_vocab': len(self.text_vocab),
            'total_mappings': sum(len(v) for v in self.sign_to_text.values()),
            'total_terminology': len(self.terminology),
            'categories': list(set(t['category'] for t in self.terminology.values())),
            'top_frequent_pairs': self.frequency.most_common(10)
        }
    
    def batch_add_mappings(self, mappings: List[Tuple[str, str]]):
        """
        批量添加映射关系
        
        参数:
            mappings: (手语, 文本) 对列表
        """
        for sign, text in mappings:
            self.add_mapping(sign, text)
        
        logger.info(f"批量添加 {len(mappings)} 个映射关系")
    
    def fuzzy_match_sign(self, sign: str, threshold: float = 0.6) -> List[str]:
        """
        模糊匹配手语词汇
        
        参数:
            sign: 待匹配的手语标识
            threshold: 相似度阈值
            
        返回:
            匹配的手语列表
        """
        # 简单的子字符串匹配
        matches = []
        for vocab_sign in self.sign_vocab:
            if sign.lower() in vocab_sign.lower() or vocab_sign.lower() in sign.lower():
                matches.append(vocab_sign)
        
        return matches


class SignVocabulary:
    """
    手语词汇表类
    管理更丰富的手语词汇和动作描述
    """
    
    def __init__(self):
        """初始化手语词汇表"""
        self.vocab: Dict[str, Dict] = {}
        self._initialize_sign_vocab()
    
    def _initialize_sign_vocab(self):
        """
        初始化详细的手语词汇表
        包含动作描述、类别等信息
        """
        # 手势动作词汇
        gestures = [
            {
                'id': 'point_right',
                'name': '指右边',
                'category': '指示',
                'description': '右手食指指向右侧',
                'text_meaning': ['这里', '那边', '这个'],
            },
            {
                'id': 'point_left',
                'name': '指左边',
                'category': '指示',
                'description': '右手食指指向左侧',
                'text_meaning': ['这里', '那边', '这个'],
            },
            {
                'id': 'clap',
                'name': '拍手',
                'category': '动作',
                'description': '双手手掌相对拍击',
                'text_meaning': ['鼓掌', '祝贺', '好'],
            },
            {
                'id': 'wave_right_hand',
                'name': '挥手',
                'category': '问候',
                'description': '右手在空中左右摆动',
                'text_meaning': ['你好', '再见'],
            },
            {
                'id': 'thumbs_up',
                'name': '竖拇指',
                'category': '表情',
                'description': '右手拇指向上，其他手指收起',
                'text_meaning': ['好', '优秀', '同意'],
            },
            {
                'id': 'open_palms',
                'name': '摊手',
                'category': '表情',
                'description': '双手掌心向上摊开',
                'text_meaning': ['不知道', '没办法', '怎么了'],
            },
            {
                'id': 'heart_gesture',
                'name': '比心',
                'category': '表情',
                'description': '双手拇指和食指组成心形',
                'text_meaning': ['爱', '喜欢', '谢谢'],
            },
            {
                'id': 'nod',
                'name': '点头',
                'category': '体态',
                'description': '头部上下移动',
                'text_meaning': ['是', '对', '好的'],
            },
            {
                'id': 'shake_head',
                'name': '摇头',
                'category': '体态',
                'description': '头部左右移动',
                'text_meaning': ['不', '不对', '不是'],
            },
        ]
        
        for gesture in gestures:
            self.vocab[gesture['id']] = gesture
        
        logger.info(f"初始化手语词汇表完成，共 {len(self.vocab)} 个词汇")
    
    def get_sign_info(self, sign_id: str) -> Optional[Dict]:
        """
        获取手语词汇的详细信息
        
        参数:
            sign_id: 手语ID
            
        返回:
            手语信息字典
        """
        return self.vocab.get(sign_id)
    
    def get_signs_by_category(self, category: str) -> List[Dict]:
        """
        按类别获取手语词汇
        
        参数:
            category: 类别名称
            
        返回:
            该类别下的手语列表
        """
        return [
            info for info in self.vocab.values()
            if info['category'] == category
        ]
    
    def get_all_categories(self) -> List[str]:
        """
        获取所有类别
        
        返回:
            类别列表
        """
        return list(set(info['category'] for info in self.vocab.values()))
    
    def search_sign(self, keyword: str) -> List[Dict]:
        """
        搜索手语词汇
        
        参数:
            keyword: 搜索关键词
            
        返回:
            匹配的手语列表
        """
        results = []
        for info in self.vocab.values():
            if (keyword.lower() in info['name'].lower() or
                keyword.lower() in info['description'].lower() or
                any(keyword.lower() in text.lower() for text in info['text_meaning'])):
                results.append(info)
        
        return results