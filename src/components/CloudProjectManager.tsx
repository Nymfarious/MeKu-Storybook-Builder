import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Save, FolderOpen, Copy, Trash2, Download, Upload, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Project {
  id: string;
  name: string;
  description?: string;
  data: any;
  thumbnail_url?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

interface CloudProjectManagerProps {
  currentProject: any;
  onLoadProject: (projectData: any) => void;
  onSaveProject: (projectData: any) => void;
}

export const CloudProjectManager = ({ currentProject, onLoadProject, onSaveProject }: CloudProjectManagerProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  // Load projects from database
  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error loading projects",
        description: "Failed to load your saved projects.",
        variant: "destructive",
      });
    }
  };

  const handleSaveProject = async () => {
    if (!user || !projectName.trim()) return;

    setLoading(true);
    try {
      // Check if project with this name already exists
      const existingProject = projects.find(p => p.name === projectName.trim());
      
      if (existingProject) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update({
            data: currentProject,
            description: projectDescription.trim() || null,
            version: existingProject.version + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingProject.id);

        if (error) throw error;

        toast({
          title: "Project updated",
          description: `"${projectName}" has been updated to version ${existingProject.version + 1}.`,
        });
      } else {
        // Create new project
        const { error } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: projectName.trim(),
            description: projectDescription.trim() || null,
            data: currentProject,
            version: 1,
          });

        if (error) throw error;

        toast({
          title: "Project saved",
          description: `"${projectName}" has been saved successfully.`,
        });
      }

      await loadProjects();
      setSaveDialogOpen(false);
      setProjectName('');
      setProjectDescription('');
      onSaveProject(currentProject);
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: "Error saving project",
        description: "Failed to save your project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadProject = async (project: Project) => {
    try {
      onLoadProject(project.data);
      setLoadDialogOpen(false);
      toast({
        title: "Project loaded",
        description: `"${project.name}" has been loaded successfully.`,
      });
    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: "Error loading project",
        description: "Failed to load the selected project.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateProject = async (project: Project) => {
    if (!user) return;

    setLoading(true);
    try {
      const duplicateName = `${project.name} (Copy)`;
      
      const { error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: duplicateName,
          description: project.description,
          data: project.data,
          version: 1,
        });

      if (error) throw error;

      await loadProjects();
      toast({
        title: "Project duplicated",
        description: `"${duplicateName}" has been created.`,
      });
    } catch (error) {
      console.error('Error duplicating project:', error);
      toast({
        title: "Error duplicating project",
        description: "Failed to duplicate the project.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!user || !confirm(`Are you sure you want to delete "${project.name}"?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      await loadProjects();
      toast({
        title: "Project deleted",
        description: `"${project.name}" has been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error deleting project",
        description: "Failed to delete the project.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportProject = (project: Project) => {
    const dataStr = JSON.stringify(project, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Project exported",
      description: `"${project.name}" has been downloaded as JSON.`,
    });
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  if (!user) {
    return (
      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button disabled variant="outline" size="icon" className="relative">
              <Save className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 text-destructive text-xs font-bold">*</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save (Login Required)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button disabled variant="outline" size="icon" className="relative">
              <FolderOpen className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 text-destructive text-xs font-bold">*</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Load (Login Required)</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save Project
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <Label htmlFor="project-description">Description (Optional)</Label>
              <Textarea
                id="project-description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Brief description of your project"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProject} disabled={loading || !projectName.trim()}>
                {loading ? 'Saving...' : 'Save Project'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <FolderOpen className="mr-2 h-4 w-4" />
            Load Project
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Load Project</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px]">
            <div className="grid gap-4">
              {projects.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      No saved projects found. Create and save your first project!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                projects.map((project) => (
                  <Card key={project.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          {project.description && (
                            <CardDescription className="mt-1">
                              {project.description}
                            </CardDescription>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(project.updated_at)}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Version {project.version}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleLoadProject(project)}
                          >
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDuplicateProject(project)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportProject(project)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteProject(project)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};