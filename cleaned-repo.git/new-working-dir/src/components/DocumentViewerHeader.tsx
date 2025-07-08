import React from 'react';
import { DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Download, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';
import { formatFileSize, formatDate } from './DocumentViewerUtils';
import './DocumentViewerHeader.css';

interface Document {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
}

interface DocumentViewerHeaderProps {
  document: Document;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onDownload: () => void;
  onExternalView: () => void;
  onClose: () => void;
}

// Mobile accessibility: Download button is always visible and controls are styled for mobile usability.
export const DocumentViewerHeader: React.FC<DocumentViewerHeaderProps> = ({
  document,
  zoom,
  onZoomIn,
  onZoomOut,
  onDownload,
  onExternalView,
  onClose
}) => {
  const isImage = document.mime_type?.includes('image');

  return (
    <div className="flex items-center justify-between p-4 border-b document-viewer-header-mobile">
      <div className="flex-1 min-w-0">
        <DialogTitle className="text-lg font-semibold truncate">
          {document.name}
        </DialogTitle>
        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
          <Badge variant="secondary">
            {document.mime_type?.split('/')[1] || 'file'}
          </Badge>
          <span>{formatFileSize(document.file_size)}</span>
          <span>Created {formatDate(document.created_at)}</span>
        </div>
      </div>
      
      {/* Controls are wrapped in mobile-header-controls for mobile-friendly layout */}
      <div className="flex items-center space-x-2 ml-4 document-viewer-header-controls mobile-header-controls">
        {isImage && (
          <div className="flex items-center bg-muted rounded-md">
            <Button
              size="sm"
              variant="ghost"
              onClick={onZoomOut}
              disabled={zoom <= 25}
              className="h-9 w-9 p-0 rounded-r-none"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="px-3 py-2 text-sm font-medium bg-muted border-x min-w-[60px] text-center">
              {zoom}%
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onZoomIn}
              disabled={zoom >= 200}
              className="h-9 w-9 p-0 rounded-l-none"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        )}
        {/* Download button removed as per request */}
        <Button size="sm" variant="outline" onClick={onExternalView} className="h-9 open-external-btn" title="Open in new tab (use this to download)">
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-9">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
