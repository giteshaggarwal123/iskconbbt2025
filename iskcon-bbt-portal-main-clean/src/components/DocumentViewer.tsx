import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DocumentViewerHeader } from './DocumentViewerHeader';
import { DocumentViewerContent } from './DocumentViewerContent';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentViewTracking } from '@/hooks/useDocumentViewTracking';
import { supabase } from '@/integrations/supabase/client';
import { Avatar } from './ui/avatar';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useProfile } from '@/hooks/useProfile';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    name: string;
    file_path: string;
    file_size: number | null;
    mime_type: string | null;
    uploaded_by: string;
    created_at: string;
  } | null;
  documentType?: 'document' | 'poll_attachment';
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  isOpen,
  onClose,
  document: documentProp,
  documentType = 'document'
}) => {
  const [zoom, setZoom] = useState(100);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Use the tracking hook with document type
  useDocumentViewTracking({
    documentId: documentProp?.id || null,
    userId: user?.id || null,
    isViewing: isOpen,
    documentType
  });

  // Reset zoom when document changes
  useEffect(() => {
    if (documentProp) {
      setZoom(100);
    }
  }, [documentProp?.id]);

  // Fetch comments for this document
  useEffect(() => {
    const fetchComments = async () => {
      if (!documentProp) return;
      setLoadingComments(true);
      const { data, error } = await supabase
        .from('document_comments')
        .select('*, profiles:profiles(id, first_name, last_name, avatar_url, email)')
        .eq('document_id', documentProp.id)
        .order('created_at', { ascending: true });
      if (!error) setComments(data || []);
      setLoadingComments(false);
    };
    fetchComments();
  }, [documentProp?.id, isOpen]);

  // Add new comment
  const handleAddComment = async () => {
    if (!commentText.trim() || !user || !documentProp) return;
    setSubmitting(true);
    const { error } = await supabase
      .from('document_comments')
      .insert({
        document_id: documentProp.id,
        user_id: user.id,
        comment: commentText.trim(),
      });
    setSubmitting(false);
    if (!error) {
      setCommentText('');
      // Refetch comments
      const { data } = await supabase
        .from('document_comments')
        .select('*, profiles:profiles(id, first_name, last_name, avatar_url, email)')
        .eq('document_id', documentProp.id)
        .order('created_at', { ascending: true });
      setComments(data || []);
    } else {
      toast({ title: 'Error', description: 'Failed to add comment', variant: 'destructive' });
    }
  };

  const handleDownload = async () => {
    if (!documentProp) return;
    toast({
      title: "Downloading...",
      description: `Preparing "${documentProp.name}" for download...`
    });
    try {
      const bucket = 'documents';
      const filePath = documentProp.file_path;
      if (typeof filePath !== 'string' || !filePath.trim()) {
        toast({
          title: "Download Error",
          description: "File path is missing or invalid.",
          variant: "destructive"
        });
        return;
      }
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 60);
      if (error || !data?.signedUrl) {
        toast({
          title: "Download Error",
          description: "Unable to generate download link.",
          variant: "destructive"
        });
        return;
      }
      // Force download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = documentProp.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Download Started",
        description: `"${documentProp.name}" download initiated successfully`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Unable to download the file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleExternalView = () => {
    if (!documentProp) return;
    
    try {
      // Open in new tab
      const newWindow = window.open(documentProp.file_path, '_blank', 'noopener,noreferrer');
      
      if (newWindow) {
        toast({
          title: "External View",
          description: `Opening "${documentProp.name}" in new tab`
        });
      } else {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups to open files in external tabs",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('External view error:', error);
      toast({
        title: "Error",
        description: "Unable to open file in external tab",
        variant: "destructive"
      });
    }
  };

  const handleZoomIn = () => {
    setZoom(Math.min(200, zoom + 25));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(25, zoom - 25));
  };

  const isImage = documentProp?.mime_type?.includes('image');
  const isPDF = documentProp?.mime_type?.includes('pdf');

  if (!documentProp) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] w-[95vw] h-[85vh] overflow-hidden p-0 flex flex-col">
        {isPDF ? (
          <div className="w-full flex-1 flex flex-col min-h-0">
            <div className="w-full flex-shrink-0" style={{height: 56}}>
              <div className="w-full h-full flex items-center px-4 border-b bg-white">
                <DocumentViewerHeader
                  document={documentProp}
                  zoom={zoom}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onDownload={handleDownload}
                  onExternalView={handleExternalView}
                  onClose={onClose}
                />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <DocumentViewerContent
                document={documentProp}
                zoom={zoom}
                onDownload={handleDownload}
                onExternalView={handleExternalView}
                hideActions={true}
                headerHeight={56}
              />
            </div>
          </div>
        ) : (
          <>
            <DialogHeader className="px-6 py-4 border-b bg-white">
              <DocumentViewerHeader
                document={documentProp}
                zoom={zoom}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onDownload={handleDownload}
                onExternalView={handleExternalView}
                onClose={onClose}
              />
            </DialogHeader>
            <div className={isImage ? "flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-4" : "flex-1 overflow-auto bg-gray-50"}>
              <DocumentViewerContent
                document={documentProp}
                zoom={zoom}
                onDownload={handleDownload}
                onExternalView={handleExternalView}
                hideActions={true}
              />
            </div>
          </>
        )}
        {/* Comments Section - always visible at bottom */}
        <div className="border-t bg-white px-6 py-4 max-h-64 overflow-y-auto flex-shrink-0">
          <h3 className="font-semibold text-lg mb-2">Comments</h3>
          {loadingComments ? (
            <div className="text-gray-500">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-gray-400 italic">No comments yet. Be the first to comment!</div>
          ) : (
            <div className="space-y-4">
              {comments.map((c, idx) => (
                <div key={c.id || idx} className="flex items-start gap-3">
                  <Avatar src={c.profiles?.avatar_url} alt={c.profiles?.first_name || c.profiles?.email || 'User'} />
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {c.profiles?.first_name || ''} {c.profiles?.last_name || ''} <span className="text-xs text-gray-500">{c.profiles?.email}</span>
                    </div>
                    <div className="text-xs text-gray-400 mb-1">{new Date(c.created_at).toLocaleString()}</div>
                    <div className="text-gray-800 text-base">{c.comment}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Add comment box */}
          {user && (
            <div className="flex items-center gap-2 mt-4">
              <Input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                disabled={submitting}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
              />
              <Button onClick={handleAddComment} disabled={submitting || !commentText.trim()}>
                {submitting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
