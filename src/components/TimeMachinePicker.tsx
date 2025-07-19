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
  const [decade, setDecade] = useState<number>(9);
  const [isDragging, setIsDragging] = useState<{ drum: 'century' | 'decade' | null }>({ drum: null });
  const [startY, setStartY] = useState(0);
  const [startRotation, setStartRotation] = useState({ century: 0, decade: 0 });
  const [rotation, setRotation] = useState({ century: 0, decade: 0 });
  
  const centuryRef = useRef<HTMLDivElement>(null);
  const decadeRef = useRef<HTMLDivElement>(null);

  // Available options
  const centuries = [19, 20, 21];
  const decades = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Calculate year from century and decade
  const calculateYear = (cent: number, dec: number) => {
    if (cent === 21 && dec > 2) return 2024; // Cap at current year
    return cent * 100 + dec * 10 + 5; // Middle of decade
  };

  // Update value when century or decade changes
  useEffect(() => {
    const year = calculateYear(century, decade);
    onValueChange(year.toString());
  }, [century, decade, onValueChange]);

  // Initialize from existing value
  useEffect(() => {
    if (value) {
      const year = parseInt(value);
      const cent = Math.floor(year / 100);
      const dec = Math.floor((year % 100) / 10);
      setCentury(cent);
      setDecade(dec);
      
      // Set rotations
      const centIndex = centuries.indexOf(cent);
      const decIndex = decades.indexOf(dec);
      setRotation({
        century: centIndex * -36, // 360 / 10 items
        decade: decIndex * -36
      });
    }
  }, [value]);

  const handleMouseDown = (e: React.MouseEvent, drum: 'century' | 'decade') => {
    e.preventDefault();
    setIsDragging({ drum });
    setStartY(e.clientY);
    setStartRotation({ ...rotation });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.drum) return;
    
    const deltaY = e.clientY - startY;
    const rotationDelta = deltaY * 0.5; // Sensitivity
    
    if (isDragging.drum === 'century') {
      const newRotation = startRotation.century + rotationDelta;
      setRotation(prev => ({ ...prev, century: newRotation }));
      
      // Snap to nearest option
      const index = Math.round(-newRotation / 36) % centuries.length;
      const normalizedIndex = ((index % centuries.length) + centuries.length) % centuries.length;
      setCentury(centuries[normalizedIndex]);
    } else {
      const newRotation = startRotation.decade + rotationDelta;
      setRotation(prev => ({ ...prev, decade: newRotation }));
      
      // Snap to nearest option
      const index = Math.round(-newRotation / 36) % decades.length;
      const normalizedIndex = ((index % decades.length) + decades.length) % decades.length;
      setDecade(decades[normalizedIndex]);
    }
  };

  const handleMouseUp = () => {
    setIsDragging({ drum: null });
    
    // Snap to final positions
    const centIndex = centuries.indexOf(century);
    const decIndex = decades.indexOf(decade);
    setRotation({
      century: centIndex * -36,
      decade: decIndex * -36
    });
  };

  // Mouse event listeners
  useEffect(() => {
    if (isDragging.drum) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, startY, startRotation]);

  const handleWheel = (e: React.WheelEvent, drum: 'century' | 'decade') => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    
    if (drum === 'century') {
      const currentIndex = centuries.indexOf(century);
      const newIndex = Math.max(0, Math.min(centuries.length - 1, currentIndex + delta));
      setCentury(centuries[newIndex]);
      setRotation(prev => ({ ...prev, century: newIndex * -36 }));
    } else {
      const currentIndex = decades.indexOf(decade);
      const newIndex = Math.max(0, Math.min(decades.length - 1, currentIndex + delta));
      setDecade(decades[newIndex]);
      setRotation(prev => ({ ...prev, decade: newIndex * -36 }));
    }
  };

  const DrumItem: React.FC<{ 
    children: React.ReactNode; 
    isSelected: boolean; 
    index: number;
    rotation: number;
  }> = ({ children, isSelected, index, rotation }) => {
    const itemRotation = index * 36 + rotation;
    const distance = 80; // Distance from center
    
    return (
      <div
        className={cn(
          "absolute w-16 h-12 flex items-center justify-center text-xl font-bold transition-all duration-300",
          "border-2 rounded-lg backdrop-blur-sm",
          isSelected 
            ? "bg-primary/20 border-primary text-primary shadow-lg scale-110 z-10" 
            : "bg-background/40 border-border text-muted-foreground hover:bg-background/60"
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
        <p className="text-sm text-muted-foreground">Drag the drums or use your mouse wheel</p>
        <div className="mt-2 text-2xl font-bold text-primary">
          {calculateYear(century, decade)}
        </div>
      </div>
      
      <div className="flex gap-8 items-center">
        {/* Century Drum */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Century</span>
          <div 
            className="relative w-20 h-32 cursor-grab active:cursor-grabbing"
            style={{ perspective: '400px' }}
            onMouseDown={(e) => handleMouseDown(e, 'century')}
            onWheel={(e) => handleWheel(e, 'century')}
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
                >
                  {cent}th
                </DrumItem>
              ))}
            </div>
          </div>
        </div>

        {/* Decade Drum */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Decade</span>
          <div 
            className="relative w-20 h-32 cursor-grab active:cursor-grabbing"
            style={{ perspective: '400px' }}
            onMouseDown={(e) => handleMouseDown(e, 'decade')}
            onWheel={(e) => handleWheel(e, 'decade')}
            ref={decadeRef}
          >
            <div
              className="relative w-full h-full"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${rotation.decade}deg)`,
                transition: isDragging.drum === 'decade' ? 'none' : 'transform 0.3s ease-out'
              }}
            >
              {decades.map((dec, index) => (
                <DrumItem
                  key={dec}
                  isSelected={dec === decade}
                  index={index}
                  rotation={0}
                >
                  {dec}0s
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
              const dec = Math.floor((year % 100) / 10);
              setCentury(cent);
              setDecade(dec);
              
              const centIndex = centuries.indexOf(cent);
              const decIndex = decades.indexOf(dec);
              setRotation({
                century: centIndex * -36,
                decade: decIndex * -36
              });
            }}
            className={cn(
              "px-3 py-1 text-xs rounded-full border transition-all",
              calculateYear(century, decade) === year
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