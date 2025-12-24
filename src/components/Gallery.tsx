import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Download, Eye, Filter, Calendar, Palette } from 'lucide-react';
import { GeneratedImage, Character } from '@/types';
import { toast } from 'sonner';

interface GalleryProps {
  images: GeneratedImage[];
  characters: Character[];
}

export const Gallery: React.FC<GalleryProps> = ({ images, characters }) => {
  const [selectedCharacter, setSelectedCharacter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredImages = useMemo(() => {
    return images.filter(image => {
      const matchesCharacter = selectedCharacter === 'all' || 
        (selectedCharacter === 'none' ? !image.characterId : image.characterId === selectedCharacter);
      const matchesSearch = searchTerm === '' || 
        image.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (image.characterName && image.characterName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || image.status === statusFilter;

      return matchesCharacter && matchesSearch && matchesStatus;
    });
  }, [images, selectedCharacter, searchTerm, statusFilter]);

  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-generated-${prompt.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'generating': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'pending': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'failed': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Generation Gallery
        </h2>
        <p className="text-muted-foreground">Browse your AI-generated artwork</p>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-card border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by prompt or character..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            <Select value={selectedCharacter} onValueChange={setSelectedCharacter}>
              <SelectTrigger className="w-full md:w-48 bg-background border-border">
                <SelectValue />
              </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Characters</SelectItem>
                    <SelectItem value="none">No Character</SelectItem>
                {characters.map(character => (
                  <SelectItem key={character.id} value={character.id}>
                    {character.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="generating">Generating</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredImages.length > 0 && (
            <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Showing {filteredImages.length} of {images.length} images
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gallery Grid */}
      {filteredImages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredImages.map(image => (
            <Card key={image.id} className="bg-gradient-card border-border shadow-card hover:shadow-elegant transition-all duration-300 overflow-hidden group">
              <div className="aspect-square relative bg-muted">
                {image.status === 'completed' && image.imageUrl ? (
                  <>
                    <img
                      src={image.imageUrl}
                      alt={image.prompt}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownload(image.imageUrl, image.prompt)}
                          className="backdrop-blur-sm"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {image.status === 'generating' ? (
                      <div className="text-center space-y-3">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-muted-foreground">Generating...</p>
                      </div>
                    ) : image.status === 'pending' ? (
                      <div className="text-center space-y-3">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-pulse mx-auto" />
                        <p className="text-sm text-muted-foreground">In Queue...</p>
                      </div>
                    ) : (
                      <div className="text-center space-y-3">
                        <Palette className="h-12 w-12 text-destructive mx-auto" />
                        <p className="text-sm text-destructive">Generation Failed</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={`text-xs ${getStatusColor(image.status)}`}>
                    {image.status.charAt(0).toUpperCase() + image.status.slice(1)}
                  </Badge>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(image.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground line-clamp-2">{image.prompt}</p>
                  {image.characterName && (
                    <p className="text-xs text-primary mt-1">Character: {image.characterName}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {image.seed && <span>Seed: {image.seed}</span>}
                  {image.useReference && (
                    <Badge variant="outline" className="text-xs">
                      Used Reference
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-gradient-card border-border shadow-sm">
          <CardContent className="text-center py-12">
            <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Images Found</h3>
            <p className="text-muted-foreground">
              {images.length === 0 
                ? "Generate your first AI image to see it here"
                : "Try adjusting your filters to see more results"
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};