
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Document {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  folder: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  is_important: boolean;
  is_hidden: boolean;
}

interface DocumentRenameDialogProps {
  isOpen: boolean;
  document: Document | null;
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
}

export const DocumentRenameDialog: React.FC<DocumentRenameDialogProps> = ({
  isOpen,
  document,
  onClose,
  onRename
}) => {
  const [newName, setNewName] = useState('');

  React.useEffect(() => {
    if (document) {
      setNewName(document.name);
    }
  }, [document]);

  const handleRename = async () => {
    if (!newName.trim()) return;
    await onRename(newName);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Document</DialogTitle>
          <DialogDescription>
            Enter a new name for the document
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="newName">Document Name</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new document name"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>
              Rename
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
