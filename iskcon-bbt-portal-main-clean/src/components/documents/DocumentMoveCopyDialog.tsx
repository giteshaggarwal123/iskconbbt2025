import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Folder {
  id: string;
  name: string;
}

interface DocumentMoveCopyDialogProps {
  isOpen: boolean;
  documentName: string;
  folders: Folder[];
  currentFolderId?: string | null;
  onClose: () => void;
  onMove: (targetFolderId: string | null) => Promise<void>;
  onCopy: (targetFolderId: string | null) => Promise<void>;
}

export const DocumentMoveCopyDialog: React.FC<DocumentMoveCopyDialogProps> = ({
  isOpen,
  documentName,
  folders,
  currentFolderId,
  onClose,
  onMove,
  onCopy
}) => {
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [action, setAction] = useState<'move' | 'copy'>('move');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setTargetFolderId(null);
    setAction('move');
  }, [isOpen]);

  const handleConfirm = async () => {
    setLoading(true);
    if (action === 'move') {
      await onMove(targetFolderId);
    } else {
      await onCopy(targetFolderId);
    }
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action === 'move' ? 'Move Document' : 'Copy Document'}</DialogTitle>
          <DialogDescription>
            Select a folder to {action} "{documentName}" into.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="targetFolder">Target Folder</Label>
            <Select
              value={targetFolderId || 'root'}
              onValueChange={value => setTargetFolderId(value === 'root' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Root (No parent)</SelectItem>
                {folders.map(folder => (
                  <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant={action === 'move' ? 'default' : 'outline'}
              onClick={() => setAction('move')}
              disabled={action === 'move'}
            >
              Move
            </Button>
            <Button
              variant={action === 'copy' ? 'default' : 'outline'}
              onClick={() => setAction('copy')}
              disabled={action === 'copy'}
            >
              Copy
            </Button>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {action === 'move' ? 'Move' : 'Copy'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 