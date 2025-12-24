import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Image, 
  Type, 
  ChevronUp, 
  ChevronDown,
  GripVertical
} from 'lucide-react';
import { Node, LeafNode, SplitNode } from '@/types/nodes';
import { cn } from '@/lib/utils';

interface LayerState {
  id: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

interface LayersPanelProps {
  page: SplitNode;
  selectedId: string;
  onSelectNode: (id: string) => void;
  layerStates: Record<string, LayerState>;
  onUpdateLayerState: (id: string, state: Partial<LayerState>) => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
}

// Recursively collect all leaf nodes from the tree
const collectLeafNodes = (node: Node, leaves: LeafNode[] = []): LeafNode[] => {
  if (node.kind === 'leaf') {
    leaves.push(node);
  } else {
    node.children.forEach(child => collectLeafNodes(child, leaves));
  }
  return leaves;
};

const LayerRow = ({ 
  leaf, 
  index,
  isSelected,
  state,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onOpacityChange,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: {
  leaf: LeafNode;
  index: number;
  isSelected: boolean;
  state: LayerState;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onOpacityChange: (value: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const [showOpacity, setShowOpacity] = useState(false);
  
  const layerName = leaf.contentType === 'image' 
    ? (leaf.imageProps.url ? 'Image Layer' : 'Empty Image')
    : (leaf.textProps.text?.slice(0, 20) || 'Text Layer');

  const LayerIcon = leaf.contentType === 'image' ? Image : Type;

  return (
    <div 
      className={cn(
        "group flex flex-col gap-1 p-2 rounded-lg border transition-all",
        isSelected 
          ? "bg-primary/10 border-primary" 
          : "bg-card border-border hover:bg-muted/50",
        !state.visible && "opacity-50"
      )}
    >
      <div className="flex items-center gap-2">
        {/* Drag Handle */}
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        
        {/* Layer Icon & Name */}
        <button 
          onClick={onSelect}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <LayerIcon className={cn(
            "h-4 w-4 shrink-0",
            isSelected ? "text-primary" : "text-muted-foreground"
          )} />
          <span className="text-sm truncate">
            {layerName}
          </span>
        </button>

        {/* Visibility Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7"
              onClick={onToggleVisibility}
            >
              {state.visible ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{state.visible ? 'Hide' : 'Show'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Lock Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7"
              onClick={onToggleLock}
            >
              {state.locked ? (
                <Lock className="h-3.5 w-3.5 text-destructive" />
              ) : (
                <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{state.locked ? 'Unlock' : 'Lock'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Reorder Buttons */}
        <div className="flex flex-col">
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-5 w-5 p-0"
            onClick={onMoveUp}
            disabled={isFirst}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-5 w-5 p-0"
            onClick={onMoveDown}
            disabled={isLast}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Opacity Slider (expandable) */}
      <div className="flex items-center gap-2 pl-6">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={() => setShowOpacity(!showOpacity)}
        >
          Opacity: {Math.round(state.opacity * 100)}%
        </Button>
        
        {showOpacity && (
          <Slider
            value={[state.opacity * 100]}
            onValueChange={([v]) => onOpacityChange(v / 100)}
            min={0}
            max={100}
            step={1}
            className="flex-1"
          />
        )}
      </div>
    </div>
  );
};

export const LayersPanel = ({
  page,
  selectedId,
  onSelectNode,
  layerStates,
  onUpdateLayerState,
  onReorderLayers
}: LayersPanelProps) => {
  const [open, setOpen] = useState(false);
  
  const leaves = collectLeafNodes(page);

  const getLayerState = (id: string): LayerState => {
    return layerStates[id] || { id, visible: true, locked: false, opacity: 1 };
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" className="h-9 w-9">
              <Layers className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Layers</p>
          </TooltipContent>
        </Tooltip>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Layers
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {leaves.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No layers on this page
              </p>
            ) : (
              leaves.map((leaf, index) => {
                const state = getLayerState(leaf.id);
                return (
                  <LayerRow
                    key={leaf.id}
                    leaf={leaf}
                    index={index}
                    isSelected={selectedId === leaf.id}
                    state={state}
                    onSelect={() => onSelectNode(leaf.id)}
                    onToggleVisibility={() => 
                      onUpdateLayerState(leaf.id, { visible: !state.visible })
                    }
                    onToggleLock={() => 
                      onUpdateLayerState(leaf.id, { locked: !state.locked })
                    }
                    onOpacityChange={(opacity) => 
                      onUpdateLayerState(leaf.id, { opacity })
                    }
                    onMoveUp={() => onReorderLayers(index, index - 1)}
                    onMoveDown={() => onReorderLayers(index, index + 1)}
                    isFirst={index === 0}
                    isLast={index === leaves.length - 1}
                  />
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-2 border-t text-xs text-muted-foreground">
          <span>{leaves.length} layer{leaves.length !== 1 ? 's' : ''}</span>
          <span>Click layer to select on canvas</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};