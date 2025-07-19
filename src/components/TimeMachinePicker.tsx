
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

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

  // Debounced value change with longer delay
  const debouncedOnValueChange = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (year: number) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (year <= currentYear) {
            onValueChange(year.toString());
          }
        }, 300);
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
          if (firstScrollRef.current) {
            const firstIndex = firstDigitOptions.indexOf(first);
            firstScrollRef.current.scrollTop = firstIndex * 80;
          }
          
          if (lastScrollRef.current) {
            lastScrollRef.current.scrollTop = last * 80;
          }
        }, 100);
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
    const itemHeight = 80;
    const scrollTop = container.scrollTop;
    const selectedIndex = Math.round(scrollTop / itemHeight);
    
    const clampedIndex = Math.max(0, Math.min(selectedIndex, options.length - 1));
    setter(options[clampedIndex]);
  }, []);

  const PickerColumn: React.FC<{
    options: number[];
    selectedValue: number;
    onValueChange: (value: number) => void;
    scrollRef: React.RefObject<HTMLDivElement>;
    formatValue?: (value: number) => string;
    label: string;
  }> = ({ options, selectedValue, onValueChange, scrollRef, formatValue = (v) => v.toString(), label }) => (
    <div className="flex flex-col items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        {/* Picker container with scroll snap */}
        <div 
          ref={scrollRef}
          className="w-24 h-60 overflow-y-scroll scrollbar-hide bg-background/50 border border-border rounded-xl"
          style={{
            scrollSnapType: 'y mandatory',
            scrollPadding: '100px 0px'
          }}
          onScroll={() => handleScroll(scrollRef, options, onValueChange)}
        >
          {/* Top spacer */}
          <div className="h-20" />
          
          {/* Items */}
          {options.map((option) => (
            <div
              key={option}
              className={cn(
                "h-20 flex items-center justify-center text-2xl font-semibold transition-all duration-300 cursor-pointer select-none",
                option === selectedValue 
                  ? "text-primary scale-110" 
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              )}
              style={{ 
                scrollSnapAlign: 'center',
                scrollSnapStop: 'always'
              }}
              onClick={() => {
                if (scrollRef.current) {
                  const index = options.indexOf(option);
                  scrollRef.current.scrollTop = index * 80;
                }
              }}
            >
              {formatValue(option)}
            </div>
          ))}
          
          {/* Bottom spacer */}
          <div className="h-20" />
        </div>
        
        {/* Selection indicator overlay */}
        <div className="absolute top-1/2 left-0 right-0 h-20 -mt-10 border-y-2 border-primary/20 bg-primary/5 pointer-events-none rounded-lg" />
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
                  if (firstScrollRef.current) {
                    const firstIndex = firstDigitOptions.indexOf(first);
                    firstScrollRef.current.scrollTop = firstIndex * 80;
                  }
                  
                  if (lastScrollRef.current) {
                    lastScrollRef.current.scrollTop = last * 80;
                  }
                }, 100);
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
