/**
 * EmotionButton 组件单元测试
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EmotionButton from '@/components/emotional/EmotionButton';

describe('EmotionButton 组件', () => {
  it('应该正确渲染情绪按钮', () => {
    render(<EmotionButton emotion="happy" label="开心" />);
    expect(screen.getByText('开心')).toBeInTheDocument();
  });

  it('点击按钮时应该触发回调', () => {
    const onClick = vi.fn();
    render(<EmotionButton emotion="happy" label="开心" onClick={onClick} />);
    
    const button = screen.getByText('开心');
    fireEvent.click(button);
    
    expect(onClick).toHaveBeenCalledWith('happy');
  });

  it('应该正确激活状态', () => {
    render(<EmotionButton emotion="happy" label="开心" active={true} />);
    
    const button = screen.getByText('开心');
    expect(button).toHaveClass('active');
  });

  it('应该正确禁用状态', () => {
    render(<EmotionButton emotion="happy" label="开心" disabled={true} />);
    
    const button = screen.getByText('开心');
    expect(button).toBeDisabled();
  });

  it('应该显示正确的图标', () => {
    const icons = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      neutral: '😐'
    };
    
    Object.entries(icons).forEach(([emotion, icon]) => {
      render(<EmotionButton emotion={emotion as any} label={emotion} />);
      expect(screen.getByText(icon)).toBeInTheDocument();
    });
  });

  it('应该支持键盘导航', () => {
    const onClick = vi.fn();
    render(<EmotionButton emotion="happy" label="开心" onClick={onClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    
    expect(onClick).toHaveBeenCalled();
  });
});