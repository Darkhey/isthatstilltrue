
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface TimeMachinePickerProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const TimeMachinePicker: React.FC<TimeMachinePickerProps> = ({
  value,
  onValueChange,
  placeholder = "Select graduation year..."
}) => {
  const [firstTwoDigits, setFirstTwoDigits] = useState<number>(19);
  const [lastTwoDigits, setLastTwoDigits] = useState<number>(95);
  
  const firstScrollRef = useRef<HTMLDivElement>(null);
  const lastScrollRef = useRef<HTMLDivElement>(null);

  // Available options
  const firstDigitOptions = useMemo(() => [16, 17, 18, 19, 20, 21], []);
  const lastDigitOptions = useMemo(() => Array.from({ length: 100 }, (_, i) => i), []);

  // Calculate the full year
  const fullYear = useMemo(() => {
    return parseInt(`${firstTwoDigits}${lastTwoDigits.toString().padStart(2, '0')}`);
  }, [firstTwoDigits, lastTwoDigits]);
  
  const currentYear = new Date().getFullYear();

  // Debounced value change
  const debouncedOnValueChange = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (year: number) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (year <= currentYear) {
            onValueChange(year.toString());
          }
        }, 100);
      };
    })(),
    [onValueChange, currentYear]
  );

  // Update value when digits change
  useEffect(() => {
    debouncedOnValueChange(fullYear);
  }, [fullYear, debouncedOnValueChange]);

  // Initialize from existing value
  useEffect(() => {
    if (value) {
      const yearValue = parseInt(value);
      const first = Math.floor(yearValue / 100);
      const last = yearValue % 100;
      
      if (firstDigitOptions.includes(first)) {
        setFirstTwoDigits(first);
        setLastTwoDigits(last);
        
        // Scroll to correct positions
        setTimeout(() => {
          const firstIndex = firstDigitOptions.indexOf(first);
          const firstElement = firstScrollRef.current?.children[firstIndex + 2] as HTMLElement; // +2 for padding items
          if (firstElement) {
            firstElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
          
          const lastElement = lastScrollRef.current?.children[last + 2] as HTMLElement; // +2 for padding items
          if (lastElement) {
            lastElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }, 50);
      }
    }
  }, [value, firstDigitOptions]);

  const handleScroll = useCallback((
    ref: React.RefObject<HTMLDivElement>,
    options: number[],
    setter: (value: number) => void
  ) => {
    if (!ref.current) return;
    
    const container = ref.current;
    const itemHeight = 48; // Fixed item height
    const containerCenter = container.scrollTop + container.clientHeight / 2;
    const selectedIndex = Math.round((containerCenter - itemHeight) / itemHeight) - 2; // -2 for padding items
    
    const clampedIndex = Math.max(0, Math.min(selectedIndex, options.length - 1));
    setter(options[clampedIndex]);
  }, []);

  const scrollToValue = useCallback((
    ref: React.RefObject<HTMLDivElement>,
    options: number[],
    value: number,
    delta: number
  ) => {
    const currentIndex = options.indexOf(value);
    const newIndex = Math.max(0, Math.min(currentIndex + delta, options.length - 1));
    const newValue = options[newIndex];
    
    if (ref.current) {
      const targetElement = ref.current.children[newIndex + 2] as HTMLElement; // +2 for padding items
      if (targetElement) {
        targetElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, []);

  const PickerColumn: React.FC<{
    options: number[];
    selectedValue: number;
    onValueChange: (value: number) => void;
    scrollRef: React.RefObject<HTMLDivElement>;
    formatValue?: (value: number) => string;
    label: string;
  }> = ({ options, selectedValue, onValueChange, scrollRef, formatValue = (v) => v.toString(), label }) => (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        {/* Scroll Up Button */}
        <button
          onClick={() => scrollToValue(scrollRef, options, selectedValue, -1)}
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-10 p-1 rounded-full bg-background/80 hover:bg-background transition-colors"
        >
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        </button>
        
        {/* Picker Container */}
        <div className="relative w-20 h-36 bg-background/50 rounded-lg border border-border/50 overflow-hidden">
          {/* Selection Indicator */}
          <div className="absolute top-1/2 left-0 right-0 h-12 -mt-6 bg-primary/10 border-y border-primary/20 pointer-events-none z-10" />
          
          {/* Scrollable Items */}
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto scrollbar-hide scroll-smooth"
            style={{
              scrollSnapType: 'y mandatory',
              scrollPadding: '48px 0',
            }}
            onScroll={() => handleScroll(scrollRef, options, onValueChange)}
          >
            {/* Top padding items */}
            <div className="h-12" style={{ scrollSnapAlign: 'center' }} />
            <div className="h-12" style={{ scrollSnapAlign: 'center' }} />
            
            {/* Actual options */}
            {options.map((option) => (
              <div
                key={option}
                className={cn(
                  "h-12 flex items-center justify-center text-sm font-medium transition-all duration-200 cursor-pointer",
                  option === selectedValue 
                    ? "text-primary scale-110 font-bold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={{ scrollSnapAlign: 'center' }}
                onClick={() => {
                  const targetElement = scrollRef.current?.children[options.indexOf(option) + 2] as HTMLElement;
                  if (targetElement) {
                    targetElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  }
                }}
              >
                {formatValue(option)}
              </div>
            ))}
            
            {/* Bottom padding items */}
            <div className="h-12" style={{ scrollSnapAlign: 'center' }} />
            <div className="h-12" style={{ scrollSnapAlign: 'center' }} />
          </div>
        </div>
        
        {/* Scroll Down Button */}
        <button
          onClick={() => scrollToValue(scrollRef, options, selectedValue, 1)}
          className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-10 p-1 rounded-full bg-background/80 hover:bg-background transition-colors"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-gradient-to-b from-background/50 to-background/80 rounded-lg border border-border/50 backdrop-blur-sm">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Time Machine Year Selector</h3>
        <p className="text-sm text-muted-foreground">Scroll the wheels to select your graduation year</p>
        <div className="mt-2 text-2xl font-bold text-primary">
          {fullYear}
        </div>
        {fullYear > currentYear && (
          <p className="text-xs text-destructive mt-1">
            Year cannot be in the future
          </p>
        )}
      </div>
      
      <div className="flex gap-8 items-center">
        <PickerColumn
          options={firstDigitOptions}
          selectedValue={firstTwoDigits}
          onValueChange={setFirstTwoDigits}
          scrollRef={firstScrollRef}
          label="Century"
        />
        
        <PickerColumn
          options={lastDigitOptions}
          selectedValue={lastTwoDigits}
          onValueChange={setLastTwoDigits}
          scrollRef={lastScrollRef}
          formatValue={(v) => v.toString().padStart(2, '0')}
          label="Year"
        />
      </div>

      {/* Quick Jump Buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        {[1960, 1980, 1990, 2000, 2010, 2020].map(year => (
          <button
            key={year}
            onClick={() => {
              const first = Math.floor(year / 100);
              const last = year % 100;
              
              if (firstDigitOptions.includes(first)) {
                setFirstTwoDigits(first);
                setLastTwoDigits(last);
                
                // Scroll to positions
                setTimeout(() => {
                  const firstIndex = firstDigitOptions.indexOf(first);
                  const firstElement = firstScrollRef.current?.children[firstIndex + 2] as HTMLElement;
                  if (firstElement) {
                    firstElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  }
                  
                  const lastElement = lastScrollRef.current?.children[last + 2] as HTMLElement;
                  if (lastElement) {
                    lastElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  }
                }, 50);
              }
            }}
            className={cn(
              "px-3 py-1 text-xs rounded-full border transition-all",
              fullYear === year
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/60 text-muted-foreground border-border hover:bg-background hover:text-foreground"
            )}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
};
