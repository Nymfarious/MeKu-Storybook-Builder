import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FolderOpen, Clock, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface RecentProject {
  id: string;
  name: string;
  lastModified: string;
  pageCount: number;
  thumbnail?: string;
}

interface RecentProjectsPanelProps {
  recentProjects: RecentProject[];
  onLoadProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export const RecentProjectsPanel = ({ 
  recentProjects, 
  onLoadProject, 
  onDeleteProject 
}: RecentProjectsPanelProps) => {
  const [open, setOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleLoad = (projectId: string) => {
    onLoadProject(projectId);
    setOpen(false);
    toast.success('Project loaded');
  };

  const handleDelete = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    onDeleteProject(projectId);
    toast.success('Project removed from recent');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" className="h-9 w-9">
              <FolderOpen className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Recent Projects</p>
          </TooltipContent>
        </Tooltip>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Recent Projects
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[350px] pr-4">
          {recentProjects.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No recent projects</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your projects will appear here after saving
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleLoad(project.id)}
                  className={cn(
                    "group flex items-center gap-3 p-3 rounded-lg border cursor-pointer",
                    "hover:bg-muted/50 hover:border-primary/50 transition-all"
                  )}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {project.thumbnail ? (
                      <img 
                        src={project.thumbnail} 
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{project.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(project.lastModified)}</span>
                      <span>•</span>
                      <span>{project.pageCount} page{project.pageCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(e, project.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between items-center pt-2 border-t text-xs text-muted-foreground">
          <span>{recentProjects.length} recent project{recentProjects.length !== 1 ? 's' : ''}</span>
          <span>Auto-saves every 30s</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};