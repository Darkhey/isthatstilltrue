
import React, { useState, useEffect, useMemo } from 'react';
import { WheelPicker, WheelPickerWrapper, WheelPickerOption } from '@/components/ui/wheel-picker';

interface TimeMachinePickerProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

const generateFunMessage = (year: number): string => {
  const messages = {
    // Specific iconic years
    1969: "The year of Woodstock and the moon landing! ✨",
    1989: "When the Berlin Wall fell and history changed forever! 🎆",
    1991: "The birth of the World Wide Web! 🌐",
    2001: "Y2K survived, but then came September 11th... 📅",
    1945: "Victory in Europe Day - WWII finally ended! 🕊️",
    1963: "JFK's 'I Have a Dream' speech year! ✊",
    1977: "Star Wars premiered and changed cinema forever! ⭐",
    1985: "Back to the Future hit theaters - how meta! ⚡",
    1994: "The Lion King roared and Nelson Mandela became president! 🦁",
    2008: "Obama's 'Yes We Can' and the financial crisis! 📈",
    
    // Decades with character
    1950: "Rock 'n' roll was just beginning! 🎸",
    1960: "The swinging sixties with Beatles mania! 🎵",
    1970: "Disco fever and bell-bottom pants! 🕺",
    1980: "Neon colors, big hair, and synthesizer music! 💫",
    1990: "Grunge music and the rise of the internet! 💻",
    2000: "Millennium bug fears and flip phones! 📱",
    2010: "Social media explosion and smartphone revolution! 📲",
    2020: "Pandemic year that changed everything! 😷",
    
    // Early years with historical context
    1600: "Shakespeare was still writing masterpieces! 📜",
    1700: "Bach was composing his greatest works! 🎼",
    1800: "Napoleon was conquering Europe! ⚔️",
    1900: "The dawn of the 20th century! 🌅",
    1920: "The Roaring Twenties were just starting! 🥂",
    1930: "The Great Depression era... tough times! 💰",
    1940: "World War II was raging across the globe! 🌍",
  };

  // Check for exact year matches first
  if (messages[year as keyof typeof messages]) {
    return messages[year as keyof typeof messages];
  }

  // Fallback to decade-based messages
  const decade = Math.floor(year / 10) * 10;
  
  if (year >= 1600 && year < 1700) {
    return "The age of exploration and scientific revolution! 🔭";
  } else if (year >= 1700 && year < 1800) {
    return "Enlightenment era - reason and philosophy flourished! 💡";
  } else if (year >= 1800 && year < 1850) {
    return "Industrial Revolution was transforming the world! ⚙️";
  } else if (year >= 1850 && year < 1900) {
    return "Victorian era of great inventions and progress! 🚂";
  } else if (year >= 1900 && year < 1920) {
    return "The Belle Époque - art and culture bloomed! 🎨";
  } else if (year >= 1920 && year < 1930) {
    return "Jazz Age and prohibition - what a wild time! 🎷";
  } else if (year >= 1930 && year < 1940) {
    return "Economic hardship but also incredible resilience! 💪";
  } else if (year >= 1940 && year < 1950) {
    return "A world at war, then rebuilding in peace! 🕊️";
  } else if (year >= 1950 && year < 1960) {
    return "Post-war boom and the birth of rock music! 🎸";
  } else if (year >= 1960 && year < 1970) {
    return "Cultural revolution and space race excitement! 🚀";
  } else if (year >= 1970 && year < 1980) {
    return "Disco, punk, and political awakening! ✌️";
  } else if (year >= 1980 && year < 1990) {
    return "MTV generation and personal computer revolution! 📺";
  } else if (year >= 1990 && year < 2000) {
    return "The final decade before the new millennium! 🎯";
  } else if (year >= 2000 && year < 2010) {
    return "Digital age acceleration and social media birth! 🌐";
  } else if (year >= 2010 && year < 2020) {
    return "Smartphone everywhere and streaming revolution! 📱";
  } else if (year >= 2020) {
    return "The decade that redefined everything we knew! 🔄";
  }
  
  return "What an interesting year you've chosen! 🕰️";
};

export const TimeMachinePicker: React.FC<TimeMachinePickerProps> = ({
  value,
  onValueChange,
  placeholder = "Select graduation year..."
}) => {
  const [firstTwoDigits, setFirstTwoDigits] = useState<string>('19');
  const [lastTwoDigits, setLastTwoDigits] = useState<string>('95');
  
  const currentYear = new Date().getFullYear();
  
  // Generate options for first two digits (16-20, removed 21)
  const firstDigitOptions: WheelPickerOption[] = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const value = (16 + i).toString();
      return {
        value,
        label: value,
      };
    });
  }, []);

  // Generate options for last two digits (dynamic based on century)
  const lastDigitOptions: WheelPickerOption[] = useMemo(() => {
    // For century 20 (2000s), limit to 00-23 (2023 max)
    const maxDigit = firstTwoDigits === '20' ? 23 : 99;
    return Array.from({ length: maxDigit + 1 }, (_, i) => {
      const value = i.toString().padStart(2, '0');
      return {
        value,
        label: value,
      };
    });
  }, [firstTwoDigits]);

  // Calculate the full year
  const fullYear = useMemo(() => {
    return parseInt(`${firstTwoDigits}${lastTwoDigits}`);
  }, [firstTwoDigits, lastTwoDigits]);

  // Auto-snap logic for century "20"
  useEffect(() => {
    if (firstTwoDigits === '20' && parseInt(lastTwoDigits) > 23) {
      setLastTwoDigits('23');
    }
  }, [firstTwoDigits, lastTwoDigits]);

  // Update parent when selection changes
  useEffect(() => {
    if (fullYear <= 2023) {
      onValueChange(fullYear.toString());
    }
  }, [fullYear, onValueChange]);

  // Initialize from existing value
  useEffect(() => {
    if (value) {
      const yearValue = parseInt(value);
      // Reset to 2023 if value is beyond our limit
      const limitedYear = yearValue > 2023 ? 2023 : yearValue;
      const first = Math.floor(limitedYear / 100).toString();
      const last = (limitedYear % 100).toString().padStart(2, '0');
      
      if (parseInt(first) >= 16 && parseInt(first) <= 20) {
        setFirstTwoDigits(first);
        setLastTwoDigits(last);
      }
    }
  }, [value]);

  const funMessage = generateFunMessage(fullYear);

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-gradient-to-b from-background/50 to-background/80 rounded-lg border border-border/50 backdrop-blur-sm">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Time Machine Year Selector</h3>
        <p className="text-sm text-muted-foreground">Scroll the wheels to select your graduation year</p>
        <div className="mt-2 text-2xl font-bold text-primary">
          {fullYear}
        </div>
        <div className="mt-2 text-sm text-muted-foreground italic max-w-xs">
          {funMessage}
        </div>
        {fullYear > 2023 && (
          <p className="text-xs text-destructive mt-1">
            Year cannot be beyond 2023
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
        {[1960, 1980, 1990, 2000, 2010, 2023].map(year => (
          <button
            key={year}
            onClick={() => {
              const first = Math.floor(year / 100).toString();
              const last = (year % 100).toString().padStart(2, '0');
              
              if (parseInt(first) >= 16 && parseInt(first) <= 20) {
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
