import React, { useState, useEffect } from 'react';

interface DeviceInfo {
  platform: string;
  isNative: boolean;
  model: string;
  operatingSystem: string;
  osVersion: string;
}

export const useDeviceInfo = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    platform: 'web',
    isNative: false,
    model: 'Unknown',
    operatingSystem: 'Unknown',
    osVersion: 'Unknown'
  });

  useEffect(() => {
    const getDeviceInfo = async () => {
      // First set web device info immediately to avoid delays
      setWebDeviceInfo();

      // Then check if we're running in a Capacitor app
      if (window.Capacitor?.isNative) {
        try {
          // Dynamic import with error handling
          const { Device } = await import('@capacitor/device');
          const info = await Device.getInfo();
          setDeviceInfo({
            platform: info.platform,
            isNative: true,
            model: info.model,
            operatingSystem: info.operatingSystem,
            osVersion: info.osVersion
          });
        } catch (error) {
          console.log('Capacitor Device plugin not available, using web detection:', error);
          // Keep web detection already set
        }
      }
    };

    const setWebDeviceInfo = () => {
      const userAgent = navigator.userAgent;
      let platform = 'web';
      let os = 'Unknown';
      
      if (/Android/i.test(userAgent)) {
        platform = 'android';
        os = 'Android';
      } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
        platform = 'ios';
        os = 'iOS';
      } else if (/Windows/i.test(userAgent)) {
        os = 'Windows';
      } else if (/Mac/i.test(userAgent)) {
        os = 'macOS';
      } else if (/Linux/i.test(userAgent)) {
        os = 'Linux';
      }
      
      setDeviceInfo({
        platform,
        isNative: false,
        model: 'Web Browser',
        operatingSystem: os,
        osVersion: 'Unknown'
      });
    };

    getDeviceInfo();
  }, []);

  return deviceInfo;
};
