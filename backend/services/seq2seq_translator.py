"""
序列到序列翻译模型模块
基于Transformer的编码器-解码器架构
支持手语序列到文本和文本到手语序列的双向翻译
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class TranslatorConfig:
    """翻译器配置"""
    vocab_size: int = 5000
    d_model: int = 512
    nhead: int = 8
    num_encoder_layers: int = 6
    num_decoder_layers: int = 6
    dim_feedforward: int = 2048
    dropout: float = 0.1
    max_seq_length: int = 512
    pad_idx: int = 0
    sos_idx: int = 1
    eos_idx: int = 2
    beam_size: int = 5
    beam_length_penalty: float = 1.0


class PositionalEncoding(nn.Module):
    """
    位置编码模块
    为序列中的每个位置添加位置嵌入
    """
    
    def __init__(self, d_model: int, max_seq_length: int = 5000, dropout: float = 0.1):
        """
        初始化位置编码
        
        参数:
            d_model: 模型维度
            max_seq_length: 最大序列长度
            dropout: dropout概率
        """
        super(PositionalEncoding, self).__init__()
        self.dropout = nn.Dropout(p=dropout)
        
        # 创建位置矩阵
        position = torch.arange(max_seq_length).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2) * (-math.log(10000.0) / d_model))
        
        pe = torch.zeros(max_seq_length, d_model)
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        
        # 添加batch维度
        self.register_buffer('pe', pe.unsqueeze(0))
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        前向传播
        
        参数:
            x: 输入张量，形状 (batch_size, seq_len, d_model)
            
        返回:
            添加位置编码后的张量
        """
        x = x + self.pe[:, :x.size(1), :]
        return self.dropout(x)


class MultiHeadAttention(nn.Module):
    """
    多头注意力机制
    """
    
    def __init__(self, d_model: int, nhead: int, dropout: float = 0.1):
        """
        初始化多头注意力
        
        参数:
            d_model: 模型维度
            nhead: 注意力头数
            dropout: dropout概率
        """
        super(MultiHeadAttention, self).__init__()
        assert d_model % nhead == 0, "d_model must be divisible by nhead"
        
        self.d_model = d_model
        self.nhead = nhead
        self.d_k = d_model // nhead
        
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)
        
        self.dropout = nn.Dropout(dropout)
        
    def scaled_dot_product_attention(
        self,
        Q: torch.Tensor,
        K: torch.Tensor,
        V: torch.Tensor,
        mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        缩放点积注意力
        
        参数:
            Q: 查询张量
            K: 键张量
            V: 值张量
            mask: 注意力掩码
            
        返回:
            注意力输出和注意力权重
        """
        # 计算注意力分数
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.d_k)
        
        # 应用掩码
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))
        
        # softmax归一化
        attention_weights = F.softmax(scores, dim=-1)
        attention_weights = self.dropout(attention_weights)
        
        # 应用注意力权重到值
        output = torch.matmul(attention_weights, V)
        
        return output, attention_weights
    
    def forward(
        self,
        query: torch.Tensor,
        key: torch.Tensor,
        value: torch.Tensor,
        mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        前向传播
        
        参数:
            query: 查询张量，形状 (batch_size, seq_len, d_model)
            key: 键张量，形状 (batch_size, seq_len, d_model)
            value: 值张量，形状 (batch_size, seq_len, d_model)
            mask: 注意力掩码
            
        返回:
            注意力输出和注意力权重
        """
        batch_size = query.size(0)
        
        # 线性变换
        Q = self.W_q(query).view(batch_size, -1, self.nhead, self.d_k).transpose(1, 2)
        K = self.W_k(key).view(batch_size, -1, self.nhead, self.d_k).transpose(1, 2)
        V = self.W_v(value).view(batch_size, -1, self.nhead, self.d_k).transpose(1, 2)
        
        # 计算注意力
        x, attention_weights = self.scaled_dot_product_attention(Q, K, V, mask)
        
        # 合并多头
        x = x.transpose(1, 2).contiguous().view(batch_size, -1, self.d_model)
        
        # 输出投影
        output = self.W_o(x)
        
        return output, attention_weights


class FeedForward(nn.Module):
    """
    前馈神经网络层
    """
    
    def __init__(self, d_model: int, dim_feedforward: int, dropout: float = 0.1):
        """
        初始化前馈网络
        
        参数:
            d_model: 模型维度
            dim_feedforward: 前馈网络隐藏层维度
            dropout: dropout概率
        """
        super(FeedForward, self).__init__()
        self.linear1 = nn.Linear(d_model, dim_feedforward)
        self.dropout = nn.Dropout(dropout)
        self.linear2 = nn.Linear(dim_feedforward, d_model)
        self.activation = nn.ReLU()
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        前向传播
        
        参数:
            x: 输入张量
            
        返回:
            输出张量
        """
        x = self.linear1(x)
        x = self.activation(x)
        x = self.dropout(x)
        x = self.linear2(x)
        return x


class TransformerEncoderLayer(nn.Module):
    """
    Transformer编码器层
    """
    
    def __init__(self, d_model: int, nhead: int, dim_feedforward: int, dropout: float = 0.1):
        """
        初始化编码器层
        
        参数:
            d_model: 模型维度
            nhead: 注意力头数
            dim_feedforward: 前馈网络维度
            dropout: dropout概率
        """
        super(TransformerEncoderLayer, self).__init__()
        self.self_attn = MultiHeadAttention(d_model, nhead, dropout)
        self.ffn = FeedForward(d_model, dim_feedforward, dropout)
        
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.dropout1 = nn.Dropout(dropout)
        self.dropout2 = nn.Dropout(dropout)
    
    def forward(
        self,
        x: torch.Tensor,
        mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        前向传播
        
        参数:
            x: 输入张量，形状 (batch_size, seq_len, d_model)
            mask: 自注意力掩码
            
        返回:
            编码器输出
        """
        # 自注意力子层
        attn_output, _ = self.self_attn(x, x, x, mask)
        x = self.norm1(x + self.dropout1(attn_output))
        
        # 前馈子层
        ffn_output = self.ffn(x)
        x = self.norm2(x + self.dropout2(ffn_output))
        
        return x


class TransformerDecoderLayer(nn.Module):
    """
    Transformer解码器层
    """
    
    def __init__(self, d_model: int, nhead: int, dim_feedforward: int, dropout: float = 0.1):
        """
        初始化解码器层
        
        参数:
            d_model: 模型维度
            nhead: 注意力头数
            dim_feedforward: 前馈网络维度
            dropout: dropout概率
        """
        super(TransformerDecoderLayer, self).__init__()
        self.self_attn = MultiHeadAttention(d_model, nhead, dropout)
        self.cross_attn = MultiHeadAttention(d_model, nhead, dropout)
        self.ffn = FeedForward(d_model, dim_feedforward, dropout)
        
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.norm3 = nn.LayerNorm(d_model)
        
        self.dropout1 = nn.Dropout(dropout)
        self.dropout2 = nn.Dropout(dropout)
        self.dropout3 = nn.Dropout(dropout)
    
    def forward(
        self,
        x: torch.Tensor,
        encoder_output: torch.Tensor,
        self_attn_mask: Optional[torch.Tensor] = None,
        cross_attn_mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        前向传播
        
        参数:
            x: 解码器输入，形状 (batch_size, tgt_seq_len, d_model)
            encoder_output: 编码器输出，形状 (batch_size, src_seq_len, d_model)
            self_attn_mask: 自注意力掩码
            cross_attn_mask: 交叉注意力掩码
            
        返回:
            解码器输出
        """
        # 自注意力子层
        attn_output, _ = self.self_attn(x, x, x, self_attn_mask)
        x = self.norm1(x + self.dropout1(attn_output))
        
        # 交叉注意力子层
        attn_output, _ = self.cross_attn(x, encoder_output, encoder_output, cross_attn_mask)
        x = self.norm2(x + self.dropout2(attn_output))
        
        # 前馈子层
        ffn_output = self.ffn(x)
        x = self.norm3(x + self.dropout3(ffn_output))
        
        return x


class Seq2SeqTransformer(nn.Module):
    """
    序列到序列Transformer模型
    """
    
    def __init__(self, config: TranslatorConfig):
        """
        初始化Seq2Seq模型
        
        参数:
            config: 模型配置
        """
        super(Seq2SeqTransformer, self).__init__()
        self.config = config
        
        # 嵌入层
        self.src_embedding = nn.Embedding(config.vocab_size, config.d_model, padding_idx=config.pad_idx)
        self.tgt_embedding = nn.Embedding(config.vocab_size, config.d_model, padding_idx=config.pad_idx)
        
        # 位置编码
        self.positional_encoding = PositionalEncoding(config.d_model, config.max_seq_length, config.dropout)
        
        # 编码器和解码器层
        self.encoder_layers = nn.ModuleList([
            TransformerEncoderLayer(
                config.d_model,
                config.nhead,
                config.dim_feedforward,
                config.dropout
            )
            for _ in range(config.num_encoder_layers)
        ])
        
        self.decoder_layers = nn.ModuleList([
            TransformerDecoderLayer(
                config.d_model,
                config.nhead,
                config.dim_feedforward,
                config.dropout
            )
            for _ in range(config.num_decoder_layers)
        ])
        
        # 输出层
        self.output_projection = nn.Linear(config.d_model, config.vocab_size)
        
        # 初始化参数
        self._init_parameters()
        
        logger.info(f"初始化Seq2Seq模型: vocab_size={config.vocab_size}, d_model={config.d_model}, layers={config.num_encoder_layers}")
    
    def _init_parameters(self):
        """初始化模型参数"""
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)
    
    def create_padding_mask(self, x: torch.Tensor, pad_idx: int = 0) -> torch.Tensor:
        """
        创建填充掩码
        
        参数:
            x: 输入张量
            pad_idx: 填充token索引
            
        返回:
            布尔掩码张量，True表示有效位置
        """
        return (x != pad_idx).unsqueeze(1).unsqueeze(2)
    
    def create_lookahead_mask(self, size: int) -> torch.Tensor:
        """
        创建前瞻掩码（防止解码器看到未来信息）
        
        参数:
            size: 序列长度
            
        返回:
            三角掩码张量
        """
        mask = torch.triu(torch.ones((size, size), dtype=torch.bool), diagonal=1)
        return mask
    
    def encode(
        self,
        src: torch.Tensor,
        src_mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        编码源序列
        
        参数:
            src: 源序列，形状 (batch_size, src_len)
            src_mask: 源序列掩码
            
        返回:
            编码器输出，形状 (batch_size, src_len, d_model)
        """
        # 嵌入和位置编码
        x = self.src_embedding(src) * math.sqrt(self.config.d_model)
        x = self.positional_encoding(x)
        
        # 编码器层
        for encoder_layer in self.encoder_layers:
            x = encoder_layer(x, src_mask)
        
        return x
    
    def decode(
        self,
        tgt: torch.Tensor,
        encoder_output: torch.Tensor,
        tgt_mask: Optional[torch.Tensor] = None,
        memory_mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        解码目标序列
        
        参数:
            tgt: 目标序列，形状 (batch_size, tgt_len)
            encoder_output: 编码器输出
            tgt_mask: 目标序列掩码
            memory_mask: 记忆掩码
            
        返回:
            解码器输出，形状 (batch_size, tgt_len, d_model)
        """
        # 嵌入和位置编码
        x = self.tgt_embedding(tgt) * math.sqrt(self.config.d_model)
        x = self.positional_encoding(x)
        
        # 解码器层
        for decoder_layer in self.decoder_layers:
            x = decoder_layer(x, encoder_output, tgt_mask, memory_mask)
        
        # 输出投影
        output = self.output_projection(x)
        
        return output
    
    def forward(
        self,
        src: torch.Tensor,
        tgt: torch.Tensor,
        src_mask: Optional[torch.Tensor] = None,
        tgt_mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        前向传播
        
        参数:
            src: 源序列，形状 (batch_size, src_len)
            tgt: 目标序列，形状 (batch_size, tgt_len)
            src_mask: 源序列掩码
            tgt_mask: 目标序列掩码
            
        返回:
            输出logits，形状 (batch_size, tgt_len, vocab_size)
        """
        # 创建掩码
        if src_mask is None:
            src_padding_mask = self.create_padding_mask(src, self.config.pad_idx)
        else:
            src_padding_mask = src_mask
        
        if tgt_mask is None:
            tgt_padding_mask = self.create_padding_mask(tgt, self.config.pad_idx)
            tgt_lookahead_mask = self.create_lookahead_mask(tgt.size(1))
            tgt_mask = tgt_lookahead_mask & tgt_padding_mask
        
        # 编码
        encoder_output = self.encode(src, src_padding_mask)
        
        # 解码
        output = self.decode(tgt, encoder_output, tgt_mask, src_padding_mask)
        
        return output


class Translator:
    """
    翻译器类
    封装Seq2Seq模型的翻译逻辑
    """
    
    def __init__(self, model: Seq2SeqTransformer, config: TranslatorConfig, device: str = 'cpu'):
        """
        初始化翻译器
        
        参数:
            model: Seq2Seq模型
            config: 配置
            device: 设备
        """
        self.model = model.to(device)
        self.config = config
        self.device = device
        
        logger.info(f"初始化翻译器，设备: {device}")
    
    def greedy_decode(
        self,
        src: torch.Tensor,
        max_length: int = 100
    ) -> List[int]:
        """
        贪婪搜索解码
        
        参数:
            src: 源序列
            max_length: 最大解码长度
            
        返回:
            解码出的序列
        """
        self.model.eval()
        
        with torch.no_grad():
            # 编码源序列
            encoder_output = self.model.encode(src)
            
            # 初始化目标序列（从SOS开始）
            ys = torch.ones(1, 1).fill_(self.config.sos_idx).type(torch.long).to(self.device)
            
            for i in range(max_length - 1):
                # 创建解码掩码
                tgt_mask = self.model.create_lookahead_mask(ys.size(1))
                
                # 解码
                output = self.model.decode(ys, encoder_output, tgt_mask)
                
                # 获取最后一个token的预测
                next_word_logits = output[0, -1, :self.config.vocab_size]
                next_word = next_word_logits.argmax(dim=-1).unsqueeze(0)
                
                # 添加到序列
                ys = torch.cat([ys, next_word.unsqueeze(0)], dim=1)
                
                # 遇到EOS停止
                if next_word.item() == self.config.eos_idx:
                    break
        
        return ys.squeeze().tolist()
    
    def beam_search_decode(
        self,
        src: torch.Tensor,
        max_length: int = 100,
        beam_size: Optional[int] = None,
        length_penalty: float = 1.0
    ) -> List[int]:
        """
        束搜索解码
        
        参数:
            src: 源序列
            max_length: 最大解码长度
            beam_size: 束大小
            length_penalty: 长度惩罚因子
            
        返回:
            解码出的最佳序列
        """
        if beam_size is None:
            beam_size = self.config.beam_size
        
        self.model.eval()
        
        with torch.no_grad():
            # 编码源序列
            encoder_output = self.model.encode(src)
            
            # 初始化束
            beams = [{
                'tokens': torch.tensor([self.config.sos_idx], dtype=torch.long).to(self.device),
                'score': 0.0
            }]
            
            for i in range(max_length - 1):
                new_beams = []
                
                for beam in beams:
                    # 防止达到最大长度束过大
                    if len(new_beams) >= beam_size:
                        continue
                    
                    # 检查是否已经遇到EOS
                    if beam['tokens'][-1].item() == self.config.eos_idx:
                        new_beams.append(beam)
                        continue
                    
                    # 创建解码掩码
                    tgt_mask = self.model.create_lookahead_mask(len(beam['tokens']))
                    
                    # 解码
                    output = self.model.decode(
                        beam['tokens'].unsqueeze(0),
                        encoder_output,
                        tgt_mask
                    )
                    
                    # 获取logits
                    logits = output[0, -1, :self.config.vocab_size]
                    log_probs = F.log_softmax(logits, dim=-1)
                    
                    # 获取top-k候选
                    topk_log_probs, topk_indices = log_probs.topk(beam_size)
                    
                    # 为每个候选创建新的束
                    for log_prob, token in zip(topk_log_probs, topk_indices):
                        new_tokens = torch.cat([
                            beam['tokens'],
                            token.unsqueeze(0)
                        ])
                        new_score = beam['score'] + log_prob.item()
                        
                        new_beams.append({
                            'tokens': new_tokens,
                            'score': new_score
                        })
                
                # 选择top-k束
                new_beams.sort(key=lambda x: x['score'], reverse=True)
                beams = new_beams[:beam_size]
                
                # 如果所有束都以EOS结束，停止解码
                if all(beam['tokens'][-1].item() == self.config.eos_idx for beam in beams):
                    break
            
            # 选择最佳束（考虑长度惩罚）
            best_beam = None
            best_normalized_score = float('-inf')
            
            for beam in beams:
                # 去除EOS
                tokens = beam['tokens']
                length = len(tokens)
                
                # 应用长度惩罚
                normalized_score = beam['score'] / (length ** length_penalty)
                
                if normalized_score > best_normalized_score:
                    best_normalized_score = normalized_score
                    best_beam = tokens
            
        return best_beam.squeeze().tolist()
    
    def translate(
        self,
        src: torch.Tensor,
        method: str = 'beam_search',
        max_length: int = 100
    ) -> List[int]:
        """
        翻译方法
        
        参数:
            src: 源序列
            method: 解码方法 ('greedy' 或 'beam_search')
            max_length: 最大解码长度
            
        返回:
            翻译结果序列
        """
        src = src.to(self.device)
        
        if method == 'greedy':
            return self.greedy_decode(src, max_length)
        elif method == 'beam_search':
            return self.beam_search_decode(src, max_length)
        else:
            raise ValueError(f"未知的解码方法: {method}")
    
    def train_step(
        self,
        src: torch.Tensor,
        tgt: torch.Tensor,
        optimizer: torch.optim.Optimizer,
        criterion: nn.Module,
        teacher_forcing_ratio: float = 0.5
    ) -> float:
        """
        训练步骤（支持教师强制）
        
        参数:
            src: 源序列
            tgt: 目标序列
            optimizer: 优化器
            criterion: 损失函数
            teacher_forcing_ratio: 教师强制比例
            
        返回:
            平均损失
        """
        self.model.train()
        optimizer.zero_grad()
        
        tgt_input = tgt[:, :-1]  # 不包含最后的EOS
        tgt_output = tgt[:, 1:]  # 偏移一个位置
        
        # 前向传播
        output = self.model(src, tgt_input)
        output = output.contiguous().view(-1, self.config.vocab_size)
        tgt_output = tgt_output.contiguous().view(-1)
        
        # 计算损失
        loss = criterion(output, tgt_output)
        
        # 反向传播
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
        optimizer.step()
        
        return loss.item()
    
    def save_model(self, path: str):
        """
        保存模型
        
        参数:
            path: 保存路径
        """
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'config': self.config
        }, path)
        logger.info(f"模型已保存到: {path}")
    
    def load_model(self, path: str):
        """
        加载模型
        
        参数:
            path: 模型路径
        """
        checkpoint = torch.load(path, map_location=self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        logger.info(f"模型已从 {path} 加载")


class SignLanguageTranslator:
    """
    手语特定翻译器
    专门针对手语翻译任务优化
    """
    
    def __init__(
        self,
        config: TranslatorConfig,
        vocab_size: int,
        device: str = 'cpu'
    ):
        """
        初始化手语翻译器
        
        参数:
            config: 配置
            vocab_size: 词汇表大小
            device: 设备
        """
        config.vocab_size = vocab_size
        model = Seq2SeqTransformer(config)
        self.translator = Translator(model, config, device)
        
        logger.info("初始化手语翻译器完成")
    
    def sign_to_text(
        self,
        sign_sequence: torch.Tensor,
        decode_method: str = 'beam_search'
    ) -> List[int]:
        """
        手语序列到文本翻译
        
        参数:
            sign_sequence: 手语序列
            decode_method: 解码方法
            
        返回:
            文本token序列
        """
        return self.translator.translate(sign_sequence, method=decode_method)
    
    def text_to_sign(
        self,
        text_sequence: torch.Tensor,
        decode_method: str = 'beam_search'
    ) -> List[int]:
        """
        文本序列到手语翻译
        
        参数:
            text_sequence: 文本序列
            decode_method: 解码方法
            
        返回:
            手语token序列
        """
        return self.translator.translate(text_sequence, method=decode_method)
    
    def batch_translate(
        self,
        sequences: torch.Tensor,
        decode_method: str = 'beam_search'
    ) -> List[List[int]]:
        """
        批量翻译
        
        参数:
            sequences: 输入序列批次
            decode_method: 解码方法
            
        返回:
            翻译结果列表
        """
        results = []
        for seq in sequences:
            seq = seq.unsqueeze(0)  # 添加batch维度
            result = self.translator.translate(seq, method=decode_method)
            results.append(result)
        
        return results