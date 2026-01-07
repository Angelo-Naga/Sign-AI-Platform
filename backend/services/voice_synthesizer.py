"""
声音合成器模块
基于 Tacotron2 简化架构实现文本到梅尔频谱的生成
集成说话人编码器，实现声音克隆功能
"""

import logging
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Optional, Tuple, List, Dict
from dataclasses import dataclass
from pathlib import Path

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class SynthesizerConfig:
    """合成器配置"""
    # 文本编码器参数
    vocab_size: int = 100  # 词汇表大小
    embedding_dim: int = 256  # 文本嵌入维度
    encoder_dim: int = 512  # 编码器维度
    decoder_dim: int = 512  # 解码器维度
    n_mels: int = 80  # 梅尔频谱数量
    speaker_embedding_dim: int = 256  # 说话人嵌入维度
    
    # 注意力参数
    attention_dim: int = 128  # 注意力维度
    attention_location_n_filters: int = 32  # 位置敏感过滤器数量
    attention_location_kernel_size: int = 31  # 位置核大小
    
    # 训练参数
    learning_rate: float = 0.001  # 学习率
    batch_size: int = 32  # 批次大小
    max_text_length: int = 200  # 最大文本长度
    max_mel_length: int = 1000  # 最大梅尔频谱长度
    
    # 合成参数
    stop_threshold: float = 0.5  # 停止阈值
    max_decoder_steps: int = 1000  # 最大解码步数


class TextEncoder(nn.Module):
    """文本编码器"""
    
    def __init__(self, config: SynthesizerConfig):
        """初始化文本编码器
        
        Args:
            config: 合成器配置
        """
        super(TextEncoder, self).__init__()
        self.config = config
        
        # 词嵌入层
        self.embedding = nn.Embedding(
            config.vocab_size,
            config.embedding_dim
        )
        
        # 卷积层
        convolutions = []
        for _ in range(3):
            conv_layer = nn.Sequential(
                nn.Conv1d(
                    config.embedding_dim,
                    config.embedding_dim,
                    kernel_size=5,
                    padding=2
                ),
                nn.BatchNorm1d(config.embedding_dim),
                nn.ReLU(),
                nn.Dropout(0.5)
            )
            convolutions.append(conv_layer)
        
        self.convolutions = nn.ModuleList(convolutions)
        
        # LSTM 层
        self.lstm = nn.LSTM(
            config.embedding_dim,
            config.encoder_dim,
            num_layers=1,
            bidirectional=True,
            batch_first=True
        )
        
        # 投影层
        self.project_to_attention = nn.Linear(
            config.encoder_dim * 2,
            config.attention_dim
        )
    
    def forward(self, text: torch.Tensor) -> Tuple[torch.Tensor, List]:
        """前向传播
        
        Args:
            text: 文本索引 (batch, text_length)
            
        Returns:
            (编码器输出, 切分标记列表)
        """
        # 词嵌入
        x = self.embedding(text)  # (batch, text_length, embedding_dim)
        
        # 转置 (batch, embedding_dim, text_length)
        x = x.transpose(1, 2)
        
        # 卷积层
        split_indices = []
        for conv in self.convolutions:
            x = conv(x)
            split_indices.append(x)
        
        # 转回 (batch, text_length, embedding_dim)
        x = x.transpose(1, 2)
        
        # LSTM
        encoder_output, _ = self.lstm(x)
        
        # 投影到注意力空间
        attention_output = self.project_to_attention(encoder_output)
        
        return attention_output, encoder_output


class AttentionMechanism(nn.Module):
    """注意力机制"""
    
    def __init__(self, config: SynthesizerConfig):
        """初始化注意力机制
        
        Args:
            config: 合成器配置
        """
        super(AttentionMechanism, self).__init__()
        self.config = config
        
        # 查询向量投影
        self.query_layer = nn.Linear(
            config.decoder_dim,
            config.attention_dim,
            bias=False
        )
        
        # 关键向量投影
        self.key_layer = nn.Linear(
            config.encoder_dim * 2,
            config.attention_dim,
            bias=False
        )
        
        # 价值投影
        self.value_layer = nn.Linear(
            config.encoder_dim * 2,
            config.decoder_dim,
            bias=False
        )
        
        # 位置敏感注意力
        self.location_layer = nn.Linear(
            config.attention_location_n_filters,
            config.attention_dim,
            bias=False
        )
        
        # 位置卷积
        self.location_conv = nn.Conv1d(
            2,
            config.attention_location_n_filters,
            kernel_size=config.attention_location_kernel_size,
            padding=(config.attention_location_kernel_size - 1) // 2
        )
        
        # 得分投影
        self.score_layer = nn.Linear(
            config.attention_dim,
            1,
            bias=False
        )
    
    def forward(
        self,
        query: torch.Tensor,
        encoder_output: torch.Tensor,
        attention_weights: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """计算注意力
        
        Args:
            query: 查询向量 (batch, decoder_dim)
            encoder_output: 编码器输出 (batch, text_length, encoder_dim * 2)
            attention_weights: 之前的注意力权重 (batch, text_length)
            
        Returns:
            (语境向量, 新的注意力权重)
        """
        # 查询投影
        query_attention = self.query_layer(query)
        query_attention = query_attention.unsqueeze(1)
        
        # 关键投影
        key_attention = self.key_layer(encoder_output)
        
        # 位置投影
        processed_attention_weights = attention_weights.unsqueeze(1)
        processed_attention_weights = self.location_conv(
            processed_attention_weights
        )
        processed_attention_weights = processed_attention_weights.transpose(1, 2)
        processed_attention_weights = self.location_layer(processed_attention_weights)
        
        # 注意力能量
        attention_energy = self.score_layer(
            torch.tanh(query_attention + key_attention + processed_attention_weights)
        )
        
        # 注意力权重
        attention_weights = F.softmax(
            attention_energy.squeeze(-1),
            dim=1
        )
        
        # 语境向量
        context = torch.bmm(
            attention_weights.unsqueeze(1),
            encoder_output
        ).squeeze(1)
        
        context = self.value_layer(context)
        
        return context, attention_weights


class Decoder(nn.Module):
    """解码器"""
    
    def __init__(self, config: SynthesizerConfig):
        """初始化解码器
        
        Args:
            config: 合成器配置
        """
        super(Decoder, self).__init__()
        self.config = config
        
        # 预网络
        self.prenet = nn.Sequential(
            nn.Linear(config.n_mels, config.decoder_dim),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(config.decoder_dim, config.decoder_dim),
            nn.ReLU(),
            nn.Dropout(0.5)
        )
        
        # 注意力机制
        self.attention = AttentionMechanism(config)
        
        # LSTM
        self.attention_lstm = nn.LSTMCell(
            config.decoder_dim * 2,
            config.decoder_dim
        )
        self.decoder_lstm = nn.LSTMCell(
            config.decoder_dim * 2,
            config.decoder_dim
        )
        
        # 梅尔频谱预测
        self.linear_projection = nn.Linear(
            config.decoder_dim,
            config.n_mels
        )
        
        # 停止令牌预测
        self.stop_projection = nn.Sequential(
            nn.Linear(config.decoder_dim, 1),
            nn.Sigmoid()
        )
    
    def forward(
        self,
        mel_frame: torch.Tensor,
        encoder_output: torch.Tensor,
        attention_weights: torch.Tensor,
        hidden_states: Tuple,
        context: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, Tuple, torch.Tensor]:
        """单步解码
        
        Args:
            mel_frame: 梅尔频谱帧 (batch, n_mels)
            encoder_output: 编码器输出 (batch, text_length, encoder_dim * 2)
            attention_weights: 注意力权重 (batch, text_length)
            hidden_states: 隐藏状态
            context: 之前的语境向量 (batch, decoder_dim)
            
        Returns:
            (梅尔频谱预测, 停止令牌, 新语境向量, 新隐藏状态, 新注意力权重)
        """
        # 预网络
        prenet_output = self.prenet(mel_frame)
        
        # 注意力 LSTM
        attention_input = torch.cat([prenet_output, context], dim=1)
        attention_hidden, attention_cell = self.attention_lstm(
            attention_input,
            hidden_states[0]
        )
        
        # 计算注意力
        context, new_attention_weights = self.attention(
            attention_hidden,
            encoder_output,
            attention_weights
        )
        
        # 解码器 LSTM
        decoder_input = torch.cat([attention_hidden, context], dim=1)
        decoder_hidden, decoder_cell = self.decoder_lstm(
            decoder_input,
            hidden_states[1]
        )
        
        # 梅尔频谱预测
        mel_prediction = self.linear_projection(decoder_hidden)
        
        # 停止令牌预测
        stop_token = self.stop_projection(decoder_hidden)
        
        # 更新隐藏状态
        new_hidden_states = (
            (attention_hidden, attention_cell),
            (decoder_hidden, decoder_cell)
        )
        
        return mel_prediction, stop_token, context, new_hidden_states, new_attention_weights


class VoiceSynthesizerModel(nn.Module):
    """声音合成器模型"""
    
    def __init__(self, config: SynthesizerConfig):
        """初始化合成器模型
        
        Args:
            config: 合成器配置
        """
        super(VoiceSynthesizerModel, self).__init__()
        self.config = config
        
        # 文本编码器
        self.text_encoder = TextEncoder(config)
        
        # 解码器
        self.decoder = Decoder(config)
        
        # 说话人嵌入投影
        self.speaker_embedding_projection = nn.Sequential(
            nn.Linear(config.speaker_embedding_dim, config.decoder_dim),
            nn.ReLU()
        )
        
        # 后处理网络
        self.postnet = nn.Sequential(
            nn.Conv1d(config.n_mels, 512, kernel_size=5, padding=2),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Conv1d(512, 512, kernel_size=5, padding=2),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Conv1d(512, 512, kernel_size=5, padding=2),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Conv1d(512, 512, kernel_size=5, padding=2),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(0.25),
            nn.Conv1d(512, config.n_mels, kernel_size=5, padding=2),
        )
        
        logger.info("声音合成器模型初始化完成")
    
    def forward(
        self,
        text: torch.Tensor,
        speaker_embedding: Optional[torch.Tensor] = None,
        mel_target: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """前向传播
        
        Args:
            text: 文本索引 (batch, text_length)
            speaker_embedding: 说话人嵌入 (batch, speaker_embedding_dim)
            mel_target: 目标梅尔频谱 (batch, n_mels, mel_length)
            
        Returns:
            (预测的梅尔频谱, 停止令牌, 注意力权重)
        """
        batch_size = text.size(0)
        device = text.device
        
        # 文本编码
        encoder_attention_output, encoder_output = self.text_encoder(text)
        
        # 投影说话人嵌入
        if speaker_embedding is not None:
            speaker_context = self.speaker_embedding_projection(speaker_embedding)
        else:
            speaker_context = torch.zeros(
                batch_size,
                self.config.decoder_dim,
                device=device
            )
        
        # 训练模式
        if mel_target is not None:
            return self._forward_training(
                encoder_attention_output,
                encoder_output,
                speaker_context,
                mel_target
            )
        # 推理模式
        else:
            return self._forward_inference(
                encoder_attention_output,
                encoder_output,
                speaker_context
            )
    
    def _forward_training(
        self,
        encoder_attention_output: torch.Tensor,
        encoder_output: torch.Tensor,
        speaker_context: torch.Tensor,
        mel_target: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """训练模式前向传播"""
        batch_size = mel_target.size(0)
        mel_length = mel_target.size(2)
        text_length = encoder_output.size(1)
        
        # 初始化
        mel_predictions = []
        stop_token_predictions = []
        attention_weights_sequence = []
        
        # 初始梅尔帧（全零）
        mel_frame = torch.zeros(
            batch_size,
            self.config.n_mels,
            device=mel_target.device
        )
        
        # 初始注意力权重
        attention_weights = torch.zeros(
            batch_size,
            text_length,
            device=mel_target.device
        )
        
        # 初始隐藏状态
        hidden_states = (
            (torch.zeros(batch_size, self.config.decoder_dim, device=mel_target.device),
             torch.zeros(batch_size, self.config.decoder_dim, device=mel_target.device)),
            (torch.zeros(batch_size, self.config.decoder_dim, device=mel_target.device),
             torch.zeros(batch_size, self.config.decoder_dim, device=mel_target.device))
        )
        
        # 初始语境
        context = torch.zeros(batch_size, self.config.decoder_dim, device=mel_target.device)
        
        # 逐步解码
        for t in range(mel_length):
            # 解码
            mel_prediction, stop_token, new_context, new_hidden_states, new_attention_weights = self.decoder(
                mel_frame,
                encoder_output,
                attention_weights,
                hidden_states,
                context
            )
            
            # 应用说话人嵌入
            mel_prediction = mel_prediction + speaker_context.unsqueeze(1)
            
            # 保存预测
            mel_predictions.append(mel_prediction)
            stop_token_predictions.append(stop_token)
            attention_weights_sequence.append(new_attention_weights)
            
            # 更新状态
            context = new_context
            hidden_states = new_hidden_states
            attention_weights = new_attention_weights
            
            # 使用真实帧
            mel_frame = mel_target[:, :, t]
        
        # 合并预测
        mel_predictions = torch.stack(mel_predictions, dim=2)
        stop_token_predictions = torch.cat(stop_token_predictions, dim=1)
        attention_weights_sequence = torch.stack(attention_weights_sequence, dim=1)
        
        # 后处理网络
        mel_predictions_postnet = mel_predictions.clone()
        mel_predictions_postnet = self.postnet(mel_predictions_postnet)
        mel_predictions_postnet = mel_predictions + mel_predictions_postnet
        
        return mel_predictions_postnet, stop_token_predictions, attention_weights_sequence
    
    def _forward_inference(
        self,
        encoder_attention_output: torch.Tensor,
        encoder_output: torch.Tensor,
        speaker_context: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """推理模式前向传播"""
        batch_size = encoder_output.size(0)
        device = encoder_output.device
        text_length = encoder_output.size(1)
        
        # 初始化
        mel_predictions = []
        stop_token_predictions = []
        attention_weights_sequence = []
        
        # 初始梅尔帧（全零）
        mel_frame = torch.zeros(
            batch_size,
            self.config.n_mels,
            device=device
        )
        
        # 初始注意力权重
        attention_weights = torch.zeros(
            batch_size,
            text_length,
            device=device
        )
        
        # 初始隐藏状态
        hidden_states = (
            (torch.zeros(batch_size, self.config.decoder_dim, device=device),
             torch.zeros(batch_size, self.config.decoder_dim, device=device)),
            (torch.zeros(batch_size, self.config.decoder_dim, device=device),
             torch.zeros(batch_size, self.config.decoder_dim, device=device))
        )
        
        # 初始语境
        context = torch.zeros(batch_size, self.config.decoder_dim, device=device)
        
        # 逐步解码
        for t in range(self.config.max_decoder_steps):
            # 解码
            mel_prediction, stop_token, new_context, new_hidden_states, new_attention_weights = self.decoder(
                mel_frame,
                encoder_output,
                attention_weights,
                hidden_states,
                context
            )
            
            # 应用说话人嵌入
            mel_prediction = mel_prediction + speaker_context.unsqueeze(1)
            
            # 保存预测
            mel_predictions.append(mel_prediction)
            stop_token_predictions.append(stop_token)
            attention_weights_sequence.append(new_attention_weights)
            
            # 更新状态
            context = new_context
            hidden_states = new_hidden_states
            attention_weights = new_attention_weights
            
            # 使用预测帧作为下一步输入
            mel_frame = mel_prediction.detach()
            
            # 检查停止条件
            if stop_token.sigmoid().data > self.config.stop_threshold:
                break
        
        # 合并预测
        mel_predictions = torch.stack(mel_predictions, dim=2)
        stop_token_predictions = torch.cat(stop_token_predictions, dim=1)
        attention_weights_sequence = torch.stack(attention_weights_sequence, dim=1)
        
        # 后处理网络
        mel_predictions_postnet = mel_predictions.clone()
        mel_predictions_postnet = self.postnet(mel_predictions_postnet)
        mel_predictions_postnet = mel_predictions + mel_predictions_postnet
        
        return mel_predictions_postnet, stop_token_predictions, attention_weights_sequence


class TextTokenizer:
    """文本分词器"""
    
    def __init__(self):
        """初始化文本分词器"""
        # 基础字符集（支持中英文）
        self.char_to_id = {}
        self.id_to_char = {}
        
        # 特殊标记
        special_tokens = {
            '<PAD>': 0,
            '<SOS>': 1,
            '<EOS>': 2,
            '<UNK>': 3
        }
        
        # 添加特殊标记
        for char, idx in special_tokens.items():
            self.char_to_id[char] = idx
            self.id_to_char[idx] = char
        
        # 基础字符集合
        chinese_chars = '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改张象完却究支群市音严今切反转果'
        
        # 英文字符
        english_chars = 'abcdefghijklmnopqrstuvwxyz'
        
        # 数字
        digits = '0123456789'
        
        # 标点符号
        punctuation = '，。！？、；："''（）《》【】…'
        
        # 合并所有字符
        all_chars = chinese_chars + english_chars + digits + punctuation
        
        # 添加字符到词汇表
        for idx, char in enumerate(all_chars, start=4):
            self.char_to_id[char] = idx
            self.id_to_char[idx] = char
        
        self.vocab_size = len(self.char_to_id)
        logger.info(f"文本分词器初始化完成，词汇表大小: {self.vocab_size}")
    
    def encode(self, text: str) -> List[int]:
        """将文本编码为索引序列
        
        Args:
            text: 输入文本
            
        Returns:
            索引序列
        """
        # 添加开始标记
        indices = [1]  # <SOS>
        
        # 编码字符
        for char in text:
            if char in self.char_to_id:
                indices.append(self.char_to_id[char])
            else:
                indices.append(3)  # <UNK>
        
        # 添加结束标记
        indices.append(2)  # <EOS>
        
        return indices
    
    def decode(self, indices: List[int]) -> str:
        """将索引序列解码为文本
        
        Args:
            indices: 索引序列
            
        Returns:
            解码后的文本
        """
        chars = []
        for idx in indices:
            if idx in self.id_to_char:
                char = self.id_to_char[idx]
                # 跳过特殊标记
                if char not in ['<PAD>', '<SOS>', '<EOS>', '<UNK>']:
                    chars.append(char)
        
        return ''.join(chars)


class VoiceSynthesizer:
    """声音合成器主类"""
    
    def __init__(self, config: Optional[SynthesizerConfig] = None):
        """初始化声音合成器
        
        Args:
            config: 合成器配置
        """
        self.config = config or SynthesizerConfig()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # 初始化分词器
        self.tokenizer = TextTokenizer()
        
        # 更新配置中的词汇表大小
        self.config.vocab_size = self.tokenizer.vocab_size
        
        # 初始化模型
        self.model = VoiceSynthesizerModel(self.config).to(self.device)
        
        logger.info(f"声音合成器初始化完成，设备: {self.device}")
    
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
    
    def synthesize(
        self,
        text: str,
        speaker_embedding: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """合成语音（文本 -> 梅尔频谱）
        
        Args:
            text: 输入文本
            speaker_embedding: 说话人嵌入向量
            
        Returns:
            梅尔频谱 (n_mels, time)
        """
        try:
            # 编码文本
            text_indices = self.tokenizer.encode(text)
            
            # 转换为张量
            text_tensor = torch.LongTensor(text_indices).unsqueeze(0).to(self.device)
            
            # 说话人嵌入
            if speaker_embedding is not None:
                speaker_tensor = torch.from_numpy(speaker_embedding).float().unsqueeze(0).to(self.device)
            else:
                speaker_tensor = None
            
            # 推理
            with torch.no_grad():
                mel_output, _, _ = self.model(text_tensor, speaker_tensor)
            
            # 转换为 numpy
            mel_numpy = mel_output.squeeze(0).cpu().numpy()
            
            logger.info(f"语音合成完成: 文本长度={len(text)}, 梅尔频谱shape={mel_numpy.shape}")
            
            return mel_numpy
            
        except Exception as e:
            logger.error(f"语音合成失败: {str(e)}")
            raise RuntimeError(f"语音合成失败: {str(e)}")
    
    def synthesize_batch(
        self,
        texts: List[str],
        speaker_embeddings: Optional[List[np.ndarray]] = None
    ) -> List[np.ndarray]:
        """批量合成语音
        
        Args:
            texts: 文本列表
            speaker_embeddings: 说话人嵌入列表
            
        Returns:
            梅尔频谱列表
        """
        try:
            mel_outputs = []
            
            for i, text in enumerate(texts):
                speaker_emb = speaker_embeddings[i] if speaker_embeddings else None
                mel = self.synthesize(text, speaker_emb)
                mel_outputs.append(mel)
            
            logger.info(f"批量合成 {len(mel_outputs)} 个语音完成")
            
            return mel_outputs
            
        except Exception as e:
            logger.error(f"批量语音合成失败: {str(e)}")
            raise RuntimeError("批量语音合成失败")