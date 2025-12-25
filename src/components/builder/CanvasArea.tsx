import React, { forwardRef } from 'react';
import { RenderNode } from '@/components/editor';
import { SplitNode } from '@/types/nodes';
import { GridSettings } from '@/components/GridSettingsPanel';

interface CanvasAreaProps {
  currentPage: SplitNode | undefined;
  selectedPage: number;
  selectedId: string;
  zoom: number;
  gutter: number;
  outline: boolean;
  pageWidth: number;
  pageHeight: number;
  pageBg: string;
  pageRadius: number;
  gridSettings: GridSettings;
  onZoomChange: (zoom: number) => void;
  onSelectPage: (index: number) => void;
  onSelectId: (id: string) => void;
  onResize: (pageIndex: number, id: string, index: number, delta: number) => void;
}

export const CanvasArea = forwardRef<HTMLDivElement, CanvasAreaProps>(({
  currentPage,
  selectedPage,
  selectedId,
  zoom,
  gutter,
  outline,
  pageWidth,
  pageHeight,
  pageBg,
  pageRadius,
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
          linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)
        `,
        backgroundAttachment: 'fixed',
        scrollbarWidth: 'thin',
        scrollbarColor: 'hsl(var(--muted-foreground) / 0.3) transparent'
      }}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? 0.9 : 1.1;
          onZoomChange(Math.min(2, Math.max(0.1, zoom * delta)));
        }
      }}
    >
      {/* Workspace boundary outline */}
      <div 
        className="relative p-12"
        style={{
          minWidth: 'fit-content',
          minHeight: 'fit-content'
        }}
      >
        {/* Workspace border */}
        <div 
          className="absolute inset-4 border-2 border-dashed border-muted-foreground/20 rounded-xl pointer-events-none"
          style={{ zIndex: 0 }}
        />
        
        {/* Page container */}
        {currentPage && (
          <div 
            className="relative shadow-2xl" 
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: "center",
              zIndex: 1
            }}
          >
            <div 
              ref={pageRef as React.RefObject<HTMLDivElement>}
              className="relative shadow-lg" 
              style={{ 
                width: pageWidth, 
                height: pageHeight, 
                background: pageBg, 
                borderRadius: pageRadius 
              }}
              onClick={() => onSelectPage(selectedPage)}
            >
              <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: pageRadius }}>
                <RenderNode
                  node={currentPage}
                  gutter={gutter}
                  outline={outline}
                  selectedId={selectedId}
                  onSelect={(id) => { onSelectId(id); }}
                  onResize={(id, idx, delta) => onResize(selectedPage, id, idx, delta)}
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
          </div>
        )}
      </div>
    </div>
  );
});

CanvasArea.displayName = 'CanvasArea';
