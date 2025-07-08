import React, { memo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
  showMobilePadding?: boolean;
}

export const MobileResponsiveLayout = memo<MobileResponsiveLayoutProps>(({ 
  children, 
  className = '', 
  showMobilePadding = true 
}) => {
  const isMobile = useIsMobile();

  return (
    <div 
      className={`w-full transition-all duration-300 ${
        isMobile 
          ? `${showMobilePadding ? 'px-4 pb-32' : 'pb-32'} pt-4` 
          : 'p-6'
      } ${className}`}
      role="region"
      aria-label="Content area"
    >
      {children}
    </div>
  );
});

MobileResponsiveLayout.displayName = 'MobileResponsiveLayout';
