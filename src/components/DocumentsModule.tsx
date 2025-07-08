import React, { useState, useMemo, useEffect } from 'react';
import { Input, SearchInput } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Plus, Grid, List, Home, ArrowLeft, ChevronLeft, Search, Trash2, Download, Star, StarOff, FolderOpen, Unlock, Lock } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { FolderSection } from './documents/FolderSection';
import { FileSection } from './documents/FileSection';
import { DocumentUploadDialog } from './documents/DocumentUploadDialog';
import { DocumentRenameDialog } from './documents/DocumentRenameDialog';
import { TrashFolder } from './documents/TrashFolder';
import { DocumentViewer } from './DocumentViewer';
import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useParams, useNavigate } from 'react-router-dom';

export const DocumentsModule = () => {
  const { folderId, docId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = useUserRole();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [renameDocument, setRenameDocument] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isInTrash, setIsInTrash] = useState(false);
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | undefined>(folderId || undefined);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Use folderId/docId from URL if present
  const [selectedFolder, setSelectedFolder] = useState<string | null>(folderId || null);
  const [viewDocument, setViewDocument] = useState<any>(docId ? { id: docId } : null);

  const {
    documents,
    folders,
    userProfiles,
    uploadDocument,
    createFolder,
    deleteDocument,
    deleteFolder,
    renameDocumentMutation,
    moveDocument,
    refreshDocuments,
    toggleImportant
  } = useDocuments(selectedFolder);

  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [allDocuments, setAllDocuments] = useState<any[]>([]);

  // Fetch all documents for viewer lookup
  useEffect(() => {
    const fetchAllDocs = async () => {
      const { data, error } = await supabase.from('documents').select('*');
      if (!error && data) setAllDocuments(data);
    };
    fetchAllDocs();
  }, []);

  React.useEffect(() => {
    setSelectedFolder(folderId || null);
    if (docId && allDocuments.length > 0) {
      const docObj = allDocuments.find(d => d.id === docId);
      setViewDocument(docObj || null);
    } else {
      setViewDocument(null);
    }
    setNewFolderParentId(folderId || undefined);
  }, [folderId, docId, allDocuments]);

  // Unified search for folders and files
  const isSearching = !!searchTerm.trim();
  const folderIdForFilter = selectedFolder || '';
  const filteredFolders = useMemo(() => {
    if (!folders) return [];
    if (!isSearching) return folders.filter(f => (f.parent_folder_id ?? '') === folderIdForFilter);
    return folders.filter(f => f.name && f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [folders, folderIdForFilter, searchTerm, isSearching]);

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    if (!isSearching) return documents.filter(d => (d.folder_id ?? '') === folderIdForFilter);
    return documents.filter(d => d.name && d.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [documents, folderIdForFilter, searchTerm, isSearching]);

  // Breadcrumbs
  const getBreadcrumbPath = () => {
    if (!selectedFolder || !folders || folders.length === 0) return [];
    const path = [];
    let currentFolderId: string | null = selectedFolder;
    let depth = 0;
    const maxDepth = 10;
    while (currentFolderId && depth < maxDepth) {
      const folder = folders.find(f => f.id === currentFolderId);
      if (folder) {
        path.unshift(folder);
        currentFolderId = folder.parent_folder_id || null;
      } else {
        break;
      }
      depth++;
    }
    return path;
  };
  const breadcrumbPath = getBreadcrumbPath();

  // Wrap deleteFolder to match (folderId: string) => Promise<boolean>
  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolder.mutateAsync(folderId);
      toast({ title: 'Success', description: 'Folder deleted successfully' });
      return true;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete folder', variant: 'destructive' });
      return false;
    }
  };

  // Wrap moveDocument to match (documentId: string, targetFolderId: string | null) => void
  const handleMoveDocument = async (documentId: string, targetFolderId: string | null) => {
    await moveDocument.mutateAsync({ documentId, targetFolderId });
  };

  // Wrap onDeleteDocument for FileSection
  const handleDeleteDocument = async (documentId: string, documentName: string) => {
    try {
      await deleteDocument.mutateAsync(documentId);
      toast({ title: 'Success', description: `"${documentName}" moved to trash` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete document', variant: 'destructive' });
    }
  };

  // Bulk action handlers
  const handleBulkDelete = async () => {
    if (selectedDocumentIds.length === 0) return;
    
    try {
      const selectedDocuments = filteredDocuments.filter(doc => selectedDocumentIds.includes(doc.id));
      for (const doc of selectedDocuments) {
        await deleteDocument.mutateAsync(doc.id);
      }
      setSelectedDocumentIds([]);
      toast({ title: 'Success', description: `${selectedDocuments.length} document(s) moved to trash` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete documents', variant: 'destructive' });
    }
  };

  const handleBulkDownload = async () => {
    if (selectedDocumentIds.length === 0) return;
    const selectedDocuments = filteredDocuments.filter(doc => selectedDocumentIds.includes(doc.id));
    if (selectedDocuments.length === 1) {
      // Single file: direct download
      const doc = selectedDocuments[0];
      if (typeof doc.file_path === 'string' && doc.file_path) {
        const a = document.createElement('a');
        a.href = doc.file_path;
        a.download = doc.name || 'document';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast({ title: 'Download Started', description: `Started download for 1 document.` });
      } else {
        toast({ title: 'No Download', description: 'No downloadable document found.', variant: 'destructive' });
      }
      return;
    }
    // Multiple files: zip and download
    const zip = new JSZip();
    let added = 0;
    for (const doc of selectedDocuments) {
      if (typeof doc.file_path === 'string' && doc.file_path) {
        try {
          const response = await fetch(doc.file_path);
          if (!response.ok) continue;
          const blob = await response.blob();
          zip.file(doc.name || `document-${doc.id}`, blob);
          added++;
        } catch (e) {
          // skip file if fetch fails
        }
      }
    }
    if (added === 0) {
      toast({ title: 'No Download', description: 'No downloadable documents found.', variant: 'destructive' });
      return;
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documents-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast({ title: 'Download Started', description: `Started download for ${added} documents as ZIP.` });
  };

  const handleBulkToggleImportant = async (makeImportant: boolean) => {
    if (selectedDocumentIds.length === 0) return;
    try {
      const selectedDocuments = filteredDocuments.filter(doc => selectedDocumentIds.includes(doc.id));
      for (const doc of selectedDocuments) {
        await toggleImportant.mutateAsync({ documentId: doc.id, isImportant: makeImportant });
      }
      setSelectedDocumentIds([]);
      toast({ title: 'Success', description: `${selectedDocuments.length} document(s) ${makeImportant ? 'marked as' : 'unmarked from'} important` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update documents', variant: 'destructive' });
    }
  };

  const handleSelectionChange = (newSelectedIds: string[]) => {
    setSelectedDocumentIds(newSelectedIds);
  };

  // Defensive helpers
  const safe = (val: any, fallback: string = '') => (val === undefined || val === null ? fallback : val);

  // Helper to always return a string for folder name
  function getFolderName(folders: any[] | undefined, selectedFolder: string | null): string {
    if (!folders || !selectedFolder) return 'Folder';
    const folder = folders.find(f => f.id === selectedFolder);
    if (!folder) return 'Folder';
    return typeof folder.name === 'string' && folder.name.length > 0 ? folder.name : 'Folder';
  }

  // Add a stub for onCopyToFolder
  const handleCopyToFolder = async (documentId: string, targetFolderId: string | null) => {
    // TODO: implement copy logic
    toast({ title: 'Copy', description: `Copy document ${documentId} to folder ${targetFolderId}` });
  };

  // Pass canDeleteDocument to DocumentTable/FileSection
  const canDeleteDocument = (document: any) => {
    // Only admins/super admins can delete
    return userRole.isAdmin || userRole.isSuperAdmin;
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({ title: 'Invalid Folder Name', description: 'Please enter a folder name', variant: 'destructive' });
      return;
    }
    setIsCreatingFolder(true);
    try {
      const result = await createFolder(newFolderName.trim(), newFolderParentId);
      if (result) {
        setNewFolderName('');
        setNewFolderParentId(selectedFolder || undefined);
        setIsCreateFolderDialogOpen(false);
        toast({ title: 'Success', description: 'Folder created successfully' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create folder', variant: 'destructive' });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleFolderClick = (folderId: string) => {
    navigate(`/documents/folder/${folderId}`);
    setSelectedFolder(folderId);
  };

  const handleViewDocument = (doc: any) => {
    if (selectedFolder) {
      navigate(`/documents/folder/${selectedFolder}/doc/${doc.id}`);
    } else {
      navigate(`/documents/doc/${doc.id}`);
    }
    setViewDocument(doc);
  };

  // Bulk folder delete handler
  const handleBulkFolderDelete = async () => {
    if (selectedFolderIds.length === 0) return;
    try {
      for (const folderId of selectedFolderIds) {
        await handleDeleteFolder(folderId);
      }
      setSelectedFolderIds([]);
      toast({ title: 'Success', description: `${selectedFolderIds.length} folder(s) deleted` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete folders', variant: 'destructive' });
    }
  };

  // Handler for bulk lock/unlock
  const handleBulkLockUnlock = async () => {
    if (selectedFolderIds.length === 0) return;
    // Determine if any selected folder is locked
    const anyLocked = selectedFolderIds.some(id => {
      const folder = folders.find(f => f.id === id);
      return folder && folder.is_locked;
    });
    try {
      // Update all selected folders to locked/unlocked
      const { error } = await supabase
        .from('folders')
        .update({ is_locked: !anyLocked })
        .in('id', selectedFolderIds);
      if (error) throw error;
      toast({ title: 'Success', description: anyLocked ? 'Folder(s) unlocked.' : 'Folder(s) locked.' });
      // Refresh folder list
      await refreshDocuments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update lock state.', variant: 'destructive' });
    }
  };

  // Add loading/empty state
  if (!folders || !documents) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  const noContent = filteredFolders.length === 0 && filteredDocuments.length === 0;

  // Add after loading/empty state check
  if (selectedFolder) {
    const folderObj = folders.find(f => f.id === selectedFolder);
    if (folderObj && folderObj.is_locked && !(userRole.isAdmin || userRole.isSuperAdmin)) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <Lock className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-red-700 mb-2">Locked Folder</h2>
          <p className="text-lg text-muted-foreground">You do not have access to this folder.</p>
        </div>
      );
    }
  }

  // UI
  return (
    <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          {selectedFolder && (
            <Button variant="ghost" size="sm" onClick={() => { navigate('/documents'); setSelectedFolder(null); }} title="Go back">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          )}
          <h1 className="text-2xl font-bold">{selectedFolder ? getFolderName(folders, selectedFolder as string) : 'Document Repository'}</h1>
        </div>
        <div className="flex gap-2">
          {!isInTrash && (
            <Button onClick={() => setIsUploadDialogOpen(true)} className="bg-[#8E1616] hover:bg-[#7A1414] text-white flex items-center gap-2">
              <Plus className="h-4 w-4" /> Upload
            </Button>
          )}
          <Button 
            variant={isInTrash ? 'default' : 'outline'} 
            onClick={() => setIsInTrash(!isInTrash)}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isInTrash ? 'Exit Trash' : 'Trash'}
          </Button>
          <Button variant={viewMode === 'card' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('card')}><Grid className="h-4 w-4" /></Button>
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="bg-muted/50 rounded-lg p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={() => {
                  setSelectedFolder(null);
                  setIsInTrash(false);
                }} 
                className="cursor-pointer flex items-center gap-1"
              >
                <Home className="h-4 w-4" /> Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            {isInTrash && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="flex items-center gap-1">
                    <Trash2 className="h-4 w-4" /> Trash
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
            {!isInTrash && breadcrumbPath.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {index === breadcrumbPath.length - 1 ? (
                    <BreadcrumbPage>{folder.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink onClick={() => setSelectedFolder(folder.id)} className="cursor-pointer">{folder.name}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Search Bar */}
      <div className="relative flex items-center gap-2 mb-4 w-full max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <SearchInput
          type="text"
          placeholder="Search documents and folders..."
          value={searchTerm || ''}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10 bg-background border-input"
        />
      </div>

      {/* Bulk Actions */}
      {selectedDocumentIds.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-900">
            {selectedDocumentIds.length} document(s) selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDownload}
              className="text-blue-600 hover:bg-blue-100"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkToggleImportant(true)}
              className="text-yellow-600 hover:bg-yellow-100"
            >
              <Star className="h-4 w-4 mr-1" />
              Mark Important
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkToggleImportant(false)}
              className="text-gray-600 hover:bg-gray-100"
            >
              <StarOff className="h-4 w-4 mr-1" />
              Unmark Important
            </Button>
            {(userRole.isAdmin || userRole.isSuperAdmin) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Folders and Files */}
      {isInTrash ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Recycle Bin
            </h2>
            <p className="text-sm text-muted-foreground">
              Items will be permanently deleted after 30 days
            </p>
          </div>
          <TrashFolder isOpen={true} onClose={() => setIsInTrash(false)} inline={true} />
        </div>
      ) : noContent ? (
        <div className="text-center text-muted-foreground py-12 text-lg">No documents or folders found.</div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Folders
            </h2>
            <Dialog open={isCreateFolderDialogOpen} onOpenChange={setIsCreateFolderDialogOpen}>
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
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      placeholder="Enter folder name"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !isCreatingFolder) {
                          handleCreateFolder();
                        }
                      }}
                    />
                  </div>
                  {folders.length > 0 && (
                    <div>
                      <Label htmlFor="parentFolder">Parent Folder (Optional)</Label>
                      <Select value={newFolderParentId || 'root'} onValueChange={value => setNewFolderParentId(value === 'root' ? undefined : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent folder (or leave empty for root)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="root">Root (No parent)</SelectItem>
                          {folders.map(folder => (
                            <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateFolderDialogOpen(false)} disabled={isCreatingFolder}>Cancel</Button>
                    <Button onClick={handleCreateFolder} disabled={isCreatingFolder}>
                      <FolderOpen className="h-4 w-4 mr-2" />
                      {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {selectedFolderIds.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg my-2">
              <span className="text-sm font-medium text-red-900">
                {selectedFolderIds.length} folder(s) selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkFolderDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected Folders
              </Button>
              {(userRole.isAdmin || userRole.isSuperAdmin) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkLockUnlock}
                >
                  {/* Show Unlock if any selected folder is locked, else Lock */}
                  {selectedFolderIds.some(id => {
                    const folder = folders.find(f => f.id === id);
                    return folder && folder.is_locked;
                  }) ? (
                    <>
                      <Unlock className="h-4 w-4 mr-1" />
                      Unlock
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-1" />
                      Lock
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
          <FolderSection
            folders={filteredFolders.map(f => ({...f, name: safe(f.name, 'Untitled'), id: safe(f.id, '')}))}
            userProfiles={userProfiles || {}}
            onFolderClick={handleFolderClick}
            onDeleteFolder={handleDeleteFolder}
            canAccessLockedFolders={true}
            viewMode={viewMode}
            selectedIds={selectedFolderIds}
            onSelectionChange={setSelectedFolderIds}
          />
          <FileSection
            documents={filteredDocuments.map(d => ({...d, name: safe(d.name, 'Untitled'), id: safe(d.id, '')}))}
            userProfiles={userProfiles || {}}
            currentUserId={user?.id}
            canDeleteDocument={canDeleteDocument}
            onViewDocument={handleViewDocument}
            onDownloadDocument={() => {}}
            onToggleImportant={() => {}}
            onRenameDocument={setRenameDocument}
            onCopyDocument={async (documentId) => {
              try {
                const doc = filteredDocuments.find(d => d.id === documentId);
                if (!doc) {
                  toast({ title: 'Error', description: 'Document not found', variant: 'destructive' });
                  return;
                }
                // Download the file as a blob
                const response = await fetch(doc.file_path);
                if (!response.ok) throw new Error('Failed to download file');
                const blob = await response.blob();
                // Create a new File object with 'Copy of' in the name
                const newFile = new File([blob], `Copy of ${doc.name}`, { type: doc.mime_type || blob.type });
                // Upload the new file to the same folder
                await uploadDocument(newFile, doc.folder_id || undefined);
                toast({ title: 'Success', description: 'File duplicated successfully' });
              } catch (error: any) {
                toast({ title: 'Error', description: error.message || 'Failed to duplicate file', variant: 'destructive' });
              }
            }}
            onDeleteDocument={handleDeleteDocument}
            onMoveDocument={handleMoveDocument}
            onCopyToFolder={handleCopyToFolder}
            onDragStart={() => {}}
            folders={folders}
            viewMode={viewMode}
            selectedIds={selectedDocumentIds}
            onSelectionChange={handleSelectionChange}
          />
        </>
      )}

      {/* Dialogs */}
      <DocumentUploadDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onUpload={async (files, folder) => {
          try {
            // 1. Build a set of all unique folder paths from files
            const folderMap: Record<string, string> = {};
            const folderPaths: Set<string> = new Set();
            const fileFolderPaths: { file: File, folderPath: string }[] = [];
            for (const file of files) {
              let relPath = (file as any).webkitRelativePath || file.name;
              const parts = relPath.split('/').filter(Boolean);
              if (parts.length > 1) {
                const folderPath = parts.slice(0, -1).join('/');
                folderPaths.add(folderPath);
                fileFolderPaths.push({ file, folderPath });
              } else {
                fileFolderPaths.push({ file, folderPath: '' });
              }
            }
            // 2. Create all folders in order (parent before child)
            // Sort by depth to ensure parents are created first
            const sortedFolderPaths = Array.from(folderPaths).sort((a, b) => a.split('/').length - b.split('/').length);
            for (const path of sortedFolderPaths) {
              const parts = path.split('/');
              let parentId = folder || selectedFolder || undefined;
              let currentPath = '';
              for (let i = 0; i < parts.length; i++) {
                currentPath = currentPath ? currentPath + '/' + parts[i] : parts[i];
                if (!folderMap[currentPath]) {
                  // Find parent folder ID
                  let parentPath = currentPath.includes('/') ? currentPath.substring(0, currentPath.lastIndexOf('/')) : '';
                  let parentFolderId = parentPath ? folderMap[parentPath] : (folder || selectedFolder || undefined);
                  // Create folder and get its ID
                  const created = await createFolder(parts[i], parentFolderId);
                  if (!created || !created.id) throw new Error('Failed to create folder: ' + parts[i]);
                  folderMap[currentPath] = created.id;
                }
              }
            }
            // 3. Upload files to correct folders
            let successCount = 0;
            let errorCount = 0;
            const errors: string[] = [];
            for (const { file, folderPath } of fileFolderPaths) {
              try {
                let targetFolderId = folder || selectedFolder || undefined;
                if (folderPath) {
                  targetFolderId = folderMap[folderPath];
                }
                await uploadDocument(file, targetFolderId);
                successCount++;
              } catch (error: any) {
                errorCount++;
                errors.push(`${file.name}: ${error.message}`);
              }
            }
            setIsUploadDialogOpen(false);
            if (successCount > 0) {
              toast({ 
                title: "Upload Complete", 
                description: `Successfully uploaded ${successCount} file${successCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}` 
              });
            }
            if (errorCount > 0) {
              toast({ 
                title: "Upload Errors", 
                description: `Failed to upload ${errorCount} file${errorCount !== 1 ? 's' : ''}: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`, 
                variant: "destructive" 
              });
            }
          } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to upload documents", variant: "destructive" });
          }
        }}
        currentFolderId={selectedFolder}
      />
      <DocumentRenameDialog
        isOpen={!!renameDocument}
        document={renameDocument}
        onClose={() => setRenameDocument(null)}
        onRename={async (newName) => {
          try {
            await renameDocumentMutation.mutateAsync({ documentId: renameDocument?.id, newName });
            setRenameDocument(null);
            toast({ title: "Success", description: "Document renamed successfully" });
          } catch (error: any) {
            toast({ title: "Error", description: "Failed to rename document", variant: "destructive" });
          }
        }}
      />
      <TrashFolder isOpen={isTrashOpen} onClose={() => setIsTrashOpen(false)} />
      <DocumentViewer
        isOpen={!!viewDocument}
        onClose={() => {
          if (selectedFolder) {
            navigate(`/documents/folder/${selectedFolder}`);
          } else {
            navigate('/documents');
          }
          setViewDocument(null);
        }}
        document={viewDocument}
        documentType="document"
      />
    </div>
  );
};