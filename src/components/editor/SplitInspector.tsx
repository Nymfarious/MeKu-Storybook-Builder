import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Node, SplitNode } from '@/types/nodes';

interface SplitInspectorProps {
  node: SplitNode;
  onChange: (updater: (node: Node) => Node) => void;
}

export const SplitInspector: React.FC<SplitInspectorProps> = ({ node, onChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Layout Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Direction</Label>
          <Select
            value={node.direction}
            onValueChange={(value: "horizontal" | "vertical") => 
              onChange(n => ({ ...n, direction: value } as SplitNode))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="horizontal">Horizontal</SelectItem>
              <SelectItem value="vertical">Vertical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="text-sm font-medium mb-2 block">Child Sizes</Label>
          <div className="space-y-2">
            {node.sizes.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs w-16">Child {i + 1}:</span>
                <Slider
                  value={[s]}
                  onValueChange={([value]) => {
                    let val = Math.min(0.95, Math.max(0.05, value)); 
                    const rest = Math.max(0.05, 1 - val); 
                    const factor = rest / (1 - node.sizes[i]); 
                    const newSizes = node.sizes.map((v, idx) => idx === i ? val : Math.max(0.05, v * factor)); 
                    onChange(n => ({ ...n, sizes: newSizes } as SplitNode)); 
                  }}
                  min={0.05}
                  max={0.95}
                  step={0.01}
                  className="flex-1"
                />
                <span className="text-xs tabular-nums w-12 text-right">
                  {(s * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
