import React from 'react';
import { Node, SplitNode } from '@/types/nodes';
import { RenderNode } from './RenderNode';

interface SplitViewProps {
  node: SplitNode;
  gutter: number;
  outline: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  onResize: (id: string, index: number, delta: number) => void;
}

export const SplitView: React.FC<SplitViewProps> = ({ node, gutter, outline, selectedId, onSelect, onResize }) => {
  const isHorizontal = node.direction === "horizontal";
  
  return (
    <div 
      className={`flex ${isHorizontal ? 'flex-col' : 'flex-row'} h-full w-full`}
      style={{ gap: gutter }}
    >
      {node.children.map((child, index) => (
        <div 
          key={child.id}
          className="relative"
          style={{
            [isHorizontal ? 'height' : 'width']: `${node.sizes[index] * 100}%`,
            minHeight: isHorizontal ? '20px' : undefined,
            minWidth: !isHorizontal ? '20px' : undefined,
          }}
        >
          <RenderNode
            node={child}
            gutter={gutter}
            outline={outline}
            selectedId={selectedId}
            onSelect={onSelect}
            onResize={onResize}
          />
        </div>
      ))}
    </div>
  );
};
