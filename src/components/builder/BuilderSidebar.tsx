import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CharacterManager } from '@/components/CharacterManager';
import { Gallery } from '@/components/Gallery';
import { ImageHistory } from '@/components/ImageHistory';
import { CloudProjectManager } from '@/components/CloudProjectManager';
import UserMenu from '@/components/UserMenu';
import { SavePageModal } from '@/components/SavePageModal';
import { ExportPanel } from '@/components/ExportPanel';
import { LayersPanel } from '@/components/LayersPanel';
import { GridSettingsPanel, GridSettings } from '@/components/GridSettingsPanel';
import { RecentProjectsPanel, RecentProject } from '@/components/RecentProjectsPanel';
import { LayoutPresetsSimple } from '@/components/LayoutPresetsSimple';
import { PanelOperationsMenu } from '@/components/PanelOperationsMenu';
import { TextFormattingModal } from '@/components/TextFormattingModal';
import { PAGE_SIZES, PageSizeKey } from '@/constants/pagePresets';
import { Character, GeneratedImage, SavedPage } from '@/types';
import { Node, SplitNode } from '@/types/nodes';
import { 
  LayoutGrid, 
  Plus, 
  Undo, 
  Redo, 
  ZoomIn, 
  ZoomOut, 
  Copy,
  Trash2,
  Monitor,
  Users,
  History,
  Images
} from 'lucide-react';

interface BuilderSidebarProps {
  // Pages
  pages: SplitNode[];
  selectedPage: number;
  zoom: number;
  outline: boolean;
  
  // History
  historyIndex: number;
  historyLength: number;
  
  // Settings
  globalSettings: {
    gutter: number;
    background: string;
    pageSize: PageSizeKey;
    orientation: 'portrait' | 'landscape';
  };
  gridSettings: GridSettings;
  
  // Data
  characters: Character[];
  generatedImages: GeneratedImage[];
  savedPages: SavedPage[];
  recentProjects: RecentProject[];
  lastSaved: Date | null;
  
  // Selected node
  selectedNode: Node | null;
  parentNode: SplitNode | null;
  selectedId: string;
  layerStates: Record<string, { id: string; visible: boolean; locked: boolean; opacity: number }>;
  
  // Refs
  pageRef: React.RefObject<HTMLDivElement>;
  
  // Actions
  onAddPage: () => void;
  onDeletePage: (index: number) => void;
  onDuplicatePage: (index: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onFitToViewport: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onOutlineChange: (value: boolean) => void;
  onSettingsChange: (settings: BuilderSidebarProps['globalSettings']) => void;
  onGridSettingsChange: (settings: GridSettings) => void;
  onApplyPreset: (preset: SplitNode) => void;
  onAddCharacter: (data: Omit<Character, 'id' | 'createdAt'>) => void;
  onDeleteCharacter: (id: string) => void;
  onSavePage: (pageInfo: { title: string; description: string; imageUrl: string; pageData: any; id?: string }) => void;
  onSelectNode: (id: string) => void;
  onUpdateLayerState: (id: string, updates: Partial<{ visible: boolean; locked: boolean; opacity: number }>) => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
  onLoadRecentProject: (id: string) => void;
  onDeleteRecentProject: (id: string) => void;
  onLoadCloudProject: (data: any) => void;
  
  // Panel operations
  onSplitPanel: (direction: 'horizontal' | 'vertical', count: number) => void;
  onMergePanel: () => void;
  onDeletePanel: () => void;
  onDuplicatePanel: () => void;
  onTextPropsChange: (updates: Record<string, any>) => void;
}

const IconButton = ({ onClick, icon: Icon, label, disabled = false }: { 
  onClick: () => void; 
  icon: React.ElementType; 
  label: string; 
  disabled?: boolean;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button onClick={onClick} size="icon" variant="outline" disabled={disabled} className="h-9 w-9">
        <Icon className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>{label}</p>
    </TooltipContent>
  </Tooltip>
);

export const BuilderSidebar: React.FC<BuilderSidebarProps> = ({
  pages,
  selectedPage,
  zoom,
  outline,
  historyIndex,
  historyLength,
  globalSettings,
  gridSettings,
  characters,
  generatedImages,
  savedPages,
  recentProjects,
  lastSaved,
  selectedNode,
  parentNode,
  selectedId,
  layerStates,
  pageRef,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
  onUndo,
  onRedo,
  onFitToViewport,
  onZoomIn,
  onZoomOut,
  onOutlineChange,
  onSettingsChange,
  onGridSettingsChange,
  onApplyPreset,
  onAddCharacter,
  onDeleteCharacter,
  onSavePage,
  onSelectNode,
  onUpdateLayerState,
  onReorderLayers,
  onLoadRecentProject,
  onDeleteRecentProject,
  onLoadCloudProject,
  onSplitPanel,
  onMergePanel,
  onDeletePanel,
  onDuplicatePanel,
  onTextPropsChange
}) => {
  return (
    <div className="h-full border-r border-border bg-card shadow-card overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <div className="p-4">
        <Tabs defaultValue="builder" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="builder">
              <Tooltip>
                <TooltipTrigger asChild>
                  <LayoutGrid className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>Builder</TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="characters">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Users className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>Characters</TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="history">
              <Tooltip>
                <TooltipTrigger asChild>
                  <History className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>History</TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="gallery">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Images className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>Gallery</TooltipContent>
              </Tooltip>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="flex-1 overflow-y-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">Storybook Builder</h2>
              <UserMenu />
            </div>
          
            {/* Cloud Project Manager */}
            <CloudProjectManager
              currentProject={{ pages, selectedPage, zoom, characters, generatedImages }}
              onLoadProject={onLoadCloudProject}
              onSaveProject={() => {}}
            />
            
            {/* Quick Actions */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Quick Actions</h4>
              <div className="flex flex-wrap gap-2">
                <IconButton onClick={onAddPage} icon={Plus} label="Add Page (Ctrl+N)" />
                <IconButton onClick={() => onDeletePage(selectedPage)} icon={Trash2} label="Delete Page" disabled={pages.length <= 1} />
                <IconButton onClick={() => onDuplicatePage(selectedPage)} icon={Copy} label="Duplicate Page" />
                <IconButton onClick={onUndo} icon={Undo} label="Undo (Ctrl+Z)" disabled={historyIndex <= 0} />
                <IconButton onClick={onRedo} icon={Redo} label="Redo (Ctrl+Y)" disabled={historyIndex >= historyLength - 1} />
                <IconButton onClick={onFitToViewport} icon={Monitor} label="Fit to View (Ctrl+0)" />
                <SavePageModal
                  pageElement={pageRef.current}
                  pageData={pages[selectedPage]}
                  onSave={onSavePage}
                />
                <ExportPanel pageRef={pageRef} pages={pages} selectedPage={selectedPage} />
                <LayersPanel
                  page={pages[selectedPage]}
                  selectedId={selectedId}
                  onSelectNode={onSelectNode}
                  layerStates={layerStates}
                  onUpdateLayerState={onUpdateLayerState}
                  onReorderLayers={onReorderLayers}
                />
                <GridSettingsPanel settings={gridSettings} onSettingsChange={onGridSettingsChange} />
                <RecentProjectsPanel
                  recentProjects={recentProjects}
                  onLoadProject={onLoadRecentProject}
                  onDeleteProject={onDeleteRecentProject}
                />
                <PanelOperationsMenu
                  selectedNode={selectedNode}
                  parentNode={parentNode}
                  onSplitPanel={onSplitPanel}
                  onMergePanel={onMergePanel}
                  onDeletePanel={onDeletePanel}
                  onDuplicatePanel={onDuplicatePanel}
                />
                {selectedNode && selectedNode.kind === 'leaf' && selectedNode.contentType === 'text' && (
                  <TextFormattingModal textProps={selectedNode.textProps} onChange={onTextPropsChange} />
                )}
              </div>
              {lastSaved && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Page Settings */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Page Settings</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Page Size</Label>
                  <Select
                    value={globalSettings.pageSize}
                    onValueChange={(value: PageSizeKey) => 
                      onSettingsChange({ ...globalSettings, pageSize: value })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAGE_SIZES).map(([key, size]) => (
                        <SelectItem key={key} value={key}>{size.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Orientation</Label>
                  <Select
                    value={globalSettings.orientation}
                    onValueChange={(value: 'portrait' | 'landscape') => 
                      onSettingsChange({ ...globalSettings, orientation: value })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Layout Presets */}
            <LayoutPresetsSimple onApplyPreset={onApplyPreset} />

            {/* View Controls */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">View</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  <Button onClick={onZoomOut} variant="ghost" size="icon" className="h-7 w-7">
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-10 text-center font-mono">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button onClick={onZoomIn} variant="ghost" size="icon" className="h-7 w-7">
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className={`flex items-center space-x-2 p-2 rounded-md transition-colors ${outline ? 'bg-primary/20 ring-1 ring-primary' : ''}`}>
                  <Switch id="outlines" checked={outline} onCheckedChange={onOutlineChange} />
                  <Label htmlFor="outlines" className={`text-xs ${outline ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Show Outlines</Label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="characters" className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Characters</h2>
                <p className="text-sm text-muted-foreground">Manage your character library</p>
              </div>
              <CharacterManager
                characters={characters}
                onAddCharacter={onAddCharacter}
                onDeleteCharacter={onDeleteCharacter}
              />
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Generation History</h2>
                <p className="text-sm text-muted-foreground">Track your generations</p>
              </div>
              <ImageHistory images={generatedImages} characters={characters} />
            </div>
          </TabsContent>

          <TabsContent value="gallery" className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Gallery</h2>
                <p className="text-sm text-muted-foreground">Browse images and saved pages</p>
              </div>
              
              <div className="space-y-4">
                {savedPages.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Saved Pages ({savedPages.length})</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {savedPages.slice(0, 6).map((page) => (
                        <div key={page.id} className="group relative">
                          <div className="aspect-[0.707] rounded border border-border overflow-hidden bg-muted">
                            <img src={page.imageUrl} alt={page.title} className="w-full h-full object-cover" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="font-medium truncate">{page.title}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {savedPages.length > 6 && (
                      <p className="text-xs text-muted-foreground text-center">+{savedPages.length - 6} more</p>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Generated Images ({generatedImages.length})</h3>
                  <Gallery images={generatedImages} characters={characters} />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
