import React, { useState } from 'react';
import { FileText, FolderIcon, Eye, Download, MoreHorizontal, Star, StarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { FolderSection } from './FolderSection';
import { FileSection } from './FileSection';
import { DragDropZone } from './DragDropZone';
import { DocumentAnalytics } from '../DocumentAnalytics';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { useUserRole } from '@/hooks/useUserRole';

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
  view_count?: number;
  download_count?: number;
  last_accessed?: string;
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

interface DocumentTableProps {
  documents: Document[];
  folders: Folder[];
  userProfiles: {[key: string]: {first_name: string, last_name: string}};
  currentUserId?: string;
  canDeleteDocument: (document: Document) => boolean;
  onViewDocument: (document: Document) => void;
  onDownloadDocument: (document: Document) => void;
  onToggleImportant: (documentId: string, currentStatus: boolean) => void;
  onRenameDocument: (document: Document) => void;
  onCopyDocument: (documentId: string) => void;
  onDeleteDocument: (documentId: string, documentName: string) => void;
  onDeleteFolder: (folderId: string) => Promise<boolean>;
  onFolderClick: (folderId: string) => void;
  onMoveDocument: (documentId: string, targetFolderId: string | null) => void;
  currentFolderId?: string | null;
  canAccessLockedFolders?: boolean;
  viewMode?: 'card' | 'list';
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  folders,
  userProfiles,
  currentUserId,
  canDeleteDocument,
  onViewDocument,
  onDownloadDocument,
  onToggleImportant,
  onRenameDocument,
  onCopyDocument,
  onDeleteDocument,
  onDeleteFolder,
  onFolderClick,
  onMoveDocument,
  currentFolderId,
  canAccessLockedFolders = false,
  viewMode = 'list'
}) => {
  const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const { userRole } = useUserRole();

  const allIds = [
    ...folders.map((f) => f.id),
    ...documents.map((d) => d.id)
  ];
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(allIds);
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleDragStart = (documentId: string) => {
    setDraggedDocumentId(documentId);
  };

  const handleMoveDocument = (documentId: string, targetFolderId: string | null) => {
    onMoveDocument(documentId, targetFolderId);
    setDraggedDocumentId(null);
  };

  const getUserDisplayName = (userId: string) => {
    const profile = userProfiles[userId];
    if (profile) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return 'You';
  };

  const formatFileSize = (bytes: number | null) => {
    if (bytes === null) return '—';
    if (bytes === 0) return '—';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileType = (mimeType: string | null) => {
    if (!mimeType) return 'folder';
    return mimeType.split('/')[1] || 'unknown';
  };

  const handleDocumentRowClick = (document: Document, event: React.MouseEvent) => {
    // Don't trigger if clicking on dropdown menu or buttons
    if ((event.target as HTMLElement).closest('button') || (event.target as HTMLElement).closest('[role="menu"]')) {
      return;
    }
    onViewDocument(document);
  };

  // Add a stub for onCopyToFolder
  const onCopyToFolder = (documentId: string, targetFolderId: string | null) => {
    // TODO: implement copy logic
    console.log('Copy document', documentId, 'to folder', targetFolderId);
  };

  // If card view is selected, use the original card-based components
  if (viewMode === 'card') {
    return (
      <div className="w-full space-y-6">
        {folders.length > 0 && (
          <FolderSection
            folders={folders}
            userProfiles={userProfiles}
            onFolderClick={onFolderClick}
            onDeleteFolder={onDeleteFolder}
            canAccessLockedFolders={canAccessLockedFolders}
            viewMode={viewMode}
          />
        )}

        {documents.length > 0 && (
          <FileSection
            documents={documents}
            userProfiles={userProfiles}
            currentUserId={currentUserId}
            canDeleteDocument={canDeleteDocument}
            onViewDocument={onViewDocument}
            onDownloadDocument={onDownloadDocument}
            onToggleImportant={onToggleImportant}
            onRenameDocument={onRenameDocument}
            onCopyDocument={onCopyDocument}
            onDeleteDocument={onDeleteDocument}
            onMoveDocument={onMoveDocument}
            onCopyToFolder={onCopyToFolder}
            onDragStart={handleDragStart}
            folders={folders}
            viewMode={viewMode}
          />
        )}

        {documents.length === 0 && folders.length === 0 && (
          <div className="text-center py-12 w-full">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium text-foreground mb-2">No documents or folders found</h3>
            <p className="text-muted-foreground">
              Get started by uploading your first document or creating a folder
            </p>
          </div>
        )}

        <DragDropZone
          folders={folders}
          onMoveDocument={handleMoveDocument}
          draggedDocumentId={draggedDocumentId}
          canAccessLockedFolders={canAccessLockedFolders}
        />
      </div>
    );
  }

  // Table view
  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[36px]">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead className="w-[40%]">Name</TableHead>
            <TableHead className="w-[10%]">Type</TableHead>
            <TableHead className="w-[10%]">Size</TableHead>
            <TableHead className="w-[15%]">Modified</TableHead>
            <TableHead className="w-[15%]">Modified By</TableHead>
            <TableHead className="w-[12%]">Last Accessed</TableHead>
            <TableHead className="w-[10%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Folders */}
          {folders.map((folder) => (
            <TableRow 
              key={folder.id} 
              className="hover:bg-muted/50 cursor-pointer"
              onClick={() => onFolderClick(folder.id)}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(folder.id)}
                  onCheckedChange={() => toggleSelect(folder.id)}
                  aria-label={`Select folder ${folder.name}`}
                  onClick={e => e.stopPropagation()}
                />
              </TableCell>
              <TableCell className="flex items-center gap-3">
                <FolderIcon className="h-5 w-5 text-blue-500" />
                <span className="font-medium">{folder.name}</span>
                {folder.is_locked && <Badge variant="secondary" className="text-xs">Locked</Badge>}
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">folder</span>
              </TableCell>
              <TableCell>—</TableCell>
              <TableCell>
                {format(new Date(folder.updated_at), 'MMM d, yyyy, h:mm a')}
              </TableCell>
              <TableCell>{getUserDisplayName(folder.created_by)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onFolderClick(folder.id)}>
                      Open Folder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => onDeleteFolder(folder.id)}
                    >
                      Delete Folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}

          {/* Documents */}
          {documents.map((document) => (
            <TableRow 
              key={document.id}
              className="hover:bg-muted/50 cursor-pointer"
              draggable
              onDragStart={() => handleDragStart(document.id)}
              onClick={(e) => handleDocumentRowClick(document, e)}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(document.id)}
                  onCheckedChange={() => toggleSelect(document.id)}
                  aria-label={`Select document ${document.name}`}
                  onClick={e => e.stopPropagation()}
                />
              </TableCell>
              <TableCell className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <span className="font-medium">{document.name}</span>
                {document.is_important && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">{getFileType(document.mime_type)}</span>
              </TableCell>
              <TableCell>{formatFileSize(document.file_size)}</TableCell>
              <TableCell>
                {format(new Date(document.updated_at), 'MMM d, yyyy, h:mm a')}
              </TableCell>
              <TableCell>{getUserDisplayName(document.uploaded_by)}</TableCell>
              <TableCell>{document.last_accessed ? format(new Date(document.last_accessed), 'MMM d, yyyy') : '—'}</TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onViewDocument(document)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {(userRole === 'admin' || userRole === 'super_admin') && (
                    <DocumentAnalytics
                      documentId={document.id}
                      documentName={document.name}
                      documentType="document"
                    />
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDocument(document)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleImportant(document.id, document.is_important)}>
                        {document.is_important ? (
                          <>
                            <StarOff className="h-4 w-4 mr-2" />
                            Unmark Important
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-2" />
                            Mark Important
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onRenameDocument(document)}>
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCopyDocument(document.id)}>
                        Duplicate File
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => onDeleteDocument(document.id, document.name)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Empty State */}
      {documents.length === 0 && folders.length === 0 && (
        <div className="text-center py-12 w-full">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-medium text-foreground mb-2">No documents or folders found</h3>
          <p className="text-muted-foreground">
            Get started by uploading your first document or creating a folder
          </p>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <DragDropZone
        folders={folders}
        onMoveDocument={handleMoveDocument}
        draggedDocumentId={draggedDocumentId}
        canAccessLockedFolders={canAccessLockedFolders}
      />
    </div>
  );
};
