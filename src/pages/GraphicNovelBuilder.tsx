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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CharacterManager } from '@/components/CharacterManager';
import { Gallery } from '@/components/Gallery';
import { ImageHistory } from '@/components/ImageHistory';
import { CloudProjectManager } from '@/components/CloudProjectManager';
import UserMenu from '@/components/UserMenu';
import { EnhancedLeafInspector } from '@/components/EnhancedLeafInspector';
import { SavePageModal } from '@/components/SavePageModal';
import { RenderNode, SplitInspector } from '@/components/editor';
import { Character, GeneratedImage, GenerationJob, SavedPage } from '@/types';
import { ReplicateService } from '@/services/replicate';
import { Node, SplitNode } from '@/types/nodes';
import { 
  findNode, 
  updateNode, 
  applyResize, 
  appendGeneratedLine, 
  storyPrompts,
  DEFAULT_LEAF 
} from '@/utils/nodeUtils';
import { PAGE_SIZES, PRESETS, getDefaultPreset, PageSizeKey } from '@/constants/pagePresets';
import { 
  LayoutGrid, 
  Plus, 
  Download, 
  Undo, 
  Redo, 
  ZoomIn, 
  ZoomOut, 
  Copy,
  Trash2,
  Monitor,
  Users,
  History,
  Images,
  Save
} from 'lucide-react';

const GraphicNovelBuilder = () => {
  const [pages, setPages] = useState<SplitNode[]>([getDefaultPreset()]);
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
    background: '#ffffff',
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

  const exportCanvas = useCallback(() => {
    toast.info("Export functionality would be implemented here");
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
    const saved = localStorage.getItem('graphic-novel-builder');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setPages(data.pages || [getDefaultPreset()]);
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
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    const data = {
      pages,
      settings: globalSettings,
      characters,
      generatedImages,
      savedPages
    };
    localStorage.setItem('graphic-novel-builder', JSON.stringify(data));
  }, [pages, globalSettings, characters, generatedImages, savedPages]);

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

  const currentLeft = pages[spreadIndex];
  const currentRight = pages[spreadIndex + 1];
  
  const { gutter, pageSize, orientation } = globalSettings;
  const pageGap = 20;
  
  // Safety check to ensure pageSize exists in PAGE_SIZES
  const safePageSize = pageSize && PAGE_SIZES[pageSize] ? pageSize : 'A4';
  const baseSize = PAGE_SIZES[safePageSize];
  const pageWidth = orientation === 'landscape' ? baseSize.height : baseSize.width;
  const pageHeight = orientation === 'landscape' ? baseSize.width : baseSize.height;

  const canvasBg = "#1a1a1a";
  const pageBg = globalSettings.background;
  const pageRadius = 8;

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
      
      // Fallback to random prompt
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

  // Enhanced AI image generation with character support
  const onGenerateImage = async (characterId?: string) => {
    if (!selectedNode || selectedNode.kind !== "leaf" || !aiPrompt.trim()) {
      toast.error("Please select a leaf node and provide a prompt");
      return;
    }

    const character = characterId ? characters.find(c => c.id === characterId) : undefined;
    const jobId = crypto.randomUUID();
    
    // Prepare reference image input
    let inputImage = null;
    if (referenceImages.length > 0) {
      inputImage = referenceImages.length === 1 
        ? referenceImages[0] 
        : await createCompositeImage(referenceImages);
    } else if (referenceImageUrl.trim()) {
      inputImage = referenceImageUrl.trim();
    }
    
    // Create generation job
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

    // Create a new generated image entry
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
      
      // Build request body with all parameters
      const requestBody: any = {
        prompt: aiPrompt,
        aspect_ratio: aspectRatio,
        output_format: outputFormat,
        safety_tolerance: safetyTolerance,
        prompt_upsampling: promptUpsampling,
        seed: seed || undefined
      };

      // Add optional parameters
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

      // Update the node with the generated image
      updatePage(selectedPage, prev => updateNode(prev, selectedNode.id, n => n.kind !== "leaf" ? n : ({
        ...n, 
        contentType: "image", 
        imageProps: { ...n.imageProps, url: data.imageURL }
      })) as SplitNode);

      // Update the generated image and job with the result
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

      // Update failed states
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

  const addPage = () => {
    setPages(prev => [...prev, getDefaultPreset()]);
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) return;
    setPages(prev => prev.filter((_, i) => i !== index));
    if (selectedPage >= pages.length - 1) {
      setSelectedPage(Math.max(0, pages.length - 2));
    }
  };

  const duplicatePage = (index: number) => {
    setPages(prev => {
      const newPage = JSON.parse(JSON.stringify(prev[index]));
      return [...prev.slice(0, index + 1), newPage, ...prev.slice(index + 1)];
    });
  };

  const applyPreset = (preset: SplitNode) => {
    updatePage(selectedPage, () => JSON.parse(JSON.stringify(preset)));
    setSelectedId("");
  };

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
        <div className="h-screen flex bg-background">
        {/* Left Sidebar - Document Controls */}
        <div className="w-80 border-r border-border bg-card shadow-card overflow-y-auto">
          <div className="p-6">
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

              <TabsContent value="builder" className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6">
                  {/* Header with User Menu */}
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">GN Builder</h2>
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
                
                {/* Quick Actions - Icon Only with Tooltips */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Quick Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <IconButton onClick={addPage} icon={Plus} label="Add Page" />
                    <IconButton onClick={() => deletePage(selectedPage)} icon={Trash2} label="Delete Page" disabled={pages.length <= 1} />
                    <IconButton onClick={() => duplicatePage(selectedPage)} icon={Copy} label="Duplicate Page" />
                    <IconButton onClick={undo} icon={Undo} label="Undo" disabled={historyIndex <= 0} />
                    <IconButton onClick={redo} icon={Redo} label="Redo" disabled={historyIndex >= history.length - 1} />
                    <IconButton onClick={fitToViewport} icon={Monitor} label="Fit to View" />
                    <SavePageModal
                      pageElement={pageRef.current}
                      pageData={pages[selectedPage]}
                      onSave={handleSavePage}
                    />
                    <IconButton onClick={exportCanvas} icon={Download} label="Export" />
                  </div>
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

                {/* Layout Presets */}
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
                        <div className="grid grid-cols-2 gap-2">
                          {PRESETS.filter(preset => preset.category === category).map((preset, i) => (
                            <Tooltip key={i}>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={() => applyPreset(preset.root)}
                                  variant="outline"
                                  size="sm"
                                  className="h-auto p-2 text-xs"
                                >
                                  <LayoutGrid className="h-3 w-3 mr-1" />
                                  {preset.name}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Apply {preset.name} layout</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>

                {/* View Controls */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">View</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <IconButton onClick={() => setZoom(z => Math.min(2, z * 1.2))} icon={ZoomIn} label="Zoom In" />
                      <span className="text-xs text-muted-foreground flex-1 text-center">
                        {Math.round(zoom * 100)}%
                      </span>
                      <IconButton onClick={() => setZoom(z => Math.max(0.1, z / 1.2))} icon={ZoomOut} label="Zoom Out" />
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

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Pages</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {pages.map((_, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => { 
                              setSelectedPage(i); 
                              setSpreadIndex(i % 2 === 0 ? i : i - 1); 
                              setSelectedId(""); 
                            }} 
                            variant={i === selectedPage ? "default" : "outline"}
                            size="sm"
                            className="aspect-[0.707] p-1 text-xs h-auto"
                          >
                            {i + 1}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Go to page {i + 1}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="characters" className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
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
                <div className="p-4 space-y-4">
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
                <div className="p-4 space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Gallery</h2>
                    <p className="text-sm text-muted-foreground">Browse images and saved pages</p>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Saved Pages Section */}
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
                    
                    {/* Images Section */}
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

        {/* Canvas */}
        <div 
          ref={containerRef} 
          className="min-h-0 overflow-hidden relative flex items-center justify-center flex-1" 
          style={{ background: canvasBg }}
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
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Inspector */}
        {showRight && (
          <div className="w-80 border-l border-border bg-card shadow-card flex flex-col">
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
        )}
        </div>
      </DndProvider>
    </TooltipProvider>
  );
};

export default GraphicNovelBuilder;
