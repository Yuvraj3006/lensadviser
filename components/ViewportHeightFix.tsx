'use client';

import { useEffect } from 'react';

/**
 * ViewportHeightFix Component
 * 
 * Fixes mobile browser viewport height issues by dynamically setting
 * the --vh CSS variable based on actual window.innerHeight.
 * 
 * This prevents layout jumps when mobile browser address bars show/hide.
 */
export function ViewportHeightFix() {
  useEffect(() => {
    // Lock to initial viewport height to prevent address bar hide/show from affecting layout
    let initialHeight: number | null = null;
    let isInitialized = false;

    // Function to set viewport height variable
    const setViewportHeight = (forceUpdate = false) => {
      // Use visual viewport if available (for mobile browsers with dynamic UI)
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      
      // On first call, lock to initial height (when address bar is visible)
      // This prevents layout jumps when address bar hides during scroll
      if (!isInitialized || initialHeight === null) {
        initialHeight = viewportHeight;
        isInitialized = true;
      }
      
      // For scrollable pages, use the initial height (when address bar is visible)
      // This keeps the viewport constant even when address bar hides
      // Only update if it's a significant change (orientation change, window resize)
      const currentHeight = viewportHeight;
      const heightDifference = Math.abs(currentHeight - (initialHeight || currentHeight));
      
      // Only update if forced or if height changed significantly (orientation change)
      if (forceUpdate || heightDifference > 100) {
        initialHeight = currentHeight;
      }
      
      // Use the locked initial height to prevent address bar from affecting layout
      const lockedHeight = initialHeight || currentHeight;
      const vh = lockedHeight * 0.01;
      
      // Set CSS variable with locked height
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set initial value (locks to height when address bar is visible)
    setViewportHeight();

    // Update on resize (but only for significant changes, not address bar hide/show)
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      // Debounce resize events
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Only update if it's a real resize (window size change), not address bar hide/show
        const currentHeight = window.visualViewport?.height || window.innerHeight;
        const heightDifference = Math.abs(currentHeight - (initialHeight || currentHeight));
        
        // If height changed significantly (more than 100px), it's likely a real resize
        if (heightDifference > 100) {
          setViewportHeight(true);
        }
      }, 150);
    };

    // Update on orientation change (always update on orientation change)
    const handleOrientationChange = () => {
      // Delay to ensure accurate height after orientation change
      setTimeout(() => {
        setViewportHeight(true);
      }, 300);
    };

    // Add event listeners
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
    
    // Don't listen to visual viewport changes for scroll - this causes the issue
    // Only listen for significant changes (like keyboard appearing)
    let cleanupVisualViewport: (() => void) | null = null;
    
    if (typeof window.visualViewport !== 'undefined' && window.visualViewport) {
      const handleVisualViewportResize = () => {
        if (!window.visualViewport) return;
        const currentHeight = window.visualViewport.height || window.innerHeight;
        const heightDifference = Math.abs(currentHeight - (initialHeight || currentHeight));
        
        // Only update if it's a significant change (keyboard, orientation), not address bar
        if (heightDifference > 150) {
          setViewportHeight(true);
        }
      };
      
      window.visualViewport.addEventListener('resize', handleVisualViewportResize, { passive: true });
      
      cleanupVisualViewport = () => {
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
        }
      };
    }
    
    // Cleanup
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (cleanupVisualViewport) {
        cleanupVisualViewport();
      }
    };
  }, []);

  // This component doesn't render anything
  return null;
}

