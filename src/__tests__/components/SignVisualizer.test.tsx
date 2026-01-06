/**
 * SignVisualizer 组件单元测试
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SignVisualizer from '@/components/SignVisualizer';

describe('SignVisualizer 组件', () => {
  it('应该正确渲染手势可视化组件', () => {
    const mockSigns = [
      { sign: '你好', x: 100, y: 200 },
      { sign: '世界', x: 300, y: 400 }
    ];
    
    render(<SignVisualizer signs={mockSigns} />);
    expect(screen.getByText('你好')).toBeInTheDocument();
    expect(screen.getByText('世界')).toBeInTheDocument();
  });

  it('应该正确处理空的手势数据', () => {
    render(<SignVisualizer signs={[]} />);
    expect(screen.getByText(/no signs|empty/i)).toBeInTheDocument();
  });

  it('应该正确显示手势置信度', () => {
    const mockSigns = [
      { sign: '你好', confidence: 0.95 }
    ];
    
    render(<SignVisualizer signs={mockSigns} />);
    expect(screen.getByText(/95%|0\.95/i)).toBeInTheDocument();
  });

  it('应该正确触发手势选择回调', () => {
    const onSelect = vi.fn();
    const mockSigns = [
      { sign: '你好', confidence: 0.95 }
    ];
    
    const { getByText } = render(
      <SignVisualizer signs={mockSigns} onSelect={onSelect} />
    );
    
    getByText('你好').click();
    expect(onSelect).toHaveBeenCalledWith(mockSigns[0]);
  });

  it('应该正确显示动画效果', () => {
    const mockSigns = [
      { sign: '你好', animation: 'wave' }
    ];
    
    render(<SignVisualizer signs={mockSigns} animate={true} />);
    const animatedElement = screen.getByText('你好');
    expect(animatedElement).toHaveClass('animate');
  });
});