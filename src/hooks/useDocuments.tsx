import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface Document {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  folder: string | null;
  folder_id: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  is_important: boolean;
  is_hidden: boolean;
}

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

export const useDocuments = (currentFolderId?: string | null) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: {first_name: string, last_name: string}}>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchUserProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name');

      if (error) throw error;
      
      const profilesMap = (data || []).reduce((acc, profile) => {
        acc[profile.id] = {
          first_name: profile.first_name || '',
          last_name: profile.last_name || ''
        };
        return acc;
      }, {} as {[key: string]: {first_name: string, last_name: string}});
      
      setUserProfiles(profilesMap);
    } catch (error: any) {
      console.error('Error fetching user profiles:', error);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      console.log('Fetching documents for folder:', currentFolderId);
      let query = supabase
        .from('documents')
        .select('*');
      
      if (currentFolderId) {
        query = query.eq('folder_id', currentFolderId);
      } else {
        query = query.is('folder_id', null);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      // Sanitize document fields
      const sanitized = (data || []).map((d: any) => ({
        ...d,
        id: typeof d.id === 'string' ? d.id : '',
        name: typeof d.name === 'string' ? d.name : 'Untitled',
        file_path: typeof d.file_path === 'string' ? d.file_path : '',
        created_at: typeof d.created_at === 'string' ? d.created_at : '',
        updated_at: typeof d.updated_at === 'string' ? d.updated_at : '',
        uploaded_by: typeof d.uploaded_by === 'string' ? d.uploaded_by : '',
      }));

      console.log('Fetched documents:', sanitized.length);
      setDocuments(sanitized);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      });
      setDocuments([]); // Set empty array on error
    }
  }, [currentFolderId, toast]);

  const fetchFolders = useCallback(async () => {
    try {
      console.log('Fetching folders...');
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Sanitize folder names
      const sanitized = (data || []).map((f: any) => ({
        ...f,
        name: typeof f.name === 'string' ? f.name : 'Folder'
      }));

      console.log('Fetched folders:', sanitized.length);
      setFolders(sanitized);
    } catch (error: any) {
      console.error('Error fetching folders:', error);
      toast({
        title: "Error",
        description: "Failed to load folders",
        variant: "destructive"
      });
      setFolders([]); // Set empty array on error
    }
  }, [toast]);

  const refreshDocuments = useCallback(async () => {
    try {
      await Promise.all([fetchDocuments(), fetchFolders(), fetchUserProfiles()]);
    } catch (error) {
      console.error('Error refreshing documents:', error);
    }
  }, [fetchDocuments, fetchFolders, fetchUserProfiles]);

  // React Query mutations with improved error handling
  const renameDocumentMutation = useMutation({
    mutationFn: async ({ documentId, newName }: { documentId: string; newName: string }) => {
      if (!documentId || !newName?.trim()) {
        throw new Error('Document ID and name are required');
      }

      const { error } = await supabase
        .from('documents')
        .update({ name: newName.trim(), updated_at: new Date().toISOString() })
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      refreshDocuments();
    },
    onError: (error) => {
      console.error('Rename mutation error:', error);
    }
  });

  const copyDocument = useMutation({
    mutationFn: async (documentId: string) => {
      if (!documentId) {
        throw new Error('Document ID is required');
      }

      const { data: original, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;
      if (!original) throw new Error('Document not found');

      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          ...original,
          id: undefined,
          name: `${original.name} (Copy)`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      refreshDocuments();
    },
    onError: (error) => {
      console.error('Copy mutation error:', error);
    }
  });

  const toggleImportant = useMutation({
    mutationFn: async ({ documentId, isImportant }: { documentId: string; isImportant: boolean }) => {
      if (!documentId) {
        throw new Error('Document ID is required');
      }

      const { error } = await supabase
        .from('documents')
        .update({ is_important: isImportant, updated_at: new Date().toISOString() })
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      refreshDocuments();
    },
    onError: (error) => {
      console.error('Toggle important mutation error:', error);
    }
  });

  const moveDocument = useMutation({
    mutationFn: async ({ documentId, targetFolderId }: { documentId: string; targetFolderId: string | null }) => {
      if (!documentId) {
        throw new Error('Document ID is required');
      }

      const { error } = await supabase
        .from('documents')
        .update({ 
          folder_id: targetFolderId,
          folder: targetFolderId ? null : 'general',
          updated_at: new Date().toISOString() 
        })
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      refreshDocuments();
    },
    onError: (error) => {
      console.error('Move document mutation error:', error);
    }
  });

  const uploadDocument = async (file: File, folderId?: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload documents",
        variant: "destructive"
      });
      return;
    }

    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Starting upload for:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Validate file size (100MB limit)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        throw new Error('File size exceeds 100MB limit');
      }
      
      const fileExt = file.name.split('.').pop() || 'bin';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = folderId ? `folders/${folderId}/${fileName}` : `root/${fileName}`;
      
      console.log('Uploading to storage path:', filePath);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('File uploaded successfully:', uploadData);

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      console.log('Public URL:', urlData.publicUrl);
      
      const { data, error } = await supabase
        .from('documents')
        .insert({
          name: file.name,
          file_path: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          folder_id: folderId || null,
          folder: folderId ? null : 'general',
          uploaded_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('Document record created:', data);

      toast({
        title: "Upload Complete",
        description: `Document "${file.name}" uploaded successfully`
      });

      await refreshDocuments();
      return data;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document",
        variant: "destructive"
      });
      throw error;
    }
  };

  const createFolder = async (folderName: string, parentFolderId?: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create folders",
        variant: "destructive"
      });
      return null;
    }

    if (!folderName?.trim()) {
      toast({
        title: "Invalid Name",
        description: "Folder name cannot be empty",
        variant: "destructive"
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('folders')
        .insert({
          name: folderName.trim(),
          parent_folder_id: parentFolderId || null,
          created_by: user.id,
          is_locked: false
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('A folder with this name already exists in this location');
        }
        throw error;
      }

      await refreshDocuments();
      return data;
    } catch (error: any) {
      console.error('Error creating folder:', error);
      toast({
        title: "Create Failed",
        description: error.message || "Failed to create folder",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => {
      if (!folderId) {
        throw new Error('Folder ID is required');
      }

      // Recursively delete all documents in this folder
      const { data: folderDocuments } = await supabase
        .from('documents')
        .select('id')
        .eq('folder_id', folderId);
      if (folderDocuments && folderDocuments.length > 0) {
        for (const doc of folderDocuments) {
          // Try move to recycle bin first, fallback to direct delete if needed
          let deleted = false;
          try {
            const { error: rpcError } = await supabase.rpc('move_to_recycle_bin', {
              _document_id: doc.id,
              _deleted_by: user?.id || 'admin-script',
            });
            if (!rpcError) {
              deleted = true;
            }
          } catch (e) {}
          if (!deleted) {
            // Fallback: try direct delete (admin)
            const { error: delError } = await supabase
              .from('documents')
              .delete()
              .eq('id', doc.id);
            if (delError) {
              console.error('Failed to delete document', doc.id, delError);
            }
          }
        }
      }

      // Recursively delete all subfolders
      const { data: subfolders } = await supabase
        .from('folders')
        .select('id')
        .eq('parent_folder_id', folderId);
      if (subfolders && subfolders.length > 0) {
        for (const sub of subfolders) {
          await deleteFolder.mutateAsync(sub.id);
        }
      }

      // Now delete the folder itself
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      refreshDocuments();
    },
    onError: (error) => {
      console.error('Delete folder mutation error:', error);
    }
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      if (!user) {
        throw new Error('Authentication required');
      }

      if (!documentId) {
        throw new Error('Document ID is required');
      }

      console.log('Deleting document:', documentId);
      
      const { error } = await supabase.rpc('move_to_recycle_bin', {
        _document_id: documentId,
        _deleted_by: user.id
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }
      
      console.log('Document moved to recycle bin successfully');
    },
    onSuccess: () => {
      refreshDocuments();
    },
    onError: (error) => {
      console.error('Delete document mutation error:', error);
    }
  });

  const lockFolder = useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .from('folders')
        .update({ is_locked: true })
        .eq('id', folderId);
      if (error) throw error;
    },
    onSuccess: () => { refreshDocuments(); },
    onError: (error) => { console.error('Lock folder mutation error:', error); }
  });

  const unlockFolder = useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .from('folders')
        .update({ is_locked: false })
        .eq('id', folderId);
      if (error) throw error;
    },
    onSuccess: () => { refreshDocuments(); },
    onError: (error) => { console.error('Unlock folder mutation error:', error); }
  });

  const lockDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('documents')
        .update({ is_locked: true })
        .eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: () => { refreshDocuments(); },
    onError: (error) => { console.error('Lock document mutation error:', error); }
  });

  const unlockDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('documents')
        .update({ is_locked: false })
        .eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: () => { refreshDocuments(); },
    onError: (error) => { console.error('Unlock document mutation error:', error); }
  });

  useEffect(() => {
    const fetchData = async () => {
      console.log('useDocuments - Initial data fetch for folder:', currentFolderId);
      setLoading(true);
      try {
        await Promise.all([fetchDocuments(), fetchFolders(), fetchUserProfiles()]);
      } catch (error) {
        console.error('Error in initial data fetch:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentFolderId]);

  return {
    documents,
    folders,
    userProfiles,
    loading,
    uploadDocument,
    deleteDocument,
    moveDocument,
    createFolder,
    deleteFolder,
    renameDocumentMutation,
    copyDocument,
    toggleImportant,
    refreshDocuments,
    fetchDocuments,
    fetchFolders,
    lockFolder,
    unlockFolder,
    lockDocument,
    unlockDocument
  };
};
