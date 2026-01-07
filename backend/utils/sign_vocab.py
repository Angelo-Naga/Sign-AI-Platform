"""
手语词汇映射模块
管理手语词汇表，提供索引与文本的双向映射功能
"""

import json
import os
from typing import Dict, List, Optional, Any
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SignVocab:
    """手语词汇表类"""
    
    # 默认基础词汇（中文手语）
    DEFAULT_VOCAB = {
        0: "你好",
        1: "谢谢",
        2: "对不起",
        3: "再见",
        4: "是",
        5: "不是",
        6: "请",
        7: "不客气",
        8: "早上好",
        9: "晚上好",
        10: "开心",
        11: "难过",
        12: "好的",
        13: "什么",
        14: "为什么",
        15: "帮助",
        16: "爱",
        17: "喜欢",
        18: "不喜欢",
        19: "等等",
        20: "吃饭",
        21: "喝水",
        22: "睡觉",
        23: "学习",
        24: "工作",
        25: "家人",
        26: "朋友",
        27: "医生",
        28: "老师",
        29: "安全",
        30: "危险",
    }
    
    # 词汇类别
    VOCAB_CATEGORIES = {
        "问候": ["你好", "早上好", "晚上好", "再见"],
        "礼貌": ["谢谢", "不客气", "对不起", "请"],
        "基本": ["是", "不是", "好的", "等等"],
        "情感": ["开心", "难过", "爱", "喜欢", "不喜欢"],
        "疑问": ["什么", "为什么"],
        "日常": ["吃饭", "喝水", "睡觉", "学习", "工作"],
        "人物": ["家人", "朋友", "医生", "老师"],
        "其他": ["帮助", "安全", "危险"],
    }
    
    def __init__(self, vocab_path: Optional[str] = None):
        """
        初始化词汇表
        
        Parameters:
        -----------
        vocab_path: str, optional
            词汇表文件路径（JSON格式）
            如果为None，则使用默认词汇表
        """
        self.word_to_idx: Dict[str, int] = {}
        self.idx_to_word: Dict[int, str] = {}
        self.categories: Dict[str, List[str]] = {}
        self.word_to_category: Dict[str, str] = {}
        
        # 加载词汇表
        if vocab_path is not None:
            self._load_vocab(vocab_path)
        else:
            self._load_default_vocab()
        
        logger.info(f"词汇表初始化完成，共 {len(self.idx_to_word)} 个词汇")
    
    def _load_default_vocab(self):
        """加载默认词汇表"""
        self.idx_to_word = self.DEFAULT_VOCAB.copy()
        self.word_to_idx = {v: k for k, v in self.idx_to_word.items()}
        self._build_category_mapping()
    
    def _load_vocab(self, vocab_path: str):
        """
        从文件加载词汇表
        
        Parameters:
        -----------
        vocab_path: str
            词汇表JSON文件路径
        """
        try:
            if not os.path.exists(vocab_path):
                logger.warning(f"词汇表文件不存在: {vocab_path}，使用默认词汇表")
                self._load_default_vocab()
                return
            
            with open(vocab_path, 'r', encoding='utf-8') as f:
                vocab_data = json.load(f)
            
            # 解析词汇表
            if isinstance(vocab_data, dict):
                if 'vocab' in vocab_data:
                    self.idx_to_word = {
                        int(k): v for k, v in vocab_data['vocab'].items()
                    }
                else:
                    self.idx_to_word = {
                        int(k): v for k, v in vocab_data.items()
                    }
                
                # 解析类别信息
                if 'categories' in vocab_data:
                    self.categories = vocab_data['categories']
                    self._build_category_mapping()
                else:
                    self._build_category_mapping()
            else:
                raise ValueError("词汇表格式错误")
            
            self.word_to_idx = {v: k for k, v in self.idx_to_word.items()}
            
            logger.info(f"成功加载词汇表文件: {vocab_path}")
            
        except Exception as e:
            logger.error(f"加载词汇表失败: {str(e)}，使用默认词汇表")
            self._load_default_vocab()
    
    def _build_category_mapping(self):
        """构建词汇到类别的映射"""
        self.word_to_category = {}
        
        # 如果没有显式类别，使用默认类别
        if not self.categories:
            self.categories = self.VOCAB_CATEGORIES
        
        for category, words in self.categories.items():
            for word in words:
                self.word_to_category[word] = category
    
    def idx_to_word(self, idx: int) -> Optional[str]:
        """
        索引转词汇
        
        Parameters:
        -----------
        idx: int
            词汇索引
            
        Returns:
        --------
        str or None
            对应的词汇，如果不存在则返回None
        """
        return self.idx_to_word.get(idx)
    
    def word_to_idx(self, word: str) -> Optional[int]:
        """
        词汇转索引
        
        Parameters:
        -----------
        word: str
            词汇字符串
            
        Returns:
        --------
        int or None
            对应的索引，如果不存在则返回None
        """
        return self.word_to_idx.get(word)
    
    def get_category(self, word: str) -> Optional[str]:
        """
        获取词汇所属类别
        
        Parameters:
        -----------
        word: str
            词汇字符串
            
        Returns:
        --------
        str or None
            词汇类别，如果不存在则返回None
        """
        return self.word_to_category.get(word)
    
    def get_words_in_category(self, category: str) -> List[str]:
        """
        获取指定类别的所有词汇
        
        Parameters:
        -----------
        category: str
            类别名称
            
        Returns:
        --------
        List[str]
            该类别的词汇列表
        """
        return self.categories.get(category, [])
    
    def get_categories(self) -> List[str]:
        """
        获取所有类别
        
        Returns:
        --------
        List[str]
            类别列表
        """
        return list(self.categories.keys())
    
    def add_word(self, word: str, category: Optional[str] = None) -> int:
        """
        添加新词汇
        
        Parameters:
        -----------
        word: str
            新词汇
        category: str, optional
            词汇类别
            
        Returns:
        --------
        int
            新词汇的索引
        """
        if word in self.word_to_idx:
            logger.warning(f"词汇已存在: {word}")
            return self.word_to_idx[word]
        
        # 分配新索引
        new_idx = len(self.idx_to_word)
        self.idx_to_word[new_idx] = word
        self.word_to_idx[word] = new_idx
        
        # 添加类别
        if category:
            if category not in self.categories:
                self.categories[category] = []
            self.categories[category].append(word)
            self.word_to_category[word] = category
        
        logger.info(f"添加新词汇: {word} (索引: {new_idx})")
        return new_idx
    
    def remove_word(self, word: str) -> bool:
        """
        移除词汇
        
        Parameters:
        -----------
        word: str
            要移除的词汇
            
        Returns:
        --------
        bool
            是否成功移除
        """
        if word not in self.word_to_idx:
            logger.warning(f"词汇不存在: {word}")
            return False
        
        idx = self.word_to_idx[word]
        del self.word_to_idx[word]
        del self.idx_to_word[idx]
        
        # 从类别中移除
        category = self.word_to_category.get(word)
        if category and category in self.categories:
            if word in self.categories[category]:
                self.categories[category].remove(word)
            del self.word_to_category[word]
        
        logger.info(f"移除词汇: {word}")
        return True
    
    def get_all_words(self) -> List[str]:
        """
        获取所有词汇
        
        Returns:
        --------
        List[str]
            所有词汇列表
        """
        return list(self.word_to_idx.keys())
    
    def size(self) -> int:
        """
        获取词汇表大小
        
        Returns:
        --------
        int
            词汇数量
        """
        return len(self.idx_to_word)
    
    def save_vocab(self, save_path: str):
        """
        保存词汇表到文件
        
        Parameters:
        -----------
        save_path: str
            保存路径
        """
        try:
            vocab_data = {
                'vocab': self.idx_to_word,
                'categories': self.categories
            }
            
            # 确保目录存在
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            
            with open(save_path, 'w', encoding='utf-8') as f:
                json.dump(vocab_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"词汇表已保存到: {save_path}")
            
        except Exception as e:
            logger.error(f"保存词汇表失败: {str(e)}")
            raise
    
    def __len__(self) -> int:
        """返回词汇表大小"""
        return self.size()
    
    def __contains__(self, word: str) -> bool:
        """检查词汇是否存在"""
        return word in self.word_to_idx
    
    def __getitem__(self, idx: int) -> Optional[str]:
        """通过索引获取词汇"""
        return self.idx_to_word.get(idx)
    
    def __repr__(self) -> str:
        """字符串表示"""
        return f"SignVocab(size={self.size()}, categories={len(self.categories)})"
    
    def get_vocab_statistics(self) -> Dict[str, Any]:
        """
        获取词汇表统计信息
        
        Returns:
        --------
        Dict[str, Any]
            统计信息字典
        """
        category_stats = {}
        for category, words in self.categories.items():
            category_stats[category] = len(words)
        
        return {
            'total_words': self.size(),
            'total_categories': len(self.categories),
            'category_statistics': category_stats,
            'categories': list(self.categories.keys())
        }
    
    def export_to_list(self) -> List[str]:
        """
        导出为词汇列表（按索引顺序）
        
        Returns:
        --------
        List[str]
            词汇列表
        """
        vocab_list = [self.idx_to_word[i] for i in sorted(self.idx_to_word.keys())]
        return vocab_list
    
    def import_from_list(self, word_list: List[str], categories: Optional[Dict[str, List[str]]] = None):
        """
        从列表导入词汇
        
        Parameters:
        -----------
        word_list: List[str]
            词汇列表
        categories: Dict[str, List[str]], optional
            类别信息
        """
        try:
            self.idx_to_word = {i: word for i, word in enumerate(word_list)}
            self.word_to_idx = {word: i for i, word in self.idx_to_word.items()}
            
            if categories:
                self.categories = categories
                self._build_category_mapping()
            else:
                self._build_category_mapping()
            
            logger.info(f"从列表导入词汇表，共 {len(word_list)} 个词汇")
            
        except Exception as e:
            logger.error(f"导入词汇列表失败: {str(e)}")
            raise


def create_vocab_from_file(vocab_path: str) -> SignVocab:
    """
    从文件创建词汇表
    
    Parameters:
    -----------
    vocab_path: str
        词汇表文件路径
    
    Returns:
    --------
    SignVocab
        词汇表实例
    """
    return SignVocab(vocab_path=vocab_path)


def create_default_vocab() -> SignVocab:
    """
    创建默认词汇表
    
    Returns:
    --------
    SignVocab
        默认词汇表实例
    """
    return SignVocab()


if __name__ == '__main__':
    # 测试代码
    print("测试手语词汇表模块")
    
    # 创建默认词汇表
    vocab = create_default_vocab()
    print(f"词汇表: {vocab}")
    print(f"词汇数量: {len(vocab)}")
    
    # 测试索引转换
    idx = 0
    word = vocab[idx]
    print(f"索引 {idx} -> 词汇: {word}")
    print(f"词汇 {word} -> 索引: {vocab.word_to_idx(word)}")
    
    # 测试类别
    category = vocab.get_category(word)
    print(f"词汇 '{word}' 的类别: {category}")
    
    # 测试添加词汇
    new_word = "测试词汇"
    new_idx = vocab.add_word(new_word, "测试")
    print(f"添加词汇: {new_word} (索引: {new_idx})")
    
    # 测试统计信息
    stats = vocab.get_vocab_statistics()
    print(f"\n统计信息:")
    print(f"总词汇数: {stats['total_words']}")
    print(f"总类别数: {stats['total_categories']}")
    print(f"类别统计: {stats['category_statistics']}")
    
    # 测试保存
    # vocab.save_vocab("test_vocab.json")
    
    print("\n测试完成！")