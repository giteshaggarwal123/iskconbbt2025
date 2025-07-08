import React, { useState } from 'react';
import { FileText, MoreVertical, Download, Eye, Edit3, Copy, Trash2, Star, StarOff, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { DocumentAnalytics } from '../DocumentAnalytics';
import { format } from 'date-fns';
import { DocumentMoveCopyDialog } from './DocumentMoveCopyDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

interface FileSectionProps {
  documents: Document[];
  userProfiles: {[key: string]: {first_name: string, last_name: string}};
  currentUserId?: string;
  canDeleteDocument: (document: Document) => boolean;
  onViewDocument: (document: Document) => void;
  onDownloadDocument: (document: Document) => void;
  onToggleImportant: (documentId: string, currentStatus: boolean) => void;
  onRenameDocument: (document: Document) => void;
  onCopyDocument: (documentId: string) => void;
  onDeleteDocument: (documentId: string, documentName: string) => void;
  onMoveDocument: (documentId: string, targetFolderId: string | null) => void;
  onCopyToFolder: (documentId: string, targetFolderId: string | null) => void;
  onDragStart: (documentId: string) => void;
  folders: { id: string; name: string }[];
  viewMode?: 'card' | 'list';
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

export const FileSection: React.FC<FileSectionProps> = ({
  documents,
  userProfiles,
  currentUserId,
  canDeleteDocument,
  onViewDocument,
  onDownloadDocument,
  onToggleImportant,
  onRenameDocument,
  onCopyDocument,
  onDeleteDocument,
  onMoveDocument,
  onCopyToFolder,
  onDragStart,
  folders,
  viewMode = 'card',
  selectedIds = [],
  onSelectionChange
}) => {
  const [draggedDocument, setDraggedDocument] = useState<string | null>(null);
  const [moveCopyDialogOpen, setMoveCopyDialogOpen] = useState(false);
  const [moveCopyDocument, setMoveCopyDocument] = useState<Document | null>(null);
  const { userRole } = useUserRole();

  // Selection state management
  const allSelected = documents.length > 0 && documents.every(doc => selectedIds.includes(doc.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(documents.map(doc => doc.id));
    }
  };

  const toggleSelect = (documentId: string) => {
    const newSelection = selectedIds.includes(documentId) 
      ? selectedIds.filter(id => id !== documentId)
      : [...selectedIds, documentId];
    onSelectionChange?.(newSelection);
  };

  const getUserDisplayName = (userId: string) => {
    const profile = userProfiles[userId];
    if (profile) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return 'Unknown User';
  };

  const formatFileSize = (bytes: number | null) => {
    if (bytes === null) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDragStart = (documentId: string) => {
    setDraggedDocument(documentId);
    onDragStart(documentId);
  };

  const handleDragEnd = () => {
    setDraggedDocument(null);
  };

  const handleDocumentClick = (document: Document, event: React.MouseEvent) => {
    // Don't trigger if clicking on dropdown menu or buttons
    if ((event.target as HTMLElement).closest('button') || (event.target as HTMLElement).closest('[role="menu"]')) {
      return;
    }
    onViewDocument(document);
  };

  const handleOpenMoveCopyDialog = (document: Document) => {
    setMoveCopyDocument(document);
    setMoveCopyDialogOpen(true);
  };

  const handleCloseMoveCopyDialog = () => {
    setMoveCopyDialogOpen(false);
    setMoveCopyDocument(null);
  };

  const handleMove = async (targetFolderId: string | null) => {
    if (moveCopyDocument) await onMoveDocument(moveCopyDocument.id, targetFolderId);
  };

  const handleCopy = async (targetFolderId: string | null) => {
    if (moveCopyDocument) await onCopyToFolder(moveCopyDocument.id, targetFolderId);
  };

  if (documents.length === 0) {
    return null;
  }

  if (viewMode === 'list') {
    return (
      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-gray-500" />
            Documents ({documents.length})
          </h3>
          {documents.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all documents"
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.length > 0 && `${selectedIds.length} selected`}
              </span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          {documents.map((document) => (
            <div
              key={document.id}
              draggable
              onDragStart={() => handleDragStart(document.id)}
              onDragEnd={handleDragEnd}
              onClick={(e) => handleDocumentClick(document, e)}
              className={`bg-card border rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer group relative flex items-center justify-between ${
                draggedDocument === document.id ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <Checkbox
                  checked={selectedIds.includes(document.id)}
                  onCheckedChange={() => toggleSelect(document.id)}
                  aria-label={`Select ${document.name}`}
                  onClick={(e) => e.stopPropagation()}
                />
                <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium truncate text-sm">{document.name}</span>
                    {document.is_important && (
                      <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {document.mime_type?.split('/')[1] || 'Unknown'} • {formatFileSize(document.file_size)} • 
                    Modified {format(new Date(document.updated_at), 'MMM dd, yyyy')} • 
                    by {getUserDisplayName(document.uploaded_by)}
                  </div>
                </div>
              </div>
              <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-70 hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => onViewDocument(document)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    {canDeleteDocument(document) && (
                      <>
                        <DropdownMenuItem onClick={() => onRenameDocument(document)}>
                          <Edit3 className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCopyDocument(document.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate File
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenMoveCopyDialog(document)}>
                          <Move className="h-4 w-4 mr-2" />
                          Move/Copy to Folder
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    {canDeleteDocument(document) && (
                      <DropdownMenuItem onClick={() => onDeleteDocument(document.id, document.name)}>
                        <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                        <span className="text-red-600">Delete</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Card view (default)
  return (
    <div>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-gray-500" />
          Documents ({documents.length})
        </h3>
        {documents.length > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all documents"
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.length > 0 && `${selectedIds.length} selected`}
            </span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {documents.map((document) => (
          <div
            key={document.id}
            className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative group flex flex-col"
            draggable
            onDragStart={() => handleDragStart(document.id)}
            onDragEnd={handleDragEnd}
            onClick={(e) => handleDocumentClick(document, e)}
          >
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={selectedIds.includes(document.id)}
                onCheckedChange={() => toggleSelect(document.id)}
                aria-label={`Select ${document.name}`}
                onClick={(e) => e.stopPropagation()}
              />
              <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <span className="font-medium truncate text-sm flex-1">{document.name}</span>
              {document.is_important && (
                <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-1 flex-1">
              <div>Type: {document.mime_type?.split('/')[1] || 'Unknown'}</div>
              <div>Size: {formatFileSize(document.file_size)}</div>
              <div>Modified: {format(new Date(document.updated_at), 'MMM dd, yyyy')}</div>
              <div>Uploaded by: {getUserDisplayName(document.uploaded_by)}</div>
            </div>
            {/* Analytics button at bottom right for admin/super_admin */}
            {(userRole === 'admin' || userRole === 'super_admin') && (
              <div className="absolute bottom-3 right-3 z-10">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <DocumentAnalytics
                          documentId={document.id}
                          documentName={document.name}
                          documentType="document"
                          buttonClassName="h-6 w-6 px-1 py-1 text-xs flex items-center justify-center"
                          iconOnly={true}
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>View Analytics</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-70 hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => onViewDocument(document)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </DropdownMenuItem>
                  {canDeleteDocument(document) && (
                    <>
                      <DropdownMenuItem onClick={() => onRenameDocument(document)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCopyDocument(document.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate File
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenMoveCopyDialog(document)}>
                        <Move className="h-4 w-4 mr-2" />
                        Move/Copy to Folder
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  {canDeleteDocument(document) && (
                    <DropdownMenuItem onClick={() => onDeleteDocument(document.id, document.name)}>
                      <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                      <span className="text-red-600">Delete</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
      <DocumentMoveCopyDialog
        isOpen={moveCopyDialogOpen}
        documentName={moveCopyDocument?.name || ''}
        folders={folders}
        currentFolderId={moveCopyDocument?.folder_id || null}
        onClose={handleCloseMoveCopyDialog}
        onMove={handleMove}
        onCopy={handleCopy}
      />
    </div>
  );
};
