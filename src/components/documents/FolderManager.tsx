
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Folder, Plus, Trash2, FolderOpen, Lock, Unlock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

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

interface FolderManagerProps {
  folders: Folder[];
  onCreateFolder: (folderName: string, parentFolderId?: string) => Promise<any>;
  onDeleteFolder: (folderId: string) => Promise<boolean>;
  currentFolderId?: string | null;
  showCreateButton?: boolean;
  userCanAccessLocked?: boolean;
  showFolderStructure?: boolean;
}

export const FolderManager: React.FC<FolderManagerProps> = ({
  folders,
  onCreateFolder,
  onDeleteFolder,
  currentFolderId,
  showCreateButton = true,
  userCanAccessLocked = false,
  showFolderStructure = false
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | undefined>(currentFolderId || undefined);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { isSuperAdmin } = useUserRole();

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast({
        title: "Invalid Folder Name",
        description: "Please enter a folder name",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const result = await onCreateFolder(folderName.trim(), parentFolderId);
      if (result) {
        setFolderName('');
        setParentFolderId(currentFolderId || undefined);
        setCreateDialogOpen(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    const success = await onDeleteFolder(folderId);
    if (success) {
      toast({
        title: "Folder Deleted",
        description: `"${folderName}" has been deleted successfully`
      });
    }
  };

  const getFolderHierarchy = (folderId: string | null, visited = new Set()): Folder[] => {
    if (visited.has(folderId || 'null')) return [];
    visited.add(folderId || 'null');
    
    return folders.filter(folder => folder.parent_folder_id === folderId);
  };

  const renderFolderTree = (parentId: string | null = null, level = 0): React.ReactNode => {
    const childFolders = getFolderHierarchy(parentId);
    
    return childFolders.map(folder => {
      // Hide locked folders from non-admin users
      if (folder.is_locked && !userCanAccessLocked) {
        return null;
      }

      return (
        <div key={folder.id} style={{ marginLeft: `${level * 20}px` }} className="border-l border-gray-200 pl-4 my-2">
          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              {folder.is_locked ? (
                <Lock className="h-4 w-4 text-red-500" />
              ) : (
                <FolderOpen className="h-4 w-4 text-blue-500" />
              )}
              <span className={`font-medium ${folder.is_locked ? 'text-red-700' : ''}`}>
                {folder.name}
                {folder.is_locked && <span className="text-xs ml-2 text-red-600">(LOCKED)</span>}
              </span>
              {/* Lock/Unlock button for super admins */}
              {isSuperAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 ml-2"
                  title={folder.is_locked ? 'Unlock Folder' : 'Lock Folder'}
                  onClick={() => handleToggleLock(folder)}
                >
                  {folder.is_locked ? <Unlock className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-gray-500" />}
                </Button>
              )}
            </div>
            {userCanAccessLocked && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600 hover:text-red-700">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{folder.name}"? This action cannot be undone.
                      Make sure the folder is empty before deleting.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDeleteFolder(folder.id, folder.name)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          {renderFolderTree(folder.id, level + 1)}
        </div>
      );
    }).filter(Boolean);
  };

  // Add lock/unlock logic
  const handleToggleLock = async (folder: Folder) => {
    try {
      // Update the folder's is_locked status in the backend (Supabase example)
      const { error } = await window.supabase
        .from('folders')
        .update({ is_locked: !folder.is_locked })
        .eq('id', folder.id);
      if (error) throw error;
      toast({
        title: folder.is_locked ? 'Folder Unlocked' : 'Folder Locked',
        description: `"${folder.name}" has been ${folder.is_locked ? 'unlocked' : 'locked'} successfully.`
      });
      // Optionally, refetch folders or update state here
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update folder lock status',
        variant: 'destructive'
      });
    }
  };

  if (!showCreateButton && folders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {showCreateButton && (
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogDescription>
                Create a new folder to organize your documents
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="folderName">Folder Name</Label>
                <Input
                  id="folderName"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isCreating) {
                      handleCreateFolder();
                    }
                  }}
                />
              </div>
              
              {folders.length > 0 && (
                <div>
                  <Label htmlFor="parentFolder">Parent Folder (Optional)</Label>
                  <Select value={parentFolderId || 'root'} onValueChange={(value) => setParentFolderId(value === 'root' ? undefined : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent folder (or leave empty for root)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">Root (No parent)</SelectItem>
                      {folders.map(folder => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder} disabled={isCreating}>
                  <Folder className="h-4 w-4 mr-2" />
                  {isCreating ? 'Creating...' : 'Create Folder'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showFolderStructure && folders.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Folder Structure</h3>
          <div className="space-y-1">
            {renderFolderTree()}
          </div>
        </div>
      )}
    </div>
  );
};
