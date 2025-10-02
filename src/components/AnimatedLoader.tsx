import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface AnimatedLoaderProps {
  messages: string[];
  className?: string;
}

export const AnimatedLoader = ({ messages, className = '' }: AnimatedLoaderProps) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        setIsVisible(true);
      }, 300);
    }, 2500);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="absolute inset-0 h-12 w-12 rounded-full bg-primary/20 animate-pulse" />
      </div>
      <div className="text-center min-h-[60px] flex items-center justify-center">
        <p 
          className={`text-sm text-muted-foreground transition-opacity duration-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {messages[currentMessageIndex]}
        </p>
      </div>
    </div>
  );
};
