
import React, { useEffect, useState } from 'react';
import { useDeviceInfo } from '@/hooks/useDeviceInfo';

export const MobileSplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const deviceInfo = useDeviceInfo();

  useEffect(() => {
    // Start fade out animation earlier
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 800);

    // Hide splash screen after fade animation
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 1200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 bg-white z-50 flex flex-col items-center justify-center transition-opacity duration-300 ${
      fadeOut ? 'opacity-0' : 'opacity-100'
    }`}>
      <div className="flex flex-col items-center space-y-6">
        {/* App Logo */}
        <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-lg">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
        
        {/* App Name */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">ISKCON Bureau</h1>
          <p className="text-gray-600 mt-1">Management Portal</p>
          <p className="text-sm text-gray-500 mt-1">
            {deviceInfo.isNative ? 'Mobile App' : 'Web Portal'}
          </p>
        </div>
        
        {/* Loading Animation */}
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
      
      {/* Version info for native apps */}
      {deviceInfo.isNative && (
        <div className="absolute bottom-8 text-center">
          <p className="text-xs text-gray-500">
            {deviceInfo.operatingSystem} {deviceInfo.osVersion}
          </p>
        </div>
      )}
      
      {/* Footer */}
      <div className="absolute bottom-4 text-center">
        <p className="text-xs text-gray-400">
          © 2025 ISKCON Bureau Management Portal
        </p>
      </div>
    </div>
  );
};
