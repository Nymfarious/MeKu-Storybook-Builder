import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Enhanced Graphic Novel Builder — Spreads
 * - Two-page spread view with improved layouts
 * - Supabase integration for AI generation
 * - Enhanced text editing capabilities
 * - More layout presets and functionality
 */

type Direction = "horizontal" | "vertical";
type ContentType = "text" | "image";

interface LeafNode {
  id: string;
  kind: "leaf";
  contentType: ContentType;
  textProps: {
    text?: string;
    align?: "left" | "center" | "right" | "justify";
    fontSize?: number;
    lineHeight?: number;
    padding?: number;
    bg?: string;
    italic?: boolean;
    bold?: boolean;
    radius?: number;
    fontFamily?: string;
    letterSpacing?: number;
    wordSpacing?: number;
  };
  imageProps: {
    url?: string;
    objectFit?: "cover" | "contain" | "fill";
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    radius?: number;
    padding?: number;
    bg?: string;
    opacity?: number;
    filter?: string;
  };
}

interface SplitNode {
  id: string;
  kind: "split";
  direction: Direction;
  sizes: number[];
  children: Node[];
}

type Node = SplitNode | LeafNode;

// ---------- Utils ----------
const uid = () => Math.random().toString(36).slice(2, 9);
const nearlyEqual = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;

/** Adds a blank line between previous text and the new line if previous exists. */
function appendGeneratedLine(existingText: string | undefined, newLine: string) {
  const prev = existingText || "";
  return prev ? `${prev}\n\n${newLine}` : newLine;
}

const DEFAULT_LEAF = (): LeafNode => ({
  id: uid(), 
  kind: "leaf", 
  contentType: "text",
  textProps: { 
    text: "Click to edit this segment...", 
    align: "left", 
    fontSize: 16, 
    lineHeight: 1.5, 
    padding: 16, 
    bg: "transparent", 
    italic: false, 
    bold: false, 
    radius: 8,
    fontFamily: "Inter",
    letterSpacing: 0,
    wordSpacing: 0
  },
  imageProps: { 
    url: "", 
    objectFit: "cover", 
    scale: 1, 
    offsetX: 0, 
    offsetY: 0, 
    radius: 8, 
    padding: 0, 
    bg: "transparent",
    opacity: 1,
    filter: "none"
  },
});

// Enhanced Presets
const layoutTwoColumns = (): SplitNode => ({ id: uid(), kind: "split", direction: "horizontal", sizes: [0.5,0.5], children: [DEFAULT_LEAF(), DEFAULT_LEAF()] });
const layoutThreeColumns = (): SplitNode => ({ id: uid(), kind: "split", direction: "horizontal", sizes: [0.33,0.33,0.34], children: [DEFAULT_LEAF(), DEFAULT_LEAF(), DEFAULT_LEAF()] });
const layoutTwoByTwo = (): SplitNode => ({ id: uid(), kind: "split", direction: "vertical", sizes: [0.5,0.5], children: [ { id: uid(), kind: "split", direction: "horizontal", sizes:[0.5,0.5], children:[DEFAULT_LEAF(), DEFAULT_LEAF()]}, { id: uid(), kind: "split", direction: "horizontal", sizes:[0.5,0.5], children:[DEFAULT_LEAF(), DEFAULT_LEAF()] } ]});
const layoutMagazine = (): SplitNode => ({ id: uid(), kind: "split", direction: "horizontal", sizes: [0.62,0.38], children: [ DEFAULT_LEAF(), { id: uid(), kind: "split", direction: "vertical", sizes:[0.6,0.4], children:[DEFAULT_LEAF(), DEFAULT_LEAF()] } ] });
const layoutHeaderColumns = (): SplitNode => ({ id: uid(), kind: "split", direction: "vertical", sizes:[0.25,0.75], children:[ DEFAULT_LEAF(), { id: uid(), kind: "split", direction: "horizontal", sizes:[0.5,0.5], children:[DEFAULT_LEAF(), DEFAULT_LEAF()] } ]});
const layoutFullBleed = (): SplitNode => ({ id: uid(), kind: "split", direction: "horizontal", sizes:[1], children:[DEFAULT_LEAF()] });
const layoutComic6Panel = (): SplitNode => ({ id: uid(), kind: "split", direction: "vertical", sizes:[0.33,0.33,0.34], children: [ { id: uid(), kind: "split", direction: "horizontal", sizes:[0.5,0.5], children:[DEFAULT_LEAF(), DEFAULT_LEAF()]}, { id: uid(), kind: "split", direction: "horizontal", sizes:[0.5,0.5], children:[DEFAULT_LEAF(), DEFAULT_LEAF()]}, { id: uid(), kind: "split", direction: "horizontal", sizes:[0.5,0.5], children:[DEFAULT_LEAF(), DEFAULT_LEAF()]} ]});
const layoutComicSplash = (): SplitNode => ({ id: uid(), kind: "split", direction: "vertical", sizes:[0.8,0.2], children: [ DEFAULT_LEAF(), { id: uid(), kind: "split", direction: "horizontal", sizes:[0.33,0.33,0.34], children:[DEFAULT_LEAF(), DEFAULT_LEAF(), DEFAULT_LEAF()] } ] });
const layoutPyramid = (): SplitNode => ({ id: uid(), kind: "split", direction: "vertical", sizes:[0.3,0.7], children: [ DEFAULT_LEAF(), { id: uid(), kind: "split", direction: "horizontal", sizes:[0.25,0.5,0.25], children:[DEFAULT_LEAF(), DEFAULT_LEAF(), DEFAULT_LEAF()] } ] });

const PRESETS = [
  { name: "Two Col", build: layoutTwoColumns },
  { name: "Three Col", build: layoutThreeColumns },
  { name: "2×2", build: layoutTwoByTwo },
  { name: "Magazine", build: layoutMagazine },
  { name: "Header+Cols", build: layoutHeaderColumns },
  { name: "Full", build: layoutFullBleed },
  { name: "6-Panel", build: layoutComic6Panel },
  { name: "Splash", build: layoutComicSplash },
  { name: "Pyramid", build: layoutPyramid },
];

// Tree utils
const findNode = (node: Node, id: string): Node | null => 
  node.id === id ? node : node.kind === "split" ? node.children.map(c=>findNode(c,id)).find(Boolean) || null : null;

const updateNode = (node: Node, id: string, updater: (node: Node) => Node): Node => 
  node.id === id ? updater(node) : node.kind === "split" ? ({...node, children: node.children.map(c=>updateNode(c,id,updater))}) : node;

const clone = (obj: any) => JSON.parse(JSON.stringify(obj));

// ---------- Component ----------
export default function GraphicNovelBuilder(){
  // Pages & selection
  const [pages, setPages] = useState<SplitNode[]>([layoutMagazine(), layoutMagazine()]);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [selectedPage, setSelectedPage] = useState(0);
  const [selectedId, setSelectedId] = useState("");

  // Global visuals
  const [gutter, setGutter] = useState(12);
  const [pageBg, setPageBg] = useState("#f5f5f5");
  const [pageRadius, setPageRadius] = useState(16);
  const [pageGap, setPageGap] = useState(24);
  const [canvasBg, setCanvasBg] = useState("#111111");
  const [outline, setOutline] = useState(true);
  const [aspect, setAspect] = useState(1.414);

  // Undo
  const [undoSnapshot, setUndoSnapshot] = useState("");

  // Fit-to-screen & panels
  const [zoom, setZoom] = useState(1);
  const [autoFit, setAutoFit] = useState(true);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);

  // AI state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiNeg, setAiNeg] = useState("");
  const [aiRef, setAiRef] = useState("");
  const [aiSeed, setAiSeed] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);

  // Text generation prompts
  const [storyPrompts] = useState([
    "A mysterious figure emerges from the shadows",
    "The ancient artifact begins to glow with otherworldly power",
    "Thunder crashes as the battle reaches its climax",
    "A whispered secret changes everything",
    "The portal opens, revealing an impossible landscape",
    "Time seems to stand still in this moment",
    "A single tear falls, carrying the weight of loss",
    "The hero realizes the true cost of their journey"
  ]);

  // Load / Save
  useEffect(()=>{
    const s = localStorage.getItem("novelBuilderV3_spreads");
    if(s){
      try{
        const p = JSON.parse(s);
        if(Array.isArray(p.pages) && p.pages.length) setPages(p.pages);
        if(p.spreadIndex!==undefined) setSpreadIndex(p.spreadIndex);
        if(p.selectedPage!==undefined) setSelectedPage(p.selectedPage);
        p.pageBg && setPageBg(p.pageBg);
        p.pageRadius!==undefined && setPageRadius(p.pageRadius);
        p.pageGap!==undefined && setPageGap(p.pageGap);
        p.canvasBg && setCanvasBg(p.canvasBg);
        p.aspect && setAspect(p.aspect);
        p.outline!==undefined && setOutline(p.outline);
        p.gutter!==undefined && setGutter(p.gutter);
      }catch{}
    }
  },[]);
  
  useEffect(()=>{
    localStorage.setItem("novelBuilderV3_spreads", JSON.stringify({ 
      pages, spreadIndex, selectedPage, gutter, pageBg, pageRadius, pageGap, canvasBg, aspect, outline 
    }));
  }, [pages, spreadIndex, selectedPage, gutter, pageBg, pageRadius, pageGap, canvasBg, aspect, outline]);

  const captureUndo = useCallback(()=>{
    setUndoSnapshot(JSON.stringify({ pages, spreadIndex, selectedPage, gutter, pageBg, pageRadius, pageGap, canvasBg, aspect, outline }));
  }, [pages, spreadIndex, selectedPage, gutter, pageBg, pageRadius, pageGap, canvasBg, aspect, outline]);
  
  const doUndo = useCallback(()=>{
    if(!undoSnapshot) return;
    try{
      const p = JSON.parse(undoSnapshot);
      p.pages && setPages(p.pages);
      p.spreadIndex!==undefined && setSpreadIndex(p.spreadIndex);
      p.selectedPage!==undefined && setSelectedPage(p.selectedPage);
      p.gutter!==undefined && setGutter(p.gutter);
      p.pageBg && setPageBg(p.pageBg);
      p.pageRadius!==undefined && setPageRadius(p.pageRadius);
      p.pageGap!==undefined && setPageGap(p.pageGap);
      p.canvasBg && setCanvasBg(p.canvasBg);
      p.aspect && setAspect(p.aspect);
      p.outline!==undefined && setOutline(p.outline);
      setUndoSnapshot("");
    }catch{}
  }, [undoSnapshot]);

  // Page helpers
  const currentLeft = pages[spreadIndex] || layoutMagazine();
  const currentRight = pages[spreadIndex+1] || null;
  const selectedRoot: SplitNode = pages[selectedPage] || currentLeft;

  const updatePage = useCallback((pageIdx: number, fn: (page: SplitNode) => SplitNode)=>{
    captureUndo();
    setPages(prev=> prev.map((pg, i)=> i===pageIdx ? fn(pg) : pg));
  }, [captureUndo]);

  const replaceWithPreset = (build: () => SplitNode)=>{
    if(selectedPage==null) return;
    updatePage(selectedPage, ()=>build());
    setSelectedId("");
  };

  // Selection
  const selectedNode = useMemo(()=> (selectedId ? findNode(selectedRoot, selectedId) : null), [selectedRoot, selectedId]);

  // Enhanced text generation
  const onGenerateText = ()=>{
    if(!selectedNode || selectedNode.kind!=="leaf") return;
    const randomPrompt = storyPrompts[Math.floor(Math.random() * storyPrompts.length)];
    updatePage(selectedPage, prev=>updateNode(prev, selectedNode.id, n=> n.kind!=="leaf"? n as any : ({
      ...n,
      textProps:{
        ...n.textProps,
        text: appendGeneratedLine(n.textProps.text || "", randomPrompt)
      }
    })));
  };

  // Enhanced AI image generation
  async function generateAIImage(){
    if(!selectedNode || selectedNode.kind!=="leaf") return;
    if(!aiPrompt.trim()) { 
      toast.error("Please enter a prompt for AI generation"); 
      return; 
    }
    
    try{
      setAiLoading(true);
      toast.info("Starting AI image generation...");
      
      const { data, error } = await supabase.functions.invoke('generate-image-novel', {
        body: {
          prompt: aiPrompt,
          negative_prompt: aiNeg || undefined,
          seed: aiSeed || undefined,
          input_image: aiRef || undefined,
          aspect_ratio: "1:1",
          output_format: "webp"
        }
      });

      if (error) {
        console.error("Generation error:", error);
        throw new Error(error.message || "Failed to generate image");
      }

      if (!data?.imageURL) {
        throw new Error("No image URL received from generation service");
      }

      updatePage(selectedPage, prev=>updateNode(prev, selectedNode.id, n=> n.kind!=="leaf"? n as any : ({
        ...n, 
        contentType:"image", 
        imageProps:{...n.imageProps, url: data.imageURL}
      })));
      
      toast.success("AI image generated successfully!");
      
    } catch(e) { 
      const message = e instanceof Error ? e.message : "AI generation failed";
      toast.error(`AI generation error: ${message}`);
    } finally { 
      setAiLoading(false); 
    }
  }

  // Auto-fit page spread to viewport
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    function fit(){
      if(!autoFit) return;
      const el = containerRef.current; 
      if(!el) return;
      const pageW = 900; 
      const pageH = pageW * aspect;
      const spreadW = pageW * 2 + pageGap; 
      const spreadH = pageH;
      const { clientWidth, clientHeight } = el;
      const z = Math.min(clientWidth / spreadW, clientHeight / spreadH);
      setZoom(z > 0 ? z : 1);
    }
    fit(); 
    const obs = new ResizeObserver(fit); 
    if(containerRef.current) obs.observe(containerRef.current); 
    return ()=>obs.disconnect();
  }, [aspect, autoFit, pageGap]);

  // Page operations
  const addPage = (tpl = layoutFullBleed) => { 
    captureUndo(); 
    setPages(p=>[...p, tpl()]); 
  };
  
  const duplicatePage = () => { 
    captureUndo(); 
    setPages(p=>{ 
      const src = p[selectedPage] || layoutFullBleed(); 
      return [...p.slice(0, selectedPage+1), clone(src), ...p.slice(selectedPage+1) ]; 
    }); 
  };
  
  const deletePage = () => { 
    if(pages.length<=1) return; 
    captureUndo(); 
    setPages(p=>{ 
      const np = p.filter((_,i)=> i!==selectedPage); 
      const newSel = Math.max(0, Math.min(np.length-1, selectedPage-1)); 
      setSelectedPage(newSel); 
      setSelectedId(""); 
      return np; 
    }); 
  };

  // Export functionality
  const exportAsJSON = () => {
    const exportData = {
      pages,
      settings: { gutter, pageBg, pageRadius, pageGap, canvasBg, aspect, outline },
      metadata: {
        version: "3.0",
        createdAt: new Date().toISOString(),
        pageCount: pages.length
      }
    };
    
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    toast.success("Story data copied to clipboard!");
  };

  // Rendering
  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-neutral-900 text-neutral-100">
      {/* Enhanced Top Bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
        <div className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
          Graphic Novel Builder
        </div>
        
        {/* Layout Presets */}
        <div className="hidden lg:flex gap-2 ml-4">
          {PRESETS.map(p=> (
            <Button 
              key={p.name} 
              onClick={()=>replaceWithPreset(p.build)} 
              variant="outline" 
              size="sm"
              className="text-xs h-8"
              title={`Apply ${p.name} layout to page ${selectedPage+1}`}
            >
              {p.name}
            </Button>
          ))}
        </div>
        
        {/* Navigation */}
        <div className="flex items-center gap-2 text-sm ml-4">
          <Button 
            onClick={()=>{ if(spreadIndex>0){ setSpreadIndex(i=>i-2<0?0:i-2); } }} 
            variant="outline" 
            size="sm"
            disabled={spreadIndex === 0}
          >
            ← Prev
          </Button>
          <Badge variant="secondary" className="px-3">
            Pages {spreadIndex+1}-{Math.min(pages.length, spreadIndex+2)} of {pages.length}
          </Badge>
          <Button 
            onClick={()=>{ if(spreadIndex+2 < pages.length){ setSpreadIndex(i=>i+2); } }} 
            variant="outline" 
            size="sm"
            disabled={spreadIndex + 2 >= pages.length}
          >
            Next →
          </Button>
          <Badge variant="outline" className="ml-2">
            Selected: Page {selectedPage+1}
          </Badge>
        </div>
        
        {/* Controls */}
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={doUndo} variant="outline" size="sm" disabled={!undoSnapshot}>
            Undo
          </Button>
          <Button 
            onClick={()=>setShowLeft(v=>!v)} 
            variant={showLeft ? "default" : "outline"} 
            size="sm"
          >
            Panels
          </Button>
          <Button 
            onClick={()=>setShowRight(v=>!v)} 
            variant={showRight ? "default" : "outline"} 
            size="sm"
          >
            Inspector
          </Button>
          <Button onClick={()=>setAutoFit(true)} variant="outline" size="sm">
            Fit
          </Button>
          <Button 
            onClick={()=>{setAutoFit(false); setZoom(z=>Math.max(0.25,z-0.05));}} 
            variant="outline" 
            size="sm"
          >
            -
          </Button>
          <span className="text-xs w-12 text-center tabular-nums">
            {Math.round(zoom*100)}%
          </span>
          <Button 
            onClick={()=>{setAutoFit(false); setZoom(z=>Math.min(2,z+0.05));}} 
            variant="outline" 
            size="sm"
          >
            +
          </Button>
          <Button onClick={exportAsJSON} variant="outline" size="sm">
            Export
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className={`flex-1 grid ${showLeft && showRight ? "grid-cols-[280px_1fr_360px]" : showLeft ? "grid-cols-[280px_1fr]" : showRight ? "grid-cols-[1fr_360px]" : "grid-cols-1"} gap-0 min-h-0`}>
        
        {/* Left Panel */}
        {showLeft && (
          <div className="border-r border-neutral-800 bg-neutral-950/50 overflow-auto">
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">
                  Document
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <Button onClick={()=>addPage()} variant="outline" size="sm">
                    Add Page
                  </Button>
                  <Button onClick={duplicatePage} variant="outline" size="sm">
                    Duplicate Page
                  </Button>
                  <Button 
                    onClick={deletePage} 
                    variant="destructive" 
                    size="sm"
                    disabled={pages.length <= 1}
                  >
                    Delete Page
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-neutral-300">Global Settings</h4>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-neutral-400">Spread Gap: {pageGap}px</Label>
                    <Slider
                      value={[pageGap]}
                      onValueChange={([value])=>setPageGap(value)}
                      max={80}
                      step={1}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-neutral-400">Page Radius: {pageRadius}px</Label>
                    <Slider
                      value={[pageRadius]}
                      onValueChange={([value])=>setPageRadius(value)}
                      max={48}
                      step={1}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-neutral-400">Gutter: {gutter}px</Label>
                    <Slider
                      value={[gutter]}
                      onValueChange={([value])=>setGutter(value)}
                      max={48}
                      step={1}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-neutral-400">Aspect Ratio</Label>
                    <Select value={aspect.toString()} onValueChange={(value)=>setAspect(parseFloat(value))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.414">A4 (√2)</SelectItem>
                        <SelectItem value="1.5">3:2</SelectItem>
                        <SelectItem value="1.333">4:3</SelectItem>
                        <SelectItem value="1.777">16:9</SelectItem>
                        <SelectItem value="1.294">US Letter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-neutral-400">Canvas</Label>
                      <Input 
                        type="color" 
                        value={canvasBg} 
                        onChange={(e)=>setCanvasBg(e.target.value)} 
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-neutral-400">Page</Label>
                      <Input 
                        type="color" 
                        value={pageBg} 
                        onChange={(e)=>setPageBg(e.target.value)} 
                        className="h-8"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="outlines" 
                      checked={outline} 
                      onCheckedChange={(checked)=>setOutline(!!checked)} 
                    />
                    <Label htmlFor="outlines" className="text-xs text-neutral-400">
                      Show Outlines
                    </Label>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-neutral-300 mb-3">Pages</h4>
                <div className="grid grid-cols-4 gap-2">
                  {pages.map((_,i)=> (
                    <Button
                      key={i} 
                      onClick={()=>{ 
                        setSelectedPage(i); 
                        setSpreadIndex(i%2===0 ? i : i-1); 
                        setSelectedId(""); 
                      }} 
                      variant={i===selectedPage ? "default" : "outline"}
                      size="sm"
                      className="aspect-[0.707] p-1 text-xs h-auto"
                      title={`Go to page ${i+1}`}
                    >
                      {i+1}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div 
          ref={containerRef} 
          className="min-h-0 overflow-hidden relative flex items-center justify-center" 
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
            {[currentLeft, currentRight].filter(Boolean).map((pageRoot, idx)=> (
              <div 
                key={idx} 
                className="relative" 
                style={{ 
                  width: 900, 
                  height: 900*aspect, 
                  background: pageBg, 
                  borderRadius: pageRadius 
                }} 
                onClick={()=>{ 
                  const i = spreadIndex + idx; 
                  setSelectedPage(i); 
                }}
              >
                <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: pageRadius }}>
                  <RenderNode
                    node={pageRoot as SplitNode}
                    gutter={gutter}
                    outline={outline}
                    selectedId={selectedPage === (spreadIndex+idx) ? selectedId : ""}
                    onSelect={(id)=>{ setSelectedPage(spreadIndex+idx); setSelectedId(id); }}
                    onResize={(id, index, delta)=> updatePage(spreadIndex+idx, prev=>updateNode(prev, id, n=>applyResize(n,index,delta)))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Inspector */}
        {showRight && (
          <div className="border-l border-neutral-800 bg-neutral-950/50 overflow-auto">
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Inspector
                </h3>
                <p className="text-xs text-neutral-500">
                  Editing page {selectedPage+1}
                  {selectedNode && (
                    <span className="block mt-1">
                      Segment: <code className="text-neutral-400">{selectedNode.id}</code>
                    </span>
                  )}
                </p>
              </div>
              
              {!selectedNode && (
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardContent className="p-4">
                    <p className="text-sm text-neutral-400 text-center">
                      Click a segment to edit its properties
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {selectedNode && selectedNode.kind === "leaf" && (
                <EnhancedLeafInspector 
                  node={selectedNode} 
                  onChange={(updater)=>updatePage(selectedPage, prev=>updateNode(prev, selectedNode.id, updater))} 
                  onGenerateText={onGenerateText}
                  aiPrompt={aiPrompt}
                  setAiPrompt={setAiPrompt}
                  aiNeg={aiNeg}
                  setAiNeg={setAiNeg}
                  aiRef={aiRef}
                  setAiRef={setAiRef}
                  aiSeed={aiSeed}
                  setAiSeed={setAiSeed}
                  aiLoading={aiLoading}
                  generateAIImage={generateAIImage}
                />
              )}
              
              {selectedNode && selectedNode.kind === "split" && (
                <SplitInspector 
                  node={selectedNode} 
                  onChange={(updater)=>updatePage(selectedPage, prev=>updateNode(prev, selectedNode.id, updater))} 
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Component implementations...
interface RenderNodeProps {
  node: Node;
  gutter: number;
  outline: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  onResize: (id: string, index: number, delta: number) => void;
}

function RenderNode({ node, gutter, outline, selectedId, onSelect, onResize }: RenderNodeProps){
  if(node.kind === "leaf") {
    return (
      <LeafView 
        node={node} 
        selected={selectedId===node.id} 
        onSelect={()=>onSelect(node.id)} 
        outline={outline} 
      />
    );
  }
  return (
    <SplitView 
      node={node} 
      gutter={gutter} 
      outline={outline} 
      selectedId={selectedId} 
      onSelect={onSelect} 
      onResize={onResize} 
    />
  );
}

interface SplitViewProps {
  node: SplitNode;
  gutter: number;
  outline: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  onResize: (id: string, index: number, delta: number) => void;
}

function SplitView({ node, gutter, outline, selectedId, onSelect, onResize }: SplitViewProps){
  const ref = useRef<HTMLDivElement>(null);
  const isH = node.direction === "horizontal";
  const drag = useRef({ active:false, index:-1, start:0 });

  const onMouseDown = (e: React.MouseEvent, i: number)=>{ 
    e.preventDefault(); 
    drag.current={active:true,index:i,start: isH? e.clientX: e.clientY}; 
    const el = ref.current; 
    if(!el) return; 
    const rect=el.getBoundingClientRect(); 
    
    const onMove = (ev: MouseEvent)=>{ 
      if(!drag.current.active) return; 
      const cur = isH? ev.clientX: ev.clientY; 
      const deltaPx = cur - drag.current.start; 
      const totalPx = isH? rect.width: rect.height; 
      const frac = totalPx>0? deltaPx/totalPx: 0; 
      onResize(node.id, i, frac); 
    }; 
    
    const onUp=()=>{ 
      drag.current.active=false; 
      window.removeEventListener("mousemove", onMove); 
      window.removeEventListener("mouseup", onUp); 
    }; 
    
    window.addEventListener("mousemove", onMove); 
    window.addEventListener("mouseup", onUp); 
  };

  return (
    <div 
      ref={ref} 
      className="absolute inset-0 flex" 
      style={{ 
        flexDirection: isH?"row":"column", 
        gap:`${gutter}px`, 
        padding:`${gutter}px`, 
        boxSizing:"border-box"
      }}
    >
      {node.children.map((child,i)=> (
        <div 
          key={child.id} 
          className="relative" 
          style={{ 
            flexBasis:`${(node.sizes[i]*100).toFixed(3)}%`, 
            flexGrow:0, 
            flexShrink:0 
          }}
        >
          <div className="absolute inset-0">
            <RenderNode 
              node={child} 
              gutter={gutter} 
              outline={outline} 
              selectedId={selectedId} 
              onSelect={onSelect} 
              onResize={onResize} 
            />
          </div>
          {i < node.children.length-1 && (
            <Divider 
              isHorizontal={isH} 
              onMouseDown={(e)=>onMouseDown(e,i)} 
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface DividerProps {
  isHorizontal: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

function Divider({ isHorizontal, onMouseDown }: DividerProps){
  const common = "absolute z-10 opacity-70 hover:opacity-100 transition-opacity bg-emerald-500/20 hover:bg-emerald-500/40";
  return isHorizontal ? (
    <div 
      className={`${common} top-0 -right-[7px] h-full w-[14px] cursor-col-resize`} 
      onMouseDown={onMouseDown}
    >
      <div className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-[2px] bg-emerald-400 rounded" />
    </div>
  ) : (
    <div 
      className={`${common} -bottom-[7px] left-0 w-full h-[14px] cursor-row-resize`} 
      onMouseDown={onMouseDown}
    >
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-10 h-[2px] bg-emerald-400 rounded" />
    </div>
  );
}

function applyResize(n: Node, index: number, delta: number): Node{ 
  if(n.kind!=="split") return n; 
  const sizes=[...n.sizes]; 
  const min=0.08; 
  const total=sizes[index]+sizes[index+1]; 
  let a=sizes[index]+delta; 
  a=Math.max(min,Math.min(a,total-min)); 
  sizes[index]=a; 
  sizes[index+1]=total-a; 
  return {...n, sizes}; 
}

interface LeafViewProps {
  node: LeafNode;
  selected: boolean;
  onSelect: () => void;
  outline: boolean;
}

function LeafView({ node, selected, onSelect, outline }: LeafViewProps){
  const onClick = (e: React.MouseEvent)=>{ 
    e.stopPropagation(); 
    onSelect(); 
  };
  
  const pad = node.contentType === "image" ? (node.imageProps.padding ?? 0) : (node.textProps.padding ?? 0);
  const bg = node.contentType === "image" ? (node.imageProps.bg ?? "transparent") : (node.textProps.bg ?? "transparent");
  const rad = node.contentType === "image" ? (node.imageProps.radius||0) : (node.textProps.radius||0);
  
  return (
    <div 
      onClick={onClick} 
      className={`w-full h-full ${outline?"ring-1 ring-neutral-700":""} ${selected?"ring-2 ring-emerald-400 ring-offset-1 ring-offset-neutral-900":""} overflow-hidden cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-emerald-500/50`} 
      style={{ background:bg, borderRadius: rad }}
    >
      {node.contentType === "image" ? 
        <ImageContent node={node} padding={pad} /> : 
        <TextContent node={node} padding={pad} />
      }
    </div>
  );
}

interface ImageContentProps {
  node: LeafNode;
  padding: number;
}

function ImageContent({ node, padding }: ImageContentProps){
  const img = node.imageProps;
  return (
    <div className="relative w-full h-full" style={{ padding }}>
      <div 
        className="absolute inset-0 overflow-hidden bg-neutral-800" 
        style={{ 
          borderRadius: img.radius,
          opacity: img.opacity
        }}
      >
        {img.url ? (
          <img 
            src={img.url} 
            alt="segment" 
            className="w-full h-full select-none pointer-events-none" 
            style={{ 
              objectFit: img.objectFit, 
              transform: `translate(${img.offsetX||0}%, ${img.offsetY||0}%) scale(${img.scale||1})`, 
              transformOrigin:"center",
              filter: img.filter || "none"
            }} 
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-neutral-400 text-sm">
            <div className="text-center">
              <div className="text-2xl mb-2">🖼️</div>
              <div>No image</div>
              <div className="text-xs opacity-70">Click to add</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TextContentProps {
  node: LeafNode;
  padding: number;
}

function TextContent({ node, padding }: TextContentProps){
  const t = node.textProps; 
  const style = { 
    fontSize:`${t.fontSize||16}px`, 
    lineHeight:t.lineHeight||1.5, 
    textAlign:t.align||"left", 
    fontStyle: t.italic?"italic":"normal", 
    fontWeight: t.bold?700:400,
    fontFamily: t.fontFamily || "Inter",
    letterSpacing: `${t.letterSpacing||0}px`,
    wordSpacing: `${t.wordSpacing||0}px`
  } as React.CSSProperties;
  
  return (
    <div className="w-full h-full overflow-auto" style={{ padding }}>
      <div className="whitespace-pre-wrap break-words" style={style}>
        {t.text || "Click to edit text..."}
      </div>
    </div>
  );
}

// Enhanced inspectors...
interface EnhancedLeafInspectorProps {
  node: LeafNode;
  onChange: (updater: (node: LeafNode) => LeafNode) => void;
  onGenerateText: () => void;
  aiPrompt: string;
  setAiPrompt: (value: string) => void;
  aiNeg: string;
  setAiNeg: (value: string) => void;
  aiRef: string;
  setAiRef: (value: string) => void;
  aiSeed: number;
  setAiSeed: (value: number) => void;
  aiLoading: boolean;
  generateAIImage: () => void;
}

function EnhancedLeafInspector({ 
  node, onChange, onGenerateText, 
  aiPrompt, setAiPrompt, aiNeg, setAiNeg, aiRef, setAiRef, 
  aiSeed, setAiSeed, aiLoading, generateAIImage 
}: EnhancedLeafInspectorProps) {
  const isText = node.contentType === "text";
  
  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="content">Content</TabsTrigger>
        <TabsTrigger value="style">Style</TabsTrigger>
        <TabsTrigger value="ai">AI Tools</TabsTrigger>
      </TabsList>
      
      <TabsContent value="content" className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Content Type</Label>
          <Select 
            value={node.contentType} 
            onValueChange={(value: ContentType)=>onChange(n=>({...n, contentType: value}))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">📝 Text</SelectItem>
              <SelectItem value="image">🖼️ Image</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isText ? (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Text Content</Label>
              <Textarea 
                value={node.textProps.text||""} 
                onChange={(e)=>onChange(n=>({...n, textProps:{...n.textProps, text:e.target.value}}))} 
                className="min-h-[120px] bg-neutral-900" 
                placeholder="Enter your text here..."
              />
              <Button 
                onClick={onGenerateText} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                ✨ Generate Story Text
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Image URL</Label>
              <Input 
                value={node.imageProps.url||""} 
                onChange={(e)=>onChange(n=>({...n, imageProps:{...n.imageProps, url:e.target.value}}))} 
                className="bg-neutral-900" 
                placeholder="https://example.com/image.jpg"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Paste an image URL or use AI generation below
              </p>
            </div>
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="style" className="space-y-4">
        {isText ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Font Size: {node.textProps.fontSize}px</Label>
                <Slider
                  value={[node.textProps.fontSize||16]}
                  onValueChange={([value])=>onChange(n=>({...n, textProps:{...n.textProps, fontSize:value}}))}
                  min={8}
                  max={72}
                  step={1}
                />
              </div>
              <div>
                <Label className="text-xs">Line Height: {node.textProps.lineHeight?.toFixed(1)}</Label>
                <Slider
                  value={[node.textProps.lineHeight||1.5]}
                  onValueChange={([value])=>onChange(n=>({...n, textProps:{...n.textProps, lineHeight:value}}))}
                  min={0.8}
                  max={3}
                  step={0.1}
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm">Text Alignment</Label>
              <Select 
                value={node.textProps.align||"left"} 
                onValueChange={(value: any)=>onChange(n=>({...n, textProps:{...n.textProps, align:value}}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">← Left</SelectItem>
                  <SelectItem value="center">⋄ Center</SelectItem>
                  <SelectItem value="right">→ Right</SelectItem>
                  <SelectItem value="justify">⎕ Justify</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm">Font Family</Label>
              <Select 
                value={node.textProps.fontFamily||"Inter"} 
                onValueChange={(value)=>onChange(n=>({...n, textProps:{...n.textProps, fontFamily:value}}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Times New Roman">Times</SelectItem>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Comic Sans MS">Comic Sans</SelectItem>
                  <SelectItem value="Courier New">Courier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="bold" 
                  checked={!!node.textProps.bold} 
                  onCheckedChange={(checked)=>onChange(n=>({...n, textProps:{...n.textProps, bold:!!checked}}))} 
                />
                <Label htmlFor="bold" className="text-sm">Bold</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="italic" 
                  checked={!!node.textProps.italic} 
                  onCheckedChange={(checked)=>onChange(n=>({...n, textProps:{...n.textProps, italic:!!checked}}))} 
                />
                <Label htmlFor="italic" className="text-sm">Italic</Label>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Object Fit</Label>
              <Select 
                value={node.imageProps.objectFit||"cover"} 
                onValueChange={(value: any)=>onChange(n=>({...n, imageProps:{...n.imageProps, objectFit:value}}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover</SelectItem>
                  <SelectItem value="contain">Contain</SelectItem>
                  <SelectItem value="fill">Fill</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Scale: {node.imageProps.scale?.toFixed(2)}</Label>
                <Slider
                  value={[node.imageProps.scale||1]}
                  onValueChange={([value])=>onChange(n=>({...n, imageProps:{...n.imageProps, scale:value}}))}
                  min={0.1}
                  max={3}
                  step={0.01}
                />
              </div>
              <div>
                <Label className="text-xs">Opacity: {Math.round((node.imageProps.opacity||1)*100)}%</Label>
                <Slider
                  value={[node.imageProps.opacity||1]}
                  onValueChange={([value])=>onChange(n=>({...n, imageProps:{...n.imageProps, opacity:value}}))}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Offset X: {node.imageProps.offsetX}%</Label>
                <Slider
                  value={[node.imageProps.offsetX||0]}
                  onValueChange={([value])=>onChange(n=>({...n, imageProps:{...n.imageProps, offsetX:value}}))}
                  min={-100}
                  max={100}
                  step={1}
                />
              </div>
              <div>
                <Label className="text-xs">Offset Y: {node.imageProps.offsetY}%</Label>
                <Slider
                  value={[node.imageProps.offsetY||0]}
                  onValueChange={([value])=>onChange(n=>({...n, imageProps:{...n.imageProps, offsetY:value}}))}
                  min={-100}
                  max={100}
                  step={1}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Common Style Properties */}
        <div className="space-y-3 pt-4 border-t border-neutral-800">
          <h4 className="text-sm font-medium text-neutral-300">Common</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Padding: {(isText ? node.textProps.padding : node.imageProps.padding)||0}px</Label>
              <Slider
                value={[(isText ? node.textProps.padding : node.imageProps.padding)||0]}
                onValueChange={([value])=>onChange(n=> isText ? 
                  ({...n, textProps:{...n.textProps, padding:value}}) : 
                  ({...n, imageProps:{...n.imageProps, padding:value}})
                )}
                max={48}
                step={1}
              />
            </div>
            <div>
              <Label className="text-xs">Radius: {(isText ? node.textProps.radius : node.imageProps.radius)||0}px</Label>
              <Slider
                value={[(isText ? node.textProps.radius : node.imageProps.radius)||0]}
                onValueChange={([value])=>onChange(n=> isText ? 
                  ({...n, textProps:{...n.textProps, radius:value}}) : 
                  ({...n, imageProps:{...n.imageProps, radius:value}})
                )}
                max={48}
                step={1}
              />
            </div>
          </div>
          
          <div>
            <Label className="text-sm">Background Color</Label>
            <Input 
              type="color" 
              value={(isText ? node.textProps.bg : node.imageProps.bg)||"#000000"} 
              onChange={(e)=>onChange(n=> isText ? 
                ({...n, textProps:{...n.textProps, bg:e.target.value}}) : 
                ({...n, imageProps:{...n.imageProps, bg:e.target.value}})
              )} 
              className="h-10"
            />
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="ai" className="space-y-4">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">🤖 AI Image Generation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm">Prompt</Label>
              <Textarea 
                value={aiPrompt} 
                onChange={(e)=>setAiPrompt(e.target.value)} 
                placeholder="Describe the image you want to generate..."
                className="min-h-[80px] bg-neutral-800" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Seed</Label>
                <Input 
                  type="number" 
                  value={aiSeed} 
                  onChange={(e)=>setAiSeed(parseInt(e.target.value)||0)} 
                  className="bg-neutral-800"
                />
              </div>
              <div>
                <Label className="text-sm">Negative</Label>
                <Input 
                  value={aiNeg} 
                  onChange={(e)=>setAiNeg(e.target.value)} 
                  placeholder="What to avoid..."
                  className="bg-neutral-800"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm">Reference Image URL (optional)</Label>
              <Input 
                value={aiRef} 
                onChange={(e)=>setAiRef(e.target.value)} 
                placeholder="https://example.com/reference.jpg"
                className="bg-neutral-800"
              />
            </div>
            
            <Button 
              disabled={aiLoading || !aiPrompt.trim()} 
              onClick={generateAIImage} 
              className="w-full"
            >
              {aiLoading ? "🔄 Generating..." : "✨ Generate Image"}
            </Button>
            
            <p className="text-xs text-neutral-500">
              Uses Replicate's Flux Kontext Pro model via Supabase Edge Function
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

interface SplitInspectorProps {
  node: SplitNode;
  onChange: (updater: (node: SplitNode) => SplitNode) => void;
}

function SplitInspector({ node, onChange }: SplitInspectorProps) {
  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">📐 Layout Container</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm">Direction</Label>
          <Select 
            value={node.direction} 
            onValueChange={(value: Direction)=>onChange(n=>({...n, direction: value}))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="horizontal">→ Horizontal</SelectItem>
              <SelectItem value="vertical">↓ Vertical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="text-sm mb-3 block">Child Sizes</Label>
          <div className="space-y-3">
            {node.sizes.map((s,i)=> (
              <div key={i} className="flex items-center gap-3">
                <Badge variant="outline" className="w-8 text-center">
                  {i+1}
                </Badge>
                <Slider
                  value={[s]}
                  onValueChange={([value])=>onChange(n=>{ 
                    const sizes=[...n.sizes]; 
                    let val = Math.min(0.95, Math.max(0.05, value)); 
                    const rest = Math.max(0.05, 1-val); 
                    const factor = rest/(1-sizes[i]); 
                    const newSizes = sizes.map((v,idx)=> idx===i ? val : Math.max(0.05, v*factor)); 
                    return {...n, sizes:newSizes}; 
                  })}
                  min={0.05}
                  max={0.95}
                  step={0.01}
                  className="flex-1"
                />
                <span className="text-xs tabular-nums w-12 text-right">
                  {(s*100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}