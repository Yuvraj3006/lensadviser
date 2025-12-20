'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

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
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState<number | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Native touch handler - defined with useCallback for use in useEffect
  const handleNativeTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;
    e.preventDefault(); // Can use preventDefault with native listener + passive: false
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setStartValue(value);
  }, [disabled, value]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    setStartY(e.clientY);
    setStartValue(value);
  };

  const handleMove = (currentY: number) => {
    if (!isDragging) return;

    // Use startValue or 0 if null/undefined - allows dragging from empty fields
    const baseValue = (startValue !== null && startValue !== undefined && typeof startValue === 'number') 
      ? startValue 
      : 0;

    const deltaY = startY - currentY; // Negative delta = drag up = increase value
    const pixelsPerStep = 15; // 15 pixels = 1 step (more sensitive)
    const steps = Math.round(deltaY / pixelsPerStep);
    
    let newValue = baseValue + (steps * step);
    
    // Apply min/max constraints
    if (min !== undefined && newValue < min) newValue = min;
    if (max !== undefined && newValue > max) newValue = max;
    
    // Round to step precision
    newValue = Math.round(newValue / step) * step;
    
    onChange(newValue);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    handleMove(e.touches[0].clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientY);
  };

  const handleEnd = () => {
    setIsDragging(false);
    // Ensure value is properly formatted after dragging ends
    if (value !== null && value !== undefined && typeof value === 'number') {
      // Round to step precision to ensure consistency
      const roundedValue = Math.round(value / step) * step;
      if (roundedValue !== value) {
        onChange(roundedValue);
      }
    }
  };

  // Add native touch listener to drag area for better control (allows preventDefault)
  useEffect(() => {
    const element = dragRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleNativeTouchStart, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleNativeTouchStart);
    };
  }, [handleNativeTouchStart]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleEnd, { passive: false });
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    } else {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [isDragging]);

  const handleIncrement = () => {
    if (disabled) return;
    const current = (value !== null && value !== undefined && typeof value === 'number') ? value : 0;
    let newValue = current + step;
    if (max !== undefined && newValue > max) newValue = max;
    onChange(newValue);
  };

  const handleDecrement = () => {
    if (disabled) return;
    const current = (value !== null && value !== undefined && typeof value === 'number') ? value : 0;
    let newValue = current - step;
    if (min !== undefined && newValue < min) newValue = min;
    onChange(newValue);
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        {/* Drag Area */}
        <div
          ref={dragRef}
          onMouseDown={handleMouseDown}
          style={{ touchAction: 'none' }}
          className={`
            relative w-full
            ${isDragging ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${error ? 'border-red-300 dark:border-red-700' : 'border-slate-300 dark:border-slate-600'}
          `}
        >
          {/* Input Field */}
          <input
            ref={inputRef}
            type="number"
            step={step}
            min={min}
            max={max}
            value={
              isDragging 
                ? '' 
                : (value !== null && value !== undefined && typeof value === 'number')
                  ? (step < 1 ? value.toFixed(2) : value.toString())
                  : ''
            }
            onChange={(e) => {
              if (isDragging) return; // Prevent input changes while dragging
              const val = e.target.value ? parseFloat(e.target.value) : null;
              onChange(val !== null && !isNaN(val) ? val : null);
            }}
            placeholder={isDragging ? '' : placeholder}
            disabled={disabled || isDragging}
            readOnly={isDragging}
            className={`
              w-full px-4 sm:px-4 py-5 sm:py-4 pr-4 sm:pr-16 pl-4 sm:pl-4
              text-[clamp(1.5rem,4vw,2.5rem)] sm:text-[clamp(1.25rem,2.5vw,1.75rem)]
              border-2 rounded-lg
              bg-white dark:bg-slate-800
              font-bold
              text-center
              focus:outline-none focus:ring-2 focus:ring-blue-500
              transition-all duration-200
              placeholder:text-slate-400 dark:placeholder:text-slate-500
              ${error 
                ? 'border-red-300 dark:border-red-700 focus:ring-red-500 text-red-900 dark:text-red-100' 
                : 'border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
              }
              ${isDragging ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-transparent' : ''}
            `}
          />

          {/* Drag Indicator - Shows ONLY when dragging (replaces input) */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 rounded-lg">
              <div className="text-blue-600 dark:text-blue-400 font-bold text-[clamp(1.5rem,4vw,2.5rem)] sm:text-[clamp(1.25rem,2.5vw,1.75rem)]">
                {value !== null && value !== undefined && typeof value === 'number' 
                  ? value.toFixed(step < 1 ? 2 : 0) 
                  : '0.00'}
              </div>
            </div>
          )}

          {/* Drag Buttons - Mobile Only (Almost Invisible but Functional) */}
          {!isDragging && (
            <div className="absolute right-0.5 top-1/2 -translate-y-1/2 flex flex-col gap-0 sm:hidden z-20">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleIncrement();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleIncrement();
                }}
                disabled={disabled || (max !== undefined && (value ?? 0) >= max)}
                className={`
                  w-4 h-4 rounded
                  opacity-0 hover:opacity-10 active:opacity-20
                  bg-transparent
                  active:bg-blue-100/20 dark:active:bg-blue-900/10
                  flex items-center justify-center
                  transition-opacity
                  touch-manipulation
                  ${disabled || (max !== undefined && (value ?? 0) >= max) ? 'pointer-events-none' : ''}
                `}
                aria-label="Increase value"
              >
                <ChevronUp size={8} className="text-transparent" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDecrement();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDecrement();
                }}
                disabled={disabled || (min !== undefined && (value ?? 0) <= min)}
                className={`
                  w-4 h-4 rounded
                  opacity-0 hover:opacity-10 active:opacity-20
                  bg-transparent
                  active:bg-blue-100/20 dark:active:bg-blue-900/10
                  flex items-center justify-center
                  transition-opacity
                  touch-manipulation
                  ${disabled || (min !== undefined && (value ?? 0) <= min) ? 'pointer-events-none' : ''}
                `}
                aria-label="Decrease value"
              >
                <ChevronDown size={8} className="text-transparent" />
              </button>
            </div>
          )}

        </div>
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

    </div>
  );
}

