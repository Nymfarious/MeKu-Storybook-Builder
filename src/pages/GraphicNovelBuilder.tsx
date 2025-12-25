import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CharacterManager } from '@/components/CharacterManager';
import { Gallery } from '@/components/Gallery';
import { ImageHistory } from '@/components/ImageHistory';
import { CloudProjectManager } from '@/components/CloudProjectManager';
import UserMenu from '@/components/UserMenu';
import { EnhancedLeafInspector } from '@/components/EnhancedLeafInspector';
import { SavePageModal } from '@/components/SavePageModal';
import { ExportPanel } from '@/components/ExportPanel';
import { LayersPanel } from '@/components/LayersPanel';
import { GridSettingsPanel, GridSettings } from '@/components/GridSettingsPanel';
import { RecentProjectsPanel, RecentProject } from '@/components/RecentProjectsPanel';
import { PageThumbnailTray } from '@/components/PageThumbnailTray';
import { LayoutPresetsSimple } from '@/components/LayoutPresetsSimple';
import { RenderNode, SplitInspector } from '@/components/editor';
import { Character, GeneratedImage, GenerationJob, SavedPage } from '@/types';
import { ReplicateService } from '@/services/replicate';
import { Node, SplitNode } from '@/types/nodes';
import { 
  findNode,
  findParentNode,
  updateNode, 
  applyResize, 
  appendGeneratedLine, 
  storyPrompts,
  DEFAULT_LEAF,
  removeNode,
  replaceNode,
  duplicateNodeInParent,
  uid
} from '@/utils/nodeUtils';
import { PanelOperationsMenu, splitLeafNode, splitSplitNode } from '@/components/PanelOperationsMenu';
import { TextFormattingModal } from '@/components/TextFormattingModal';
import { PAGE_SIZES, PRESETS, getDefaultPreset, PageSizeKey } from '@/constants/pagePresets';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
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
  
  // Character management
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
  const [showRight, setShowRight] = useState(true);
  const [globalSettings, setGlobalSettings] = useState({
    gutter: 8,
    background: '#faf9f6',
    pageSize: 'A4' as PageSizeKey,
    orientation: 'portrait' as 'portrait' | 'landscape'
  });

  // AI generation settings
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
  
  // Text generation settings
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  
  // Saved pages
  const [savedPages, setSavedPages] = useState<SavedPage[]>([]);
  
  // Layer states for visibility, lock, opacity
  const [layerStates, setLayerStates] = useState<Record<string, { id: string; visible: boolean; locked: boolean; opacity: number }>>({});

  // Grid settings
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    show: false,
    size: 20,
    color: '#3b82f6',
    opacity: 0.3,
    snap: false
  });

  // Recent projects
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Helper function to create composite image from multiple references
  const createCompositeImage = async (images: string[]): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      const gridSize = Math.ceil(Math.sqrt(images.length));
      canvas.width = 512 * gridSize;
      canvas.height = 512 * gridSize;
      
      let loadedCount = 0;
      
      images.forEach((imageSrc, index) => {
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const row = Math.floor(index / gridSize);
          const col = index % gridSize;
          const x = col * 512;
          const y = row * 512;
          
          ctx.drawImage(img, x, y, 512, 512);
          loadedCount++;
          
          if (loadedCount === images.length) {
            resolve(canvas.toDataURL('image/png'));
          }
        };
        img.src = imageSrc;
      });
    });
  };

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

  const fitToViewport = useCallback(() => {
    setZoom(0.5);
    toast.success("Fit to viewport");
  }, []);


  // Character management functions
  const addCharacter = useCallback((characterData: Omit<Character, 'id' | 'createdAt'>) => {
    const newCharacter: Character = {
      ...characterData,
      id: crypto.randomUUID(),
      createdAt: new Date()
    };
    setCharacters(prev => [...prev, newCharacter]);
    toast.success(`Character "${newCharacter.name}" created successfully!`);
  }, []);

  const deleteCharacter = useCallback((id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
    toast.success('Character deleted successfully!');
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    // Load current project
    const saved = localStorage.getItem('graphic-novel-builder');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setPages(data.pages || [getDefaultPreset()]);
        setPageInfos(data.pageInfos || [{ id: crypto.randomUUID(), name: 'Page 1', hidden: false }]);
        setGlobalSettings({
          gutter: 8,
          background: '#ffffff',
          pageSize: 'A4' as PageSizeKey,
          orientation: 'portrait' as 'portrait' | 'landscape',
          ...data.settings
        });
        setCharacters(data.characters || []);
        setGeneratedImages(data.generatedImages || []);
        setSavedPages(data.savedPages || []);
        setProjectName(data.projectName || 'Untitled Project');
        if (data.gridSettings) setGridSettings(data.gridSettings);
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }

    // Load recent projects list
    const recentList = localStorage.getItem('gn-recent-projects');
    if (recentList) {
      try {
        setRecentProjects(JSON.parse(recentList));
      } catch (error) {
        console.error('Error loading recent projects:', error);
      }
    }
  }, []);

  // Save current project to localStorage
  const saveProject = useCallback(() => {
    const projectId = localStorage.getItem('gn-current-project-id') || crypto.randomUUID();
    localStorage.setItem('gn-current-project-id', projectId);

    const data = {
      id: projectId,
      projectName,
      pages,
      pageInfos,
      settings: globalSettings,
      characters,
      generatedImages,
      savedPages,
      gridSettings,
      lastModified: new Date().toISOString()
    };
    localStorage.setItem('graphic-novel-builder', JSON.stringify(data));
    setLastSaved(new Date());
    toast.success('Project saved');

    // Update recent projects list
    setRecentProjects(prev => {
      const existing = prev.filter(p => p.id !== projectId);
      const updated: RecentProject[] = [
        {
          id: projectId,
          name: projectName,
          lastModified: new Date().toISOString(),
          pageCount: pages.length
        },
        ...existing
      ].slice(0, 5);
      localStorage.setItem('gn-recent-projects', JSON.stringify(updated));
      return updated;
    });
  }, [pages, pageInfos, globalSettings, characters, generatedImages, savedPages, gridSettings, projectName]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const data = {
        projectName,
        pages,
        pageInfos,
        settings: globalSettings,
        characters,
        generatedImages,
        savedPages,
        gridSettings
      };
      localStorage.setItem('graphic-novel-builder', JSON.stringify(data));
      setLastSaved(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [pages, pageInfos, globalSettings, characters, generatedImages, savedPages, gridSettings, projectName]);

  // Load a recent project
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
        console.error('Error loading project:', error);
        toast.error('Failed to load project');
      }
    }
  }, [globalSettings]);

  // Delete a recent project
  const handleDeleteRecentProject = useCallback((projectId: string) => {
    localStorage.removeItem(`gn-project-${projectId}`);
    setRecentProjects(prev => {
      const updated = prev.filter(p => p.id !== projectId);
      localStorage.setItem('gn-recent-projects', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updatePage = (pageIndex: number, updater: (page: SplitNode) => SplitNode) => {
    setPages(prev => {
      const newPages = prev.map((page, i) => i === pageIndex ? updater(page) : page);
      saveToHistory(newPages);
      return newPages;
    });
  };

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
    
    const newNode = selectedNode.kind === 'leaf'
      ? splitLeafNode(selectedNode, direction, count)
      : splitSplitNode(selectedNode, direction, count);
    
    updatePage(selectedPage, prev => replaceNode(prev, selectedNode.id, newNode) as SplitNode);
    setSelectedId(newNode.children[0].id);
    toast.success(`Split into ${count} panels`);
  }, [selectedNode, selectedPage]);

  const handleMergePanel = useCallback(() => {
    if (!selectedNode || !parentNode) return;
    
    const siblingIndex = parentNode.children.findIndex(c => c.id === selectedNode.id);
    if (siblingIndex === -1 || parentNode.children.length <= 1) return;
    
    updatePage(selectedPage, prev => removeNode(prev, selectedNode.id) as SplitNode);
    setSelectedId('');
    toast.success('Panel merged');
  }, [selectedNode, parentNode, selectedPage]);

  const handleDeletePanel = useCallback(() => {
    if (!selectedNode || !parentNode || parentNode.children.length <= 1) return;
    
    updatePage(selectedPage, prev => removeNode(prev, selectedNode.id) as SplitNode);
    setSelectedId('');
    toast.success('Panel deleted');
  }, [selectedNode, parentNode, selectedPage]);

  const handleDuplicatePanel = useCallback(() => {
    if (!selectedNode) return;
    
    updatePage(selectedPage, prev => duplicateNodeInParent(prev, selectedNode.id) as SplitNode);
    toast.success('Panel duplicated');
  }, [selectedNode, selectedPage]);

  // Text formatting handler
  const handleTextPropsChange = useCallback((updates: Record<string, any>) => {
    if (!selectedNode || selectedNode.kind !== 'leaf') return;
    
    updatePage(selectedPage, prev => updateNode(prev, selectedNode.id, n => {
      if (n.kind !== 'leaf') return n;
      return {
        ...n,
        textProps: { ...n.textProps, ...updates }
      };
    }) as SplitNode);
  }, [selectedNode, selectedPage]);

  // Page management
  const addPage = useCallback(() => {
    setPages(prev => [...prev, getDefaultPreset()]);
    setPageInfos(prev => [...prev, { 
      id: crypto.randomUUID(), 
      name: `Page ${prev.length + 1}`, 
      hidden: false 
    }]);
  }, []);

  const deletePage = useCallback((index: number) => {
    if (pages.length <= 1) return;
    setPages(prev => prev.filter((_, i) => i !== index));
    setPageInfos(prev => prev.filter((_, i) => i !== index));
    if (selectedPage >= pages.length - 1) {
      setSelectedPage(Math.max(0, pages.length - 2));
    }
  }, [pages.length, selectedPage]);

  const duplicatePage = useCallback((index: number) => {
    setPages(prev => {
      const newPage = JSON.parse(JSON.stringify(prev[index]));
      return [...prev.slice(0, index + 1), newPage, ...prev.slice(index + 1)];
    });
    setPageInfos(prev => {
      const newInfo = { 
        id: crypto.randomUUID(), 
        name: `${prev[index].name} (Copy)`, 
        hidden: prev[index].hidden 
      };
      return [...prev.slice(0, index + 1), newInfo, ...prev.slice(index + 1)];
    });
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
  }, [selectedPage]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onZoomIn: () => setZoom(z => Math.min(2, z * 1.2)),
    onZoomOut: () => setZoom(z => Math.max(0.1, z / 1.2)),
    onZoomReset: () => setZoom(0.5),
    onSplitHorizontal: () => selectedNode && handleSplitPanel('horizontal', 2),
    onSplitVertical: () => selectedNode && handleSplitPanel('vertical', 2),
    onDuplicate: handleDuplicatePanel,
    onDelete: handleDeletePanel,
    onSave: saveProject,
    onNewPage: addPage,
    onDeselect: () => setSelectedId(''),
    enabled: true
  });

  const currentLeft = pages[spreadIndex];
  const currentRight = pages[spreadIndex + 1];
  
  const { gutter, pageSize, orientation } = globalSettings;
  const pageGap = 20;
  
  const safePageSize = pageSize && PAGE_SIZES[pageSize] ? pageSize : 'A4';
  const baseSize = PAGE_SIZES[safePageSize];
  const pageWidth = orientation === 'landscape' ? baseSize.height : baseSize.width;
  const pageHeight = orientation === 'landscape' ? baseSize.width : baseSize.height;

  const pageBg = globalSettings.background;
  const pageRadius = 8;

  const handleSavePage = (pageInfo: { title: string; description: string; imageUrl: string; pageData: any; id?: string }) => {
    const newSavedPage: SavedPage = {
      id: pageInfo.id || crypto.randomUUID(),
      title: pageInfo.title,
      description: pageInfo.description,
      imageUrl: pageInfo.imageUrl,
      pageData: pageInfo.pageData,
      createdAt: new Date()
    };
    
    setSavedPages(prev => [newSavedPage, ...prev]);
  };

  // Layer state handlers
  const handleUpdateLayerState = useCallback((id: string, updates: Partial<{ visible: boolean; locked: boolean; opacity: number }>) => {
    setLayerStates(prev => ({
      ...prev,
      [id]: {
        id,
        visible: true,
        locked: false,
        opacity: 1,
        ...prev[id],
        ...updates
      }
    }));
  }, []);

  const handleReorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    toast.info('Layer reordering updates z-index visually');
  }, []);

  const onGenerateText = async () => {
    if (!selectedNode || selectedNode.kind !== "leaf") return;
    
    try {
      toast.info("Generating story text...");
      
      const { data, error } = await supabase.functions.invoke('generate-story-text', {
        body: {
          prompt: aiPrompt || "Continue the story",
          context: selectedNode.textProps.text,
          style: 'narration',
          tone: 'dramatic',
          length: 'medium',
          characters: selectedCharacters.length > 0 ? selectedCharacters.map(id => characters.find(c => c.id === id)?.name).filter(Boolean) : undefined
        }
      });

      if (error) {
        throw new Error(error.message || "Failed to generate story text");
      }

      if (!data || !data.text) {
        throw new Error("No text received from generation service");
      }

      updatePage(selectedPage, prev => updateNode(prev, selectedNode.id, n => n.kind !== "leaf" ? n : ({
        ...n,
        textProps: {
          ...n.textProps,
          text: appendGeneratedLine(n.textProps.text || "", data.text.trim())
        }
      })) as SplitNode);
      
      toast.success("Story text generated successfully!");
      
    } catch (error) {
      console.error('Text generation error:', error);
      const message = error instanceof Error ? error.message : "Failed to generate text";
      toast.error(`Generation failed: ${message}`);
      
      const randomPrompt = storyPrompts[Math.floor(Math.random() * storyPrompts.length)];
      updatePage(selectedPage, prev => updateNode(prev, selectedNode.id, n => n.kind !== "leaf" ? n : ({
        ...n,
        textProps: {
          ...n.textProps,
          text: appendGeneratedLine(n.textProps.text || "", randomPrompt)
        }
      })) as SplitNode);
    }
  };

  const onGenerateImage = async (characterId?: string) => {
    if (!selectedNode || selectedNode.kind !== "leaf" || !aiPrompt.trim()) {
      toast.error("Please select a leaf node and provide a prompt");
      return;
    }

    const character = characterId ? characters.find(c => c.id === characterId) : undefined;
    const jobId = crypto.randomUUID();
    
    let inputImage = null;
    if (referenceImages.length > 0) {
      inputImage = referenceImages.length === 1 
        ? referenceImages[0] 
        : await createCompositeImage(referenceImages);
    } else if (referenceImageUrl.trim()) {
      inputImage = referenceImageUrl.trim();
    }
    
    const generationJob: GenerationJob = {
      id: jobId,
      characterId,
      prompt: aiPrompt,
      seed: seed || undefined,
      useReference: !!inputImage,
      referenceImageUrl: inputImage || undefined,
      aspectRatio: aspectRatio as any,
      outputFormat: outputFormat as any,
      promptUpsampling,
      safetyTolerance,
      status: 'pending',
      createdAt: new Date()
    };

    const generatedImage: GeneratedImage = {
      id: crypto.randomUUID(),
      characterId,
      characterName: character?.name,
      prompt: aiPrompt,
      seed: seed || undefined,
      imageUrl: '',
      useReference: !!inputImage,
      referenceImageUrl: inputImage || undefined,
      aspectRatio: aspectRatio as any,
      outputFormat: outputFormat as any,
      promptUpsampling,
      safetyTolerance,
      status: 'generating',
      createdAt: new Date()
    };

    setGenerationJobs(prev => [generationJob, ...prev]);
    setGeneratedImages(prev => [generatedImage, ...prev]);
    setIsGenerating(true);

    try {
      toast.info("Generating image...");
      
      const requestBody: any = {
        prompt: aiPrompt,
        aspect_ratio: aspectRatio,
        output_format: outputFormat,
        safety_tolerance: safetyTolerance,
        prompt_upsampling: promptUpsampling,
        seed: seed || undefined
      };

      if (inputImage) {
        requestBody.input_image = inputImage;
      }
      
      if (negativePrompt.trim()) {
        requestBody.negative_prompt = negativePrompt.trim();
      }
      
      const { data, error } = await supabase.functions.invoke('generate-image-novel', {
        body: requestBody
      });

      if (error) {
        throw new Error(error.message || "Failed to call image generation service");
      }

      if (!data || !data.imageURL) {
        throw new Error("No image URL received from generation service");
      }

      updatePage(selectedPage, prev => updateNode(prev, selectedNode.id, n => n.kind !== "leaf" ? n : ({
        ...n, 
        contentType: "image", 
        imageProps: { ...n.imageProps, url: data.imageURL }
      })) as SplitNode);

      const completedImage: GeneratedImage = {
        ...generatedImage,
        imageUrl: data.imageURL,
        seed: data.seed,
        predictionId: data.predictionId,
        status: 'completed'
      };
      
      setGeneratedImages(prev => 
        prev.map(img => img.id === generatedImage.id ? completedImage : img)
      );

      setGenerationJobs(prev => 
        prev.map(job => job.id === jobId ? { 
          ...job, 
          status: 'completed' as const, 
          imageUrl: data.imageURL,
          predictionId: data.predictionId 
        } : job)
      );
      
      toast.success("Image generated successfully!");
      
    } catch (error) {
      console.error('Image generation error:', error);
      const message = error instanceof Error ? error.message : "Failed to generate image";
      toast.error(`Generation failed: ${message}`);

      setGeneratedImages(prev => 
        prev.map(img => 
          img.id === generatedImage.id 
            ? { ...img, status: 'failed' as const }
            : img
        )
      );

      setGenerationJobs(prev => 
        prev.map(job => job.id === jobId ? { ...job, status: 'failed' as const } : job)
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Icon button helper component
  const IconButton = ({ onClick, icon: Icon, label, disabled = false, variant = "outline" as const }: { 
    onClick: () => void; 
    icon: React.ElementType; 
    label: string; 
    disabled?: boolean;
    variant?: "outline" | "default" | "ghost";
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button onClick={onClick} size="icon" variant={variant} disabled={disabled} className="h-9 w-9">
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider>
      <DndProvider backend={HTML5Backend}>
        <div className="h-screen flex flex-col bg-background">
          {/* Main content area */}
          <div className="flex-1 flex min-h-0">
            <ResizablePanelGroup direction="horizontal" className="w-full">
              {/* Left Sidebar */}
              <ResizablePanel defaultSize={25} minSize={20} maxSize={50}>
                <div className="h-full border-r border-border bg-card shadow-card overflow-y-auto">
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
                        {/* Header with User Menu */}
                        <div className="flex justify-between items-center">
                          <h2 className="text-xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">Storybook Builder</h2>
                          <UserMenu />
                        </div>
                      
                        {/* Cloud Project Manager */}
                        <CloudProjectManager
                          currentProject={{
                            pages,
                            selectedPage,
                            zoom,
                            characters,
                            generatedImages
                          }}
                          onLoadProject={(data) => {
                            if (data.pages) setPages(data.pages);
                            if (data.selectedPage !== undefined) setSelectedPage(data.selectedPage);
                            if (data.zoom !== undefined) setZoom(data.zoom);
                            if (data.characters) setCharacters(data.characters);
                            if (data.generatedImages) setGeneratedImages(data.generatedImages);
                            if (data.savedPages) setSavedPages(data.savedPages);
                          }}
                          onSaveProject={() => {}}
                        />
                        
                        {/* Quick Actions */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-foreground">Quick Actions</h4>
                          <div className="flex flex-wrap gap-2">
                            <IconButton onClick={addPage} icon={Plus} label="Add Page (Ctrl+N)" />
                            <IconButton onClick={() => deletePage(selectedPage)} icon={Trash2} label="Delete Page" disabled={pages.length <= 1} />
                            <IconButton onClick={() => duplicatePage(selectedPage)} icon={Copy} label="Duplicate Page" />
                            <IconButton onClick={undo} icon={Undo} label="Undo (Ctrl+Z)" disabled={historyIndex <= 0} />
                            <IconButton onClick={redo} icon={Redo} label="Redo (Ctrl+Y)" disabled={historyIndex >= history.length - 1} />
                            <IconButton onClick={fitToViewport} icon={Monitor} label="Fit to View (Ctrl+0)" />
                            <SavePageModal
                              pageElement={pageRef.current}
                              pageData={pages[selectedPage]}
                              onSave={handleSavePage}
                            />
                            <ExportPanel 
                              pageRef={pageRef} 
                              pages={pages} 
                              selectedPage={selectedPage} 
                            />
                            <LayersPanel
                              page={pages[selectedPage]}
                              selectedId={selectedId}
                              onSelectNode={setSelectedId}
                              layerStates={layerStates}
                              onUpdateLayerState={handleUpdateLayerState}
                              onReorderLayers={handleReorderLayers}
                            />
                            <GridSettingsPanel
                              settings={gridSettings}
                              onSettingsChange={setGridSettings}
                            />
                            <RecentProjectsPanel
                              recentProjects={recentProjects}
                              onLoadProject={handleLoadRecentProject}
                              onDeleteProject={handleDeleteRecentProject}
                            />
                            <PanelOperationsMenu
                              selectedNode={selectedNode}
                              parentNode={parentNode}
                              onSplitPanel={handleSplitPanel}
                              onMergePanel={handleMergePanel}
                              onDeletePanel={handleDeletePanel}
                              onDuplicatePanel={handleDuplicatePanel}
                            />
                            {selectedNode && selectedNode.kind === 'leaf' && selectedNode.contentType === 'text' && (
                              <TextFormattingModal
                                textProps={selectedNode.textProps}
                                onChange={handleTextPropsChange}
                              />
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
                                  setGlobalSettings(prev => ({ ...prev, pageSize: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
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
                                  setGlobalSettings(prev => ({ ...prev, orientation: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="portrait">Portrait</SelectItem>
                                  <SelectItem value="landscape">Landscape</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Layout Presets - Simplified */}
                        <LayoutPresetsSimple onApplyPreset={applyPreset} />

                        {/* View Controls */}
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-3">View</h4>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <IconButton onClick={() => setZoom(z => Math.min(2, z * 1.2))} icon={ZoomIn} label="Zoom In (Ctrl++)" />
                              <span className="text-xs text-muted-foreground flex-1 text-center">
                                {Math.round(zoom * 100)}%
                              </span>
                              <IconButton onClick={() => setZoom(z => Math.max(0.1, z / 1.2))} icon={ZoomOut} label="Zoom Out (Ctrl+-)" />
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Switch 
                                id="outlines" 
                                checked={outline} 
                                onCheckedChange={(checked) => setOutline(!!checked)} 
                              />
                              <Label htmlFor="outlines" className="text-xs text-muted-foreground">
                                Show Outlines
                              </Label>
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
                            onAddCharacter={addCharacter}
                            onDeleteCharacter={deleteCharacter}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="history" className="flex-1 overflow-y-auto">
                        <div className="space-y-4">
                          <div>
                            <h2 className="text-lg font-semibold">Generation History</h2>
                            <p className="text-sm text-muted-foreground">Track your generations</p>
                          </div>
                          <ImageHistory
                            images={generatedImages}
                            characters={characters}
                          />
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
                                        <img
                                          src={page.imageUrl}
                                          alt={page.title}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="font-medium truncate">{page.title}</div>
                                        {page.description && (
                                          <div className="text-muted-foreground truncate">{page.description}</div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {savedPages.length > 6 && (
                                  <p className="text-xs text-muted-foreground text-center">
                                    +{savedPages.length - 6} more pages in gallery
                                  </p>
                                )}
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              <h3 className="text-sm font-medium">Generated Images ({generatedImages.length})</h3>
                              <Gallery
                                images={generatedImages}
                                characters={characters}
                              />
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Canvas */}
              <ResizablePanel defaultSize={50}>
                <div 
                  ref={containerRef} 
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
                      setZoom(z => Math.min(2, Math.max(0.1, z * delta)));
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
                        ref={selectedPage === (spreadIndex + idx) ? pageRef : undefined}
                        className="relative" 
                        style={{ 
                          width: pageWidth, 
                          height: pageHeight, 
                          background: pageBg, 
                          borderRadius: pageRadius 
                        }}
                        onClick={() => { 
                          const i = spreadIndex + idx; 
                          setSelectedPage(i); 
                        }}
                      >
                        <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: pageRadius }}>
                          <RenderNode
                            node={pageRoot as SplitNode}
                            gutter={gutter}
                            outline={outline}
                            selectedId={selectedPage === (spreadIndex + idx) ? selectedId : ""}
                            onSelect={(id) => { setSelectedPage(spreadIndex + idx); setSelectedId(id); }}
                            onResize={(id, index, delta) => updatePage(spreadIndex + idx, prev => updateNode(prev, id, n => applyResize(n, index, delta)) as SplitNode)}
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
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Right Inspector */}
              <ResizablePanel defaultSize={25} minSize={20} maxSize={50}>
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
                          node={selectedNode} 
                          onChange={(updater) => updatePage(selectedPage, prev => updateNode(prev, selectedNode.id, updater) as SplitNode)}
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
                          node={selectedNode} 
                          onChange={(updater) => updatePage(selectedPage, prev => updateNode(prev, selectedNode.id, updater) as SplitNode)} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          {/* Bottom Page Thumbnail Tray */}
          <PageThumbnailTray
            pages={pages}
            pageInfos={pageInfos}
            selectedPage={selectedPage}
            onSelectPage={(i) => { 
              setSelectedPage(i); 
              setSpreadIndex(i % 2 === 0 ? i : i - 1); 
              setSelectedId(""); 
            }}
            onAddPage={addPage}
            onDeletePage={deletePage}
            onDuplicatePage={duplicatePage}
            onRenamePage={renamePage}
            onToggleHidden={togglePageHidden}
            onBulkRename={bulkRenamePage}
          />
        </div>
      </DndProvider>
    </TooltipProvider>
  );
};

export default GraphicNovelBuilder;
