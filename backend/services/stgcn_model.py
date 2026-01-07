"""
ST-GCN (Spatio-Temporal Graph Convolutional Network) 模型定义
用于手语识别的时空图卷积神经网络
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import Optional, List, Tuple
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GraphConvolution(nn.Module):
    """图卷积层"""
    
    def __init__(self, in_channels: int, out_channels: int, A: torch.Tensor):
        """
        初始化图卷积层
        
        Parameters:
        -----------
        in_channels: int
            输入特征通道数
        out_channels: int
            输出特征通道数
        A: torch.Tensor
            邻接矩阵 (3, num_nodes, num_nodes)
        """
        super(GraphConvolution, self).__init__()
        self.in_channels = in_channels
        self.out_channels = out_channels
        
        # 为每种邻接矩阵类型学习独立的权重
        # 3种类型：自身划分、邻近划分、离心划分
        self.conv = nn.Conv2d(
            in_channels * len(A),
            out_channels,
            kernel_size=1
        )
        
        # 邻接矩阵的可学习参数
        if not isinstance(A, torch.Tensor):
            A = torch.tensor(A, dtype=torch.float32)
        self.register_buffer('A', A)
        
        # 用于初始化的可学习参数
        self.alpha = nn.Parameter(torch.ones(len(A), 1, 1, 1))
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        前向传播
        
        Parameters:
        -----------
        x: torch.Tensor
            输入张量 (batch_size, in_channels, num_nodes, temporal_steps)
            
        Returns:
        --------
        torch.Tensor
            输出张量 (batch_size, out_channels, num_nodes, temporal_steps)
        """
        batch_size, channels, num_nodes, temporal_steps = x.shape
        
        # 与三种邻接矩阵分别进行卷积
        Res = []
        for i in range(len(self.A)):
            # 矩阵乘法实现图卷积
            # x: (batch, channels, nodes, time)
            # A[i]: (nodes, nodes)
            temp = torch.einsum('bcnt,nm->bcmt', x, self.A[i])
            
            # 应用学习到的权重参数
            temp = temp * self.alpha[i]
            Res.append(temp)
        
        # 拼接三种卷积结果
        Res = torch.cat(Res, dim=1)  # (batch, 3*in_channels, nodes, time)
        
        # 1x1卷积融合
        result = self.conv(Res)  # (batch, out_channels, nodes, time)
        
        return result


class TemporalConvolution(nn.Module):
    """时序卷积层"""
    
    def __init__(
        self, 
        channels: int, 
        kernel_size: int = 9,
        stride: int = 1,
        dropout: float = 0.5
    ):
        """
        初始化时序卷积层
        
        Parameters:
        -----------
        channels: int
            通道数
        kernel_size: int
            卷积核大小（时间维度）
        stride: int
            步长
        dropout: float
            Dropout比率
        """
        super(TemporalConvolution, self).__init__()
        pad = (kernel_size - 1) // 2
        
        self.conv = nn.Conv2d(
            channels,
            channels,
            kernel_size=(kernel_size, 1),
            padding=(pad, 0),
            stride=(stride, 1)
        )
        
        self.bn = nn.BatchNorm2d(channels)
        self.relu = nn.ReLU(inplace=True)
        self.dropout = nn.Dropout(dropout)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        前向传播
        
        Parameters:
        -----------
        x: torch.Tensor
            输入张量 (batch_size, channels, num_nodes, temporal_steps)
            
        Returns:
        --------
        torch.Tensor
            输出张量
        """
        x = self.conv(x)
        x = self.bn(x)
        x = self.relu(x)
        x = self.dropout(x)
        return x


class STGCNBlock(nn.Module):
    """ST-GCN 基础块"""
    
    def __init__(
        self, 
        in_channels: int, 
        out_channels: int, 
        A: torch.Tensor,
        kernel_size: int = 9,
        stride: int = 1,
        dropout: int = 0.5,
        residual: bool = True
    ):
        """
        初始化ST-GCN块
        
        Parameters:
        -----------
        in_channels: int
            输入通道数
        out_channels: int
            输出通道数
        A: torch.Tensor
            邻接矩阵
        kernel_size: int
            时序卷积核大小
        stride: int
            步长
        dropout: float
            Dropout比率
        residual: bool
            是否使用残差连接
        """
        super(STGCNBlock, self).__init__()
        self.residual = residual
        
        # 图卷积
        self.gcn = GraphConvolution(in_channels, out_channels, A)
        
        # 时序卷积
        self.tcn = TemporalConvolution(
            out_channels,
            kernel_size=kernel_size,
            stride=stride,
            dropout=dropout
        )
        
        # 残差连接的投影层（如果输入输出通道数不同）
        if not residual:
            self.residual_connection = None
        elif in_channels == out_channels and stride == 1:
            self.residual_connection = lambda x: x
        else:
            self.residual_connection = nn.Sequential(
                nn.Conv2d(
                    in_channels,
                    out_channels,
                    kernel_size=1,
                    stride=(stride, 1)
                ),
                nn.BatchNorm2d(out_channels)
            )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        前向传播
        
        Parameters:
        -----------
        x: torch.Tensor
            输入张量 (batch_size, in_channels, num_nodes, temporal_steps)
            
        Returns:
        --------
        torch.Tensor
            输出张量
        """
        # 图卷积
        x = self.gcn(x)
        
        # 时序卷积
        x = self.tcn(x)
        
        # 残差连接
        if self.residual_connection is not None:
            return x + self.residual_connection(x)
        else:
            return x


class SpatialAttention(nn.Module):
    """空间注意力机制"""
    
    def __init__(self, in_channels: int):
        """
        初始化空间注意力层
        
        Parameters:
        -----------
        in_channels: int
            输入通道数
        """
        super(SpatialAttention, self).__init__()
        self.conv = nn.Conv2d(in_channels, 1, kernel_size=1)
        self.softmax = nn.Softmax(dim=2)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        前向传播
        
        Parameters:
        -----------
        x: torch.Tensor
            输入张量 (batch_size, channels, num_nodes, temporal_steps)
            
        Returns:
        --------
        torch.Tensor
            注意力权重 (batch_size, 1, num_nodes, temporal_steps)
        """
        # 计算注意力分数
        attention = self.conv(x)  # (batch, 1, nodes, time)
        attention = self.softmax(attention)
        return attention


class TemporalAttention(nn.Module):
    """时序注意力机制"""
    
    def __init__(self, in_channels: int):
        """
        初始化时序注意力层
        
        Parameters:
        -----------
        in_channels: int
            输入通道数
        """
        super(TemporalAttention, self).__init__()
        self.conv = nn.Conv1d(in_channels, 1, kernel_size=1)
        self.softmax = nn.Softmax(dim=2)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        前向传播
        
        Parameters:
        -----------
        x: torch.Tensor
            输入张量 (batch_size, channels, num_nodes, temporal_steps)
            
        Returns:
        --------
        torch.Tensor
            注意力权重 (batch_size, 1, temporal_steps)
        """
        batch_size, channels, num_nodes, temporal_steps = x.shape
        
        # 平均池化到每个节点
        x = x.mean(dim=2)  # (batch, channels, time)
        
        # 计算注意力分数
        attention = self.conv(x)  # (batch, 1, time)
        attention = self.softmax(attention)
        
        return attention.unsqueeze(1)  # (batch, 1, 1, time)


class STGCN(nn.Module):
    """ST-GCN 时空图卷积网络模型"""
    
    def __init__(
        self,
        num_classes: int,
        num_points: int = 21,
        in_channels: int = 2,
        graph_setting: str = 'default',
        dropout: float = 0.5,
        edge_importance_weighting: bool = True
    ):
        """
        初始化ST-GCN模型
        
        Parameters:
        -----------
        num_classes: int
            分类类别数
        num_points: int
            关键点数量（21个手部关键点）
        in_channels: int
            输入通道数（x, y坐标）
        graph_setting: str
            图结构设置
        dropout: float
            Dropout比率
        edge_importance_weighting: bool
            是否使用边重要性加权
        """
        super(STGCN, self).__init__()
        
        self.num_classes = num_classes
        self.num_points = num_points
        self.in_channels = in_channels
        
        # 构建邻接矩阵
        self.A = self._build_adjacency_matrix()
        
        # ST-GCN 层
        self.st_gcn_networks = nn.ModuleList([
            STGCNBlock(in_channels, 64, self.A, residual=False),
            STGCNBlock(64, 64, self.A),
            STGCNBlock(64, 64, self.A),
            STGCNBlock(64, 128, self.A, stride=2),
            STGCNBlock(128, 128, self.A),
            STGCNBlock(128, 256, self.A, stride=2),
            STGCNBlock(256, 256, self.A),
            STGCNBlock(256, 256, self.A),
        ])
        
        # 注意力机制
        self.spatial_attention = SpatialAttention(256)
        self.temporal_attention = TemporalAttention(256)
        
        # 全局平均池化
        self.global_pool = nn.AdaptiveAvgPool2d(1)
        
        # 分类器
        self.fc = nn.Linear(256, num_classes)
        
        # Dropout
        self.dropout = nn.Dropout(dropout)
        
        logger.info(f"ST-GCN模型初始化完成，类别数: {num_classes}")
    
    def _build_adjacency_matrix(self) -> torch.Tensor:
        """
        构建手部关键点的邻接矩阵
        
        Returns:
        --------
        torch.Tensor
            邻接矩阵 (3, 21, 21)
            3种划分策略：自身、邻近、离心
        """
        # 手部关键点的连接关系（基于MediaPipe手的拓扑结构）
        # 索引：0=手腕, 1-4=拇指, 5-8=食指, 9-12=中指, 13-16=无名指, 17-20=小指
        links = [
            (0, 1), (0, 5), (0, 9), (0, 13), (0, 17),  # 手腕到各指根部
            (1, 2), (2, 3), (3, 4),  # 拇指
            (5, 6), (6, 7), (7, 8),  # 食指
            (9, 10), (10, 11), (11, 12),  # 中指
            (13, 14), (14, 15), (15, 16),  # 无名指
            (17, 18), (18, 19), (19, 20)  # 小指
        ]
        
        num_nodes = self.num_points
        adj_matrix = np.zeros((num_nodes, num_nodes), dtype=np.float32)
        
        # 构建邻接矩阵
        for i, j in links:
            adj_matrix[i, j] = 1
            adj_matrix[j, i] = 1
        
        # 添加自环
        np.fill_diagonal(adj_matrix, 1)
        
        # 三种划分策略
        # 1. 自身划分（距离=0）
        A_self = np.eye(num_nodes, dtype=np.float32)
        
        # 2. 邻近划分（距离=1）
        A_centripetal = np.where((adj_matrix > 0) & (adj_matrix < 2), 1, 0)
        np.fill_diagonal(A_centripetal, 0)
        
        # 3. 离心划分（距离>1）
        A_centrifugal = np.where(adj_matrix >= 2, 1, 0)
        np.fill_diagonal(A_centrifugal, 0)
        
        A = np.stack([A_self, A_centripetal, A_centrifugal], axis=0)
        return torch.from_numpy(A)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        前向传播
        
        Parameters:
        -----------
        x: torch.Tensor
            输入张量 (batch_size, temporal_steps, num_nodes, in_channels)
            
        Returns:
        --------
        torch.Tensor
            分类logits (batch_size, num_classes)
        """
        # 调整输入格式：从 (N, T, V, C) 到 (N, C, V, T)
        x = x.permute(0, 3, 2, 1)  # (batch, channels, nodes, time)
        
        # 通过ST-GCN层
        for gcn in self.st_gcn_networks:
            x = gcn(x)
        
        # 空间注意力
        spatial_attn = self.spatial_attention(x)
        x = x * spatial_attn
        
        # 时序注意力
        temporal_attn = self.temporal_attention(x)
        x = x * temporal_attn
        
        # 全局池化
        x = self.global_pool(x)  # (batch, 256, 1, 1)
        x = x.squeeze(-1).squeeze(-1)  # (batch, 256)
        
        # Dropout
        x = self.dropout(x)
        
        # 分类
        output = self.fc(x)  # (batch, num_classes)
        
        return output
    
    def predict(
        self,
        x: torch.Tensor,
        return_probabilities: bool = False
    ) -> torch.Tensor:
        """
        预测方法
        
        Parameters:
        -----------
        x: torch.Tensor
            输入张量 (batch_size, temporal_steps, num_nodes, in_channels)
        return_probabilities: bool
            是否返回概率分布
            
        Returns:
        --------
        torch.Tensor
            预测结果或概率分布
        """
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            
            if return_probabilities:
                probabilities = F.softmax(logits, dim=1)
                return probabilities
            else:
                return logits.argmax(dim=1)


def create_stgcn_model(
    num_classes: int,
    pretrained_path: Optional[str] = None,
    device: str = 'cuda'
) -> STGCN:
    """
    创建ST-GCN模型并加载预训练权重
    
    Parameters:
    -----------
    num_classes: int
            分类类别数
    pretrained_path: str, optional
            预训练模型路径
    device: str
            设备类型
            
    Returns:
    --------
    STGCN
            初始化的模型
    """
    try:
        # 创建模型
        model = STGCN(num_classes=num_classes)
        
        # 加载预训练权重
        if pretrained_path is not None:
            checkpoint = torch.load(pretrained_path, map_location=device)
            
            # 处理不同的checkpoint格式
            if 'state_dict' in checkpoint:
                state_dict = checkpoint['state_dict']
            elif 'model' in checkpoint:
                state_dict = checkpoint['model']
            else:
                state_dict = checkpoint
            
            model.load_state_dict(state_dict, strict=False)
            logger.info(f"成功加载预训练模型: {pretrained_path}")
        
        # 移动到指定设备
        model = model.to(device)
        
        return model
        
    except Exception as e:
        logger.error(f"创建ST-GCN模型失败: {str(e)}")
        raise


if __name__ == '__main__':
    # 测试代码
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    # 创建模型
    model = create_stgcn_model(num_classes=10, device=device)
    
    # 创建测试输入
    batch_size = 4
    temporal_steps = 30
    num_nodes = 21
    in_channels = 2
    
    x = torch.randn(batch_size, temporal_steps, num_nodes, in_channels).to(device)
    
    # 前向传播
    output = model(x)
    print(f"输出形状: {output.shape}")
    print(f"设备: {device}")