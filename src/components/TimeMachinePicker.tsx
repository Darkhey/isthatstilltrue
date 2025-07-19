
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
  const [firstTwoDigits, setFirstTwoDigits] = useState<number>(19);
  const [lastTwoDigits, setLastTwoDigits] = useState<number>(95);
  const [isDragging, setIsDragging] = useState<{ drum: 'first' | 'last' | null }>({ drum: null });
  const [startY, setStartY] = useState(0);
  const [startRotation, setStartRotation] = useState({ first: 0, last: 0 });
  const [rotation, setRotation] = useState({ first: 0, last: 0 });
  
  const firstRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef<HTMLDivElement>(null);

  // Available options
  const firstDigitOptions = [16, 17, 18, 19, 20, 21];
  const lastDigitOptions = Array.from({ length: 100 }, (_, i) => i); // 0-99

  // Calculate the full year
  const fullYear = parseInt(`${firstTwoDigits}${lastTwoDigits.toString().padStart(2, '0')}`);
  const currentYear = new Date().getFullYear();

  // Update value when digits change
  useEffect(() => {
    const year = parseInt(`${firstTwoDigits}${lastTwoDigits.toString().padStart(2, '0')}`);
    if (year <= currentYear) {
      onValueChange(year.toString());
    }
  }, [firstTwoDigits, lastTwoDigits, onValueChange, currentYear]);

  // Initialize from existing value
  useEffect(() => {
    if (value) {
      const yearValue = parseInt(value);
      const first = Math.floor(yearValue / 100);
      const last = yearValue % 100;
      
      if (firstDigitOptions.includes(first)) {
        setFirstTwoDigits(first);
        setLastTwoDigits(last);
        
        // Set rotations
        const firstIndex = firstDigitOptions.indexOf(first);
        const lastIndex = last;
        setRotation({
          first: firstIndex * -80,
          last: lastIndex * -15
        });
      }
    }
  }, [value]);

  const handlePointerDown = (e: React.PointerEvent, drum: 'first' | 'last') => {
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
    
    if (isDragging.drum === 'first') {
      const newRotation = startRotation.first + rotationDelta;
      setRotation(prev => ({ ...prev, first: newRotation }));
      
      const index = Math.round(-newRotation / 80) % firstDigitOptions.length;
      const normalizedIndex = ((index % firstDigitOptions.length) + firstDigitOptions.length) % firstDigitOptions.length;
      const newFirst = firstDigitOptions[normalizedIndex];
      if (newFirst !== firstTwoDigits) {
        setFirstTwoDigits(newFirst);
      }
    } else {
      const newRotation = startRotation.last + rotationDelta;
      setRotation(prev => ({ ...prev, last: newRotation }));
      
      const index = Math.round(-newRotation / 15) % lastDigitOptions.length;
      const normalizedIndex = ((index % lastDigitOptions.length) + lastDigitOptions.length) % lastDigitOptions.length;
      setLastTwoDigits(lastDigitOptions[normalizedIndex]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging({ drum: null });
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    
    // Snap to final positions
    const firstIndex = firstDigitOptions.indexOf(firstTwoDigits);
    const lastIndex = lastTwoDigits;
    setRotation({
      first: firstIndex * -80,
      last: lastIndex * -15
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
          {fullYear}
        </div>
        {fullYear > currentYear && (
          <p className="text-xs text-destructive mt-1">
            Year cannot be in the future
          </p>
        )}
      </div>
      
      <div className="flex gap-8 items-center">
        {/* First Two Digits Drum */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">First Digits</span>
          <div 
            className="relative w-20 h-32 cursor-grab active:cursor-grabbing touch-none"
            style={{ perspective: '400px' }}
            onPointerDown={(e) => handlePointerDown(e, 'first')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            ref={firstRef}
          >
            <div
              className="relative w-full h-full"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${rotation.first}deg)`,
                transition: isDragging.drum === 'first' ? 'none' : 'transform 0.3s ease-out'
              }}
            >
              {firstDigitOptions.map((digit, index) => (
                <DrumItem
                  key={digit}
                  isSelected={digit === firstTwoDigits}
                  index={index}
                  rotation={0}
                  itemSize={80}
                >
                  {digit}
                </DrumItem>
              ))}
            </div>
          </div>
        </div>

        {/* Last Two Digits Drum */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Last Digits</span>
          <div 
            className="relative w-20 h-32 cursor-grab active:cursor-grabbing touch-none overflow-hidden"
            style={{ perspective: '400px' }}
            onPointerDown={(e) => handlePointerDown(e, 'last')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            ref={lastRef}
          >
            <div
              className="relative w-full h-full"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${rotation.last}deg)`,
                transition: isDragging.drum === 'last' ? 'none' : 'transform 0.3s ease-out'
              }}
            >
              {lastDigitOptions.map((digit, index) => (
                <DrumItem
                  key={digit}
                  isSelected={digit === lastTwoDigits}
                  index={index}
                  rotation={0}
                  itemSize={15}
                >
                  {digit.toString().padStart(2, '0')}
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
              const first = Math.floor(year / 100);
              const last = year % 100;
              
              if (firstDigitOptions.includes(first)) {
                setFirstTwoDigits(first);
                setLastTwoDigits(last);
                
                const firstIndex = firstDigitOptions.indexOf(first);
                const lastIndex = last;
                setRotation({
                  first: firstIndex * -80,
                  last: lastIndex * -15
                });
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
