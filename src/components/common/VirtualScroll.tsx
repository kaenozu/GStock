import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number; // レンダリングする追加アイテム数
}

// 仮想スクロールコンポーネント
export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // スクロール可能範囲の計算
  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

  // 可視範囲内のアイテムインデックスを計算
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // 表示するアイテムをスライス
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  // スクロールイベントハンドラ
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // インデックスに基づいてアイテムの位置を計算
  const getItemStyle = useCallback((index: number) => ({
    position: 'absolute' as const,
    top: `${(visibleRange.startIndex + index) * itemHeight}px`,
    left: 0,
    right: 0,
    height: `${itemHeight}px`,
  }), [visibleRange.startIndex, itemHeight]);

  return (
    <div
      ref={containerRef}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div key={visibleRange.startIndex + index} style={getItemStyle(index)}>
            {renderItem(item, visibleRange.startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// 動的アイテム高さ対応版
interface VariableVirtualScrollProps<T> {
  items: T[];
  estimatedItemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemHeight?: (item: T, index: number) => number;
  overscan?: number;
}

export function VariableVirtualScroll<T>({
  items,
  estimatedItemHeight,
  containerHeight,
  renderItem,
  getItemHeight,
  overscan = 5
}: VariableVirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // アイテムの位置情報を計算
  const itemPositions = useMemo(() => {
    const positions: number[] = [0];
    let totalHeight = 0;
    
    for (let i = 0; i < items.length; i++) {
      const height = itemHeights.get(i) || estimatedItemHeight;
      totalHeight += height;
      positions.push(totalHeight);
    }
    
    return { positions, totalHeight };
  }, [items.length, itemHeights, estimatedItemHeight]);

  // 可視範囲内のインデックスを計算
  const visibleRange = useMemo(() => {
    const { positions } = itemPositions;
    
    // 二分探索で開始インデックスを探索
    let startIndex = 0;
    let low = 0;
    let high = positions.length - 1;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (positions[mid] <= scrollTop) {
        startIndex = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    // 終了インデックスを計算
    let endIndex = startIndex;
    const visibleBottom = scrollTop + containerHeight;
    
    while (endIndex < positions.length - 1 && positions[endIndex + 1] <= visibleBottom + (overscan * estimatedItemHeight)) {
      endIndex++;
    }
    
    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex: Math.min(items.length - 1, endIndex + overscan)
    };
  }, [scrollTop, containerHeight, itemPositions, estimatedItemHeight, overscan, items.length]);

  // 表示するアイテムをスライス
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  // アイテムの高さを測定
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const newHeights = new Map(itemHeights);
      
      entries.forEach(entry => {
        const index = parseInt(entry.target.getAttribute('data-index') || '0');
        const height = entry.contentRect.height;
        
        if (height > 0 && height !== newHeights.get(index)) {
          newHeights.set(index, height);
        }
      });
      
      setItemHeights(newHeights);
    });

    // 観測対象を設定
    itemRefs.current.forEach((element, index) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [itemHeights]);

  // リファレンスを設定するコールバック
  const setItemRef = useCallback((index: number) => (element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current.set(index, element);
      element.setAttribute('data-index', String(index));
    } else {
      itemRefs.current.delete(index);
    }
  }, []);

  // アイテムのスタイルを計算
  const getItemStyle = useCallback((index: number) => {
    const actualIndex = visibleRange.startIndex + index;
    const top = itemPositions.positions[actualIndex] || 0;
    
    return {
      position: 'absolute' as const,
      top: `${top}px`,
      left: 0,
      right: 0,
      height: getItemHeight ? `${getItemHeight(items[actualIndex], actualIndex)}px` : undefined
    };
  }, [visibleRange.startIndex, itemPositions.positions, getItemHeight, items]);

  // スクロールイベントハンドラ
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: itemPositions.totalHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={visibleRange.startIndex + index}
            ref={setItemRef(visibleRange.startIndex + index)}
            style={getItemStyle(index)}
          >
            {renderItem(item, visibleRange.startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// 便利なフック
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  return useMemo(() => ({
    VirtualScroll: (props: Omit<VirtualScrollProps<T>, 'items' | 'itemHeight' | 'containerHeight'>) => (
      <VirtualScroll
        items={items}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        {...props}
      />
    ),
    VariableVirtualScroll: (props: Omit<VariableVirtualScrollProps<T>, 'items' | 'estimatedItemHeight' | 'containerHeight'>) => (
      <VariableVirtualScroll
        items={items}
        estimatedItemHeight={itemHeight}
        containerHeight={containerHeight}
        {...props}
      />
    )
  }), [items, itemHeight, containerHeight]);
}