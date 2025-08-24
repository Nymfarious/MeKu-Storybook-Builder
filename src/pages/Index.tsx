import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Users, Wand2, Images, Github, ExternalLink, Zap, History } from 'lucide-react';
import { CharacterManager } from '@/components/CharacterManager';
import { ImageGenerator } from '@/components/ImageGenerator';
import { Gallery } from '@/components/Gallery';
import { BatchGenerator } from '@/components/BatchGenerator';
import { ImageHistory } from '@/components/ImageHistory';

import { Character, GeneratedImage, GenerationJob } from '@/types';
import { ReplicateService } from '@/services/replicate';
import { GenerationQueue } from '@/components/GenerationQueue';
import { toast } from 'sonner';
import heroImage from '@/assets/hero-image.jpg';

const Index = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const replicateService = useRef<ReplicateService>(new ReplicateService());

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


  const handleGenerate = useCallback(async (jobData: Omit<GenerationJob, 'id' | 'createdAt' | 'status'>) => {

    setIsGenerating(true);
    
    const character = jobData.characterId ? characters.find(c => c.id === jobData.characterId) : undefined;
    const jobId = crypto.randomUUID();
    
    // Create generation job
    const generationJob: GenerationJob = {
      id: jobId,
      characterId: jobData.characterId,
      prompt: jobData.prompt,
      seed: jobData.seed,
      useReference: jobData.useReference,
      referenceImageUrl: jobData.referenceImageUrl,
      aspectRatio: jobData.aspectRatio,
      outputFormat: jobData.outputFormat,
      promptUpsampling: jobData.promptUpsampling,
      safetyTolerance: jobData.safetyTolerance,
      status: 'pending',
      createdAt: new Date()
    };

    // Create a new generated image entry
    const generatedImage: GeneratedImage = {
      id: crypto.randomUUID(),
      characterId: jobData.characterId,
      characterName: character?.name,
      prompt: jobData.prompt,
      seed: jobData.seed,
      imageUrl: '', // Will be filled when generation completes
      useReference: jobData.useReference,
      referenceImageUrl: jobData.referenceImageUrl,
      aspectRatio: jobData.aspectRatio,
      outputFormat: jobData.outputFormat,
      promptUpsampling: jobData.promptUpsampling,
      safetyTolerance: jobData.safetyTolerance,
      status: 'generating',
      createdAt: new Date()
    };

    setGenerationJobs(prev => [generationJob, ...prev]);
    setGeneratedImages(prev => [generatedImage, ...prev]);

    try {
      // Update job status to generating
      setGenerationJobs(prev => 
        prev.map(job => job.id === jobId ? { ...job, status: 'generating' as const } : job)
      );

      // Call Replicate API with proper parameters
      const result = await replicateService.current!.generateImage({
        prompt: jobData.prompt,
        input_image: jobData.useReference ? jobData.referenceImageUrl : undefined,
        aspect_ratio: jobData.aspectRatio || "1:1",
        output_format: jobData.outputFormat || "png",
        prompt_upsampling: jobData.promptUpsampling ?? true,
        safety_tolerance: jobData.safetyTolerance ?? 2,
        seed: jobData.seed
      });

      // Update the generated image and job with the result
      const completedImage: GeneratedImage = {
        ...generatedImage,
        imageUrl: result.imageURL,
        seed: result.seed,
        predictionId: result.predictionId,
        status: 'completed'
      };
      
      setGeneratedImages(prev => 
        prev.map(img => img.id === generatedImage.id ? completedImage : img)
      );

      setGenerationJobs(prev => 
        prev.map(job => job.id === jobId ? { 
          ...job, 
          status: 'completed' as const, 
          imageUrl: result.imageURL,
          predictionId: result.predictionId 
        } : job)
      );
      
      setIsGenerating(false);
      
    } catch (error) {
      console.error('Generation error:', error);
      
      // Handle generation failure
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
      
      setIsGenerating(false);
    }
  }, [characters]);


  const handleCancelJob = useCallback(async (jobId: string) => {
    const job = generationJobs.find(j => j.id === jobId);
    if (job?.predictionId) {
      try {
        await replicateService.current.cancelGeneration(job.predictionId);
      } catch (error) {
        console.error('Cancel error:', error);
      }
    }
    
    setGenerationJobs(prev => 
      prev.map(j => j.id === jobId ? { ...j, status: 'canceled' as const } : j)
    );
    
    setGeneratedImages(prev => 
      prev.map(img => 
        img.id === jobId ? { ...img, status: 'canceled' as const } : img
      )
    );
  }, [generationJobs]);

  const handleRetryJob = useCallback((jobId: string) => {
    const job = generationJobs.find(j => j.id === jobId);
    if (job) {
      handleGenerate(job);
    }
  }, [generationJobs, handleGenerate]);

  const handleRemoveJob = useCallback((jobId: string) => {
    setGenerationJobs(prev => prev.filter(j => j.id !== jobId));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="AI Character Creation" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-hero opacity-80" />
        </div>
        
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-foreground">
                AI Character{' '}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Image Generator
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Create stunning AI-generated artwork of your characters using Replicate's Flux Kontext Pro. 
                Upload reference images and let AI bring your imagination to life with advanced control options.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8">
                <a href="/graphic-novel-builder">
                  📚 Try Graphic Novel Builder
                </a>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8">
                <Github className="h-5 w-5" />
                View Documentation
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
              <Card className="bg-card/50 backdrop-blur-sm border-border shadow-elegant">
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Character Management</h3>
                  <p className="text-muted-foreground">Create and organize characters with reference images</p>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 backdrop-blur-sm border-border shadow-elegant">
                <CardContent className="p-6 text-center">
                  <Wand2 className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">AI Generation</h3>
                  <p className="text-muted-foreground">Generate single images with multiple reference support</p>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 backdrop-blur-sm border-border shadow-elegant">
                <CardContent className="p-6 text-center">
                  <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Batch Generation</h3>
                  <p className="text-muted-foreground">Create multiple variations from different prompts</p>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 backdrop-blur-sm border-border shadow-elegant">
                <CardContent className="p-6 text-center">
                  <Images className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Gallery & History</h3>
                  <p className="text-muted-foreground">Browse, organize and download your artwork</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Main Application */}
      <section className="container mx-auto px-4 py-12">
        <Tabs defaultValue="characters" className="space-y-8">
          <div className="flex justify-center">
            <TabsList className="grid grid-cols-5 w-full max-w-2xl bg-card border-border shadow-card">
              <TabsTrigger value="characters" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="h-4 w-4 mr-2" />
                Characters
              </TabsTrigger>
              <TabsTrigger value="generate" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Wand2 className="h-4 w-4 mr-2" />
                Generate
              </TabsTrigger>
              <TabsTrigger value="batch" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Zap className="h-4 w-4 mr-2" />
                Batch
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
              <TabsTrigger value="gallery" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Images className="h-4 w-4 mr-2" />
                Gallery
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="characters" className="space-y-6">
            <CharacterManager
              characters={characters}
              onAddCharacter={addCharacter}
              onDeleteCharacter={deleteCharacter}
            />
          </TabsContent>

          <TabsContent value="generate" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <ImageGenerator
                characters={characters}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    Generation Queue
                  </h2>
                  <p className="text-muted-foreground">Track your image generation progress</p>
                </div>
                <GenerationQueue
                  jobs={generationJobs}
                  onCancelJob={handleCancelJob}
                  onRetryJob={handleRetryJob}
                  onRemoveJob={handleRemoveJob}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="batch" className="space-y-6">
            <BatchGenerator
              characters={characters}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <ImageHistory
              images={generatedImages}
              characters={characters}
            />
          </TabsContent>

          <TabsContent value="gallery" className="space-y-6">
            <Gallery
              images={generatedImages}
              characters={characters}
            />
          </TabsContent>
        </Tabs>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Built with React, TypeScript, and Tailwind CSS
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Powered by Replicate Flux Kontext Pro</span>
              <span>•</span>
              <a href="https://replicate.com/black-forest-labs/flux-kontext-pro" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                API Documentation
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Index;