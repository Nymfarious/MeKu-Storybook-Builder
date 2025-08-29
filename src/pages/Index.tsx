import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Palette, Users, BookOpen, ArrowRight, Zap, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '@/assets/hero-image.jpg';
import { Character, GeneratedImage, GenerationJob } from '@/types';
import { ReplicateService } from '@/services/replicate';

const Index = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const replicateService = useRef<ReplicateService>(new ReplicateService());

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
      imageUrl: '',
      // Will be filled when generation completes
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
      setGenerationJobs(prev => prev.map(job => job.id === jobId ? {
        ...job,
        status: 'generating' as const
      } : job));

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
      setGeneratedImages(prev => prev.map(img => img.id === generatedImage.id ? completedImage : img));
      setGenerationJobs(prev => prev.map(job => job.id === jobId ? {
        ...job,
        status: 'completed' as const,
        imageUrl: result.imageURL,
        predictionId: result.predictionId
      } : job));
      setIsGenerating(false);
    } catch (error) {
      console.error('Generation error:', error);

      // Handle generation failure
      setGeneratedImages(prev => prev.map(img => img.id === generatedImage.id ? {
        ...img,
        status: 'failed' as const
      } : img));
      setGenerationJobs(prev => prev.map(job => job.id === jobId ? {
        ...job,
        status: 'failed' as const
      } : job));
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
    setGenerationJobs(prev => prev.map(j => j.id === jobId ? {
      ...j,
      status: 'canceled' as const
    } : j));
    setGeneratedImages(prev => prev.map(img => img.id === jobId ? {
      ...img,
      status: 'canceled' as const
    } : img));
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

  const features = [
    {
      icon: Palette,
      title: 'Graphic Novel Builder',
      description: 'Create stunning comic book pages with AI-generated panels, characters, and layouts.',
      href: '/graphic-novel-builder',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20'
    },
    {
      icon: Users,
      title: 'Character Assets',
      description: 'Manage your character library with reference images and consistent AI generation.',
      href: '/assets',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20'
    },
    {
      icon: BookOpen,
      title: 'Digital Storybooks',
      description: 'View and organize your completed graphic novel pages in beautiful collections.',
      href: '/saved-pages',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/20'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
        <div className="absolute inset-0 opacity-5">
          <img 
            src={heroImage} 
            alt="AI Character Creation" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full border px-4 py-2 text-sm bg-secondary/50">
                <Sparkles className="h-4 w-4 mr-2 text-primary" />
                Powered by Flux Kontext Pro AI
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                Create Amazing{' '}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  AI Art
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Generate stunning character artwork, build graphic novels, and bring your creative visions to life with advanced AI technology.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 h-12">
                <Link to="/graphic-novel-builder">
                  <Palette className="h-5 w-5 mr-2" />
                  Start Creating
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg px-8 h-12">
                <Link to="/assets">
                  <Users className="h-5 w-5 mr-2" />
                  Manage Assets
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Create
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed for artists, writers, and creators who want to bring their stories to life.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-border">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                    <Button asChild variant="ghost" className="p-0 h-auto font-medium">
                      <Link to={feature.href} className="flex items-center">
                        Get Started
                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">AI</div>
              <div className="text-sm text-muted-foreground">Powered Generation</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">∞</div>
              <div className="text-sm text-muted-foreground">Creative Possibilities</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">
                <Zap className="h-8 w-8 inline" />
              </div>
              <div className="text-sm text-muted-foreground">Fast Generation</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">
                <Star className="h-8 w-8 inline" />
              </div>
              <div className="text-sm text-muted-foreground">Professional Quality</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
