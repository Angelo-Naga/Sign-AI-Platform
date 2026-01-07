"""
说话人编码器模块
基于 GE2E（Generalized End-to-End）损失实现说话人嵌入提取
用于从参考音频中提取说话人的声音特征
"""

import logging
import numpy as np
import librosa
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Optional, Tuple, List, Dict
from dataclasses import dataclass
from pathlib import Path
import io

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class EncoderConfig:
    """编码器配置"""
    # 音频参数
    sample_rate: int = 16000  # 采样率
    n_fft: int = 512  # FFT 窗口大小
    hop_length: int = 160  # 跳跃长度
    win_length: int = 400  # 窗口长度
    n_mels: int = 80  # 梅尔频谱数量
    
    # 模型参数
    num_layers: int = 3  # LSTM 层数
    hidden_size: int = 256  # 隐藏层大小
    embedding_dim: int = 256  # 嵌入向量维度
    
    # 训练参数
    learning_rate: float = 0.001  # 学习率
    batch_size: int = 16  # 批次大小
    
    # GE2E 参数
    w: float = 10.0  # GE2E 损失权重参数
    b: float = -5.0  # GE2E 损失偏置参数


class MelSpectrogramExtractor:
    """梅尔频谱提取器"""
    
    def __init__(self, config: EncoderConfig):
        """初始化梅尔频谱提取器
        
        Args:
            config: 编码器配置
        """
        self.config = config
        logger.info("梅尔频谱提取器初始化完成")
    
    def extract(
        self,
        audio: np.ndarray,
        sample_rate: int
    ) -> np.ndarray:
        """提取梅尔频谱
        
        Args:
            audio: 音频数据
            sample_rate: 采样率
            
        Returns:
            梅尔频谱 (n_mels, time)
        """
        try:
            # 重采样
            if sample_rate != self.config.sample_rate:
                audio = librosa.resample(
                    audio,
                    orig_sr=sample_rate,
                    target_sr=self.config.sample_rate
                )
            
            # 提取梅尔频谱
            mel_spec = librosa.feature.melspectrogram(
                y=audio,
                sr=self.config.sample_rate,
                n_fft=self.config.n_fft,
                hop_length=self.config.hop_length,
                win_length=self.config.win_length,
                n_mels=self.config.n_mels
            )
            
            # 转换为对数尺度
            mel_spec = librosa.power_to_db(mel_spec, ref=np.max)
            
            # 归一化
            mel_spec = (mel_spec - mel_spec.mean()) / (mel_spec.std() + 1e-8)
            
            logger.debug(f"梅尔频谱提取完成: shape={mel_spec.shape}")
            
            return mel_spec
            
        except Exception as e:
            logger.error(f"梅尔频谱提取失败: {str(e)}")
            raise RuntimeError(f"梅尔频谱提取失败: {str(e)}")
    
    def extract_from_audio_data(
        self,
        audio_data: bytes,
        input_format: str = "wav"
    ) -> np.ndarray:
        """从音频字节流提取梅尔频谱
        
        Args:
            audio_data: 音频字节流
            input_format: 音频格式
            
        Returns:
            梅尔频谱
        """
        try:
            # 使用 librosa 加载音频
            audio, sr = librosa.load(
                io.BytesIO(audio_data),
                sr=self.config.sample_rate,
                mono=True
            )
            
            return self.extract(audio, sr)
            
        except Exception as e:
            logger.error(f"从字节流提取梅尔频谱失败: {str(e)}")
            raise RuntimeError(f"从字节流提取梅尔频谱失败: {str(e)}")


class SpeakerEncoderModel(nn.Module):
    """说话人编码器模型
    
    基于 SV2TTS 的简化架构，使用 LSTM 提取说话人嵌入
    """
    
    def __init__(self, config: EncoderConfig):
        """初始化编码器模型
        
        Args:
            config: 编码器配置
        """
        super(SpeakerEncoderModel, self).__init__()
        self.config = config
        
        # 特征投影层
        self.projection = nn.Linear(config.n_mels, config.hidden_size)
        
        # LSTM 层
        self.lstm = nn.LSTM(
            input_size=config.hidden_size,
            hidden_size=config.hidden_size,
            num_layers=config.num_layers,
            batch_first=True,
            bidirectional=True
        )
        
        # 注意力权重
        self.attention = nn.Linear(config.hidden_size * 2, 1)
        
        # 嵌入投影层
        self.embedding_projection = nn.Sequential(
            nn.Linear(config.hidden_size * 2, config.hidden_size),
            nn.BatchNorm1d(config.hidden_size),
            nn.ReLU(),
            nn.Linear(config.hidden_size, config.embedding_dim)
        )
        
        # 初始化权重
        self._init_weights()
        
        logger.info("说话人编码器模型初始化完成")
    
    def _init_weights(self):
        """初始化模型权重"""
        for name, param in self.named_parameters():
            if 'weight' in name:
                if 'lstm' in name:
                    nn.init.orthogonal_(param)
                else:
                    nn.init.xavier_uniform_(param)
            elif 'bias' in name:
                nn.init.zeros_(param)
    
    def forward(
        self,
        mel_spec: torch.Tensor
    ) -> torch.Tensor:
        """前向传播
        
        Args:
            mel_spec: 梅尔频谱 (batch, n_mels, time)
            
        Returns:
            说话人嵌入 (batch, embedding_dim)
        """
        # 转换维度 (batch, time, n_mels)
        x = mel_spec.transpose(1, 2)
        
        # 特征投影
        x = self.projection(x)  # (batch, time, hidden_size)
        x = torch.relu(x)
        
        # LSTM
        lstm_out, _ = self.lstm(x)  # (batch, time, hidden_size * 2)
        
        # 注意力机制
        attention_weights = torch.softmax(
            self.attention(lstm_out),
            dim=1
        )  # (batch, time, 1)
        
        # 加权求和
        weighted_sum = torch.sum(
            attention_weights * lstm_out,
            dim=1
        )  # (batch, hidden_size * 2)
        
        # 嵌入投影
        embedding = self.embedding_projection(weighted_sum)
        
        return embedding  # (batch, embedding_dim)
    
    def compute_similarity(
        self,
        embedding1: torch.Tensor,
        embedding2: torch.Tensor,
        w: Optional[float] = None,
        b: Optional[float] = None
    ) -> torch.Tensor:
        """计算说话人相似度
        
        Args:
            embedding1: 嵌入向量1
            embedding2: 嵌入向量2
            w: GE2E 权重参数
            b: GE2E 偏置参数
            
        Returns:
            相似度分数 (0-1)
        """
        w = w or self.config.w
        b = b or self.config.b
        
        # 计算余弦相似度
        similarity = F.cosine_similarity(
            embedding1.unsqueeze(1),
            embedding2.unsqueeze(0),
            dim=2
        )
        
        # 应用 GE2E 变换
        transformed = similarity * w + b
        
        return torch.sigmoid(transformed)


class GE2ELoss(nn.Module):
    """GE2E（Generalized End-to-End）损失函数"""
    
    def __init__(self, w: float = 10.0, b: float = -5.0):
        """初始化 GE2E 损失
        
        Args:
            w: 权重参数
            b: 偏置参数
        """
        super(GE2ELoss, self).__init__()
        self.w = w
        self.b = b
        logger.info("GE2E 损失函数初始化完成")
    
    def forward(
        self,
        embeddings: torch.Tensor,
        N: int,
        M: int
    ) -> torch.Tensor:
        """计算 GE2E 损失
        
        Args:
            embeddings: 嵌入向量 (N*M, embedding_dim)
            N: 说话人数量
            M: 每个说话人的样本数
            
        Returns:
            损失值
        """
        # 重塑为 (N, M, embedding_dim)
        embeddings = embeddings.view(N, M, -1)
        
        # 计算说话人均值
        centroids = torch.mean(embeddings, dim=1)  # (N, embedding_dim)
        
        # 扩展均值以计算相似度
        centroids_expand = centroids.unsqueeze(1).expand(N, M, -1)
        
        # 计算同说话人相似度
        same_speaker_sim = F.cosine_similarity(
            embeddings,
            centroids_expand,
            dim=2
        )
        
        # 计算不同说话人相似度
        centroids_flat = centroids.unsqueeze(1).expand(N, N, -1)
        embeddings_expand = embeddings.unsqueeze(1).expand(N, M, N, -1)
        
        diff_speaker_sim = F.cosine_similarity(
            embeddings_expand,
            centroids_flat,
            dim=3
        )
        
        # 计算损失
        same_speaker_score = same_speaker_sim * self.w + self.b
        diff_speaker_score = diff_speaker_sim * self.w + self.b
        
        # 构建 softmax 分母
        same_speaker_exp = torch.exp(same_speaker_score.unsqueeze(2))
        diff_speaker_exp = torch.sum(
            torch.exp(diff_speaker_score),
            dim=2,
            keepdim=True
        )
        
        # 总和
        total_exp = same_speaker_exp + diff_speaker_exp
        loss = -torch.mean(torch.log(same_speaker_exp / total_exp + 1e-8))
        
        return loss


class SpeakerEncoder:
    """说话人编码器主类"""
    
    def __init__(self, config: Optional[EncoderConfig] = None):
        """初始化说话人编码器
        
        Args:
            config: 编码器配置
        """
        self.config = config or EncoderConfig()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # 初始化组件
        self.mel_extractor = MelSpectrogramExtractor(self.config)
        self.model = SpeakerEncoderModel(self.config).to(self.device)
        self.loss_fn = GE2ELoss(
            w=self.config.w,
            b=self.config.b
        ).to(self.device)
        
        logger.info(f"说话人编码器初始化完成，设备: {self.device}")
    
    def load_model(self, model_path: str):
        """加载预训练模型
        
        Args:
            model_path: 模型文件路径
        """
        try:
            if Path(model_path).exists():
                checkpoint = torch.load(
                    model_path,
                    map_location=self.device
                )
                self.model.load_state_dict(checkpoint['model_state_dict'])
                logger.info(f"成功加载模型: {model_path}")
            else:
                logger.warning(f"模型文件不存在: {model_path}，使用随机初始化的模型")
        except Exception as e:
            logger.error(f"加载模型失败: {str(e)}")
            raise RuntimeError(f"加载模型失败: {str(e)}")
    
    def save_model(self, model_path: str):
        """保存模型
        
        Args:
            model_path: 模型保存路径
        """
        try:
            # 创建目录
            Path(model_path).parent.mkdir(parents=True, exist_ok=True)
            
            # 保存模型
            torch.save({
                'model_state_dict': self.model.state_dict(),
                'config': self.config
            }, model_path)
            
            logger.info(f"模型保存成功: {model_path}")
            
        except Exception as e:
            logger.error(f"保存模型失败: {str(e)}")
            raise RuntimeError(f"保存模型失败: {str(e)}")
    
    def extract_embedding(
        self,
        audio: np.ndarray,
        sample_rate: int
    ) -> np.ndarray:
        """提取说话人嵌入
        
        Args:
            audio: 音频数据
            sample_rate: 采样率
            
        Returns:
            说话人嵌入向量
        """
        try:
            # 提取梅尔频谱
            mel_spec = self.mel_extractor.extract(audio, sample_rate)
            
            # 转换为张量
            mel_tensor = torch.from_numpy(mel_spec).float().unsqueeze(0).to(self.device)
            
            # 提取嵌入
            with torch.no_grad():
                embedding = self.model(mel_tensor)
            
            # 归一化
            embedding = F.normalize(embedding, p=2, dim=1)
            
            # 转换为 numpy
            embedding_np = embedding.cpu().numpy()[0]
            
            logger.debug(f"说话人嵌入提取完成: shape={embedding_np.shape}")
            
            return embedding_np
            
        except Exception as e:
            logger.error(f"提取说话人嵌入失败: {str(e)}")
            raise RuntimeError(f"提取说话人嵌入失败: {str(e)}")
    
    def extract_embedding_from_audio_data(
        self,
        audio_data: bytes,
        input_format: str = "wav"
    ) -> np.ndarray:
        """从音频字节流提取说话人嵌入
        
        Args:
            audio_data: 音频字节流
            input_format: 音频格式
            
        Returns:
            说话人嵌入向量
        """
        try:
            # 提取梅尔频谱
            mel_spec = self.mel_extractor.extract_from_audio_data(
                audio_data,
                input_format
            )
            
            # 转换为张量
            mel_tensor = torch.from_numpy(mel_spec).float().unsqueeze(0).to(self.device)
            
            # 提取嵌入
            with torch.no_grad():
                embedding = self.model(mel_tensor)
            
            # 归一化
            embedding = F.normalize(embedding, p=2, dim=1)
            
            # 转换为 numpy
            embedding_np = embedding.cpu().numpy()[0]
            
            logger.debug("从音频字节流提取说话人嵌入完成")
            
            return embedding_np
            
        except Exception as e:
            logger.error(f"从音频字节流提取说话人嵌入失败: {str(e)}")
            raise RuntimeError(f"从音频字节流提取说话人嵌入失败: {str(e)}")
    
    def compute_speaker_similarity(
        self,
        embedding1: np.ndarray,
        embedding2: np.ndarray
    ) -> float:
        """计算两个说话人之间的相似度
        
        Args:
            embedding1: 说话人1的嵌入向量
            embedding2: 说话人2的嵌入向量
            
        Returns:
            相似度分数 (0.0 - 1.0)
        """
        try:
            # 转换为张量
            emb1_tensor = torch.from_numpy(embedding1).float().unsqueeze(0).to(self.device)
            emb2_tensor = torch.from_numpy(embedding2).float().unsqueeze(0).to(self.device)
            
            # 计算相似度
            with torch.no_grad():
                similarity_tensor = self.model.compute_similarity(
                    emb1_tensor,
                    emb2_tensor
                )
            
            similarity = similarity_tensor.cpu().numpy()[0][0]
            
            logger.debug(f"说话人相似度: {similarity:.4f}")
            
            return float(similarity)
            
        except Exception as e:
            logger.error(f"计算说话人相似度失败: {str(e)}")
            raise RuntimeError(f"计算说话人相似度失败: {str(e)}")
    
    def verify_speaker(
        self,
        embedding1: np.ndarray,
        embedding2: np.ndarray,
        threshold: float = 0.7
    ) -> Tuple[bool, float]:
        """验证两个音频是否来自同一说话人
        
        Args:
            embedding1: 说话人1的嵌入向量
            embedding2: 说话人2的嵌入向量
            threshold: 相似度阈值
            
        Returns:
            (是否同一说话人, 相似度分数)
        """
        try:
            similarity = self.compute_speaker_similarity(
                embedding1,
                embedding2
            )
            
            is_same = similarity >= threshold
            
            logger.info(f"说话人验证结果: {is_same}, 相似度: {similarity:.4f}")
            
            return is_same, similarity
            
        except Exception as e:
            logger.error(f"说话人验证失败: {str(e)}")
            raise RuntimeError(f"说话人验证失败: {str(e)}")
    
    def extract_embeddings_batch(
        self,
        audio_list: List[Tuple[np.ndarray, int]]
    ) -> List[np.ndarray]:
        """批量提取说话人嵌入
        
        Args:
            audio_list: 音频数据列表 [(audio, sample_rate), ...]
            
        Returns:
            说话人嵌入向量列表
        """
        try:
            embeddings = []
            
            for audio, sample_rate in audio_list:
                embedding = self.extract_embedding(audio, sample_rate)
                embeddings.append(embedding)
            
            logger.info(f"批量提取 {len(embeddings)} 个说话人嵌入完成")
            
            return embeddings
            
        except Exception as e:
            logger.error(f"批量提取说话人嵌入失败: {str(e)}")
            raise RuntimeError(f"批量提取说话人嵌入失败: {str(e)}")