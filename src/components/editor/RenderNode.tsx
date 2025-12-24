import React from 'react';
import { Node } from '@/types/nodes';
import { LeafView } from './LeafView';
import { SplitView } from './SplitView';

interface RenderNodeProps {
  node: Node;
  gutter: number;
  outline: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  onResize: (id: string, index: number, delta: number) => void;
}

export const RenderNode: React.FC<RenderNodeProps> = ({ node, gutter, outline, selectedId, onSelect, onResize }) => {
  if (node.kind === "split") {
    return <SplitView node={node} gutter={gutter} outline={outline} selectedId={selectedId} onSelect={onSelect} onResize={onResize} />;
  } else {
    return <LeafView node={node} outline={outline} isSelected={selectedId === node.id} onSelect={onSelect} />;
  }
};
