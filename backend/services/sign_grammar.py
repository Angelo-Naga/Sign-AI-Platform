"""
手语语法处理器模块
处理手语与口语之间的语法转换
支持ASL（美国手语）和CSL（中国手语）的语法规则
"""

import logging
import re
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class SignLanguage(Enum):
    """手语类型枚举"""
    ASL = "asl"  # 美国手语
    CSL = "csl"  # 中国手语


@dataclass
class GrammarRule:
    """语法规则数据类"""
    name: str  # 规则名称
    pattern: str  # 匹配模式
    replacement: str  # 替换模式
    description: str  # 规则描述
    priority: int = 0  # 优先级（数字越大优先级越高）


class SignGrammarProcessor:
    """
    手语语法处理器
    处理手语语法规则和语法转换
    """
    
    # CSL语法规则：时间-地点-主体-动词-客体 (T-P-S-V-O)
    CSL_WORD_ORDER = "TPSVO"
    
    # ASL语法规则：时间-主题-评论 (TTC)
    ASL_WORD_ORDER = "TTC"
    
    def __init__(self, sign_language: SignLanguage = SignLanguage.CSL):
        """
        初始化语法处理器
        
        参数:
            sign_language: 手语类型 (ASL 或 CSL)
        """
        self.sign_language = sign_language
        self.rules: List[GrammarRule] = []
        self.time_expressions: Set[str] = set()
        self.place_expressions: Set[str] = set()
        self.pronouns: Set[str] = set()
        self.verbs: Set[str] = set()
        self.nouns: Set[str] = set()
        
        self._initialize_vocabulary()
        self._initialize_grammar_rules()
        
        logger.info(f"初始化{sign_language.value.upper()}语法处理器")
    
    def _initialize_vocabulary(self):
        """初始化词汇分类"""
        # 时间表达
        self.time_expressions = {
            '现在', '今天', '明天', '昨天', '刚才', '后来',
            '早晨', '晚上', '中午', '白天', '夜间',
            '以前', '以后', '总是', '经常', '偶尔',
            '星期一', '星期二', '星期三', '星期四', '星期五',
            '星期六', '星期日', '周一', '周二', '周三', '周四',
            '周五', '周六', '周日', '一', '二', '三', '四', '五', '六', '日',
            '早上', '下午', '傍晚', '深夜', '清晨',
        }
        
        # 地点表达
        self.place_expressions = {
            '这里', '那里', '家', '学校', '医院', '商场',
            '北京', '上海', '广州', '深圳', '杭州',
            '办公室', '教室', '图书馆', '公园', '餐厅',
            '家', '房间', '客厅', '卧室', '厨房',
            '里面', '外面', '上面', '下面', '前面', '后面',
            '左边', '右边', '旁边', '附近', '远处',
        }
        
        # 代词
        self.pronouns = {
            '我', '你', '他', '她', '它', '我们', '你们', '他们', '她们',
            '这', '那', '谁', '什么', '哪里', '什么时候', '怎么',
            '大家', '别人', '自己', '各自', '互相',
        }
        
        # 常用动词
        self.verbs = {
            '来', '去', '看', '听', '说', '做', '吃', '喝',
            '学', '教', '帮', '喜欢', '爱', '恨', '想', '要',
            '买', '卖', '读', '写', '玩', '工作', '休息',
            '开始', '结束', '继续', '停止', '等待', '寻找',
            '认识', '了解', '相信', '怀疑', '知道', '明白',
            '给', '拿', '放', '带', '送', '拿走', '放下',
            '走', '跑', '飞', '跳', '爬', '坐', '站', '躺',
        }
        
        # 常用名词
        self.nouns = {
            '书', '笔', '杯子', '桌子', '椅子', '手机', '电脑',
            '饭', '菜', '水', '桌子', '杯子', '杯子',
            '妈妈', '爸爸', '哥哥', '姐姐', '弟弟', '妹妹',
            '朋友', '老师', '学生', '医生', '护士', '警察',
            '衣服', '鞋子', '帽子', '裤子', '衣服',
            '车', '公交车', '火车', '飞机', '船',
            '天空', '太阳', '月亮', '星星', '云', '雨', '雪',
        }
    
    def _initialize_grammar_rules(self):
        """初始化语法规则"""
        if self.sign_language == SignLanguage.CSL:
            self._init_csl_rules()
        else:
            self._init_asl_rules()
    
    def _init_csl_rules(self):
        """初始化CSL（中国手语）语法规则"""
        # 主题化规则
        self.rules.extend([
            GrammarRule(
                name="time_front",
                pattern=r"^(.+?)(的|了|吗|吧|呢|嘛)?(.+?)(动词)的(.+?)$",
                replacement=r"\3\2\1\4\5",
                description="时间前置：动词短语中的时间成分移到句首",
                priority=3
            ),
            GrammarRule(
                name="place_front",
                pattern=r"^(.+?)(在|到|去|从)(.+?)(做|干|玩)$",
                replacement=r"\3\2\1\4",
                description="地点前置：介词短语前移",
                priority=3
            ),
            GrammarRule(
                name="topic_comment",
                pattern=r"^(.+?)(呢|的话)?(就|是|是)(.+?)$",
                replacement=r"\1\3\4",
                description="主题-评论结构：标记主题",
                priority=4
            ),
            GrammarRule(
                name="noun_verb_order",
                pattern=r"^(.+?)(的)(.+?)(.+?)(.+?)$",
                replacement=r"\1\4\3\5",
                description="主语-客体-动词转换",
                priority=2
            ),
        ])
        
        # 词序重排规则：TPSVO（时间-地点-主体-动词-客体）
        self.rules.extend([
            GrammarRule(
                name="tpsvo_reorder",
                pattern=r"(.+)",
                replacement=r"\1",  # 实际处理在专用方法中
                description="TPSVO词序重排",
                priority=5
            ),
        ])
        
        logger.info(f"加载CSL语法规则，共{len(self.rules)}条规则")
    
    def _init_asl_rules(self):
        """初始化ASL（美国手语）语法规则"""
        # ASL主题-评论结构
        self.rules.extend([
            GrammarRule(
                name="topic_eyebrow_raise",
                pattern=r"^(.+?)(疑问词)?(.+?)$",
                replacement=r"[TOPIC: \1] [COMMENT: \2\3]",
                description="主题评论结构：用眉毛动作标记主题",
                priority=5
            ),
            GrammarRule(
                name="yes_no_question",
                pattern=r"^(.+?)(吧|吗|嘛)?$",
                replacement=r"[QUESTION: \1]",
                description="是非疑问句：用面部表情标记",
                priority=4
            ),
            GrammarRule(
                name="wh_question",
                pattern=r"^(.+?)(什么|哪里|谁|为什么|怎么)(.+?)$",
                replacement=r"[WH-\2: \1\3]",
                description="特指疑问句：疑问词后置",
                priority=4
            ),
        ])
        
        logger.info(f"加载ASL语法规则，共{len(self.rules)}条规则")
    
    def analyze_sentence_structure(self, sentence: str) -> Dict[str, List[str]]:
        """
        分析句子结构
        
        参数:
            sentence: 待分析的句子
            
        返回:
            包含各个成分的字典
        """
        words = re.findall(r'[^\s,，.。、！？;；]+', sentence)
        
        structure = {
            'time': [],  # 时间成分
            'place': [],  # 地点成分
            'subject': [],  # 主体/主语
            'verb': [],  # 动词
            'object': [],  # 客体/宾语
            'other': []  # 其他成分
        }
        
        for word in words:
            categorized = False
            if word in self.time_expressions:
                structure['time'].append(word)
                categorized = True
            if word in self.place_expressions:
                structure['place'].append(word)
                categorized = True
            if word in self.pronouns or word in self.nouns:
                if not structure['subject'] and not structure['object']:
                    structure['subject'].append(word)
                elif not structure['object']:
                    structure['object'].append(word)
                else:
                    structure['other'].append(word)
                categorized = True
            if word in self.verbs:
                structure['verb'].append(word)
                categorized = True
            
            if not categorized:
                structure['other'].append(word)
        
        return structure
    
    def convert_to_sign_language_word_order(self, sentence: str) -> str:
        """
        将句子转换到手语词序
        
        参数:
            sentence: 原始句子
            
        返回:
            转换后的手语词序句子
        """
        # 分析句子结构
        structure = self.analyze_sentence_structure(sentence)
        
        if self.sign_language == SignLanguage.CSL:
            # CSL: T-P-S-V-O (时间-地点-主体-动词-客体)
            ordered_parts = []
            
            # 时间成分
            ordered_parts.extend(structure['time'])
            
            # 地点成分
            ordered_parts.extend(structure['place'])
            
            # 主体
            ordered_parts.extend(structure['subject'])
            
            # 动词
            ordered_parts.extend(structure['verb'])
            
            # 客体
            ordered_parts.extend(structure['object'])
            
            # 其他成分
            ordered_parts.extend(structure['other'])
            
            result = ' '.join(ordered_parts) if ordered_parts else sentence
            
        else:  # ASL
            # ASL: Topic-Comment structure
            # 主题通常是前置
            ordered_parts = []
            
            # 时间和地点作为主题
            topic_parts = structure['time'] + structure['place']
            if topic_parts:
                ordered_parts.extend(topic_parts)
            
            # 然后是评论：主体-客体-动词（主题化）
            comment_parts = (structure['subject'] + 
                           structure['object'] + 
                           structure['verb'])
            ordered_parts.extend(comment_parts)
            
            # 其他成分
            ordered_parts.extend(structure['other'])
            
            result = ' '.join(ordered_parts) if ordered_parts else sentence
        
        logger.debug(f"词序转换: '{sentence}' -> '{result}'")
        return result
    
    def convert_from_sign_language_word_order(self, sign_sequence: str) -> str:
        """
        将手语词序转换回正常句子
        
        参数:
            sign_sequence: 手语词序序列
            
        返回:
            正常语序的句子
        """
        # 分析手语序列
        structure = self.analyze_sentence_structure(sign_sequence)
        
        # 根据当前手语类型的规则进行反向转换
        if self.sign_language == SignLanguage.CSL:
            # 从TPSVO转回标准语序（S-T-P-V-O的变种）
            ordered_parts = []
            
            # 主体优先
            ordered_parts.extend(structure['subject'])
            
            # 时间
            ordered_parts.extend(structure['time'])
            
            # 地点
            ordered_parts.extend(structure['place'])
            
            # 动词
            ordered_parts.extend(structure['verb'])
            
            # 客体
            ordered_parts.extend(structure['object'])
            
            # 其他
            ordered_parts.extend(structure['other'])
            
        else:  # ASL
            # 从主题-评论转回标准语序
            ordered_parts = []
            
            # 主体
            ordered_parts.extend(structure['subject'])
            
            # 时间
            ordered_parts.extend(structure['time'])
            
            # 地点
            ordered_parts.extend(structure['place'])
            
            # 动词
            ordered_parts.extend(structure['verb'])
            
            # 客体
            ordered_parts.extend(structure['object'])
            
            # 其他
            ordered_parts.extend(structure['other'])
        
        result = ' '.join(ordered_parts) if ordered_parts else sign_sequence
        return result
    
    def apply_grammar_rules(self, text: str, direction: str = "text_to_sign") -> str:
        """
        应用语法规则
        
        参数:
            text: 待处理的文本
            direction: 转换方向 ("text_to_sign" 或 "sign_to_text")
            
        返回:
            转换后的文本
        """
        result = text
        
        # 按优先级排序规则
        sorted_rules = sorted(self.rules, key=lambda r: r.priority)
        
        for rule in sorted_rules:
            try:
                if direction == "text_to_sign":
                    pattern = rule.pattern
                    replacement = rule.replacement
                else:
                    # 反向转换：交换模式
                    pattern = rule.replacement
                    replacement = rule.pattern
                
                # 使用正则表达式替换
                new_result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
                
                if new_result != result:
                    logger.debug(f"应用规则 '{rule.name}': {result} -> {new_result}")
                    result = new_result
            
            except Exception as e:
                logger.warning(f"应用规则 '{rule.name}' 失败: {e}")
                continue
        
        return result
    
    def is_time_expression(self, word: str) -> bool:
        """判断是否为时间表达"""
        return word in self.time_expressions
    
    def is_place_expression(self, word: str) -> bool:
        """判断是否为地点表达"""
        return word in self.place_expressions
    
    def is_pronoun(self, word: str) -> bool:
        """判断是否为代词"""
        return word in self.pronouns
    
    def is_verb(self, word: str) -> bool:
        """判断是否为动词"""
        return word in self.verbs
    
    def is_noun(self, word: str) -> bool:
        """判断是否为名词"""
        return word in self.nouns
    
    def add_vocabulary(self, word: str, word_type: str):
        """
        添加词汇到相应类别
        
        参数:
            word: 词汇
            word_type: 词汇类型 ('time', 'place', 'pronoun', 'verb', 'noun')
        """
        categories = {
            'time': self.time_expressions,
            'place': self.place_expressions,
            'pronoun': self.pronouns,
            'verb': self.verbs,
            'noun': self.nouns
        }
        
        if word_type in categories:
            categories[word_type].add(word)
            logger.debug(f"添加词汇 '{word}' 到类别 '{word_type}'")
        else:
            logger.warning(f"未知的词汇类型: {word_type}")
    
    def add_grammar_rule(self, rule: GrammarRule):
        """
        添加语法规则
        
        参数:
            rule: 语法规则对象
        """
        self.rules.append(rule)
        logger.info(f"添加语法规则: {rule.name}")
    
    def get_word_order_info(self) -> Dict:
        """
        获取当前手语的词序信息
        
        返回:
            词序信息字典
        """
        return {
            'sign_language': self.sign_language.value,
            'word_order': self.CSL_WORD_ORDER if self.sign_language == SignLanguage.CSL else self.ASL_WORD_ORDER,
            'description': '时间-地点-主体-动词-客体' if self.sign_language == SignLanguage.CSL else '主题-评论结构',
            'rules_count': len(self.rules)
        }
    
    def parse_sign_sequence(self, sequence: List[Dict]) -> List[Dict]:
        """
        解析手语序列，添加语法标注
        
        参数:
            sequence: 手语动作序列
            
        返回:
            添加了语法信息的序列
        """
        parsed_sequence = []
        
        for item in sequence:
            sign_text = item.get('text', '')
            parsed_item = item.copy()
            
            # 添加词性标注
            if self.is_time_expression(sign_text):
                parsed_item['pos'] = 'time'
            elif self.is_place_expression(sign_text):
                parsed_item['pos'] = 'place'
            elif self.is_pronoun(sign_text):
                parsed_item['pos'] = 'pronoun'
            elif self.is_verb(sign_text):
                parsed_item['pos'] = 'verb'
            elif self.is_noun(sign_text):
                parsed_item['pos'] = 'noun'
            else:
                parsed_item['pos'] = 'unknown'
            
            parsed_sequence.append(parsed_item)
        
        return parsed_sequence


class GrammarAnalyzer:
    """
    语法分析器
    提供更深入的句法和语义分析
    """
    
    def __init__(self, grammar_processor: SignGrammarProcessor):
        """
        初始化语法分析器
        
        参数:
            grammar_processor: 语法处理器实例
        """
        self.grammar = grammar_processor
    
    def analyze_sentence_complexity(self, sentence: str) -> int:
        """
        分析句子复杂度
        
        参数:
            sentence: 待分析句子
            
        返回:
            复杂度分数（1-5，5最复杂）
        """
        words = re.findall(r'[^\s,，.。、！？;；]+', sentence)
        
        # 基于词语数量、长度、标点符号等计算复杂度
        length_score = min(len(words) // 3, 2)  # 基于长度
        punctuation = len(re.findall(r'[，；、；;]', sentence))  # 逗号等
        question = 1 if re.search(r'[？?]', sentence) else 0
        
        complexity = 1 + length_score + min(punctuation, 1) + question
        
        return min(complexity, 5)
    
    def detect_question_type(self, sentence: str) -> Optional[str]:
        """
        检测疑问句类型
        
        参数:
            sentence: 待分析句子
            
        返回:
            疑问类型 ('yes_no', 'wh_question', 'alternative', None)
        """
        # 是非疑问句
        if re.search(r'(吗|吧|嘛|不|是不是|对不对)', sentence):
            return 'yes_no'
        
        # 特指疑问句
        wh_words = ['什么', '哪里', '谁', '为什么', '怎么', '什么时候', '多少', '哪个']
        if any(word in sentence for word in wh_words):
            return 'wh_question'
        
        # 选择疑问句
        if re.search(r'还是|或者', sentence) and re.search(r'[？?]', sentence):
            return 'alternative'
        
        return None
    
    def suggest_sign_modifications(self, sentence: str) -> List[str]:
        """
        根据语法分析建议手语修改
        
        参数:
            sentence: 原始句子
            
        返回:
            建议列表
        """
        suggestions = []
        
        # 检查时间表达
        structure = self.grammar.analyze_sentence_structure(sentence)
        if not structure['time']:
            if any(word in sentence for word in ['明天', '昨天', '今天']):
                suggestions.append("建议明确时间表达，可以用手指向日历或使用时间手势")
        
        # 检查疑问句类型
        question_type = self.detect_question_type(sentence)
        if question_type:
            suggestions.append(f"检测到{question_type}型疑问句，建议配合相应的面部表情和肢体语言")
        
        # 检测复杂度
        complexity = self.analyze_sentence_complexity(sentence)
        if complexity >= 4:
            suggestions.append("句子较复杂，建议分段表达，每段之间增加停顿")
        
        return suggestions