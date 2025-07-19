
import React, { useState, useEffect, useCallback } from 'react';

interface TypewriterTextProps {
  phrases: string[];
  className?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  showCursor?: boolean;
  onComplete?: () => void;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  phrases,
  className = '',
  typingSpeed = 100,
  deletingSpeed = 50,
  pauseDuration = 2000,
  showCursor = true,
  onComplete
}) => {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  const typeText = useCallback(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    
    if (isTyping) {
      if (currentText.length < currentPhrase.length) {
        setCurrentText(currentPhrase.substring(0, currentText.length + 1));
      } else {
        // Finished typing current phrase
        if (currentPhraseIndex === phrases.length - 1) {
          // Last phrase - complete the animation
          setIsComplete(true);
          onComplete?.();
          return;
        }
        // Pause before deleting
        setTimeout(() => setIsTyping(false), pauseDuration);
      }
    } else {
      if (currentText.length > 0) {
        setCurrentText(currentText.substring(0, currentText.length - 1));
      } else {
        // Move to next phrase
        setCurrentPhraseIndex((prev) => prev + 1);
        setIsTyping(true);
      }
    }
  }, [currentText, currentPhraseIndex, phrases, isTyping, pauseDuration, onComplete]);

  useEffect(() => {
    if (isComplete) return;

    const speed = isTyping ? typingSpeed : deletingSpeed;
    const timer = setTimeout(typeText, speed);

    return () => clearTimeout(timer);
  }, [typeText, isTyping, typingSpeed, deletingSpeed, isComplete]);

  return (
    <span className={`inline-block ${className}`}>
      <span className="bg-gradient-primary bg-clip-text text-transparent">
        {currentText}
      </span>
      {showCursor && (
        <span 
          className={`inline-block w-1 bg-primary ml-1 animate-typewriter-cursor ${
            isComplete ? 'opacity-0' : ''
          }`}
          style={{ height: '1em' }}
        />
      )}
    </span>
  );
};
