"""
说话人数据库模块
管理说话人档案、嵌入向量和样本数据
提供 CRU D操作和相似度搜索功能
"""

import logging
import json
import numpy as np
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
from datetime import datetime
import uuid
import pickle

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class SpeakerProfile:
    """说话人档案"""
    id: str  # 说话人ID
    name: str  # 说话人名称
    description: str = ""  # 描述
    created_at: str = ""  # 创建时间（ISO格式）
    updated_at: str = ""  # 更新时间（ISO格式）
    sample_count: int = 0  # 样本数量
    is_active: bool = True  # 是否活跃
    embedding: Optional[np.ndarray] = None  # 平均嵌入向量
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典（用于存储）"""
        data = asdict(self)
        # 不存储嵌入向量（单独存储）
        data['embedding'] = None
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SpeakerProfile':
        """从字典创建对象"""
        return cls(**data)


@dataclass
class VoiceSample:
    """声音样本"""
    id: str  # 样本ID
    speaker_id: str  # 说话人ID
    name: str  # 样本名称
    audio_path: str  # 音频文件路径
    embedding: Optional[np.ndarray] = None  # 嵌入向量
    duration: float = 0.0  # 时长（秒）
    created_at: str = ""  # 创建时间
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        data = asdict(self)
        data['embedding'] = None  # 单独存储
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'VoiceSample':
        """从字典创建对象"""
        return cls(**data)


class SpeakerDatabase:
    """说话人数据库类"""
    
    def __init__(self, db_path: Optional[str] = None):
        """初始化说话人数据库
        
        Args:
            db_path: 数据库目录路径，None 表示使用默认路径
        """
        if db_path is None:
            # 默认路径：backend/speaker_db
            self.db_path = Path(__file__).parent.parent / "speaker_db"
        else:
            self.db_path = Path(db_path)
        
        # 创建必要的目录
        self.speakers_dir = self.db_path / "speakers"
        self.samples_dir = self.db_path / "samples"
        self.embeddings_dir = self.db_path / "embeddings"
        
        for dir_path in [self.speakers_dir, self.samples_dir, self.embeddings_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
        
        # 说话人档案索引
        self.speakers_index: Dict[str, SpeakerProfile] = {}
        
        # 样本索引
        self.samples_index: Dict[str, VoiceSample] = {}
        
        # 说话人样本映射
        self.speaker_samples: Dict[str, List[str]] = {}
        
        # 加载索引
        self._load_index()
        
        logger.info(f"说话人数据库初始化完成，路径: {self.db_path}")
        logger.info(f"已加载 {len(self.speakers_index)} 个说话人档案")
    
    def _load_index(self):
        """加载索引文件"""
        try:
            # 加载说话人索引
            speakers_file = self.db_path / "speakers_index.json"
            if speakers_file.exists():
                with open(speakers_file, 'r', encoding='utf-8') as f:
                    speakers_data = json.load(f)
                
                for speaker_id, data in speakers_data.items():
                    self.speakers_index[speaker_id] = SpeakerProfile.from_dict(data)
                
                logger.info(f"加载 {len(self.speakers_index)} 个说话人档案")
            
            # 加载样本索引
            samples_file = self.db_path / "samples_index.json"
            if samples_file.exists():
                with open(samples_file, 'r', encoding='utf-8') as f:
                    samples_data = json.load(f)
                
                for sample_id, data in samples_data.items():
                    self.samples_index[sample_id] = VoiceSample.from_dict(data)
                
                logger.info(f"加载 {len(self.samples_index)} 个声音样本")
            
            # 加载说话人-样本映射
            mapping_file = self.db_path / "speaker_samples_mapping.json"
            if mapping_file.exists():
                with open(mapping_file, 'r', encoding='utf-8') as f:
                    self.speaker_samples = json.load(f)
                
                logger.debug(f"加载说话人-样本映射: {len(self.speaker_samples)} 个映射关系")
        
        except Exception as e:
            logger.error(f"加载索引失败: {str(e)}")
    
    def _save_index(self):
        """保存索引文件"""
        try:
            # 保存说话人索引
            speakers_data = {
                speaker_id: profile.to_dict()
                for speaker_id, profile in self.speakers_index.items()
            }
            
            speakers_file = self.db_path / "speakers_index.json"
            with open(speakers_file, 'w', encoding='utf-8') as f:
                json.dump(speakers_data, f, ensure_ascii=False, indent=2)
            
            # 保存样本索引
            samples_data = {
                sample_id: sample.to_dict()
                for sample_id, sample in self.samples_index.items()
            }
            
            samples_file = self.db_path / "samples_index.json"
            with open(samples_file, 'w', encoding='utf-8') as f:
                json.dump(samples_data, f, ensure_ascii=False, indent=2)
            
            # 保存说话人-样本映射
            mapping_file = self.db_path / "speaker_samples_mapping.json"
            with open(mapping_file, 'w', encoding='utf-8') as f:
                json.dump(self.speaker_samples, f, ensure_ascii=False, indent=2)
            
            logger.debug("索引文件保存成功")
        
        except Exception as e:
            logger.error(f"保存索引失败: {str(e)}")
    
    def create_speaker(
        self,
        name: str,
        description: str = ""
    ) -> SpeakerProfile:
        """创建说话人档案
        
        Args:
            name: 说话人名称
            description: 描述
            
        Returns:
            说话人档案对象
        """
        try:
            # 生成ID
            speaker_id = str(uuid.uuid4())
            
            # 当前时间
            now = datetime.now().isoformat()
            
            # 创建档案
            profile = SpeakerProfile(
                id=speaker_id,
                name=name,
                description=description,
                created_at=now,
                updated_at=now,
                sample_count=0,
                is_active=True
            )
            
            # 保存到索引
            self.speakers_index[speaker_id] = profile
            self.speaker_samples[speaker_id] = []
            
            # 保存索引
            self._save_index()
            
            logger.info(f"创建说话人档案成功: {name} (ID: {speaker_id})")
            
            return profile
            
        except Exception as e:
            logger.error(f"创建说话人档案失败: {str(e)}")
            raise RuntimeError(f"创建说话人档案失败: {str(e)}")
    
    def get_speaker(self, speaker_id: str) -> Optional[SpeakerProfile]:
        """获取说话人档案
        
        Args:
            speaker_id: 说话人ID
            
        Returns:
            说话人档案对象，不存在则返回None
        """
        return self.speakers_index.get(speaker_id)
    
    def update_speaker(
        self,
        speaker_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Optional[SpeakerProfile]:
        """更新说话人档案
        
        Args:
            speaker_id: 说话人ID
            name: 新名称
            description: 新描述
            is_active: 是否活跃
            
        Returns:
            更新后的档案对象，不存在则返回None
        """
        try:
            profile = self.speakers_index.get(speaker_id)
            if profile is None:
                logger.warning(f"说话人档案不存在: {speaker_id}")
                return None
            
            # 更新字段
            if name is not None:
                profile.name = name
            if description is not None:
                profile.description = description
            if is_active is not None:
                profile.is_active = is_active
            
            # 更新时间
            profile.updated_at = datetime.now().isoformat()
            
            # 保存索引
            self._save_index()
            
            logger.info(f"更新说话人档案成功: {speaker_id}")
            
            return profile
            
        except Exception as e:
            logger.error(f"更新说话人档案失败: {str(e)}")
            raise RuntimeError(f"更新说话人档案失败: {str(e)}")
    
    def delete_speaker(self, speaker_id: str) -> bool:
        """删除说话人档案
        
        Args:
            speaker_id: 说话人ID
            
        Returns:
            是否删除成功
        """
        try:
            if speaker_id not in self.speakers_index:
                logger.warning(f"说话人档案不存在: {speaker_id}")
                return False
            
            # 获取该说话人的所有样本
            sample_ids = self.speaker_samples.get(speaker_id, [])
            
            # 删除样本文件和嵌入
            for sample_id in sample_ids:
                self.delete_sample(sample_id)
            
            # 删除说话人档案
            del self.speakers_index[speaker_id]
            del self.speaker_samples[speaker_id]
            
            # 保存索引
            self._save_index()
            
            logger.info(f"删除说话人档案成功: {speaker_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"删除说话人档案失败: {str(e)}")
            raise RuntimeError(f"删除说话人档案失败: {str(e)}")
    
    def list_speakers(self, active_only: bool = True) -> List[SpeakerProfile]:
        """列出所有说话人档案
        
        Args:
            active_only: 是否只列出活跃的档案
            
        Returns:
            说话人档案列表
        """
        speakers = list(self.speakers_index.values())
        
        if active_only:
            speakers = [s for s in speakers if s.is_active]
        
        return speakers
    
    def add_sample(
        self,
        speaker_id: str,
        name: str,
        audio_path: str,
        embedding: np.ndarray,
        duration: float = 0.0
    ) -> VoiceSample:
        """添加声音样本
        
        Args:
            speaker_id: 说话人ID
            name: 样本名称
            audio_path: 音频文件路径
            embedding: 嵌入向量
            duration: 时长
            
        Returns:
            声音样本对象
        """
        try:
            # 检查说话人是否存在
            if speaker_id not in self.speakers_index:
                raise ValueError(f"说话人档案不存在: {speaker_id}")
            
            # 生成样本ID
            sample_id = str(uuid.uuid4())
            
            # 当前时间
            now = datetime.now().isoformat()
            
            # 创建样本
            sample = VoiceSample(
                id=sample_id,
                speaker_id=speaker_id,
                name=name,
                audio_path=audio_path,
                embedding=embedding,
                duration=duration,
                created_at=now
            )
            
            # 保存到索引
            self.samples_index[sample_id] = sample
            
            # 添加到说话人的样本列表
            self.speaker_samples[speaker_id].append(sample_id)
            
            # 更新说话人档案
            profile = self.speakers_index[speaker_id]
            profile.sample_count += 1
            profile.updated_at = now
            
            # 保存嵌入向量
            self._save_embedding(sample_id, embedding)
            
            # 更新平均嵌入
            self._update_speaker_embedding(speaker_id)
            
            # 保存索引
            self._save_index()
            
            logger.info(f"添加声音样本成功: {name} (ID: {sample_id})")
            
            return sample
            
        except Exception as e:
            logger.error(f"添加声音样本失败: {str(e)}")
            raise RuntimeError(f"添加声音样本失败: {str(e)}")
    
    def _save_embedding(self, sample_id: str, embedding: np.ndarray):
        """保存嵌入向量到文件
        
        Args:
            sample_id: 样本ID
            embedding: 嵌入向量
        """
        try:
            embedding_path = self.embeddings_dir / f"{sample_id}.npy"
            np.save(embedding_path, embedding)
        except Exception as e:
            logger.error(f"保存嵌入向量失败: {str(e)}")
    
    def _load_embedding(self, sample_id: str) -> Optional[np.ndarray]:
        """从文件加载嵌入向量
        
        Args:
            sample_id: 样本ID
            
        Returns:
            嵌入向量，不存在则返回None
        """
        try:
            embedding_path = self.embeddings_dir / f"{sample_id}.npy"
            if embedding_path.exists():
                return np.load(embedding_path)
            return None
        except Exception as e:
            logger.error(f"加载嵌入向量失败: {str(e)}")
            return None
    
    def _update_speaker_embedding(self, speaker_id: str):
        """更新说话人的平均嵌入向量
        
        Args:
            speaker_id: 说话人ID
        """
        try:
            sample_ids = self.speaker_samples.get(speaker_id, [])
            
            if not sample_ids:
                return
            
            # 加载所有样本的嵌入
            embeddings = []
            for sample_id in sample_ids:
                embedding = self._load_embedding(sample_id)
                if embedding is not None:
                    embeddings.append(embedding)
            
            if embeddings:
                # 计算平均嵌入
                avg_embedding = np.mean(embeddings, axis=0)
                
                # 归一化
                norm = np.linalg.norm(avg_embedding)
                if norm > 0:
                    avg_embedding = avg_embedding / norm
                
                # 保存到说话人档案
                self.speakers_index[speaker_id].embedding = avg_embedding
                
                # 保存平均嵌入
                speaker_embedding_path = self.embeddings_dir / f"speaker_{speaker_id}.npy"
                np.save(speaker_embedding_path, avg_embedding)
                
                logger.debug(f"更新说话人嵌入向量成功: {speaker_id}")
        
        except Exception as e:
            logger.error(f"更新说话人嵌入向量失败: {str(e)}")
    
    def get_sample(self, sample_id: str) -> Optional[VoiceSample]:
        """获取声音样本
        
        Args:
            sample_id: 样本ID
            
        Returns:
            声音样本对象，不存在则返回None
        """
        return self.samples_index.get(sample_id)
    
    def delete_sample(self, sample_id: str) -> bool:
        """删除声音样本
        
        Args:
            sample_id: 样本ID
            
        Returns:
            是否删除成功
        """
        try:
            sample = self.samples_index.get(sample_id)
            if sample is None:
                logger.warning(f"声音样本不存在: {sample_id}")
                return False
            
            # 删除嵌入文件
            embedding_path = self.embeddings_dir / f"{sample_id}.npy"
            if embedding_path.exists():
                embedding_path.unlink()
            
            # 从说话人的样本列表中移除
            speaker_id = sample.speaker_id
            if speaker_id in self.speaker_samples:
                if sample_id in self.speaker_samples[speaker_id]:
                    self.speaker_samples[speaker_id].remove(sample_id)
            
            # 更新说话人档案
            if speaker_id in self.speakers_index:
                self.speakers_index[speaker_id].sample_count -= 1
                self._update_speaker_embedding(speaker_id)
            
            # 从索引中移除
            del self.samples_index[sample_id]
            
            # 保存索引
            self._save_index()
            
            logger.info(f"删除声音样本成功: {sample_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"删除声音样本失败: {str(e)}")
            raise RuntimeError(f"删除声音样本失败: {str(e)}")
    
    def list_samples(self, speaker_id: str) -> List[VoiceSample]:
        """列出说话人的所有样本
        
        Args:
            speaker_id: 说话人ID
            
        Returns:
            声音样本列表
        """
        sample_ids = self.speaker_samples.get(speaker_id, [])
        samples = []
        
        for sample_id in sample_ids:
            sample = self.samples_index.get(sample_id)
            if sample:
                samples.append(sample)
        
        return samples
    
    def search_by_similarity(
        self,
        query_embedding: np.ndarray,
        top_k: int = 5,
        threshold: float = 0.0
    ) -> List[Tuple[SpeakerProfile, float]]:
        """根据嵌入向量搜索相似的说话人
        
        Args:
            query_embedding: 查询嵌入向量
            top_k: 返回前k个结果
            threshold: 相似度阈值
            
        Returns:
            (说话人档案, 相似度)列表，按相似度降序排列
        """
        try:
            results = []
            
            # 归一化查询向量
            query_norm = np.linalg.norm(query_embedding)
            if query_norm > 0:
                query_embedding = query_embedding / query_norm
            
            # 计算与每个说话人的相似度
            for speaker_id, profile in self.speakers_index.items():
                if not profile.is_active:
                    continue
                
                if profile.embedding is None:
                    continue
                
                # 计算余弦相似度
                similarity = np.dot(query_embedding, profile.embedding)
                
                if similarity >= threshold:
                    results.append((profile, float(similarity)))
            
            # 按相似度排序并返回top_k
            results.sort(key=lambda x: x[1], reverse=True)
            results = results[:top_k]
            
            logger.info(f"相似度搜索完成，返回 {len(results)} 个结果")
            
            return results
            
        except Exception as e:
            logger.error(f"相似度搜索失败: {str(e)}")
            return []
    
    def verify_speaker(
        self,
        speaker_id: str,
        query_embedding: np.ndarray,
        threshold: float = 0.7
    ) -> Tuple[bool, float]:
        """验证音频是否来自指定说话人
        
        Args:
            speaker_id: 说话人ID
            query_embedding: 查询嵌入向量
            threshold: 相似度阈值
            
        Returns:
            (是否匹配, 相似度)
        """
        try:
            profile = self.speakers_index.get(speaker_id)
            
            if profile is None or profile.embedding is None:
                return False, 0.0
            
            # 归一化
            query_norm = np.linalg.norm(query_embedding)
            if query_norm > 0:
                query_embedding = query_embedding / query_norm
            
            # 计算相似度
            similarity = np.dot(query_embedding, profile.embedding)
            
            # 判断是否匹配
            is_match = similarity >= threshold
            
            logger.info(f"说话人验证: {speaker_id}, 相似度={similarity:.4f}, 结果={is_match}")
            
            return is_match, float(similarity)
            
        except Exception as e:
            logger.error(f"说话人验证失败: {str(e)}")
            return False, 0.0
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取数据库统计信息
        
        Returns:
            统计信息字典
        """
        try:
            stats = {
                'total_speakers': len(self.speakers_index),
                'active_speakers': len([s for s in self.speakers_index.values() if s.is_active]),
                'total_samples': len(self.samples_index),
                'average_samples_per_speaker': 0.0,
                'database_size_mb': 0.0
            }
            
            # 计算平均样本数
            if stats['total_speakers'] > 0:
                stats['average_samples_per_speaker'] = stats['total_samples'] / stats['total_speakers']
            
            # 计算数据库大小
            def get_dir_size(path):
                total = 0
                for item in path.rglob('*'):
                    if item.is_file():
                        total += item.stat().st_size
                return total
            
            db_size = get_dir_size(self.embeddings_dir)
            stats['database_size_mb'] = db_size / (1024 * 1024)
            
            return stats
            
        except Exception as e:
            logger.error(f"获取统计信息失败: {str(e)}")
            return {}