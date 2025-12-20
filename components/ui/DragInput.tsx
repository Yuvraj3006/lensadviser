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
        
        const rect = inputRef.current.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const scrollX = window.scrollX || window.pageXOffset || 0;
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Dropdown dimensions
        const dropdownMaxHeight = 300; // max-h-[300px]
        const gap = 4; // Small gap between input and dropdown
        const edgeMargin = 8; // Margin from viewport edges
        
        // Calculate available space
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Determine best position (prefer below, but check if enough space)
        const minSpaceForBelow = 150; // Need at least 150px below to show dropdown below
        const canShowBelow = spaceBelow >= minSpaceForBelow;
        const canShowAbove = spaceAbove >= minSpaceForBelow;
        
        // Calculate position - stick directly to input field
        let top: number;
        let left: number;
        let width: number;
        
        if (canShowBelow) {
          // Show below - stick to bottom of input
          top = rect.bottom + scrollY + gap;
        } else if (canShowAbove && spaceAbove > spaceBelow) {
          // Show above - stick to top of input (only if more space above)
          const availableHeight = Math.min(dropdownMaxHeight, spaceAbove - gap);
          top = rect.top + scrollY - availableHeight - gap;
        } else {
          // Not enough space either way - show below anyway (will be clipped but visible)
          top = rect.bottom + scrollY + gap;
        }
        
        // Horizontal positioning - stick exactly to input field edges
        left = rect.left + scrollX;
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
      // Update position immediately
      updateDropdownPosition();
      
      // Small delay to ensure DOM is ready, then scroll to selected value
      if (currentIndex >= 0 && dropdownRef.current) {
        setTimeout(() => {
          const selectedElement = dropdownRef.current?.querySelector(`[data-index="${currentIndex}"]`);
          if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
            setHighlightedIndex(currentIndex);
          }
        }, 50);
      }
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        setDropdownPosition(null);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const formatValue = (val: number): string => {
    if (step < 1) {
      return val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
    }
    return val.toString();
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && options.length > 0) {
      // Update position and open dropdown immediately
      updateDropdownPosition();
      setIsDropdownOpen(true);
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!disabled && options.length > 0) {
      // Update position and open dropdown immediately
      updateDropdownPosition();
      setIsDropdownOpen(true);
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
    if ((scrollingUp && isAtTop) || (scrollingDown && isAtBottom)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  // Handle touch events and prevent page scroll when at dropdown boundaries
  useEffect(() => {
    if (isDropdownOpen && dropdownRef.current) {
      const element = dropdownRef.current;

      const handleTouchMove = (e: TouchEvent) => {
        if (!element.contains(e.target as Node)) return;
        
        const { scrollTop, scrollHeight, clientHeight } = element;
        const touch = e.touches[0];
        const touchY = touch.clientY;
        
        // Get element bounds
        const rect = element.getBoundingClientRect();
        const isInsideDropdown = touchY >= rect.top && touchY <= rect.bottom;
        
        if (!isInsideDropdown) return;
        
        const isAtTop = scrollTop <= 1;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
        
        // If at boundaries, prevent default to stop page scroll
        if (isAtTop || isAtBottom) {
          e.preventDefault();
          e.stopPropagation();
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
      document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
      document.addEventListener('wheel', handleBodyWheel, { passive: false, capture: true });

      return () => {
        document.removeEventListener('touchmove', handleTouchMove, { capture: true });
        document.removeEventListener('wheel', handleBodyWheel, { capture: true });
      };
    }
  }, [isDropdownOpen]);

  const dropdownContent = isDropdownOpen && !disabled && dropdownPosition && options.length > 0 && (
    <div
      ref={dropdownRef}
      onWheel={handleWheel}
      className="fixed z-[9999] bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg shadow-2xl max-h-[300px] overflow-y-auto"
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
            className={`
              px-4 py-3 text-center cursor-pointer
              text-[clamp(1.25rem,3vw,2rem)] sm:text-[clamp(1rem,2vw,1.5rem)]
              font-semibold
              transition-colors
              flex items-center justify-center gap-2
              ${isHighlighted
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100'
                : 'text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
              }
            `}
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
              ${error 
                ? 'border-red-300 dark:border-red-700 focus:ring-red-500 text-red-900 dark:text-red-100' 
                : 'border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
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
