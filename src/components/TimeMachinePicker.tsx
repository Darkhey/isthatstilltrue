
import React, { useState, useEffect, useMemo } from 'react';
import { WheelPicker, WheelPickerWrapper, WheelPickerOption } from '@/components/ui/wheel-picker';

interface TimeMachinePickerProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

const generateFunMessage = (year: number): string => {
  const messages = {
    // Ancient and medieval years
    1: "The very first year of Anno Domini! 🕊️",
    100: "Roman Empire at its peak under Trajan! 🏛️",
    500: "Fall of the Western Roman Empire era! ⚔️",
    1000: "The turn of the first millennium! ✨",
    1066: "Norman Conquest of England! 👑",
    1206: "Genghis Khan unites the Mongol tribes! 🐎",
    1347: "Black Death begins devastating Europe... 💀",
    1492: "Columbus reaches the Americas! ⛵",
    
    // Early modern period
    1600: "Shakespeare was still writing masterpieces! 📜",
    1700: "Bach was composing his greatest works! 🎼",
    1776: "American Revolution and the Declaration! 🗽",
    1789: "French Revolution begins! 🇫🇷",
    1800: "Napoleon was conquering Europe! ⚔️",
    
    // Modern era
    1900: "The dawn of the 20th century! 🌅",
    1920: "The Roaring Twenties were just starting! 🥂",
    1930: "The Great Depression era... tough times! 💰",
    1940: "World War II was raging across the globe! 🌍",
    1945: "Victory in Europe Day - WWII finally ended! 🕊️",
    1963: "JFK's 'I Have a Dream' speech year! ✊",
    1969: "The year of Woodstock and the moon landing! ✨",
    1977: "Star Wars premiered and changed cinema forever! ⭐",
    1985: "Back to the Future hit theaters - how meta! ⚡",
    1989: "When the Berlin Wall fell and history changed forever! 🎆",
    1991: "The birth of the World Wide Web! 🌐",
    1994: "The Lion King roared and Nelson Mandela became president! 🦁",
    2001: "Y2K survived, but then came September 11th... 📅",
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
  };

  // Check for exact year matches first
  if (messages[year as keyof typeof messages]) {
    return messages[year as keyof typeof messages];
  }

  // Fallback to period-based messages
  if (year >= 1 && year < 100) {
    return "Ancient Roman Empire era - gladiators and emperors! ⚔️";
  } else if (year >= 100 && year < 500) {
    return "Late Roman Empire - Christianity spreading! ✝️";
  } else if (year >= 500 && year < 1000) {
    return "Medieval Dark Ages - knights and castles! 🏰";
  } else if (year >= 1000 && year < 1300) {
    return "High Middle Ages - crusades and cathedrals! ⛪";
  } else if (year >= 1300 && year < 1500) {
    return "Late Medieval period - Renaissance dawning! 🎨";
  } else if (year >= 1500 && year < 1600) {
    return "Age of exploration and reformation! 🌍";
  } else if (year >= 1600 && year < 1700) {
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
  
  // Generate options for first two digits (00-20 for years 1-2024)
  const firstDigitOptions: WheelPickerOption[] = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const value = i.toString().padStart(2, '0');
      return {
        value,
        label: value,
      };
    });
  }, []);

  // Generate options for last two digits (dynamic based on century)
  const lastDigitOptions: WheelPickerOption[] = useMemo(() => {
    const firstDigitNum = parseInt(firstTwoDigits);
    
    // For year 0 (0001-0099), allow 01-99
    if (firstDigitNum === 0) {
      return Array.from({ length: 99 }, (_, i) => {
        const value = (i + 1).toString().padStart(2, '0');
        return {
          value,
          label: value,
        };
      });
    }
    
    // For century 20 (2000s), limit to 00-currentYear%100
    const maxDigit = firstDigitNum === 20 ? (currentYear % 100) : 99;
    return Array.from({ length: maxDigit + 1 }, (_, i) => {
      const value = i.toString().padStart(2, '0');
      return {
        value,
        label: value,
      };
    });
  }, [firstTwoDigits, currentYear]);

  // Calculate the full year (handle year 0 specially as it represents 1-99)
  const fullYear = useMemo(() => {
    const firstNum = parseInt(firstTwoDigits);
    const lastNum = parseInt(lastTwoDigits);
    
    // For century 00, we represent years 1-99
    if (firstNum === 0) {
      return lastNum; // This gives us 1-99
    }
    
    return parseInt(`${firstTwoDigits}${lastTwoDigits}`);
  }, [firstTwoDigits, lastTwoDigits]);

  // Auto-snap logic for century "20" and century "00"
  useEffect(() => {
    const firstNum = parseInt(firstTwoDigits);
    const lastNum = parseInt(lastTwoDigits);
    
    if (firstNum === 20 && lastNum > (currentYear % 100)) {
      setLastTwoDigits((currentYear % 100).toString().padStart(2, '0'));
    }
    
    // For century 00, ensure we don't have 00 (which would be year 0)
    if (firstNum === 0 && lastNum === 0) {
      setLastTwoDigits('01');
    }
  }, [firstTwoDigits, lastTwoDigits, currentYear]);

  // Update parent when selection changes
  useEffect(() => {
    if (fullYear >= 1 && fullYear <= currentYear) {
      onValueChange(fullYear.toString());
    }
  }, [fullYear, onValueChange, currentYear]);

  // Initialize from existing value
  useEffect(() => {
    if (value) {
      const yearValue = parseInt(value);
      
      if (yearValue >= 1 && yearValue <= currentYear) {
        // Handle years 1-99
        if (yearValue < 100) {
          setFirstTwoDigits('00');
          setLastTwoDigits(yearValue.toString().padStart(2, '0'));
        } else {
          const first = Math.floor(yearValue / 100).toString().padStart(2, '0');
          const last = (yearValue % 100).toString().padStart(2, '0');
          setFirstTwoDigits(first);
          setLastTwoDigits(last);
        }
      }
    }
  }, [value, currentYear]);

  const funMessage = generateFunMessage(fullYear);

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-gradient-to-b from-background/50 to-background/80 rounded-lg border border-border/50 backdrop-blur-sm">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Time Machine Year Selector</h3>
        <p className="text-sm text-muted-foreground">Scroll the wheels to select your graduation year</p>
        <div className="mt-2 text-2xl font-bold text-primary">
          {fullYear >= 1 && fullYear < 100 ? `Year ${fullYear}` : fullYear}
        </div>
        {fullYear > currentYear && (
          <p className="text-xs text-destructive mt-1">
            Year cannot be beyond {currentYear}
          </p>
        )}
        {fullYear < 1 && (
          <p className="text-xs text-destructive mt-1">
            Please select a valid year from 1 onwards
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
        {[1, 100, 500, 1000, 1500, 1800, 1900, 1950, 1980, 2000, 2020].map(year => (
          <button
            key={year}
            onClick={() => {
              if (year < 100) {
                setFirstTwoDigits('00');
                setLastTwoDigits(year.toString().padStart(2, '0'));
              } else {
                const first = Math.floor(year / 100).toString().padStart(2, '0');
                const last = (year % 100).toString().padStart(2, '0');
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
            {year < 100 ? `${year}` : year}
          </button>
        ))}
      </div>
    </div>
  );
};
