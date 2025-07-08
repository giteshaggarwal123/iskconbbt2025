
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Folder, Plus, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

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

interface CreateFolderDialogProps {
  onFolderCreated: (folderName: string, parentFolderId?: string) => Promise<any>;
  existingFolders: Folder[];
  currentFolderId?: string | null;
  canAccessLockedFolders?: boolean;
}

export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({ 
  onFolderCreated, 
  existingFolders,
  currentFolderId,
  canAccessLockedFolders = false
}) => {
  const [open, setOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | undefined>(currentFolderId || undefined);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Filter folders to only show accessible ones for parent selection
  const accessibleFolders = existingFolders.filter(folder => 
    !folder.is_locked || canAccessLockedFolders
  );

  const handleCreate = async () => {
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
      const result = await onFolderCreated(folderName.trim(), parentFolderId);
      if (result) {
        setFolderName('');
        setParentFolderId(currentFolderId || undefined);
        setOpen(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={`${isMobile ? 'w-full justify-center' : 'w-full sm:w-auto justify-center'}`}>
          <Plus className="h-4 w-4 mr-2" />
          New Folder
        </Button>
      </DialogTrigger>
      <DialogContent className={isMobile ? 'mx-4 max-w-[calc(100vw-2rem)]' : ''}>
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
                  handleCreate();
                }
              }}
            />
          </div>
          
          {accessibleFolders.length > 0 && (
            <div>
              <Label htmlFor="parentFolder">Parent Folder (Optional)</Label>
              <Select value={parentFolderId || 'root'} onValueChange={(value) => setParentFolderId(value === 'root' ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent folder (or leave empty for root)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root (No parent)</SelectItem>
                  {accessibleFolders.map(folder => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center space-x-2">
                        {folder.is_locked && <Lock className="h-3 w-3 text-red-500" />}
                        <span className={folder.is_locked ? 'text-red-600' : ''}>
                          {folder.name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'justify-end space-x-2'}`}>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isCreating} className={isMobile ? 'w-full' : ''}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating} className={isMobile ? 'w-full' : ''}>
              <Folder className="h-4 w-4 mr-2" />
              {isCreating ? 'Creating...' : 'Create Folder'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFolderDialog;
