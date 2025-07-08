import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, File } from 'lucide-react';
import { formatFileSize, formatDate } from './DocumentViewerUtils';

interface Document {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
}

interface DocumentViewerContentProps {
  document: Document;
  zoom?: number;
  onDownload: () => void;
  onExternalView: () => void;
  hideActions?: boolean;
  headerHeight?: number;
}

export const DocumentViewerContent: React.FC<DocumentViewerContentProps> = ({
  document,
  zoom = 100,
  onDownload,
  onExternalView,
  hideActions = false,
  headerHeight = 0
}) => {
  console.log('DocumentViewerContent - Document:', document);
  console.log('DocumentViewerContent - File path:', document.file_path);
  console.log('DocumentViewerContent - MIME type:', document.mime_type);
  
  const mimeType = document.mime_type || '';
  
  const renderFilePreview = () => {
    console.log('Rendering file preview for:', document.name, 'Type:', mimeType);
    
    // Check if this is a Supabase storage URL (public URL)
    const isSupabaseStorage = document.file_path.includes('supabase.co/storage') || 
                             document.file_path.includes('/storage/v1/object/public/');
    
    console.log('Is Supabase storage URL?', isSupabaseStorage);
    
    if (!isSupabaseStorage) {
      // Show demo message for non-storage paths
      return (
        <div className="w-full h-full bg-white rounded-lg border flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <File className="h-24 w-24 text-gray-400 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Demo Environment</h3>
            <p className="text-gray-500 mb-4">
              This document was created before storage was configured.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span> {mimeType.split('/')[1] || 'file'}
                </div>
                <div>
                  <span className="font-medium">Size:</span> {formatFileSize(document.file_size)}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {formatDate(document.created_at)}
                </div>
                <div>
                  <span className="font-medium">Format:</span> {document.name.split('.').pop()?.toUpperCase()}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-4">
              File path: {document.file_path}
            </div>
            {!hideActions && (
              <div className="flex space-x-2 justify-center">
                <Button onClick={onDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download (Demo)
                </Button>
                <Button onClick={onExternalView} size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View (Demo)
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Handle real files from Supabase Storage
    if (mimeType.includes('image')) {
      return (
        <div className="w-full bg-gray-100 document-viewer-image-mobile-parent" style={{height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <img 
            src={document.file_path} 
            alt={document.name}
            className="document-viewer-image-mobile"
            style={{ 
              width: 'auto',
              height: 'auto',
              maxWidth: '100vw',
              maxHeight: '100%',
              objectFit: 'contain',
              display: 'block',
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
            onError={(e) => {
              console.error('Image failed to load:', document.file_path);
              e.currentTarget.style.display = 'none';
            }}
            onLoad={() => {
              console.log('Image loaded successfully:', document.file_path);
            }}
          />
        </div>
      );
    }
    
    if (mimeType.includes('pdf')) {
      return (
        <iframe
          src={`${document.file_path}#toolbar=0&navpanes=0&scrollbar=1`}
          className="w-full border-0 document-viewer-pdf-mobile"
          style={{ height: '60vh' }}
          title={document.name}
          onError={() => {
            console.error('PDF failed to load:', document.file_path);
          }}
        />
      );
    }

    if (mimeType.includes('text')) {
      return (
        <div className="w-full h-full p-4 bg-white overflow-auto">
          <iframe
            src={document.file_path}
            className="w-full h-full border-0"
            title={document.name}
            style={{ fontSize: `${zoom}%` }}
          />
        </div>
      );
    }

    // For Office documents, show download interface (simplified approach)
    if (mimeType.includes('word') || mimeType.includes('document') || 
        mimeType.includes('spreadsheet') || mimeType.includes('excel') ||
        mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      
      return (
        <div className="w-full h-full bg-white rounded-lg border flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <FileText className="h-24 w-24 text-blue-500 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Office Document</h3>
            <p className="text-gray-500 mb-4">
              Click download to access this {mimeType.includes('word') ? 'Word' : 
                                           mimeType.includes('excel') ? 'Excel' : 
                                           mimeType.includes('powerpoint') ? 'PowerPoint' : 'Office'} document.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span> {mimeType.includes('word') ? 'Word' : 
                                                            mimeType.includes('excel') ? 'Excel' : 
                                                            mimeType.includes('powerpoint') ? 'PowerPoint' : 'Office'}
                </div>
                <div>
                  <span className="font-medium">Size:</span> {formatFileSize(document.file_size)}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {formatDate(document.created_at)}
                </div>
                <div>
                  <span className="font-medium">Format:</span> {document.name.split('.').pop()?.toUpperCase()}
                </div>
              </div>
            </div>
            {!hideActions && (
              <div className="flex space-x-2 justify-center">
                <Button onClick={onDownload} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button onClick={onExternalView} variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open External
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Fallback for other file types
    return (
      <div className="w-full h-full bg-white rounded-lg border flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <FileText className="h-24 w-24 text-blue-500 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">File Ready</h3>
          <p className="text-gray-500 mb-4">
            Click download to access this {mimeType.split('/')[1] || 'file'} file.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Type:</span> {mimeType.split('/')[1] || 'file'}
              </div>
              <div>
                <span className="font-medium">Size:</span> {formatFileSize(document.file_size)}
              </div>
              <div>
                <span className="font-medium">Created:</span> {formatDate(document.created_at)}
              </div>
              <div>
                <span className="font-medium">Format:</span> {document.name.split('.').pop()?.toUpperCase()}
              </div>
            </div>
          </div>
          {!hideActions && (
            <div className="flex space-x-2 justify-center">
              <Button onClick={onDownload} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={onExternalView} variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open External
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full">
      {renderFilePreview()}
    </div>
  );
};
