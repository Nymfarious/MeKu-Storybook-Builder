import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Eye, 
  EyeOff, 
  Pencil, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ListOrdered
} from 'lucide-react';
import { SplitNode } from '@/types/nodes';

interface PageInfo {
  id: string;
  name: string;
  hidden: boolean;
}

interface PageThumbnailTrayProps {
  pages: SplitNode[];
  pageInfos: PageInfo[];
  selectedPage: number;
  orientation?: 'portrait' | 'landscape';
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDeletePage: (index: number) => void;
  onDuplicatePage: (index: number) => void;
  onRenamePage: (index: number, name: string) => void;
  onToggleHidden: (index: number) => void;
  onBulkRename: (startNumber: number) => void;
}

export const PageThumbnailTray: React.FC<PageThumbnailTrayProps> = ({
  pages,
  pageInfos,
  selectedPage,
  orientation = 'portrait',
  onSelectPage,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
  onRenamePage,
  onToggleHidden,
  onBulkRename
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [showBulkRename, setShowBulkRename] = useState(false);
  const [bulkStartNumber, setBulkStartNumber] = useState(1);

  // Thumbnail aspect ratio based on orientation
  const aspectRatio = orientation === 'portrait' ? '0.707' : '1.414';
  const thumbWidth = orientation === 'portrait' ? 'w-14' : 'w-20';

  const handleStartRename = (index: number) => {
    setEditingIndex(index);
    setEditName(pageInfos[index]?.name || `Page ${index + 1}`);
  };

  const handleFinishRename = () => {
    if (editingIndex !== null && editName.trim()) {
      onRenamePage(editingIndex, editName.trim());
    }
    setEditingIndex(null);
    setEditName('');
  };

  const handleBulkRename = () => {
    onBulkRename(bulkStartNumber);
    setShowBulkRename(false);
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const renderStructurePreview = (node: SplitNode | { kind: 'leaf' }): React.ReactNode => {
    if (node.kind === 'leaf') {
      return <div className="flex-1 border border-muted-foreground/30 rounded-sm" />;
    }

    const splitNode = node as SplitNode;
    const isHorizontal = splitNode.direction === 'horizontal';
    
    return (
      <div className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} gap-px flex-1`}>
        {splitNode.children.map((child, i) => (
          <div 
            key={i} 
            className="flex-1 min-w-0 min-h-0"
            style={{ flex: splitNode.sizes[i] }}
          >
            {child.kind === 'leaf' ? (
              <div className="w-full h-full border border-muted-foreground/30 rounded-sm" />
            ) : (
              renderStructurePreview(child as SplitNode)
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderPagePreview = (page: SplitNode, index: number) => {
    const pageInfo = pageInfos[index];
    const isHidden = pageInfo?.hidden || false;
    const pageName = pageInfo?.name || `Page ${index + 1}`;

    return (
      <ContextMenu key={index}>
        <ContextMenuTrigger>
          <div
            className={`relative flex-shrink-0 cursor-pointer transition-all group ${
              selectedPage === index 
                ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                : 'hover:ring-1 hover:ring-border'
            } ${isHidden ? 'opacity-50' : ''}`}
            onClick={() => onSelectPage(index)}
          >
            {/* Thumbnail */}
            <div 
              className={`${thumbWidth} rounded border border-border bg-card flex items-center justify-center relative overflow-hidden`}
              style={{ aspectRatio }}
            >
              {/* Outline preview of page structure */}
              <div className="absolute inset-1 flex flex-col gap-0.5">
                {renderStructurePreview(page)}
              </div>
              
              {/* Page number badge */}
              <div className="absolute bottom-0.5 right-0.5 text-[9px] font-mono text-muted-foreground bg-background/80 px-0.5 rounded">
                #{index + 1}
              </div>
              
              {/* Hidden indicator */}
              {isHidden && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
            
            {/* Page name */}
            {editingIndex === index ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                className={`${thumbWidth} h-4 text-[9px] mt-1 px-1`}
                autoFocus
              />
            ) : (
              <p className={`text-[9px] text-center text-muted-foreground mt-1 truncate ${thumbWidth}`}>
                {pageName}
              </p>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => handleStartRename(index)}>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onDuplicatePage(index)}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onToggleHidden(index)}>
            {isHidden ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Show
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hide
              </>
            )}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={() => onDeletePage(index)}
            className="text-destructive"
            disabled={pages.length <= 1}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <>
      <div className="border-t border-border bg-card/50 p-2">
        <div className="flex items-center gap-2">
          {/* Scroll left button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 flex-shrink-0"
            onClick={scrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Scrollable thumbnail area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-x-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`.page-tray-scroll::-webkit-scrollbar { display: none; }`}</style>
            <div className="flex gap-2 py-1 px-1 page-tray-scroll">
              {pages.map((page, index) => renderPagePreview(page, index))}
              
              {/* Add new page button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className={`${thumbWidth} flex-shrink-0 border-dashed`}
                    style={{ aspectRatio }}
                    onClick={onAddPage}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add new page</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Scroll right button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 flex-shrink-0"
            onClick={scrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Bulk rename button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 flex-shrink-0"
                onClick={() => setShowBulkRename(true)}
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bulk rename pages</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Bulk Rename Dialog */}
      <Dialog open={showBulkRename} onOpenChange={setShowBulkRename}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Rename Pages</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Rename all pages consecutively starting from a number.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm">Start from:</span>
              <Input
                type="number"
                value={bulkStartNumber}
                onChange={(e) => setBulkStartNumber(parseInt(e.target.value) || 1)}
                className="w-20"
                min={1}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Pages will be named: Page {bulkStartNumber}, Page {bulkStartNumber + 1}, Page {bulkStartNumber + 2}, ...
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkRename(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkRename}>
              Rename All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
