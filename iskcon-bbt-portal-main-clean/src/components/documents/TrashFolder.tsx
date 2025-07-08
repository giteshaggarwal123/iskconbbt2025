import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, RotateCcw, Eye, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TrashFolderProps {
  isOpen: boolean;
  onClose: () => void;
  inline?: boolean;
}

interface RecycleBinItem {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  folder: string | null;
  uploaded_by: string;
  deleted_by: string;
  deleted_at: string;
  permanent_delete_at: string;
  original_created_at: string;
  original_updated_at: string;
  is_important: boolean;
  is_hidden: boolean;
}

export const TrashFolder: React.FC<TrashFolderProps> = ({ isOpen, onClose, inline = false }) => {
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { toast } = useToast();

  const allSelected = items.length > 0 && items.every(item => selectedIds.includes(item.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(item => item.id));
    }
  };

  const toggleSelect = (itemId: string) => {
    setSelectedIds(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const fetchTrashItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recycle_bin')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setItems((data || []).map(item => ({
        ...item,
        is_important: item.is_important || false,
        is_hidden: item.is_hidden || false
      })));
    } catch (error: any) {
      console.error('Error fetching trash items:', error);
      toast({
        title: "Error",
        description: "Failed to load trash items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreItem = async (itemId: string) => {
    try {
      const { error } = await supabase.rpc('restore_from_recycle_bin', {
        _recycle_bin_id: itemId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item restored successfully"
      });

      fetchTrashItems();
    } catch (error: any) {
      console.error('Error restoring item:', error);
      toast({
        title: "Error",
        description: "Failed to restore item",
        variant: "destructive"
      });
    }
  };

  const permanentlyDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('recycle_bin')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item permanently deleted"
      });

      fetchTrashItems();
    } catch (error: any) {
      console.error('Error permanently deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to permanently delete item",
        variant: "destructive"
      });
    }
  };

  const bulkRestore = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      for (const itemId of selectedIds) {
        await supabase.rpc('restore_from_recycle_bin', {
          _recycle_bin_id: itemId
        });
      }
      
      setSelectedIds([]);
      toast({
        title: "Success",
        description: `${selectedIds.length} item(s) restored successfully`
      });
      
      fetchTrashItems();
    } catch (error: any) {
      console.error('Error restoring items:', error);
      toast({
        title: "Error",
        description: "Failed to restore items",
        variant: "destructive"
      });
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to permanently delete ${selectedIds.length} item(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      for (const itemId of selectedIds) {
        await supabase
          .from('recycle_bin')
          .delete()
          .eq('id', itemId);
      }
      
      setSelectedIds([]);
      toast({
        title: "Success",
        description: `${selectedIds.length} item(s) permanently deleted`
      });
      
      fetchTrashItems();
    } catch (error: any) {
      console.error('Error deleting items:', error);
      toast({
        title: "Error",
        description: "Failed to delete items",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  useEffect(() => {
    if (isOpen) {
      fetchTrashItems();
    }
  }, [isOpen]);

  const content = (
    <>
      {!inline && (
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Trash
          </DialogTitle>
          <DialogDescription>
            Items in trash will be permanently deleted after 30 days
          </DialogDescription>
        </DialogHeader>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Trash2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Trash is empty</p>
          <p className="text-sm mt-2">Deleted documents will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.length} item(s) selected
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={bulkRestore}
                  className="text-green-600 hover:bg-green-100"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restore All
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={bulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete All
                </Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all items"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Deleted</TableHead>
                <TableHead>Auto-delete</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                      aria-label={`Select ${item.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{item.name}</span>
                      {item.is_important && (
                        <Badge variant="secondary" className="text-xs">
                          Important
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatFileSize(item.file_size)}</TableCell>
                  <TableCell>
                    {format(new Date(item.deleted_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {format(new Date(item.permanent_delete_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreItem(item.id)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => permanentlyDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );

  if (inline) {
    return content;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        {content}
      </DialogContent>
    </Dialog>
  );
};
