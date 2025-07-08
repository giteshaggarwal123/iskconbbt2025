
import React, { useState } from 'react';
import { FolderOpen, Lock, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_hidden: boolean;
  is_locked: boolean;
}

interface DragDropZoneProps {
  folders: Folder[];
  onMoveDocument: (documentId: string, targetFolderId: string | null) => void;
  draggedDocumentId: string | null;
  canAccessLockedFolders?: boolean;
}

export const DragDropZone: React.FC<DragDropZoneProps> = ({
  folders,
  onMoveDocument,
  draggedDocumentId,
  canAccessLockedFolders = false
}) => {
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const folder = folders.find(f => f.id === folderId);
    
    // Check if user can access locked folders
    if (folder?.is_locked && !canAccessLockedFolders) {
      return;
    }
    
    setDragOverFolder(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolder(null);
    
    if (!draggedDocumentId) return;
    
    const folder = folders.find(f => f.id === folderId);
    
    // Check if user can access locked folders
    if (folder?.is_locked && !canAccessLockedFolders) {
      toast({
        title: "Access Denied",
        description: "Cannot move documents to locked folders",
        variant: "destructive"
      });
      return;
    }
    
    onMoveDocument(draggedDocumentId, folderId);
  };

  if (!draggedDocumentId) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/20 z-50 pointer-events-none">
      <div className="absolute top-4 right-4 bg-card border rounded-lg p-4 shadow-lg pointer-events-auto max-w-sm">
        <h4 className="font-medium mb-3 flex items-center">
          <Upload className="h-4 w-4 mr-2" />
          Drop to move document
        </h4>
        
        {/* Root folder drop zone */}
        <div
          className={`p-3 border-2 border-dashed rounded-lg mb-2 transition-colors pointer-events-auto ${
            dragOverFolder === null ? 'border-primary bg-primary/10' : 'border-muted-foreground'
          }`}
          onDragOver={(e) => handleDragOver(e, null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
        >
          <div className="flex items-center space-x-2">
            <FolderOpen className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Root Folder</span>
          </div>
        </div>
        
        {/* Folder drop zones */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {folders.map((folder) => {
            const isLocked = folder.is_locked && !canAccessLockedFolders;
            
            return (
              <div
                key={folder.id}
                className={`p-3 border-2 border-dashed rounded-lg transition-colors pointer-events-auto ${
                  isLocked
                    ? 'border-red-200 bg-red-50 opacity-50 cursor-not-allowed'
                    : dragOverFolder === folder.id
                    ? 'border-primary bg-primary/10'
                    : 'border-muted-foreground hover:border-primary/50'
                }`}
                onDragOver={(e) => !isLocked && handleDragOver(e, folder.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => !isLocked && handleDrop(e, folder.id)}
              >
                <div className="flex items-center space-x-2">
                  {folder.is_locked ? (
                    <Lock className="h-4 w-4 text-red-500" />
                  ) : (
                    <FolderOpen className="h-4 w-4 text-blue-500" />
                  )}
                  <span className={`text-sm truncate ${folder.is_locked ? 'text-red-600' : ''}`}>
                    {folder.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
