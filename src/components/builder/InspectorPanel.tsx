import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { EnhancedLeafInspector } from '@/components/EnhancedLeafInspector';
import { SplitInspector } from '@/components/editor';
import { Node, SplitNode, LeafNode } from '@/types/nodes';
import { Character } from '@/types';

interface InspectorPanelProps {
  selectedPage: number;
  selectedNode: Node | null;
  characters: Character[];
  isGenerating: boolean;
  
  // AI generation props
  aiPrompt: string;
  setAiPrompt: (value: string) => void;
  manualImageUrl: string;
  setManualImageUrl: (value: string) => void;
  negativePrompt: string;
  setNegativePrompt: (value: string) => void;
  referenceImageUrl: string;
  setReferenceImageUrl: (value: string) => void;
  referenceImages: string[];
  setReferenceImages: (value: string[]) => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  seed: number | null;
  setSeed: (value: number | null) => void;
  guidanceScale: number;
  setGuidanceScale: (value: number) => void;
  inferenceSteps: number;
  setInferenceSteps: (value: number) => void;
  imageStrength: number;
  setImageStrength: (value: number) => void;
  outputFormat: string;
  setOutputFormat: (value: string) => void;
  safetyTolerance: number;
  setSafetyTolerance: (value: number) => void;
  promptUpsampling: boolean;
  setPromptUpsampling: (value: boolean) => void;
  
  // Callbacks
  onNodeChange: (updater: (node: Node) => Node) => void;
  onGenerateText: () => void;
  onGenerateImage: (characterId?: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedPage,
  selectedNode,
  characters,
  isGenerating,
  aiPrompt,
  setAiPrompt,
  manualImageUrl,
  setManualImageUrl,
  negativePrompt,
  setNegativePrompt,
  referenceImageUrl,
  setReferenceImageUrl,
  referenceImages,
  setReferenceImages,
  aspectRatio,
  setAspectRatio,
  seed,
  setSeed,
  guidanceScale,
  setGuidanceScale,
  inferenceSteps,
  setInferenceSteps,
  imageStrength,
  setImageStrength,
  outputFormat,
  setOutputFormat,
  safetyTolerance,
  setSafetyTolerance,
  promptUpsampling,
  setPromptUpsampling,
  onNodeChange,
  onGenerateText,
  onGenerateImage
}) => {
  return (
    <div className="h-full border-l border-border bg-card shadow-card flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Inspector
            </h3>
            <p className="text-xs text-muted-foreground">
              Editing page {selectedPage + 1}
              {selectedNode && (
                <span className="block mt-1">
                  Segment: <code className="text-muted-foreground">{selectedNode.id.slice(0, 8)}...</code>
                </span>
              )}
            </p>
          </div>
          
          {!selectedNode && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Click a segment to edit its properties
                </p>
              </CardContent>
            </Card>
          )}
          
          {selectedNode && selectedNode.kind === "leaf" && (
            <EnhancedLeafInspector 
              node={selectedNode as LeafNode} 
              onChange={onNodeChange}
              onGenerateText={onGenerateText}
              aiPrompt={aiPrompt}
              setAiPrompt={setAiPrompt}
              characters={characters}
              onGenerateImage={onGenerateImage}
              isGenerating={isGenerating}
              manualImageUrl={manualImageUrl}
              setManualImageUrl={setManualImageUrl}
              negativePrompt={negativePrompt}
              setNegativePrompt={setNegativePrompt}
              referenceImageUrl={referenceImageUrl}
              setReferenceImageUrl={setReferenceImageUrl}
              referenceImages={referenceImages}
              setReferenceImages={setReferenceImages}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              seed={seed}
              setSeed={setSeed}
              guidanceScale={guidanceScale}
              setGuidanceScale={setGuidanceScale}
              inferenceSteps={inferenceSteps}
              setInferenceSteps={setInferenceSteps}
              imageStrength={imageStrength}
              setImageStrength={setImageStrength}
              outputFormat={outputFormat}
              setOutputFormat={setOutputFormat}
              safetyTolerance={safetyTolerance}
              setSafetyTolerance={setSafetyTolerance}
              promptUpsampling={promptUpsampling}
              setPromptUpsampling={setPromptUpsampling}
            />
          )}
          
          {selectedNode && selectedNode.kind === "split" && (
            <SplitInspector 
              node={selectedNode as SplitNode} 
              onChange={onNodeChange} 
            />
          )}
        </div>
      </div>
    </div>
  );
};
