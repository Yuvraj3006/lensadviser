'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';

interface DragInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export function DragInput({
  value,
  onChange,
  step = 0.25,
  min,
  max,
  placeholder,
  label,
  error,
  className = '',
  disabled = false,
}: DragInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  // Generate all possible values based on min, max, and step
  const options = useMemo(() => {
    const values: number[] = [];
    const start = min ?? -20;
    const end = max ?? 20;
    
    // Ensure we have valid range
    if (start > end) {
      console.warn(`DragInput: Invalid range - min (${start}) > max (${end})`);
      return [];
    }
    
    // Generate values from start to end with given step
    for (let val = start; val <= end; val += step) {
      // Round to avoid floating point issues
      const rounded = Math.round(val / step) * step;
      // Only add if rounded value is still within bounds (handle floating point precision)
      if (rounded >= start - step/2 && rounded <= end + step/2) {
        values.push(rounded);
      }
    }
    
    return values;
  }, [min, max, step]);

  // Find current value index
  const currentIndex = useMemo(() => {
    if (value === null || value === undefined) return -1;
    return options.findIndex(opt => Math.abs(opt - value) < step / 2);
  }, [value, options, step]);

  // Calculate dropdown position - stick to input field (optimized for all devices)
  const updateDropdownPosition = () => {
    if (inputRef.current) {
      // Use requestAnimationFrame for smooth positioning
      requestAnimationFrame(() => {
        if (!inputRef.current) return;
        
        // Get the input's position relative to viewport
        const rect = inputRef.current.getBoundingClientRect();
        
        // Use visual viewport if available (for mobile browsers with dynamic UI)
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const viewportWidth = window.visualViewport?.width || window.innerWidth;
        
        // Account for visual viewport offset (mobile browser UI)
        const viewportOffsetTop = window.visualViewport?.offsetTop || 0;
        const viewportOffsetLeft = window.visualViewport?.offsetLeft || 0;
        
        // Dropdown dimensions
        const dropdownMaxHeight = 300; // max-h-[300px]
        const gap = 4; // Small gap between input and dropdown
        const edgeMargin = 8; // Margin from viewport edges
        
        // Calculate available space (using getBoundingClientRect which is relative to viewport)
        // Account for visual viewport offset on mobile
        const adjustedTop = rect.top - viewportOffsetTop;
        const adjustedBottom = rect.bottom - viewportOffsetTop;
        const spaceBelow = viewportHeight - adjustedBottom;
        const spaceAbove = adjustedTop;
        
        // Determine best position (prefer below, but open upwards if insufficient space below)
        // Minimum space required to show dropdown comfortably
        const minRequiredSpace = 200; // Minimum height we want to show
        const hasEnoughSpaceBelow = spaceBelow >= minRequiredSpace;
        const hasEnoughSpaceAbove = spaceAbove >= minRequiredSpace;
        
        // Calculate position - use getBoundingClientRect values directly (viewport-relative)
        let top: number;
        let left: number;
        let width: number;
        
        // Decision logic: open below if enough space, otherwise open above if more space there
        if (hasEnoughSpaceBelow) {
          // Enough space below - open downwards
          top = adjustedBottom + gap;
        } else if (hasEnoughSpaceAbove || spaceAbove > spaceBelow) {
          // Not enough space below, but more space above - open upwards
          const availableHeight = Math.min(dropdownMaxHeight, spaceAbove - gap);
          top = adjustedTop - availableHeight - gap;
        } else {
          // More space below (even if not ideal) - show below
          top = adjustedBottom + gap;
        }
        
        // Horizontal positioning - stick exactly to input field edges (viewport-relative)
        // Account for visual viewport offset
        left = rect.left - viewportOffsetLeft;
        width = rect.width;
        
        // Ensure dropdown doesn't go off-screen horizontally
        // Priority: maintain alignment with input field
        const rightEdge = left + width;
        const leftEdge = left;
        
        // Check if dropdown goes beyond right edge
        if (rightEdge > viewportWidth - edgeMargin) {
          const overflow = rightEdge - (viewportWidth - edgeMargin);
          // Try to shift left while maintaining alignment
          if (leftEdge - overflow >= edgeMargin) {
            left = leftEdge - overflow;
          } else {
            // Can't shift enough, adjust width instead
            left = edgeMargin;
            width = viewportWidth - (edgeMargin * 2);
          }
        }
        
        // Check if dropdown goes beyond left edge
        if (left < edgeMargin) {
          const underflow = edgeMargin - left;
          // Try to expand width if possible
          if (rightEdge + underflow <= viewportWidth - edgeMargin) {
            width = width + underflow;
          }
          left = edgeMargin;
        }
        
        // Ensure minimum width
        width = Math.max(width, 200);
        
        // Final bounds checking - ensure dropdown stays within viewport
        // If dropdown would go below viewport, try opening above instead
        if (top + dropdownMaxHeight > viewportHeight - edgeMargin) {
          // If we have more space above, switch to opening upwards
          if (spaceAbove > spaceBelow && spaceAbove >= 100) {
            const availableHeight = Math.min(dropdownMaxHeight, spaceAbove - gap);
            top = Math.max(edgeMargin, adjustedTop - availableHeight - gap);
          } else {
            // Can't open above, adjust to fit within viewport
            top = Math.max(edgeMargin, viewportHeight - dropdownMaxHeight - edgeMargin);
          }
        }
        
        // Ensure dropdown doesn't go above viewport
        if (top < edgeMargin) {
          top = edgeMargin;
        }
        
        // Final check: ensure dropdown doesn't go below viewport
        const finalBottom = top + dropdownMaxHeight;
        if (finalBottom > viewportHeight - edgeMargin) {
          // Adjust to fit within viewport (reduce effective height)
          top = Math.max(edgeMargin, viewportHeight - dropdownMaxHeight - edgeMargin);
        }
        
        // Ensure left position is within viewport bounds
        if (left < edgeMargin) {
          left = edgeMargin;
        }
        
        // Ensure dropdown doesn't go beyond right edge
        if (left + width > viewportWidth - edgeMargin) {
          width = viewportWidth - left - edgeMargin;
        }
        
        setDropdownPosition({
          top,
          left,
          width: width, // Exact width to match input (or adjusted for viewport)
        });
      });
    }
  };

  // Scroll to selected value when dropdown opens and update position
  useEffect(() => {
    if (isDropdownOpen) {
      // Update position multiple times to ensure accurate positioning
      // First update immediately
      updateDropdownPosition();
      
      // Second update after a small delay to account for layout shifts
      const timeout1 = setTimeout(() => {
        updateDropdownPosition();
      }, 10);
      
      // Third update after DOM is fully settled
      const timeout2 = setTimeout(() => {
        updateDropdownPosition();
        
        // Scroll to selected value after position is set
        if (currentIndex >= 0 && dropdownRef.current) {
          const selectedElement = dropdownRef.current?.querySelector(`[data-index="${currentIndex}"]`);
          if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
            setHighlightedIndex(currentIndex);
          }
        }
      }, 50);
      
      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
      };
    }
  }, [isDropdownOpen, currentIndex]);

  // Update position on scroll/resize/orientation change
  useEffect(() => {
    if (isDropdownOpen) {
      const handleScroll = () => {
        updateDropdownPosition();
      };
      const handleResize = () => {
        // Small delay to ensure layout is updated
        setTimeout(() => updateDropdownPosition(), 10);
      };
      const handleOrientationChange = () => {
        // Delay for orientation change to complete
        setTimeout(() => updateDropdownPosition(), 100);
      };
      
      // Use capture phase for scroll to catch all scroll events
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleOrientationChange);
      
      // Also listen to touchmove for mobile scroll
      document.addEventListener('touchmove', handleScroll, { passive: true });
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleOrientationChange);
        document.removeEventListener('touchmove', handleScroll);
      };
    }
  }, [isDropdownOpen]);

  // Close dropdown when clicking outside (handle both mouse and touch events)
  useEffect(() => {
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;

    const handleTouchStart = (event: TouchEvent) => {
      const target = event.target as Node;
      const touch = event.touches[0];
      if (touch) {
        touchStartTime = Date.now();
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchMoved = false;
      }

      // If touch is inside dropdown or input, don't close
      if (
        dropdownRef.current &&
        dropdownRef.current.contains(target)
      ) {
        return; // Don't close if touching inside dropdown
      }

      if (
        inputRef.current &&
        inputRef.current.contains(target)
      ) {
        return; // Don't close if touching input
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) {
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);
        // If moved more than 5px, consider it a scroll gesture
        if (deltaX > 5 || deltaY > 5) {
          touchMoved = true;
        }
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const target = event.target as Node;
      const touchDuration = Date.now() - touchStartTime;
      
      // Only close if:
      // 1. Touch was outside dropdown and input
      // 2. Touch didn't move (was a tap, not a scroll)
      // 3. Touch duration was short (tap, not long press)
      if (
        !touchMoved &&
        touchDuration < 300 && // Less than 300ms = tap
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        setDropdownPosition(null);
      }
      
      // Reset
      touchMoved = false;
      touchStartTime = 0;
    };

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        setDropdownPosition(null);
      }
    };

    if (isDropdownOpen) {
      // Use capture phase to catch events early
      document.addEventListener('mousedown', handleMouseDown, true);
      document.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true, capture: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });
      return () => {
        document.removeEventListener('mousedown', handleMouseDown, true);
        document.removeEventListener('touchstart', handleTouchStart, { capture: true });
        document.removeEventListener('touchmove', handleTouchMove, { capture: true });
        document.removeEventListener('touchend', handleTouchEnd, { capture: true });
      };
    }
  }, [isDropdownOpen]);

  const formatValue = (val: number): string => {
    if (step < 1) {
      return val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
    }
    return val.toString();
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && options.length > 0) {
      // Small delay to ensure layout is settled, especially on mobile
      setTimeout(() => {
        updateDropdownPosition();
        setIsDropdownOpen(true);
      }, 10);
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!disabled && options.length > 0) {
      // Small delay to ensure layout is settled, especially on mobile
      setTimeout(() => {
        updateDropdownPosition();
        setIsDropdownOpen(true);
      }, 10);
    }
  };

  const handleSelectValue = (selectedValue: number) => {
    onChange(selectedValue);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    setDropdownPosition(null);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        updateDropdownPosition();
        setIsDropdownOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = prev < options.length - 1 ? prev + 1 : prev;
          // Scroll into view
          setTimeout(() => {
            const element = dropdownRef.current?.querySelector(`[data-index="${next}"]`);
            if (element) {
              element.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
          }, 0);
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = prev > 0 ? prev - 1 : 0;
          // Scroll into view
          setTimeout(() => {
            const element = dropdownRef.current?.querySelector(`[data-index="${next}"]`);
            if (element) {
              element.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
          }, 0);
          return next;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleSelectValue(options[highlightedIndex]);
        } else if (currentIndex >= 0) {
          handleSelectValue(options[currentIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        setDropdownPosition(null);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle wheel event to prevent page scroll when at dropdown boundaries
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = element;
    
    // Check if at top or bottom (with small threshold for better detection)
    const isAtTop = scrollTop <= 1;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
    
    // Calculate if we're trying to scroll beyond boundaries
    const scrollingUp = e.deltaY < 0;
    const scrollingDown = e.deltaY > 0;
    
    // If scrolling up when at top, or scrolling down when at bottom, prevent default
    // But allow some momentum for smooth scrolling
    if ((scrollingUp && isAtTop) || (scrollingDown && isAtBottom)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // Allow normal scrolling within bounds
    return true;
  };

  // Handle touch events and prevent page scroll when at dropdown boundaries
  useEffect(() => {
    if (isDropdownOpen && dropdownRef.current) {
      const element = dropdownRef.current;
      let touchStartY = 0;
      let touchStartScrollTop = 0;
      let isUserScrolling = false;

      const handleTouchStart = (e: TouchEvent) => {
        if (!element.contains(e.target as Node)) return;
        const touch = e.touches[0];
        if (touch) {
          touchStartY = touch.clientY;
          touchStartScrollTop = element.scrollTop;
          isUserScrolling = false;
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!element.contains(e.target as Node)) return;
        
        const touch = e.touches[0];
        if (!touch) return;
        
        const touchY = touch.clientY;
        const deltaY = touchY - touchStartY;
        const currentScrollTop = element.scrollTop;
        
        // Check if scroll position has changed (user is scrolling within dropdown)
        if (Math.abs(currentScrollTop - touchStartScrollTop) > 2) {
          isUserScrolling = true;
        }
        
        // Get element bounds
        const rect = element.getBoundingClientRect();
        const isInsideDropdown = touchY >= rect.top && touchY <= rect.bottom;
        
        if (!isInsideDropdown) return;
        
        const { scrollTop, scrollHeight, clientHeight } = element;
        const isAtTop = scrollTop <= 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight;
        
        // Determine scroll direction based on touch movement
        const scrollingUp = deltaY > 0;
        const scrollingDown = deltaY < 0;
        
        // Only prevent default if:
        // 1. At boundary AND trying to scroll beyond boundary
        // 2. AND user is not actively scrolling within the dropdown
        // This allows smooth momentum scrolling to work
        if (isUserScrolling) {
          // User is scrolling - only prevent if at boundary and trying to go beyond
          if ((isAtTop && scrollingUp) || (isAtBottom && scrollingDown)) {
            e.preventDefault();
            e.stopPropagation();
          }
        } else {
          // Initial touch - be more lenient to allow scrolling to start
          // Only prevent if clearly trying to scroll beyond boundary
          const threshold = 10; // pixels
          if (Math.abs(deltaY) > threshold) {
            if ((isAtTop && scrollingUp) || (isAtBottom && scrollingDown)) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        }
      };

      // Prevent body scroll when wheel event reaches dropdown boundaries
      const handleBodyWheel = (e: WheelEvent) => {
        if (!element.contains(e.target as Node)) return;
        
        const { scrollTop, scrollHeight, clientHeight } = element;
        const isAtTop = scrollTop <= 1;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
        
        // If at boundaries and trying to scroll beyond, prevent page scroll
        if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      // Use capture phase to catch events before they bubble
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
      document.addEventListener('wheel', handleBodyWheel, { passive: false, capture: true });

      return () => {
        element.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove, { capture: true });
        document.removeEventListener('wheel', handleBodyWheel, { capture: true });
      };
    }
  }, [isDropdownOpen]);

  const dropdownContent = isDropdownOpen && !disabled && dropdownPosition && options.length > 0 && (
    <div
      ref={dropdownRef}
      onWheel={handleWheel}
      className="fixed z-[99999] bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg shadow-2xl max-h-[300px] overflow-y-auto"
      data-dropdown-scroll="true"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        minWidth: `${dropdownPosition.width}px`,
        maxWidth: `${dropdownPosition.width}px`,
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 #f1f5f9',
        overscrollBehavior: 'contain', // Prevent scroll chaining
        touchAction: 'pan-y', // Allow vertical scrolling but prevent page scroll
        position: 'fixed',
        transform: 'translateZ(0)', // Force hardware acceleration
        WebkitOverflowScrolling: 'touch', // Smooth momentum scrolling on iOS
        willChange: 'scroll-position', // Optimize for scrolling
        backfaceVisibility: 'hidden', // Improve performance
        WebkitTransform: 'translateZ(0)', // Force hardware acceleration on WebKit
        // Ensure dropdown is positioned correctly on mobile
        margin: 0,
        padding: 0,
      }}
    >
      {options.map((option, index) => {
        const isSelected = value !== null && Math.abs(option - value) < step / 2;
        const isHighlighted = highlightedIndex === index || (highlightedIndex === -1 && isSelected);
        
        return (
          <div
            key={index}
            data-index={index}
            onClick={() => handleSelectValue(option)}
            onTouchStart={(e) => {
              // Prevent dropdown from closing when touching an option
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Small delay to ensure touch events are processed
              setTimeout(() => {
                handleSelectValue(option);
              }, 50);
            }}
            className={`
              px-4 py-3 text-center cursor-pointer
              text-[clamp(1.25rem,3vw,2rem)] sm:text-[clamp(1rem,2vw,1.5rem)]
              font-semibold
              transition-colors
              flex items-center justify-center gap-2
              touch-manipulation
              select-none
              ${isHighlighted
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100'
                : 'text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600'
              }
            `}
            style={{ touchAction: 'manipulation' }}
          >
            {formatValue(option)}
            {isSelected && (
              <Check 
                size={20} 
                className="text-blue-600 dark:text-blue-400 flex-shrink-0" 
              />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <div className={`relative ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {label}
          </label>
        )}
        
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            readOnly
            value={
              (value !== null && value !== undefined && typeof value === 'number')
                ? formatValue(value)
                : ''
            }
            onClick={handleInputClick}
            onTouchStart={handleInputClick}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              w-full px-4 sm:px-4 py-5 sm:py-4
              text-[clamp(1.5rem,4vw,2.5rem)] sm:text-[clamp(1.25rem,2.5vw,1.75rem)]
              border-2 rounded-lg
              bg-white dark:bg-slate-800
              font-bold
              text-center
              focus:outline-none focus:ring-2 focus:ring-blue-500
              transition-all duration-200
              placeholder:text-slate-400 dark:placeholder:text-slate-500
              cursor-pointer
              touch-manipulation
              ${error 
                ? 'border-red-300 dark:border-red-700 focus:ring-red-500 text-red-900 dark:text-red-100' 
                : 'border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            style={{ touchAction: 'manipulation' }}
          />
        </div>

        {error && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      {/* Render dropdown using portal outside the container */}
      {typeof window !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
}
