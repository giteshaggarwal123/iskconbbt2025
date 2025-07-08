import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Settings, User, Menu } from 'lucide-react';
import { NotificationsDialog } from './NotificationsDialog';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNotifications } from '@/hooks/useNotifications';
import { logger } from '@/lib/utils';

interface HeaderProps {
  onMenuClick?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onNavigate?: (module: string, id?: string) => void;
  showMenuButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onMenuClick, 
  onProfileClick, 
  onSettingsClick,
  onNavigate,
  showMenuButton = true
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { getUnreadCount } = useNotifications();

  const unreadNotifications = getUnreadCount();
  logger.log('Header - Unread notifications:', unreadNotifications);

  // Get user's name for personalized greeting
  const userName = user?.user_metadata?.first_name 
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || 'Devotee';

  const handleNotificationNavigation = useCallback((module: string, id?: string) => {
    logger.log('Navigating from notification:', { module, id });
    setShowNotifications(false);
    if (onNavigate) {
      onNavigate(module, id);
    }
  }, [onNavigate]);

  const handleProfileClick = useCallback(() => {
    if (onProfileClick) {
      onProfileClick();
    }
  }, [onProfileClick]);

  const handleLogoClick = useCallback(() => {
    if (onNavigate) {
      onNavigate('dashboard');
    }
  }, [onNavigate]);

  const handleNotificationClick = useCallback(() => {
    logger.log('Notification bell clicked, unread count:', unreadNotifications);
    setShowNotifications(true);
  }, [unreadNotifications]);

  return (
    <>
      {/* Theme-colored status bar indicator - Only on mobile with higher z-index */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-12 bg-[#8E1616] z-60" aria-hidden="true" />
      )}
      
      <header className={`bg-white border-b border-gray-200 px-4 py-3 fixed left-0 right-0 h-16 ${
        isMobile ? 'top-12 z-60' : 'top-0 z-50'
      }`} role="banner">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center space-x-4">
            {/* Hamburger Menu Button - Show on both mobile and desktop */}
            {onMenuClick && showMenuButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuClick}
                className="hover:bg-gray-100 transition-colors"
                title={isMobile ? "Open navigation menu" : "Toggle sidebar"}
                aria-label={isMobile ? "Open navigation menu" : "Toggle sidebar"}
                aria-expanded="false"
              >
                <Menu className="h-4 w-4 text-foreground" aria-hidden="true" />
              </Button>
            )}
            
            {/* Logo and Title - Now clickable */}
            <button 
              onClick={handleLogoClick}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
              title="Go to Dashboard"
              aria-label="Go to Dashboard"
            >
              <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
                <img 
                  src="/icons/icon-512.png" 
                  alt="ISKCON Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-left">
                {!isMobile && (
                  <>
                    <h1 className="text-xl font-bold text-[#8E1616]">
                      ISKCON BUREAU
                    </h1>
                    <p className="text-sm text-muted-foreground -mt-1">
                      Management Portal
                    </p>
                  </>
                )}
                {isMobile && (
                  <>
                    <h1 className="text-lg font-bold text-[#8E1616]">
                      ISKCON BUREAU
                    </h1>
                    <p className="text-xs text-muted-foreground -mt-1">
                      Management Portal
                    </p>
                  </>
                )}
              </div>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Notifications - Only show red dot when there are unread notifications */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNotificationClick}
              className="relative"
              aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
              aria-haspopup="dialog"
            >
              <Bell className="h-4 w-4 text-foreground" aria-hidden="true" />
              {unreadNotifications > 0 && (
                <span 
                  className="absolute -top-1 -right-1 h-3 w-3 bg-[#8E1616] rounded-full animate-pulse" 
                  aria-label={`${unreadNotifications} unread notifications`}
                />
              )}
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsClick}
              aria-label="Settings"
            >
              <Settings className="h-4 w-4 text-foreground" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      {/* Dialogs */}
      <NotificationsDialog 
        open={showNotifications} 
        onOpenChange={setShowNotifications}
        onNavigate={handleNotificationNavigation}
      />
    </>
  );
};
