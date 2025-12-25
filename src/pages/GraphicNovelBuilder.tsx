import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PageThumbnailTray } from '@/components/PageThumbnailTray';
import { CanvasArea, InspectorPanel, BuilderSidebar } from '@/components/builder';
import { Character, GeneratedImage, GenerationJob, SavedPage } from '@/types';
import { ReplicateService } from '@/services/replicate';
import { Node, SplitNode } from '@/types/nodes';
import { GridSettings } from '@/components/GridSettingsPanel';
import { RecentProject } from '@/components/RecentProjectsPanel';
import { 
  findNode,
  findParentNode,
  updateNode, 
  applyResize, 
  appendGeneratedLine, 
  storyPrompts,
  removeNode,
  replaceNode,
  duplicateNodeInParent,
  uid
} from '@/utils/nodeUtils';
import { splitLeafNode, splitSplitNode } from '@/components/PanelOperationsMenu';
import { PAGE_SIZES, getDefaultPreset, PageSizeKey } from '@/constants/pagePresets';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface PageInfo {
  id: string;
  name: string;
  hidden: boolean;
}

const GraphicNovelBuilder = () => {
  const [pages, setPages] = useState<SplitNode[]>([getDefaultPreset()]);
  const [pageInfos, setPageInfos] = useState<PageInfo[]>([{ id: crypto.randomUUID(), name: 'Page 1', hidden: false }]);
  const [history, setHistory] = useState<SplitNode[][]>([[getDefaultPreset()]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [characters, setCharacters] = useState<Character[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const replicateService = useRef<ReplicateService>(new ReplicateService());

  const [selectedPage, setSelectedPage] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [zoom, setZoom] = useState(0.5);
  const [outline, setOutline] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({
    gutter: 8,
    background: '#faf9f6',
    pageSize: 'A4' as PageSizeKey,
    orientation: 'portrait' as 'portrait' | 'landscape'
  });

  const [aiPrompt, setAiPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [outputFormat, setOutputFormat] = useState<string>("png");
  const [safetyTolerance, setSafetyTolerance] = useState<number>(2);
  const [promptUpsampling, setPromptUpsampling] = useState<boolean>(true);
  const [seed, setSeed] = useState<number | null>(null);
  const [guidanceScale, setGuidanceScale] = useState<number>(7.5);
  const [inferenceSteps, setInferenceSteps] = useState<number>(4);
  const [imageStrength, setImageStrength] = useState<number>(0.8);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  
  const [savedPages, setSavedPages] = useState<SavedPage[]>([]);
  const [layerStates, setLayerStates] = useState<Record<string, { id: string; visible: boolean; locked: boolean; opacity: number }>>({});
  const [gridSettings, setGridSettings] = useState<GridSettings>({ show: false, size: 20, color: '#3b82f6', opacity: 0.3, snap: false });
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);

  // History management
  const saveToHistory = useCallback((newPages: SplitNode[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newPages)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setPages(history[historyIndex - 1]);
      toast.success("Undone");
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setPages(history[historyIndex + 1]);
      toast.success("Redone");
    }
  }, [history, historyIndex]);

  // Load/Save
  useEffect(() => {
    const saved = localStorage.getItem('graphic-novel-builder');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setPages(data.pages || [getDefaultPreset()]);
        setPageInfos(data.pageInfos || [{ id: crypto.randomUUID(), name: 'Page 1', hidden: false }]);
        setGlobalSettings({ gutter: 8, background: '#ffffff', pageSize: 'A4', orientation: 'portrait', ...data.settings });
        setCharacters(data.characters || []);
        setGeneratedImages(data.generatedImages || []);
        setSavedPages(data.savedPages || []);
        setProjectName(data.projectName || 'Untitled Project');
        if (data.gridSettings) setGridSettings(data.gridSettings);
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
    const recentList = localStorage.getItem('gn-recent-projects');
    if (recentList) {
      try { setRecentProjects(JSON.parse(recentList)); } catch (error) {}
    }
  }, []);

  const saveProject = useCallback(() => {
    const projectId = localStorage.getItem('gn-current-project-id') || crypto.randomUUID();
    localStorage.setItem('gn-current-project-id', projectId);
    const data = { id: projectId, projectName, pages, pageInfos, settings: globalSettings, characters, generatedImages, savedPages, gridSettings, lastModified: new Date().toISOString() };
    localStorage.setItem('graphic-novel-builder', JSON.stringify(data));
    setLastSaved(new Date());
    toast.success('Project saved');
    setRecentProjects(prev => {
      const updated: RecentProject[] = [{ id: projectId, name: projectName, lastModified: new Date().toISOString(), pageCount: pages.length }, ...prev.filter(p => p.id !== projectId)].slice(0, 5);
      localStorage.setItem('gn-recent-projects', JSON.stringify(updated));
      return updated;
    });
  }, [pages, pageInfos, globalSettings, characters, generatedImages, savedPages, gridSettings, projectName]);

  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem('graphic-novel-builder', JSON.stringify({ projectName, pages, pageInfos, settings: globalSettings, characters, generatedImages, savedPages, gridSettings }));
      setLastSaved(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [pages, pageInfos, globalSettings, characters, generatedImages, savedPages, gridSettings, projectName]);

  const handleLoadRecentProject = useCallback((projectId: string) => {
    const projectData = localStorage.getItem(`gn-project-${projectId}`);
    if (projectData) {
      try {
        const data = JSON.parse(projectData);
        setPages(data.pages || [getDefaultPreset()]);
        setPageInfos(data.pageInfos || [{ id: crypto.randomUUID(), name: 'Page 1', hidden: false }]);
        setGlobalSettings(data.settings || globalSettings);
        setCharacters(data.characters || []);
        setGeneratedImages(data.generatedImages || []);
        setSavedPages(data.savedPages || []);
        setProjectName(data.projectName || 'Untitled Project');
        if (data.gridSettings) setGridSettings(data.gridSettings);
        localStorage.setItem('gn-current-project-id', projectId);
      } catch (error) {
        toast.error('Failed to load project');
      }
    }
  }, [globalSettings]);

  const handleDeleteRecentProject = useCallback((projectId: string) => {
    localStorage.removeItem(`gn-project-${projectId}`);
    setRecentProjects(prev => {
      const updated = prev.filter(p => p.id !== projectId);
      localStorage.setItem('gn-recent-projects', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updatePage = useCallback((pageIndex: number, updater: (page: SplitNode) => SplitNode) => {
    setPages(prev => {
      const newPages = prev.map((page, i) => i === pageIndex ? updater(page) : page);
      saveToHistory(newPages);
      return newPages;
    });
  }, [saveToHistory]);

  const selectedNode = useMemo(() => {
    if (!selectedId || selectedPage >= pages.length) return null;
    return findNode(pages[selectedPage], selectedId);
  }, [pages, selectedPage, selectedId]);

  const parentNode = useMemo(() => {
    if (!selectedId || selectedPage >= pages.length) return null;
    return findParentNode(pages[selectedPage], selectedId);
  }, [pages, selectedPage, selectedId]);

  // Panel operations
  const handleSplitPanel = useCallback((direction: 'horizontal' | 'vertical', count: number) => {
    if (!selectedNode) return;
    const newNode = selectedNode.kind === 'leaf' ? splitLeafNode(selectedNode, direction, count) : splitSplitNode(selectedNode, direction, count);
    updatePage(selectedPage, prev => replaceNode(prev, selectedNode.id, newNode) as SplitNode);
    setSelectedId(newNode.children[0].id);
    toast.success(`Split into ${count} panels`);
  }, [selectedNode, selectedPage, updatePage]);

  const handleMergePanel = useCallback(() => {
    if (!selectedNode || !parentNode || parentNode.children.length <= 1) return;
    updatePage(selectedPage, prev => removeNode(prev, selectedNode.id) as SplitNode);
    setSelectedId('');
    toast.success('Panel merged');
  }, [selectedNode, parentNode, selectedPage, updatePage]);

  const handleDeletePanel = useCallback(() => {
    if (!selectedNode || !parentNode || parentNode.children.length <= 1) return;
    updatePage(selectedPage, prev => removeNode(prev, selectedNode.id) as SplitNode);
    setSelectedId('');
    toast.success('Panel deleted');
  }, [selectedNode, parentNode, selectedPage, updatePage]);

  const handleDuplicatePanel = useCallback(() => {
    if (!selectedNode) return;
    updatePage(selectedPage, prev => duplicateNodeInParent(prev, selectedNode.id) as SplitNode);
    toast.success('Panel duplicated');
  }, [selectedNode, selectedPage, updatePage]);

  const handleTextPropsChange = useCallback((updates: Record<string, any>) => {
    if (!selectedNode || selectedNode.kind !== 'leaf') return;
    updatePage(selectedPage, prev => updateNode(prev, selectedNode.id, n => n.kind !== 'leaf' ? n : { ...n, textProps: { ...n.textProps, ...updates } }) as SplitNode);
  }, [selectedNode, selectedPage, updatePage]);

  // Page management
  const addPage = useCallback(() => {
    setPages(prev => [...prev, getDefaultPreset()]);
    setPageInfos(prev => [...prev, { id: crypto.randomUUID(), name: `Page ${prev.length + 1}`, hidden: false }]);
  }, []);

  const deletePage = useCallback((index: number) => {
    if (pages.length <= 1) return;
    setPages(prev => prev.filter((_, i) => i !== index));
    setPageInfos(prev => prev.filter((_, i) => i !== index));
    if (selectedPage >= pages.length - 1) setSelectedPage(Math.max(0, pages.length - 2));
  }, [pages.length, selectedPage]);

  const duplicatePage = useCallback((index: number) => {
    setPages(prev => [...prev.slice(0, index + 1), JSON.parse(JSON.stringify(prev[index])), ...prev.slice(index + 1)]);
    setPageInfos(prev => [...prev.slice(0, index + 1), { id: crypto.randomUUID(), name: `${prev[index].name} (Copy)`, hidden: prev[index].hidden }, ...prev.slice(index + 1)]);
  }, []);

  const renamePage = useCallback((index: number, name: string) => {
    setPageInfos(prev => prev.map((info, i) => i === index ? { ...info, name } : info));
  }, []);

  const togglePageHidden = useCallback((index: number) => {
    setPageInfos(prev => prev.map((info, i) => i === index ? { ...info, hidden: !info.hidden } : info));
  }, []);

  const bulkRenamePage = useCallback((startNumber: number) => {
    setPageInfos(prev => prev.map((info, i) => ({ ...info, name: `Page ${startNumber + i}` })));
    toast.success('Pages renamed');
  }, []);

  const applyPreset = useCallback((preset: SplitNode) => {
    updatePage(selectedPage, () => JSON.parse(JSON.stringify(preset)));
    setSelectedId("");
  }, [selectedPage, updatePage]);

  const addCharacter = useCallback((characterData: Omit<Character, 'id' | 'createdAt'>) => {
    setCharacters(prev => [...prev, { ...characterData, id: crypto.randomUUID(), createdAt: new Date() }]);
    toast.success(`Character created!`);
  }, []);

  const deleteCharacter = useCallback((id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
    toast.success('Character deleted!');
  }, []);

  const handleSavePage = useCallback((pageInfo: { title: string; description: string; imageUrl: string; pageData: any; id?: string }) => {
    setSavedPages(prev => [{ id: pageInfo.id || crypto.randomUUID(), title: pageInfo.title, description: pageInfo.description, imageUrl: pageInfo.imageUrl, pageData: pageInfo.pageData, createdAt: new Date() }, ...prev]);
  }, []);

  const handleUpdateLayerState = useCallback((id: string, updates: Partial<{ visible: boolean; locked: boolean; opacity: number }>) => {
    setLayerStates(prev => ({ ...prev, [id]: { id, visible: true, locked: false, opacity: 1, ...prev[id], ...updates } }));
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onUndo: undo, onRedo: redo,
    onZoomIn: () => setZoom(z => Math.min(2, z * 1.2)),
    onZoomOut: () => setZoom(z => Math.max(0.1, z / 1.2)),
    onZoomReset: () => setZoom(0.5),
    onSplitHorizontal: () => selectedNode && handleSplitPanel('horizontal', 2),
    onSplitVertical: () => selectedNode && handleSplitPanel('vertical', 2),
    onDuplicate: handleDuplicatePanel, onDelete: handleDeletePanel,
    onSave: saveProject, onNewPage: addPage, onDeselect: () => setSelectedId(''),
    enabled: true
  });

  // Generation functions
  const createCompositeImage = async (images: string[]): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const gridSize = Math.ceil(Math.sqrt(images.length));
      canvas.width = 512 * gridSize; canvas.height = 512 * gridSize;
      let loadedCount = 0;
      images.forEach((src, index) => {
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, (index % gridSize) * 512, Math.floor(index / gridSize) * 512, 512, 512);
          if (++loadedCount === images.length) resolve(canvas.toDataURL('image/png'));
        };
        img.src = src;
      });
    });
  };

  const onGenerateText = async () => {
    if (!selectedNode || selectedNode.kind !== "leaf") return;
    try {
      toast.info("Generating story text...");
      const { data, error } = await supabase.functions.invoke('generate-story-text', {
        body: { prompt: aiPrompt || "Continue the story", context: selectedNode.textProps.text, style: 'narration', tone: 'dramatic', length: 'medium' }
      });
      if (error) throw new Error(error.message);
      if (!data?.text) throw new Error("No text received");
      updatePage(selectedPage, prev => updateNode(prev, selectedNode.id, n => n.kind !== "leaf" ? n : { ...n, textProps: { ...n.textProps, text: appendGeneratedLine(n.textProps.text || "", data.text.trim()) } }) as SplitNode);
      toast.success("Text generated!");
    } catch (error) {
      const randomPrompt = storyPrompts[Math.floor(Math.random() * storyPrompts.length)];
      updatePage(selectedPage, prev => updateNode(prev, selectedNode.id, n => n.kind !== "leaf" ? n : { ...n, textProps: { ...n.textProps, text: appendGeneratedLine(n.textProps.text || "", randomPrompt) } }) as SplitNode);
    }
  };

  const onGenerateImage = async (characterId?: string) => {
    if (!selectedNode || selectedNode.kind !== "leaf" || !aiPrompt.trim()) {
      toast.error("Please select a leaf node and provide a prompt");
      return;
    }
    const character = characterId ? characters.find(c => c.id === characterId) : undefined;
    let inputImage = referenceImages.length > 0 ? (referenceImages.length === 1 ? referenceImages[0] : await createCompositeImage(referenceImages)) : referenceImageUrl.trim() || null;
    
    const generatedImage: GeneratedImage = { id: crypto.randomUUID(), characterId, characterName: character?.name, prompt: aiPrompt, seed: seed || undefined, imageUrl: '', useReference: !!inputImage, referenceImageUrl: inputImage || undefined, aspectRatio: aspectRatio as any, outputFormat: outputFormat as any, promptUpsampling, safetyTolerance, status: 'generating', createdAt: new Date() };
    setGeneratedImages(prev => [generatedImage, ...prev]);
    setIsGenerating(true);

    try {
      toast.info("Generating image...");
      const requestBody: any = { prompt: aiPrompt, aspect_ratio: aspectRatio, output_format: outputFormat, safety_tolerance: safetyTolerance, prompt_upsampling: promptUpsampling, seed: seed || undefined };
      if (inputImage) requestBody.input_image = inputImage;
      if (negativePrompt.trim()) requestBody.negative_prompt = negativePrompt.trim();
      
      const { data, error } = await supabase.functions.invoke('generate-image-novel', { body: requestBody });
      if (error || !data?.imageURL) throw new Error(error?.message || "No image URL received");
      
      updatePage(selectedPage, prev => updateNode(prev, selectedNode.id, n => n.kind !== "leaf" ? n : { ...n, contentType: "image", imageProps: { ...n.imageProps, url: data.imageURL } }) as SplitNode);
      setGeneratedImages(prev => prev.map(img => img.id === generatedImage.id ? { ...img, imageUrl: data.imageURL, status: 'completed' } : img));
      toast.success("Image generated!");
    } catch (error) {
      setGeneratedImages(prev => prev.map(img => img.id === generatedImage.id ? { ...img, status: 'failed' } : img));
      toast.error("Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  // Computed values
  const currentLeft = pages[spreadIndex];
  const currentRight = pages[spreadIndex + 1];
  const { gutter, pageSize, orientation } = globalSettings;
  const safePageSize = pageSize && PAGE_SIZES[pageSize] ? pageSize : 'A4';
  const baseSize = PAGE_SIZES[safePageSize];
  const pageWidth = orientation === 'landscape' ? baseSize.height : baseSize.width;
  const pageHeight = orientation === 'landscape' ? baseSize.width : baseSize.height;

  return (
    <TooltipProvider>
      <DndProvider backend={HTML5Backend}>
        <div className="h-screen flex flex-col bg-background">
          <div className="flex-1 flex min-h-0">
            <ResizablePanelGroup direction="horizontal" className="w-full">
              <ResizablePanel defaultSize={25} minSize={20} maxSize={50}>
                <BuilderSidebar
                  pages={pages} selectedPage={selectedPage} zoom={zoom} outline={outline}
                  historyIndex={historyIndex} historyLength={history.length}
                  globalSettings={globalSettings} gridSettings={gridSettings}
                  characters={characters} generatedImages={generatedImages} savedPages={savedPages}
                  recentProjects={recentProjects} lastSaved={lastSaved}
                  selectedNode={selectedNode} parentNode={parentNode} selectedId={selectedId} layerStates={layerStates}
                  pageRef={pageRef}
                  onAddPage={addPage} onDeletePage={deletePage} onDuplicatePage={duplicatePage}
                  onUndo={undo} onRedo={redo} onFitToViewport={() => setZoom(0.5)}
                  onZoomIn={() => setZoom(z => Math.min(2, z * 1.2))} onZoomOut={() => setZoom(z => Math.max(0.1, z / 1.2))}
                  onOutlineChange={setOutline} onSettingsChange={setGlobalSettings} onGridSettingsChange={setGridSettings}
                  onApplyPreset={applyPreset} onAddCharacter={addCharacter} onDeleteCharacter={deleteCharacter}
                  onSavePage={handleSavePage} onSelectNode={setSelectedId}
                  onUpdateLayerState={handleUpdateLayerState} onReorderLayers={() => {}}
                  onLoadRecentProject={handleLoadRecentProject} onDeleteRecentProject={handleDeleteRecentProject}
                  onLoadCloudProject={(data) => { if (data.pages) setPages(data.pages); if (data.characters) setCharacters(data.characters); if (data.generatedImages) setGeneratedImages(data.generatedImages); }}
                  onSplitPanel={handleSplitPanel} onMergePanel={handleMergePanel}
                  onDeletePanel={handleDeletePanel} onDuplicatePanel={handleDuplicatePanel}
                  onTextPropsChange={handleTextPropsChange}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50}>
                <CanvasArea
                  ref={pageRef}
                  currentLeft={currentLeft} currentRight={currentRight}
                  spreadIndex={spreadIndex} selectedPage={selectedPage} selectedId={selectedId}
                  zoom={zoom} gutter={gutter} outline={outline}
                  pageWidth={pageWidth} pageHeight={pageHeight} pageBg={globalSettings.background}
                  pageRadius={8} pageGap={20} gridSettings={gridSettings}
                  onZoomChange={setZoom} onSelectPage={setSelectedPage} onSelectId={setSelectedId}
                  onResize={(pageIdx, id, index, delta) => updatePage(pageIdx, prev => updateNode(prev, id, n => applyResize(n, index, delta)) as SplitNode)}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={25} minSize={20} maxSize={50}>
                <InspectorPanel
                  selectedPage={selectedPage} selectedNode={selectedNode} characters={characters} isGenerating={isGenerating}
                  aiPrompt={aiPrompt} setAiPrompt={setAiPrompt} manualImageUrl={manualImageUrl} setManualImageUrl={setManualImageUrl}
                  negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt}
                  referenceImageUrl={referenceImageUrl} setReferenceImageUrl={setReferenceImageUrl}
                  referenceImages={referenceImages} setReferenceImages={setReferenceImages}
                  aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
                  seed={seed} setSeed={setSeed} guidanceScale={guidanceScale} setGuidanceScale={setGuidanceScale}
                  inferenceSteps={inferenceSteps} setInferenceSteps={setInferenceSteps}
                  imageStrength={imageStrength} setImageStrength={setImageStrength}
                  outputFormat={outputFormat} setOutputFormat={setOutputFormat}
                  safetyTolerance={safetyTolerance} setSafetyTolerance={setSafetyTolerance}
                  promptUpsampling={promptUpsampling} setPromptUpsampling={setPromptUpsampling}
                  onNodeChange={(updater) => selectedNode && updatePage(selectedPage, prev => updateNode(prev, selectedNode.id, updater) as SplitNode)}
                  onGenerateText={onGenerateText} onGenerateImage={onGenerateImage}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
          <PageThumbnailTray
            pages={pages} pageInfos={pageInfos} selectedPage={selectedPage}
            onSelectPage={(i) => { setSelectedPage(i); setSpreadIndex(i % 2 === 0 ? i : i - 1); setSelectedId(""); }}
            onAddPage={addPage} onDeletePage={deletePage} onDuplicatePage={duplicatePage}
            onRenamePage={renamePage} onToggleHidden={togglePageHidden} onBulkRename={bulkRenamePage}
          />
        </div>
      </DndProvider>
    </TooltipProvider>
  );
};

export default GraphicNovelBuilder;
