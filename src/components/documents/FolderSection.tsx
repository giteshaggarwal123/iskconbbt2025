import React from 'react';
import { FolderOpen, Lock, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { useDocuments } from '@/hooks/useDocuments';
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

interface FolderSectionProps {
  folders: Folder[];
  userProfiles: {[key: string]: {first_name: string, last_name: string}};
  onFolderClick: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => Promise<boolean>;
  canAccessLockedFolders?: boolean;
  viewMode?: 'card' | 'list';
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

export const FolderSection: React.FC<FolderSectionProps> = ({
  folders,
  userProfiles,
  onFolderClick,
  onDeleteFolder,
  canAccessLockedFolders = false,
  viewMode = 'card',
  selectedIds = [],
  onSelectionChange
}) => {
  const { lockFolder, unlockFolder } = useDocuments();
  const userRole = useUserRole();

  const getUserDisplayName = (userId: string) => {
    const profile = userProfiles[userId];
    if (profile) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return 'Unknown User';
  };

  const handleDeleteFolderAction = async (folderId: string, folderName: string) => {
    const success = await onDeleteFolder(folderId);
    if (success) {
      // Handle success if needed
    }
  };

  // Helper to toggle selection
  const toggleSelect = (folderId: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(folderId)) {
      onSelectionChange(selectedIds.filter(id => id !== folderId));
    } else {
      onSelectionChange([...selectedIds, folderId]);
    }
  };

  // Recursive render function
  const renderFolders = (parentId: string | null = null, level = 0) => {
    return folders
      .filter(folder => folder.parent_folder_id === parentId)
      .map(folder => (
        <div
          key={`folder-${folder.id}`}
          style={{ marginLeft: `${level * 20}px` }}
          className="bg-card border rounded-lg p-3 sm:p-4 hover:bg-muted/30 transition-colors cursor-pointer group mb-2"
          onClick={() => onFolderClick(folder.id)}
        >
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <input
                type="checkbox"
                checked={selectedIds.includes(folder.id)}
                onChange={e => { e.stopPropagation(); toggleSelect(folder.id); }}
                onClick={e => e.stopPropagation()}
                className="mr-2"
              />
              {folder.is_locked ? (
                <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 flex-shrink-0" />
              ) : (
                <FolderOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
              )}
              <span className={`font-medium truncate text-sm sm:text-base ${folder.is_locked ? 'text-red-700' : ''}`}>{folder.name}</span>
            </div>
            {canAccessLockedFolders && (
              <div onClick={e => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => handleDeleteFolderAction(folder.id, folder.name)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                    {userRole.isAdmin || userRole.isSuperAdmin ? (
                      folder.is_locked ? (
                        <DropdownMenuItem onClick={() => unlockFolder.mutate(folder.id)}>
                          <Lock className="h-4 w-4 mr-2" /> Unlock
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => lockFolder.mutate(folder.id)}>
                          <Lock className="h-4 w-4 mr-2" /> Lock
                        </DropdownMenuItem>
                      )
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          {folder.is_locked && (
            <Badge variant="destructive" className="text-xs mb-2">
              LOCKED
            </Badge>
          )}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Modified: {format(new Date(folder.updated_at), 'MMM dd, yyyy')}</div>
            <div className="truncate">Created by: {getUserDisplayName(folder.created_by)}</div>
          </div>
          {/* Render subfolders recursively */}
          {renderFolders(folder.id, level + 1)}
        </div>
      ));
  };

  if (folders.length === 0) {
    return null;
  }

  if (viewMode === 'list') {
    return (
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center">
          <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
          Folders ({folders.length})
        </h3>
        <div className="space-y-1">
          {folders.filter(f => f.parent_folder_id === null).map(folder => (
            <div
              key={`folder-list-${folder.id}`}
              className="bg-card border rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer group flex items-center justify-between"
              onClick={() => onFolderClick(folder.id)}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(folder.id)}
                onChange={e => { e.stopPropagation(); toggleSelect(folder.id); }}
                onClick={e => e.stopPropagation()}
                className="mr-2"
              />
                {folder.is_locked ? (
                  <Lock className="h-5 w-5 text-red-500 flex-shrink-0" />
                ) : (
                  <FolderOpen className="h-5 w-5 text-blue-500 flex-shrink-0" />
                )}
              <span className={`font-medium truncate text-sm ${folder.is_locked ? 'text-red-700' : ''}`}>{folder.name}</span>
              {canAccessLockedFolders && (
                <div onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => onDeleteFolder(folder.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default to card (grid) view
  return (
    <div className="mb-4 sm:mb-6">
      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center">
        <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
        Folders ({folders.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {folders.filter(f => f.parent_folder_id === null).map(folder => (
          <div
            key={`folder-card-${folder.id}`}
            className="bg-card border rounded-lg p-3 sm:p-4 hover:bg-muted/30 transition-colors cursor-pointer group mb-2 flex flex-col"
            onClick={() => onFolderClick(folder.id)}
          >
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                checked={selectedIds.includes(folder.id)}
                onChange={e => { e.stopPropagation(); toggleSelect(folder.id); }}
                onClick={e => e.stopPropagation()}
                className="mr-2"
              />
                {folder.is_locked ? (
                  <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 flex-shrink-0" />
                ) : (
                  <FolderOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
                )}
              <span className={`font-medium truncate text-sm sm:text-base ${folder.is_locked ? 'text-red-700' : ''}`}>{folder.name}</span>
            </div>
            {folder.is_locked && (userRole.isAdmin || userRole.isSuperAdmin) && (
              <div className="absolute top-2 right-2 z-10">
                <Button variant="ghost" size="icon" className="text-red-600" title="Unlock folder" onClick={e => { e.stopPropagation(); unlockFolder.mutate(folder.id); }}>
                  <Lock className="h-5 w-5" />
                </Button>
              </div>
            )}
            {folder.is_locked && (
              <Badge variant="destructive" className="text-xs mb-2">
                LOCKED
              </Badge>
            )}
            <div className="text-xs text-muted-foreground space-y-1 flex-1">
              <div>Modified: {format(new Date(folder.updated_at), 'MMM dd, yyyy')}</div>
              <div className="truncate">Created by: {getUserDisplayName(folder.created_by)}</div>
              </div>
              {canAccessLockedFolders && (
              <div onClick={e => e.stopPropagation()} className="mt-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => handleDeleteFolderAction(folder.id, folder.name)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
};
