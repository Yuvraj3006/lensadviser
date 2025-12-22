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
    // Function to set viewport height variable
    const setViewportHeight = () => {
      // Get actual viewport height (excludes browser UI)
      const vh = window.innerHeight * 0.01;
      // Set CSS variable
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set initial value
    setViewportHeight();

    // Update on resize (handles address bar show/hide)
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      // Debounce resize events
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setViewportHeight();
      }, 100);
    };

    // Update on orientation change
    const handleOrientationChange = () => {
      // Delay to ensure accurate height after orientation change
      setTimeout(() => {
        setViewportHeight();
      }, 200);
    };

    // Add event listeners
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
    
    // Also listen to visual viewport changes (for mobile browsers)
    if (typeof window.visualViewport !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize, { passive: true });
    }

    // Cleanup
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (typeof window.visualViewport !== 'undefined' && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // This component doesn't render anything
  return null;
}

