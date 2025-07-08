
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'>('prompt');
  const [isNative, setIsNative] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const checkPlatform = () => {
    // Enhanced native app detection
    const capacitorNative = typeof window !== 'undefined' && 
                           window.Capacitor && 
                           window.Capacitor.isNative === true;
    
    // Additional check for mobile user agent
    const isMobile = typeof navigator !== 'undefined' && 
                    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const isNativeApp = capacitorNative || isMobile;
    setIsNative(isNativeApp);
    console.log('Platform detected:', isNativeApp ? 'Native/Mobile' : 'Web');
    return isNativeApp;
  };

  const checkWebPushSupport = () => {
    console.log('Checking web push support...');
    
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      console.log('Window or navigator not available');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return false;
    }

    if (!('PushManager' in window)) {
      console.log('Push Manager not supported');
      return false;
    }

    if (!('Notification' in window)) {
      console.log('Notification API not supported');
      return false;
    }

    console.log('Web push is supported');
    return true;
  };

  const getCurrentPermissionStatus = async () => {
    if (isNative) {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const permResult = await PushNotifications.checkPermissions();
        console.log('Native permission status:', permResult.receive);
        return permResult.receive;
      } catch (error) {
        console.log('Error checking native permissions:', error);
        return 'prompt';
      }
    } else {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'denied';
      }
      
      const permission = Notification.permission;
      console.log('Web notification permission:', permission);
      return permission as 'granted' | 'denied' | 'prompt';
    }
  };

  const initializeNativePush = async () => {
    try {
      console.log('Initializing native push notifications...');
      
      // Import Capacitor plugins dynamically
      const { PushNotifications } = await import('@capacitor/push-notifications');
      setIsSupported(true);
      
      // Check and update permission status
      const permission = await getCurrentPermissionStatus();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        // Register for push notifications
        await PushNotifications.register();
        
        // Set up listeners
        PushNotifications.addListener('registration', async (token) => {
          console.log('Native push registration success:', token.value);
          setToken(token.value);
          
          if (user && token.value) {
            await savePushToken(token.value);
          }
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Native push registration error:', error);
          setIsSupported(false);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received:', notification);
          toast.success(notification.title || 'New notification', {
            description: notification.body,
          });
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push action performed:', notification);
          const data = notification.notification.data;
          if (data?.module) {
            window.location.hash = `#/${data.module}${data.id ? `/${data.id}` : ''}`;
          }
        });
      }
    } catch (error) {
      console.log('Native push notifications not available:', error);
      // For mobile web, still try to use web notifications
      if (checkWebPushSupport()) {
        await initializeWebPush();
      } else {
        setIsSupported(false);
      }
    }
  };

  const initializeWebPush = async () => {
    try {
      console.log('Initializing web push notifications...');
      
      const isWebSupported = checkWebPushSupport();
      setIsSupported(isWebSupported);
      
      if (!isWebSupported) {
        return;
      }

      const permission = await getCurrentPermissionStatus();
      setPermissionStatus(permission);
      
      // Register service worker for web
      if (!isNative) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered for web');
          
          if (permission === 'granted') {
            const fallbackToken = `web-${Date.now()}`;
            setToken(fallbackToken);
            if (user) await savePushToken(fallbackToken);
          }
        } catch (error) {
          console.log('Service Worker registration failed:', error);
        }
      }
    } catch (error) {
      console.error('Web push initialization error:', error);
      setIsSupported(false);
    }
  };

  const savePushToken = async (pushToken: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          push_token: pushToken,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;
      console.log('Push token saved successfully');
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  const requestPermission = async () => {
    setIsLoading(true);
    
    try {
      console.log('Requesting notification permission...');
      
      if (isNative) {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const result = await PushNotifications.requestPermissions();
        console.log('Native permission result:', result);
        setPermissionStatus(result.receive);
        
        if (result.receive === 'granted') {
          await PushNotifications.register();
          toast.success('Push notifications enabled!');
          
          // Re-initialize to set up listeners
          await initializeNativePush();
        } else {
          toast.error('Push notifications permission denied');
        }
      } else {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          console.log('Web permission result:', permission);
          setPermissionStatus(permission as any);
          
          if (permission === 'granted') {
            toast.success('Push notifications enabled!');
            await initializeWebPush();
          } else {
            toast.error('Push notifications permission denied');
          }
        } else {
          toast.error('Notifications not supported in this browser');
        }
      }
    } catch (error) {
      console.error('Permission request error:', error);
      toast.error('Failed to request notification permission');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      const timer = setTimeout(async () => {
        const native = checkPlatform();
        const currentPermission = await getCurrentPermissionStatus();
        setPermissionStatus(currentPermission);
        
        if (native) {
          await initializeNativePush();
        } else {
          await initializeWebPush();
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  return {
    isSupported,
    token,
    permissionStatus,
    requestPermission,
    isNative,
    isLoading
  };
};
