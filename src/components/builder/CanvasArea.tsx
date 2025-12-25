import React, { forwardRef } from 'react';
import { RenderNode } from '@/components/editor';
import { SplitNode } from '@/types/nodes';
import { GridSettings } from '@/components/GridSettingsPanel';

interface CanvasAreaProps {
  currentLeft: SplitNode | undefined;
  currentRight: SplitNode | undefined;
  spreadIndex: number;
  selectedPage: number;
  selectedId: string;
  zoom: number;
  gutter: number;
  outline: boolean;
  pageWidth: number;
  pageHeight: number;
  pageBg: string;
  pageRadius: number;
  pageGap: number;
  gridSettings: GridSettings;
  onZoomChange: (zoom: number) => void;
  onSelectPage: (index: number) => void;
  onSelectId: (id: string) => void;
  onResize: (pageIndex: number, id: string, index: number, delta: number) => void;
}

export const CanvasArea = forwardRef<HTMLDivElement, CanvasAreaProps>(({
  currentLeft,
  currentRight,
  spreadIndex,
  selectedPage,
  selectedId,
  zoom,
  gutter,
  outline,
  pageWidth,
  pageHeight,
  pageBg,
  pageRadius,
  pageGap,
  gridSettings,
  onZoomChange,
  onSelectPage,
  onSelectId,
  onResize
}, pageRef) => {
  return (
    <div 
      className="h-full overflow-auto relative flex items-center justify-center" 
      style={{ 
        background: `
          radial-gradient(circle at 50% 50%, rgba(251, 146, 60, 0.03) 0%, transparent 50%),
          linear-gradient(to bottom, #0f0f0f 0%, #1a1a1a 100%)
        `,
        backgroundAttachment: 'fixed'
      }}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? 0.9 : 1.1;
          onZoomChange(Math.min(2, Math.max(0.1, zoom * delta)));
        }
      }}
    >
      <div 
        className="flex items-stretch shadow-2xl" 
        style={{ 
          gap: `${pageGap}px`,
          transform: `scale(${zoom})`,
          transformOrigin: "center"
        }}
      >
        {[currentLeft, currentRight].filter(Boolean).map((pageRoot, idx) => (
          <div 
            key={idx} 
            ref={selectedPage === (spreadIndex + idx) ? pageRef as React.RefObject<HTMLDivElement> : undefined}
            className="relative" 
            style={{ 
              width: pageWidth, 
              height: pageHeight, 
              background: pageBg, 
              borderRadius: pageRadius 
            }}
            onClick={() => onSelectPage(spreadIndex + idx)}
          >
            <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: pageRadius }}>
              <RenderNode
                node={pageRoot as SplitNode}
                gutter={gutter}
                outline={outline}
                selectedId={selectedPage === (spreadIndex + idx) ? selectedId : ""}
                onSelect={(id) => { onSelectPage(spreadIndex + idx); onSelectId(id); }}
                onResize={(id, index, delta) => onResize(spreadIndex + idx, id, index, delta)}
              />
              {/* Grid Overlay */}
              {gridSettings.show && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `
                      linear-gradient(${gridSettings.color}${Math.round(gridSettings.opacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px),
                      linear-gradient(90deg, ${gridSettings.color}${Math.round(gridSettings.opacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px)
                    `,
                    backgroundSize: `${gridSettings.size}px ${gridSettings.size}px`,
                    borderRadius: pageRadius
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

CanvasArea.displayName = 'CanvasArea';
