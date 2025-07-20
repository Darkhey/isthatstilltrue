
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
  const [selectedYear, setSelectedYear] = useState<string>(value || '1995');
  
  const currentYear = new Date().getFullYear();
  
  // Generate year options from 1960 to current year
  const yearOptions: WheelPickerOption[] = useMemo(() => {
    const options = [];
    for (let year = 1960; year <= currentYear; year++) {
      options.push({
        value: year.toString(),
        label: year.toString(),
      });
    }
    return options;
  }, [currentYear]);

  // Update parent when selection changes
  useEffect(() => {
    onValueChange(selectedYear);
  }, [selectedYear, onValueChange]);

  // Initialize from existing value
  useEffect(() => {
    if (value && value !== selectedYear) {
      setSelectedYear(value);
    }
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-gradient-to-b from-background/50 to-background/80 rounded-lg border border-border/50 backdrop-blur-sm">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Time Machine Year Selector</h3>
        <p className="text-sm text-muted-foreground">Scroll to select your graduation year</p>
        <div className="mt-2 text-2xl font-bold text-primary">
          {selectedYear}
        </div>
      </div>
      
      <WheelPickerWrapper className="w-32">
        <WheelPicker
          options={yearOptions}
          value={selectedYear}
          onValueChange={setSelectedYear}
        />
      </WheelPickerWrapper>

      {/* Quick Jump Buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        {[1960, 1980, 1990, 2000, 2010, 2020].map(year => (
          <button
            key={year}
            onClick={() => setSelectedYear(year.toString())}
            className={`px-3 py-1 text-xs rounded-full border transition-all ${
              parseInt(selectedYear) === year
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
