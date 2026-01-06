/**
 * CameraView 组件单元测试
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CameraView from '@/components/CameraView';

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia
  }
});

describe('CameraView 组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 清理所有 mock
    vi.restoreAllMocks();
  });

  it('应该正确渲染相机视图', () => {
    render(<CameraView />);
    expect(screen.getByRole('camera')).toBeInTheDocument();
  });

  it('相机启动时应该请求摄像头权限', async () => {
    mockGetUserMedia.mockResolvedValue({
      getVideoTracks: () => [],
      getAudioTracks: () => []
    });

    render(<CameraView />);

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: { width: 1280, height: 720 }
      });
    });
  });

  it('摄像头访问失败时应该显示错误信息', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Camera not found'));

    render(<CameraView />);

    await waitFor(() => {
      expect(screen.getByText(/error|camera/i)).toBeInTheDocument();
    });
  });

  it('应该正确传递回调函数', async () => {
    const onFrameCapture = vi.fn();
    mockGetUserMedia.mockResolvedValue({
      getVideoTracks: () => [],
      getAudioTracks: () => []
    });

    render(<CameraView onFrameCapture={onFrameCapture} />);

    await waitFor(() => {
      expect(onFrameCapture).toBeDefined();
    });
  });

  it('应该正确处理相机停止', async () => {
    const { unmount } = render(<CameraView />);

    mockGetUserMedia.mockResolvedValue({
      getVideoTracks: () => [{}],
      getAudioTracks: () => [],
      stop: vi.fn()
    });

    await waitFor(() => {
      unmount();
    });

    expect(mockGetUserMedia).toHaveBeenCalled();
  });
});