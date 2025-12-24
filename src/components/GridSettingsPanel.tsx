import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Grid3X3 } from 'lucide-react';

export interface GridSettings {
  show: boolean;
  size: number;
  color: string;
  opacity: number;
  snap: boolean;
}

interface GridSettingsPanelProps {
  settings: GridSettings;
  onSettingsChange: (settings: GridSettings) => void;
}

export const GridSettingsPanel = ({ settings, onSettingsChange }: GridSettingsPanelProps) => {
  const [open, setOpen] = useState(false);

  const updateSetting = <K extends keyof GridSettings>(key: K, value: GridSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" className="h-9 w-9">
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Grid Settings</p>
          </TooltipContent>
        </Tooltip>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Grid Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Show Grid Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="show-grid">Show Grid</Label>
            <Switch
              id="show-grid"
              checked={settings.show}
              onCheckedChange={(checked) => updateSetting('show', checked)}
            />
          </div>

          {/* Grid Size */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Grid Size</Label>
              <span className="text-sm text-muted-foreground">{settings.size}px</span>
            </div>
            <Slider
              value={[settings.size]}
              onValueChange={([v]) => updateSetting('size', v)}
              min={10}
              max={100}
              step={5}
              disabled={!settings.show}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10px</span>
              <span>100px</span>
            </div>
          </div>

          {/* Grid Color */}
          <div className="space-y-3">
            <Label>Grid Color</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={settings.color}
                onChange={(e) => updateSetting('color', e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
                disabled={!settings.show}
              />
              <Input
                type="text"
                value={settings.color}
                onChange={(e) => updateSetting('color', e.target.value)}
                className="flex-1"
                placeholder="#000000"
                disabled={!settings.show}
              />
            </div>
          </div>

          {/* Grid Opacity */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Grid Opacity</Label>
              <span className="text-sm text-muted-foreground">{Math.round(settings.opacity * 100)}%</span>
            </div>
            <Slider
              value={[settings.opacity * 100]}
              onValueChange={([v]) => updateSetting('opacity', v / 100)}
              min={5}
              max={100}
              step={5}
              disabled={!settings.show}
            />
          </div>

          {/* Snap to Grid Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="snap-grid">Snap to Grid</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Elements will align to grid lines
              </p>
            </div>
            <Switch
              id="snap-grid"
              checked={settings.snap}
              onCheckedChange={(checked) => updateSetting('snap', checked)}
              disabled={!settings.show}
            />
          </div>

          {/* Preview */}
          {settings.show && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div 
                className="h-24 rounded-lg border relative overflow-hidden"
                style={{ backgroundColor: '#f5f5f5' }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `
                      linear-gradient(${settings.color}${Math.round(settings.opacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px),
                      linear-gradient(90deg, ${settings.color}${Math.round(settings.opacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px)
                    `,
                    backgroundSize: `${settings.size}px ${settings.size}px`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};