
import React, { useState } from 'react';
import { GraduationCap, Sparkles, BookOpen, Lightbulb } from 'lucide-react';
import { TypewriterText } from './TypewriterText';

export const AnimatedHeadline: React.FC = () => {
  const [isTypewriterComplete, setIsTypewriterComplete] = useState(false);

  const phrases = [
    "Loading...",
    "School Facts...",
    "Educational Myths...",
    "School Facts Debunker"
  ];

  const handleTypewriterComplete = () => {
    setIsTypewriterComplete(true);
  };

  const FloatingParticle: React.FC<{ 
    icon: React.ElementType; 
    delay: number; 
    duration: number;
    className?: string;
  }> = ({ icon: Icon, delay, duration, className = '' }) => (
    <div
      className={`absolute opacity-20 text-primary/30 animate-particle-float ${className}`}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 50 + 50}%`
      }}
    >
      <Icon className="h-4 w-4 md:h-6 md:w-6" />
    </div>
  );

  return (
    <div className="relative overflow-hidden">
      {/* Floating Particles Background */}
      <div className="absolute inset-0 pointer-events-none">
        <FloatingParticle icon={Sparkles} delay={0} duration={8} />
        <FloatingParticle icon={BookOpen} delay={2} duration={10} />
        <FloatingParticle icon={Lightbulb} delay={4} duration={9} />
        <FloatingParticle icon={Sparkles} delay={6} duration={11} />
        <FloatingParticle icon={BookOpen} delay={1} duration={7} />
        <FloatingParticle icon={Lightbulb} delay={3} duration={12} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center mb-4 md:mb-6 md:flex-row">
        {/* Animated Graduation Cap */}
        <div className={`mb-2 md:mb-0 md:mr-4 transition-all duration-1000 ${
          isTypewriterComplete 
            ? 'animate-float-icon' 
            : 'animate-bounce-gentle'
        }`}>
          <GraduationCap className="h-12 w-12 md:h-16 md:w-16 text-primary" />
        </div>

        {/* Typewriter Text */}
        <div className="text-center">
          <h1 className={`text-2xl md:text-3xl lg:text-5xl font-bold transition-all duration-1000 ${
            isTypewriterComplete 
              ? 'animate-text-glow' 
              : ''
          }`}>
            <TypewriterText
              phrases={phrases}
              typingSpeed={120}
              deletingSpeed={80}
              pauseDuration={1000}
              onComplete={handleTypewriterComplete}
            />
          </h1>
        </div>
      </div>

      {/* Completion Effect */}
      {isTypewriterComplete && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-gradient-shift opacity-50" />
        </div>
      )}
    </div>
  );
};
