import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/utils';

interface UseFocusManagementOptions {
  trapFocus?: boolean;
  restoreFocus?: boolean;
  initialFocus?: string;
}

export const useFocusManagement = (options: UseFocusManagementOptions = {}) => {
  const { trapFocus = false, restoreFocus = true, initialFocus } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const savePreviousFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    logger.log('Previous focus saved:', previousFocusRef.current);
  }, []);

  const restorePreviousFocus = useCallback(() => {
    if (restoreFocus && previousFocusRef.current) {
      previousFocusRef.current.focus();
      logger.log('Previous focus restored:', previousFocusRef.current);
    }
  }, [restoreFocus]);

  const focusFirstFocusableElement = useCallback(() => {
    if (!containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      const firstElement = focusableElements[0] as HTMLElement;
      firstElement.focus();
      logger.log('First focusable element focused:', firstElement);
    }
  }, []);

  const focusLastFocusableElement = useCallback(() => {
    if (!containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      lastElement.focus();
      logger.log('Last focusable element focused:', lastElement);
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!trapFocus || !containerRef.current) return;

    const focusableElements = Array.from(
      containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];

    if (focusableElements.length === 0) return;

    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab
        if (currentIndex <= 0) {
          event.preventDefault();
          focusLastFocusableElement();
        }
      } else {
        // Tab
        if (currentIndex >= focusableElements.length - 1) {
          event.preventDefault();
          focusFirstFocusableElement();
        }
      }
    }
  }, [trapFocus, focusFirstFocusableElement, focusLastFocusableElement]);

  useEffect(() => {
    if (trapFocus) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [trapFocus, handleKeyDown]);

  const activate = useCallback(() => {
    savePreviousFocus();
    
    if (initialFocus) {
      const element = document.querySelector(initialFocus) as HTMLElement;
      if (element) {
        element.focus();
        logger.log('Initial focus element focused:', element);
      } else {
        focusFirstFocusableElement();
      }
    } else {
      focusFirstFocusableElement();
    }
  }, [savePreviousFocus, initialFocus, focusFirstFocusableElement]);

  const deactivate = useCallback(() => {
    restorePreviousFocus();
  }, [restorePreviousFocus]);

  return {
    containerRef,
    activate,
    deactivate,
    focusFirstFocusableElement,
    focusLastFocusableElement
  };
}; 