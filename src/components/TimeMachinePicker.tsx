import React, { useState, useEffect, useRef } from 'react';
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
  const [century, setCentury] = useState<number>(20);
  const [selectedYear, setSelectedYear] = useState<number>(1995);
  const [isDragging, setIsDragging] = useState<{ drum: 'century' | 'year' | null }>({ drum: null });
  const [startY, setStartY] = useState(0);
  const [startRotation, setStartRotation] = useState({ century: 0, year: 0 });
  const [rotation, setRotation] = useState({ century: 0, year: 0 });
  
  const centuryRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  // Available options
  const centuries = [19, 20, 21];
  const getYearsForCentury = (cent: number) => {
    const currentYear = new Date().getFullYear();
    const startYear = cent * 100;
    const endYear = Math.min((cent + 1) * 100 - 1, currentYear);
    
    const years = [];
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }
    return years;
  };

  const availableYears = getYearsForCentury(century);

  // Update value when year changes
  useEffect(() => {
    onValueChange(selectedYear.toString());
  }, [selectedYear, onValueChange]);

  // Initialize from existing value
  useEffect(() => {
    if (value) {
      const yearValue = parseInt(value);
      const cent = Math.floor(yearValue / 100);
      setCentury(cent);
      setSelectedYear(yearValue);
      
      // Set rotations
      const centIndex = centuries.indexOf(cent);
      const years = getYearsForCentury(cent);
      const yearIndex = years.indexOf(yearValue);
      setRotation({
        century: centIndex * -60,
        year: yearIndex * -20
      });
    }
  }, [value]);

  const handlePointerDown = (e: React.PointerEvent, drum: 'century' | 'year') => {
    e.preventDefault();
    setIsDragging({ drum });
    setStartY(e.clientY);
    setStartRotation({ ...rotation });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.drum) return;
    
    const deltaY = e.clientY - startY;
    const rotationDelta = deltaY * 0.5;
    
    if (isDragging.drum === 'century') {
      const newRotation = startRotation.century + rotationDelta;
      setRotation(prev => ({ ...prev, century: newRotation }));
      
      const index = Math.round(-newRotation / 60) % centuries.length;
      const normalizedIndex = ((index % centuries.length) + centuries.length) % centuries.length;
      const newCentury = centuries[normalizedIndex];
      if (newCentury !== century) {
        setCentury(newCentury);
        const newYears = getYearsForCentury(newCentury);
        setSelectedYear(newYears[Math.floor(newYears.length / 2)]);
      }
    } else {
      const newRotation = startRotation.year + rotationDelta;
      setRotation(prev => ({ ...prev, year: newRotation }));
      
      const index = Math.round(-newRotation / 20) % availableYears.length;
      const normalizedIndex = ((index % availableYears.length) + availableYears.length) % availableYears.length;
      setSelectedYear(availableYears[normalizedIndex]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging({ drum: null });
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    
    // Snap to final positions
    const centIndex = centuries.indexOf(century);
    const yearIndex = availableYears.indexOf(selectedYear);
    setRotation({
      century: centIndex * -60,
      year: yearIndex * -20
    });
  };

  const DrumItem: React.FC<{ 
    children: React.ReactNode; 
    isSelected: boolean; 
    index: number;
    rotation: number;
    itemSize: number;
  }> = ({ children, isSelected, index, rotation, itemSize }) => {
    const itemRotation = index * itemSize + rotation;
    const distance = 80;
    
    return (
      <div
        className={cn(
          "absolute w-16 h-8 flex items-center justify-center text-sm font-bold transition-all duration-300",
          "border rounded backdrop-blur-sm",
          isSelected 
            ? "bg-primary/20 border-primary text-primary shadow-lg scale-110 z-10" 
            : "bg-background/40 border-border text-muted-foreground"
        )}
        style={{
          transform: `rotateX(${itemRotation}deg) translateZ(${distance}px)`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-gradient-to-b from-background/50 to-background/80 rounded-lg border border-border/50 backdrop-blur-sm">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Time Machine Year Selector</h3>
        <p className="text-sm text-muted-foreground">Drag the drums to select your graduation year</p>
        <div className="mt-2 text-2xl font-bold text-primary">
          {selectedYear}
        </div>
      </div>
      
      <div className="flex gap-8 items-center">
        {/* Century Drum */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Century</span>
          <div 
            className="relative w-20 h-32 cursor-grab active:cursor-grabbing touch-none"
            style={{ perspective: '400px' }}
            onPointerDown={(e) => handlePointerDown(e, 'century')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            ref={centuryRef}
          >
            <div
              className="relative w-full h-full"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${rotation.century}deg)`,
                transition: isDragging.drum === 'century' ? 'none' : 'transform 0.3s ease-out'
              }}
            >
              {centuries.map((cent, index) => (
                <DrumItem
                  key={cent}
                  isSelected={cent === century}
                  index={index}
                  rotation={0}
                  itemSize={60}
                >
                  {cent}th
                </DrumItem>
              ))}
            </div>
          </div>
        </div>

        {/* Year Drum */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Year</span>
          <div 
            className="relative w-20 h-32 cursor-grab active:cursor-grabbing touch-none overflow-hidden"
            style={{ perspective: '400px' }}
            onPointerDown={(e) => handlePointerDown(e, 'year')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            ref={yearRef}
          >
            <div
              className="relative w-full h-full"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${rotation.year}deg)`,
                transition: isDragging.drum === 'year' ? 'none' : 'transform 0.3s ease-out'
              }}
            >
              {availableYears.map((year, index) => (
                <DrumItem
                  key={year}
                  isSelected={year === selectedYear}
                  index={index}
                  rotation={0}
                  itemSize={20}
                >
                  {year}
                </DrumItem>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Jump Buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        {[1960, 1980, 1990, 2000, 2010, 2020].map(year => (
          <button
            key={year}
            onClick={() => {
              const cent = Math.floor(year / 100);
              setCentury(cent);
              setSelectedYear(year);
              
              const centIndex = centuries.indexOf(cent);
              const years = getYearsForCentury(cent);
              const yearIndex = years.indexOf(year);
              setRotation({
                century: centIndex * -60,
                year: yearIndex * -20
              });
            }}
            className={cn(
              "px-3 py-1 text-xs rounded-full border transition-all",
              selectedYear === year
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