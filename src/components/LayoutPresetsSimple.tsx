import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Square, 
  Columns2, 
  Columns3, 
  Rows2, 
  Rows3, 
  Grid2X2,
  LayoutPanelTop,
  LayoutPanelLeft,
  PanelTop,
  PanelLeft,
  GalleryHorizontal,
  RotateCw,
  ChevronDown
} from 'lucide-react';
import { SplitNode } from '@/types/nodes';
import { PRESETS } from '@/constants/pagePresets';

interface LayoutPresetsSimpleProps {
  onApplyPreset: (preset: SplitNode) => void;
}

// Fi Split custom icon
const FiSplitIcon = ({ rotation = 0 }: { rotation?: number }) => (
  <svg 
    viewBox="0 0 24 24" 
    className="h-4 w-4" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    style={{ transform: `rotate(${rotation}deg)` }}
  >
    <rect x="3" y="3" width="18" height="7" rx="1" />
    <rect x="3" y="12" width="12" height="9" rx="1" />
    <rect x="17" y="12" width="4" height="9" rx="1" />
  </svg>
);

// L-Shape custom icon  
const LShapeIcon = ({ rotation = 0 }: { rotation?: number }) => (
  <svg 
    viewBox="0 0 24 24" 
    className="h-4 w-4" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    style={{ transform: `rotate(${rotation}deg)` }}
  >
    <rect x="3" y="3" width="12" height="18" rx="1" />
    <rect x="17" y="3" width="4" height="8" rx="1" />
    <rect x="17" y="13" width="4" height="8" rx="1" />
  </svg>
);

// Strip icon (horizontal)
const StripIcon = ({ rotation = 0 }: { rotation?: number }) => (
  <svg 
    viewBox="0 0 24 24" 
    className="h-4 w-4" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    style={{ transform: `rotate(${rotation}deg)` }}
  >
    <rect x="3" y="3" width="18" height="3" rx="0.5" />
    <rect x="3" y="7.5" width="18" height="3" rx="0.5" />
    <rect x="3" y="12" width="18" height="3" rx="0.5" />
    <rect x="3" y="16.5" width="18" height="3" rx="0.5" />
    <rect x="3" y="21" width="18" height="0" rx="0.5" />
  </svg>
);

interface PresetConfig {
  icon: React.ElementType | ((props: { rotation?: number }) => JSX.Element);
  label: string;
  rotatable?: boolean;
}

// Map preset names to icons and short labels
// Note: "horizontal" direction = stacked vertically (rows), "vertical" direction = side by side (columns)
const PRESET_CONFIG: Record<string, PresetConfig> = {
  // Basic - FIXED: columns are side by side, rows are stacked
  'Single Panel': { icon: Square, label: '1×1' },
  'Two Columns': { icon: Rows2, label: '1×2' },      // Side by side = Rows icon rotated (horizontal bars)
  'Three Columns': { icon: Rows3, label: '1×3' },   
  'Two Rows': { icon: Columns2, label: '2×1' },     // Stacked = Columns icon (vertical bars)
  'Three Rows': { icon: Columns3, label: '3×1' },   
  'Two by Two': { icon: Grid2X2, label: '2×2' },
  
  // Comic
  'Hero Splash': { icon: Square, label: 'Hero' },
  'Classic 6-Panel': { icon: GalleryHorizontal, label: '6-Grid' },
  'L-Shape Layout': { icon: LShapeIcon, label: 'L-Shape', rotatable: true },
  'Vertical Strip': { icon: StripIcon, label: 'Strip', rotatable: true },
  'Fi Split': { icon: FiSplitIcon, label: 'Fi', rotatable: true },
  'Focus Panel': { icon: LayoutPanelTop, label: 'Focus' },
  
  // Magazine
  'Article Layout': { icon: PanelLeft, label: 'Article' },
  'Feature Spread': { icon: PanelTop, label: 'Feature' },
  'Sidebar Layout': { icon: LayoutPanelLeft, label: 'Sidebar' },
  'Grid Gallery': { icon: Grid2X2, label: 'Gallery' },
};

// Function to rotate a preset structure
const rotatePreset = (preset: SplitNode, times: number): SplitNode => {
  if (times === 0) return preset;
  
  const rotateOnce = (node: SplitNode): SplitNode => {
    const rotated: SplitNode = {
      ...node,
      direction: node.direction === 'horizontal' ? 'vertical' : 'horizontal',
      children: node.children.map(child => 
        child.kind === 'split' ? rotateOnce(child) : child
      )
    };
    return rotated;
  };
  
  let result = preset;
  for (let i = 0; i < times; i++) {
    result = rotateOnce(result);
  }
  return result;
};

export const LayoutPresetsSimple: React.FC<LayoutPresetsSimpleProps> = ({ onApplyPreset }) => {
  const [rotations, setRotations] = useState<Record<string, number>>({});
  
  const getRotation = (name: string) => rotations[name] || 0;
  
  const cycleRotation = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRotations(prev => ({
      ...prev,
      [name]: ((prev[name] || 0) + 90) % 360
    }));
  };
  
  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    const config = PRESET_CONFIG[preset.name];
    const rotation = getRotation(preset.name);
    const times = rotation / 90;
    const rotatedPreset = times > 0 ? rotatePreset(preset.root, times) : preset.root;
    onApplyPreset(rotatedPreset);
  };

  const renderPresetButton = (preset: typeof PRESETS[0]) => {
    const config: PresetConfig = PRESET_CONFIG[preset.name] || { icon: Square, label: preset.name.slice(0, 6) };
    const Icon = config.icon;
    const rotation = getRotation(preset.name);
    const isCustomIcon = typeof Icon === 'function' && Icon.length > 0;
    const isRotatable = 'rotatable' in config && config.rotatable;
    
    return (
      <div key={preset.name} className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => handleApplyPreset(preset)}
              variant="outline"
              size="sm"
              className="h-12 w-full flex flex-col items-center justify-center gap-0.5 p-1"
            >
              {isCustomIcon ? (
                <Icon rotation={rotation} />
              ) : (
                <Icon className="h-4 w-4" style={{ transform: isRotatable ? `rotate(${rotation}deg)` : undefined }} />
              )}
              <span className="text-[10px] font-medium">{config.label}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{preset.name}</p>
          </TooltipContent>
        </Tooltip>
        
        {isRotatable && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-muted hover:bg-accent"
            onClick={(e) => cycleRotation(preset.name, e)}
          >
            <RotateCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-3">Layout Presets</h4>
      <Tabs defaultValue="Basic" className="space-y-2">
        <TabsList className="grid w-full grid-cols-3 text-xs">
          <TabsTrigger value="Basic">Basic</TabsTrigger>
          <TabsTrigger value="Comic">Comic</TabsTrigger>
          <TabsTrigger value="Magazine">Mag</TabsTrigger>
        </TabsList>
        
        {['Basic', 'Comic', 'Magazine'].map(category => (
          <TabsContent key={category} value={category} className="mt-2">
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.filter(preset => preset.category === category).map(preset => 
                renderPresetButton(preset)
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
