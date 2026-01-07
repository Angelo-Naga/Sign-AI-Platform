"""
声音克隆服务模块
整合编码器、合成器、声码器，提供完整的声音克隆功能
支持实时合成和批量处理
"""

import logging
import numpy as np
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
from pathlib import Path
import io
import soundfile as sf

from .speaker_encoder import SpeakerEncoder, EncoderConfig
from .voice_synthesizer import VoiceSynthesizer, SynthesizerConfig
from .vocoder import Vocoder, VocoderConfig
from .audio_preprocessor import AudioPreprocessor, AudioConfig
from ..utils.speaker_db import SpeakerDatabase, SpeakerProfile, VoiceSample

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class CloneConfig:
    """克隆服务配置"""
    # 编码器配置
    encoder_config: Optional[EncoderConfig] = None
    
    # 合成器配置
    synthesizer_config: Optional[SynthesizerConfig] = None
    
    # 声码器配置
    vocoder_config: Optional[VocoderConfig] = None
    
    # 音频预处理配置
    audio_config: Optional[AudioConfig] = None
    
    # 克隆参数
    min_sample_duration: float = 1.0  # 最小样本时长（秒）
    max_sample_duration: float = 30.0  # 最大样本时长（秒）
    min_reference_samples: int = 3  # 最小参考样本数
    
    # 批处理参数
    batch_size: int = 4  # 批处理大小


@dataclass
class CloneResult:
    """克隆结果"""
    success: bool
    audio_data: Optional[bytes] = None
    duration: Optional[float] = None
    format: str = "wav"
    sample_rate: int = 22050
    voice_id: Optional[str] = None
    message: Optional[str] = None
    processing_time: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'success': self.success,
            'duration': self.duration,
            'format': self.format,
            'sample_rate': self.sample_rate,
            'voice_id': self.voice_id,
            'message': self.message,
            'processing_time': self.processing_time
        }


class VoiceCloner:
    """声音克隆服务主类"""
    
    def __init__(
        self,
        config: Optional[CloneConfig] = None,
        db_path: Optional[str] = None
    ):
        """初始化声音克隆服务
        
        Args:
            config: 克隆配置
            db_path: 数据库路径
        """
        self.config = config or CloneConfig()
        
        # 初始化音频预处理器
        self.audio_preprocessor = AudioPreprocessor(self.config.audio_config)
        
        # 初始化说话人编码器
        self.speaker_encoder = SpeakerEncoder(self.config.encoder_config)
        
        # 初始化声音合成器
        self.voice_synthesizer = VoiceSynthesizer(self.config.synthesizer_config)
        
        # 初始化声码器
        self.vocoder = Vocoder(self.config.vocoder_config)
        
        # 初始化说话人数据库
        self.speaker_db = SpeakerDatabase(db_path)
        
        logger.info("声音克隆服务初始化完成")
    
    def load_models(
        self,
        encoder_model_path: Optional[str] = None,
        synthesizer_model_path: Optional[str] = None,
        vocoder_model_path: Optional[str] = None
    ):
        """加载预训练模型
        
        Args:
            encoder_model_path: 编码器模型路径
            synthesizer_model_path: 合成器模型路径
            vocoder_model_path: 声码器模型路径
        """
        try:
            if encoder_model_path and Path(encoder_model_path).exists():
                self.speaker_encoder.load_model(encoder_model_path)
                logger.info("加载说话人编码器模型")
            
            if synthesizer_model_path and Path(synthesizer_model_path).exists():
                self.voice_synthesizer.load_model(synthesizer_model_path)
                logger.info("加载声音合成器模型")
            
            if vocoder_model_path and Path(vocoder_model_path).exists():
                self.vocoder.load_model(vocoder_model_path)
                logger.info("加载声码器模型")
            
            logger.info("模型加载完成")
            
        except Exception as e:
            logger.error(f"加载模型失败: {str(e)}")
            raise RuntimeError(f"加载模型失败: {str(e)}")
    
    def clone_voice(
        self,
        text: str,
        reference_audio: bytes,
        reference_format: str = "wav",
        voice_name: Optional[str] = None
    ) -> CloneResult:
        """克隆声音（使用实时参考音频）
        
        Args:
            text: 要合成的文本
            reference_audio: 参考音频字节流
            reference_format: 参考音频格式
            voice_name: 声音名称（可选）
            
        Returns:
            克隆结果
        """
        import time
        start_time = time.time()
        
        try:
            logger.info(f"开始声音克隆: 文本长度={len(text)}, 声音名称={voice_name}")
            
            # 1. 音频预处理
            audio_data, sr = self.audio_preprocessor.load_audio(
                reference_audio,
                reference_format
            )
            
            # 重采样到目标采样率
            if sr != self.config.encoder_config.sample_rate:
                audio_data = self.audio_preprocessor.resample(audio_data, sr)
            
            # 检查音频时长
            duration = len(audio_data) / sr
            if duration < self.config.min_sample_duration:
                return CloneResult(
                    success=False,
                    message=f"参考音频太短，至少需要 {self.config.min_sample_duration} 秒"
                )
            
            if duration > self.config.max_sample_duration:
                return CloneResult(
                    success=False,
                    message=f"参考音频太长，最多 {self.config.max_sample_duration} 秒"
                )
            
            # 2. 提取说话人嵌入
            speaker_embedding = self.speaker_encoder.extract_embedding(
                audio_data,
                sr
            )
            
            # 3. 文本到梅尔频谱合成
            mel_spec = self.voice_synthesizer.synthesize(
                text,
                speaker_embedding
            )
            
            # 4. 梅尔频谱到音频波形转换
            audio_waveform = self.vocoder.infer(mel_spec)
            
            # 5. 音频后处理
            audio_waveform = self.audio_preprocessor.normalize(audio_waveform)
            
            # 6. 保存为字节流
            audio_bytes = self._audio_to_bytes(
                audio_waveform,
                self.vocoder.config.sample_rate
            )
            
            # 计算处理时间
            processing_time = time.time() - start_time
            
            # 生成声音ID
            voice_id = voice_name or f"voice_{id(audio_waveform)}"
            
            logger.info(f"声音克隆成功，处理时间: {processing_time:.2f}s")
            
            return CloneResult(
                success=True,
                audio_data=audio_bytes,
                duration=len(audio_waveform) / self.vocoder.config.sample_rate,
                format="wav",
                sample_rate=self.vocoder.config.sample_rate,
                voice_id=voice_id,
                message="声音克隆成功",
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"声音克隆失败: {str(e)}")
            return CloneResult(
                success=False,
                message=f"声音克隆失败: {str(e)}",
                processing_time=time.time() - start_time
            )
    
    def clone_voice_from_profile(
        self,
        text: str,
        speaker_id: str
    ) -> CloneResult:
        """使用说话人档案克隆声音
        
        Args:
            text: 要合成的文本
            speaker_id: 说话人ID
            
        Returns:
            克隆结果
        """
        import time
        start_time = time.time()
        
        try:
            logger.info(f"使用说话人档案克隆声音: speaker_id={speaker_id}")
            
            # 1. 获取说话人档案
            profile = self.speaker_db.get_speaker(speaker_id)
            if profile is None:
                return CloneResult(
                    success=False,
                    message=f"说话人档案不存在: {speaker_id}"
                )
            
            if profile.embedding is None:
                return CloneResult(
                    success=False,
                    message=f"说话人档案没有嵌入向量"
                )
            
            # 2. 检查样本数量
            if profile.sample_count < self.config.min_reference_samples:
                return CloneResult(
                    success=False,
                    message=f"说话人样本不足，至少需要 {self.config.min_reference_samples} 个样本"
                )
            
            # 3. 文本到梅尔频谱合成
            mel_spec = self.voice_synthesizer.synthesize(
                text,
                profile.embedding
            )
            
            # 4. 梅尔频谱到音频波形转换
            audio_waveform = self.vocoder.infer(mel_spec)
            
            # 5. 音频后处理
            audio_waveform = self.audio_preprocessor.normalize(audio_waveform)
            
            # 6. 保存为字节流
            audio_bytes = self._audio_to_bytes(
                audio_waveform,
                self.vocoder.config.sample_rate
            )
            
            # 计算处理时间
            processing_time = time.time() - start_time
            
            logger.info(f"使用说话人档案克隆成功，处理时间: {processing_time:.2f}s")
            
            return CloneResult(
                success=True,
                audio_data=audio_bytes,
                duration=len(audio_waveform) / self.vocoder.config.sample_rate,
                format="wav",
                sample_rate=self.vocoder.config.sample_rate,
                voice_id=speaker_id,
                message="使用说话人档案克隆成功",
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"使用说话人档案克隆失败: {str(e)}")
            return CloneResult(
                success=False,
                message=f"使用说话人档案克隆失败: {str(e)}",
                processing_time=time.time() - start_time
            )
    
    def clone_voice_batch(
        self,
        texts: List[str],
        reference_audio: Optional[bytes] = None,
        speaker_id: Optional[str] = None
    ) -> List[CloneResult]:
        """批量克隆声音
        
        Args:
            texts: 文本列表
            reference_audio: 参考音频字节流（可选）
            speaker_id: 说话人ID（可选）
            
        Returns:
            克隆结果列表
        """
        try:
            logger.info(f"开始批量克隆，数量: {len(texts)}")
            
            # 确定使用哪种模式
            use_reference = reference_audio is not None
            use_profile = speaker_id is not None
            
            if not (use_reference or use_profile):
                raise ValueError("必须提供 reference_audio 或 speaker_id")
            
            # 提取说话人嵌入（使用参考音频）
            if use_reference:
                audio_data, sr = self.audio_preprocessor.load_audio(reference_audio, "wav")
                if sr != self.config.encoder_config.sample_rate:
                    audio_data = self.audio_preprocessor.resample(audio_data, sr)
                speaker_embedding = self.speaker_encoder.extract_embedding(audio_data, sr)
            else:
                # 使用档案嵌入
                profile = self.speaker_db.get_speaker(speaker_id)
                if profile is None or profile.embedding is None:
                    return [CloneResult(success=False, message="说话人档案不存在或没有嵌入向量")] * len(texts)
                speaker_embedding = profile.embedding
            
            # 批量合成
            mels = self.voice_synthesizer.synthesize_batch(texts, [speaker_embedding] * len(texts))
            
            # 批量声码
            waveforms = self.vocoder.infer_batch(mels)
            
            # 转换结果
            results = []
            for i, (text, waveform) in enumerate(zip(texts, waveforms)):
                audio_bytes = self._audio_to_bytes(
                    waveform,
                    self.vocoder.config.sample_rate
                )
                
                results.append(CloneResult(
                    success=True,
                    audio_data=audio_bytes,
                    duration=len(waveform) / self.vocoder.config.sample_rate,
                    format="wav",
                    sample_rate=self.vocoder.config.sample_rate,
                    voice_id=speaker_id if use_profile else f"voice_{i}",
                    message=f"批量克隆成功 ({i+1}/{len(texts)})",
                    processing_time=0.0
                ))
            
            logger.info(f"批量克隆完成: {len(results)} 个")
            
            return results
            
        except Exception as e:
            logger.error(f"批量克隆失败: {str(e)}")
            return [CloneResult(success=False, message=f"批量克隆失败: {str(e)}")] * len(texts)
    
    def create_voice_profile(
        self,
        name: str,
        description: str = ""
    ) -> SpeakerProfile:
        """创建说话人档案
        
        Args:
            name: 说话人名称
            description: 描述
            
        Returns:
            说话人档案
        """
        try:
            profile = self.speaker_db.create_speaker(name, description)
            logger.info(f"创建说话人档案: {name}")
            return profile
        except Exception as e:
            logger.error(f"创建说话人档案失败: {str(e)}")
            raise RuntimeError(f"创建说话人档案失败: {str(e)}")
    
    def add_voice_sample(
        self,
        speaker_id: str,
        sample_name: str,
        audio_data: bytes,
        audio_format: str = "wav"
    ) -> VoiceSample:
        """添加声音样本到档案
        
        Args:
            speaker_id: 说话人ID
            sample_name: 样本名称
            audio_data: 音频字节流
            audio_format: 音频格式
            
        Returns:
            声音样本
        """
        try:
            # 音频预处理
            audio, sr = self.audio_preprocessor.load_audio(audio_data, audio_format)
            
            # 重采样
            if sr != self.config.encoder_config.sample_rate:
                audio = self.audio_preprocessor.resample(audio, sr)
            
            # 计算时长
            duration = len(audio) / sr
            
            # 检查时长
            if duration < self.config.min_sample_duration:
                raise ValueError(f"样本太短，至少需要 {self.config.min_sample_duration} 秒")
            
            # 提取嵌入
            embedding = self.speaker_encoder.extract_embedding(audio, sr)
            
            # 保存音频文件
            audio_filename = f"{speaker_id}_{sample_name}_{id(audio)}.wav"
            audio_path = str(self.speaker_db.samples_dir / audio_filename)
            
            # 保存音频
            sf.write(audio_path, audio, sr)
            
            # 添加样本到数据库
            sample = self.speaker_db.add_sample(
                speaker_id=speaker_id,
                name=sample_name,
                audio_path=audio_path,
                embedding=embedding,
                duration=duration
            )
            
            logger.info(f"添加声音样本: {sample_name} -> {speaker_id}")
            return sample
            
        except Exception as e:
            logger.error(f"添加声音样本失败: {str(e)}")
            raise RuntimeError(f"添加声音样本失败: {str(e)}")
    
    def get_voice_profiles(
        self,
        active_only: bool = True
    ) -> List[SpeakerProfile]:
        """获取所有说话人档案
        
        Args:
            active_only: 是否只返回活跃档案
            
        Returns:
            说话人档案列表
        """
        return self.speaker_db.list_speakers(active_only=active_only)
    
    def get_voice_profile(self, speaker_id: str) -> Optional[SpeakerProfile]:
        """获取指定说话人档案
        
        Args:
            speaker_id: 说话人ID
            
        Returns:
            说话人档案
        """
        return self.speaker_db.get_speaker(speaker_id)
    
    def delete_voice_profile(self, speaker_id: str) -> bool:
        """删除说话人档案
        
        Args:
            speaker_id: 说话人ID
            
        Returns:
            是否删除成功
        """
        try:
            success = self.speaker_db.delete_speaker(speaker_id)
            if success:
                logger.info(f"删除说话人档案: {speaker_id}")
            return success
        except Exception as e:
            logger.error(f"删除说话人档案失败: {str(e)}")
            raise RuntimeError(f"删除说话人档案失败: {str(e)}")
    
    def verify_speaker(
        self,
        query_audio: bytes,
        speaker_id: str,
        threshold: float = 0.7
    ) -> Tuple[bool, float]:
        """验证音频是否来自指定说话人
        
        Args:
            query_audio: 查询音频字节流
            speaker_id: 说话人ID
            threshold: 相似度阈值
            
        Returns:
            (是否匹配, 相似度)
        """
        try:
            # 音频预处理
            audio, sr = self.audio_preprocessor.load_audio(query_audio, "wav")
            
            # 重采样
            if sr != self.config.encoder_config.sample_rate:
                audio = self.audio_preprocessor.resample(audio, sr)
            
            # 提取嵌入
            embedding = self.speaker_encoder.extract_embedding(audio, sr)
            
            # 验证
            is_match, similarity = self.speaker_db.verify_speaker(
                speaker_id,
                embedding,
                threshold
            )
            
            logger.info(f"说话人验证: {speaker_id}, 结果={is_match}, 相似度={similarity:.4f}")
            
            return is_match, similarity
            
        except Exception as e:
            logger.error(f"说话人验证失败: {str(e)}")
            return False, 0.0
    
    def search_similar_speakers(
        self,
        query_audio: bytes,
        top_k: int = 5,
        threshold: float = 0.5
    ) -> List[Tuple[SpeakerProfile, float]]:
        """搜索相似的说话人
        
        Args:
            query_audio: 查询音频字节流
            top_k: 返回前k个结果
            threshold: 相似度阈值
            
        Returns:
            (说话人档案, 相似度)列表
        """
        try:
            # 音频预处理
            audio, sr = self.audio_preprocessor.load_audio(query_audio, "wav")
            
            # 重采样
            if sr != self.config.encoder_config.sample_rate:
                audio = self.audio_preprocessor.resample(audio, sr)
            
            # 提取嵌入
            embedding = self.speaker_encoder.extract_embedding(audio, sr)
            
            # 搜索
            results = self.speaker_db.search_by_similarity(
                embedding,
                top_k,
                threshold
            )
            
            logger.info(f"相似说话人搜索完成，返回 {len(results)} 个结果")
            
            return results
            
        except Exception as e:
            logger.error(f"相似说话人搜索失败: {str(e)}")
            return []
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取服务统计信息
        
        Returns:
            统计信息字典
        """
        return self.speaker_db.get_statistics()
    
    def _audio_to_bytes(
        self,
        audio: np.ndarray,
        sample_rate: int,
        format: str = "wav"
    ) -> bytes:
        """将音频转换为字节流
        
        Args:
            audio: 音频波形
            sample_rate: 采样率
            format: 音频格式
            
        Returns:
            音频字节流
        """
        try:
            # 使用 soundfile 保存到内存
            buffer = io.BytesIO()
            sf.write(buffer, audio, sample_rate, format=format)
            buffer.seek(0)
            audio_bytes = buffer.read()
            buffer.close()
            
            return audio_bytes
            
        except Exception as e:
            logger.error(f"音频转换失败: {str(e)}")
            raise RuntimeError(f"音频转换失败: {str(e)}")
    
    def save_models(
        self,
        output_dir: str,
        encoder_name: str = "speaker_encoder.pth",
        synthesizer_name: str = "voice_synthesizer.pth",
        vocoder_name: str = "vocoder.pth"
    ):
        """保存模型
        
        Args:
            output_dir: 输出目录
            encoder_name: 编码器文件名
            synthesizer_name: 合成器文件名
            vocoder_name: 声码器文件名
        """
        try:
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            # 保存编码器
            encoder_path = output_path / encoder_name
            self.speaker_encoder.save_model(str(encoder_path))
            
            # 保存合成器
            synthesizer_path = output_path / synthesizer_name
            self.voice_synthesizer.save_model(str(synthesizer_path))
            
            # 保存声码器
            vocoder_path = output_path / vocoder_name
            self.vocoder.save_model(str(vocoder_path))
            
            logger.info(f"模型保存完成: {output_dir}")
            
        except Exception as e:
            logger.error(f"保存模型失败: {str(e)}")
            raise RuntimeError(f"保存模型失败: {str(e)}")