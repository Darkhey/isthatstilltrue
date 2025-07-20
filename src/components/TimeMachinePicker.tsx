
import React, { useState, useEffect, useMemo } from 'react';
import { WheelPicker, WheelPickerWrapper, WheelPickerOption } from '@/components/ui/wheel-picker';

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
  const [firstTwoDigits, setFirstTwoDigits] = useState<string>('19');
  const [lastTwoDigits, setLastTwoDigits] = useState<string>('95');
  
  const currentYear = new Date().getFullYear();
  
  // Generate options for first two digits (16-21)
  const firstDigitOptions: WheelPickerOption[] = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const value = (16 + i).toString();
      return {
        value,
        label: value,
      };
    });
  }, []);

  // Generate options for last two digits (00-99)
  const lastDigitOptions: WheelPickerOption[] = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const value = i.toString().padStart(2, '0');
      return {
        value,
        label: value,
      };
    });
  }, []);

  // Calculate the full year
  const fullYear = useMemo(() => {
    return parseInt(`${firstTwoDigits}${lastTwoDigits}`);
  }, [firstTwoDigits, lastTwoDigits]);

  // Update parent when selection changes
  useEffect(() => {
    if (fullYear <= currentYear) {
      onValueChange(fullYear.toString());
    }
  }, [fullYear, onValueChange, currentYear]);

  // Initialize from existing value
  useEffect(() => {
    if (value) {
      const yearValue = parseInt(value);
      const first = Math.floor(yearValue / 100).toString();
      const last = (yearValue % 100).toString().padStart(2, '0');
      
      if (parseInt(first) >= 16 && parseInt(first) <= 21) {
        setFirstTwoDigits(first);
        setLastTwoDigits(last);
      }
    }
  }, [value]);

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
      
      <div className="flex gap-4 items-center">
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Century</span>
          <WheelPickerWrapper className="w-20">
            <WheelPicker
              options={firstDigitOptions}
              value={firstTwoDigits}
              onValueChange={setFirstTwoDigits}
            />
          </WheelPickerWrapper>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Year</span>
          <WheelPickerWrapper className="w-20">
            <WheelPicker
              options={lastDigitOptions}
              value={lastTwoDigits}
              onValueChange={setLastTwoDigits}
            />
          </WheelPickerWrapper>
        </div>
      </div>

      {/* Quick Jump Buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        {[1960, 1980, 1990, 2000, 2010, 2020].map(year => (
          <button
            key={year}
            onClick={() => {
              const first = Math.floor(year / 100).toString();
              const last = (year % 100).toString().padStart(2, '0');
              
              if (parseInt(first) >= 16 && parseInt(first) <= 21) {
                setFirstTwoDigits(first);
                setLastTwoDigits(last);
              }
            }}
            className={`px-3 py-1 text-xs rounded-full border transition-all ${
              fullYear === year
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/60 text-muted-foreground border-border hover:bg-background hover:text-foreground"
            }`}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
};
