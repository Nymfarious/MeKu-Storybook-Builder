import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Square, 
  Columns2, 
  Columns3, 
  Rows2, 
  Rows3, 
  Grid2X2,
  LayoutPanelTop,
  LayoutPanelLeft,
  Layers,
  PanelTop,
  PanelLeft,
  GalleryHorizontal
} from 'lucide-react';
import { SplitNode } from '@/types/nodes';
import { PRESETS } from '@/constants/pagePresets';

interface LayoutPresetsSimpleProps {
  onApplyPreset: (preset: SplitNode) => void;
}

// Map preset names to icons and short labels
const PRESET_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  // Basic
  'Single Panel': { icon: Square, label: '1×1' },
  'Two Columns': { icon: Columns2, label: '2×1' },
  'Three Columns': { icon: Columns3, label: '3×1' },
  'Two Rows': { icon: Rows2, label: '1×2' },
  'Three Rows': { icon: Rows3, label: '1×3' },
  'Two by Two': { icon: Grid2X2, label: '2×2' },
  
  // Comic
  'Hero Splash': { icon: Square, label: 'Hero' },
  'Classic 6-Panel': { icon: GalleryHorizontal, label: '6-Grid' },
  'L-Shape Layout': { icon: LayoutPanelLeft, label: 'L-Shape' },
  'Vertical Strip': { icon: Rows3, label: 'Strip' },
  'Diagonal Split': { icon: Layers, label: 'Diagonal' },
  'Focus Panel': { icon: LayoutPanelTop, label: 'Focus' },
  
  // Magazine
  'Article Layout': { icon: PanelLeft, label: 'Article' },
  'Feature Spread': { icon: PanelTop, label: 'Feature' },
  'Sidebar Layout': { icon: LayoutPanelLeft, label: 'Sidebar' },
  'Grid Gallery': { icon: Grid2X2, label: 'Gallery' },
};

export const LayoutPresetsSimple: React.FC<LayoutPresetsSimpleProps> = ({ onApplyPreset }) => {
  const renderPresetButton = (preset: typeof PRESETS[0]) => {
    const config = PRESET_CONFIG[preset.name] || { icon: Square, label: preset.name.slice(0, 6) };
    const Icon = config.icon;
    
    return (
      <Tooltip key={preset.name}>
        <TooltipTrigger asChild>
          <Button
            onClick={() => onApplyPreset(preset.root)}
            variant="outline"
            size="sm"
            className="h-10 flex-1 min-w-[70px] flex flex-col items-center justify-center gap-0.5 p-1"
          >
            <Icon className="h-4 w-4" />
            <span className="text-[10px] font-medium">{config.label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{preset.name}</p>
        </TooltipContent>
      </Tooltip>
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
