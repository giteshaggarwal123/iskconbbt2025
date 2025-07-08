import React, { useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, Clock, Vote, Calendar, FileText } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { logger } from '@/lib/utils';

interface NotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (module: string, id?: string) => void;
}

export const NotificationsDialog: React.FC<NotificationsDialogProps> = ({ 
  open, 
  onOpenChange,
  onNavigate 
}) => {
  const { 
    notifications, 
    loading, 
    markAllAsRead, 
    handleNotificationClick, 
    getUnreadCount,
    getTimeAgo,
    markAsRead
  } = useNotifications();

  const getIcon = useCallback((type: string) => {
    switch (type) {
      case 'meeting':
        return <Calendar className="h-5 w-5 text-primary" />;
      case 'voting':
        return <Vote className="h-5 w-5 text-orange-500" />;
      case 'document':
        return <FileText className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  }, []);

  const handleNotificationItemClick = useCallback((notification: any) => {
    logger.log('Notification clicked:', notification);
    const navInfo = handleNotificationClick(notification);
    
    if (onNavigate && navInfo) {
      let module = 'dashboard';
      
      switch (navInfo.type) {
        case 'meeting':
          module = 'meetings';
          break;
        case 'document':
          module = 'documents';
          break;
        case 'voting':
          module = 'voting';
          break;
        default:
          module = 'dashboard';
      }
      
      onNavigate(module, navInfo.id);
    }
  }, [handleNotificationClick, onNavigate]);

  const handleMarkAllAsRead = useCallback(() => {
    logger.log('Marking all notifications as read');
    markAllAsRead();
  }, [markAllAsRead]);

  const handleMarkAsRead = useCallback((notificationId: string) => {
    logger.log('Marking notification as read:', notificationId);
    markAsRead(notificationId);
  }, [markAsRead]);

  const unreadCount = getUnreadCount();

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 rounded-2xl shadow-xl bg-white">
        <DialogHeader className="sticky top-0 z-10 bg-white rounded-t-2xl border-b px-6 pt-5 pb-3">
          <DialogTitle className="flex items-center space-x-2 text-lg font-bold">
            <Bell className="h-5 w-5 text-primary" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge className="bg-primary text-white px-2 py-0.5 rounded-full text-xs">{unreadCount} new</Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 mt-1">
            Stay updated with all platform activities
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[28rem] overflow-y-auto px-2 sm:px-4 py-2 bg-white rounded-b-2xl">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Bell className="h-12 w-12 mb-4" />
              <p className="font-medium text-base">No notifications yet</p>
              <p className="text-xs text-gray-400 mt-1">You'll see updates here when activities happen</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-colors group ${
                    notification.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200 shadow-sm'
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className={`text-sm font-semibold ${!notification.read ? 'text-primary' : 'text-gray-900'}`}>{notification.title}</h4>
                      <div className="flex items-center space-x-2">
                        {!notification.read && <span className="w-2 h-2 bg-primary rounded-full"></span>}
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{getTimeAgo(notification.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs px-2 py-1 rounded-md border-gray-300 hover:bg-primary/10"
                        onClick={() => handleNotificationItemClick(notification)}
                      >
                        View
                      </Button>
                      {!notification.read && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-xs px-2 py-1 rounded-md text-primary hover:bg-primary/10"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="flex justify-end px-6 py-3 border-t bg-white rounded-b-2xl">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs px-3 py-1 rounded-md border-gray-300 hover:bg-primary/10"
            >
              <Check className="h-4 w-4 mr-1" />
              Mark All Read
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
