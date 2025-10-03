import React from 'react';
import { GraduationCap, Sparkles, BookOpen, Lightbulb, Atom, Beaker, Globe, Zap, Clock, Monitor } from 'lucide-react';

export const FloatingBackground: React.FC = () => {
  const icons = [
    GraduationCap, Sparkles, BookOpen, Lightbulb, 
    Atom, Beaker, Globe, Zap, Clock, Monitor
  ];

  const FloatingParticle: React.FC<{ 
    icon: React.ElementType; 
    delay: number; 
    duration: number;
    left: string;
    top: string;
    size?: 'sm' | 'md' | 'lg';
  }> = ({ icon: Icon, delay, duration, left, top, size = 'md' }) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8'
    };

    return (
      <div
        className="absolute opacity-10 text-primary/20 animate-particle-float pointer-events-none"
        style={{
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          left,
          top
        }}
      >
        <Icon className={sizeClasses[size]} />
      </div>
    );
  };

  // Generate random positions for particles
  const particles = [
    // Top section
    { icon: Sparkles, delay: 0, duration: 12, left: '5%', top: '10%', size: 'sm' as const },
    { icon: BookOpen, delay: 2, duration: 15, left: '15%', top: '5%', size: 'md' as const },
    { icon: Lightbulb, delay: 4, duration: 13, left: '85%', top: '8%', size: 'sm' as const },
    { icon: GraduationCap, delay: 1, duration: 14, left: '92%', top: '15%', size: 'md' as const },
    
    // Middle section
    { icon: Atom, delay: 3, duration: 16, left: '8%', top: '30%', size: 'lg' as const },
    { icon: Beaker, delay: 5, duration: 11, left: '25%', top: '40%', size: 'sm' as const },
    { icon: Globe, delay: 6, duration: 17, left: '90%', top: '35%', size: 'md' as const },
    { icon: Zap, delay: 2, duration: 10, left: '75%', top: '45%', size: 'sm' as const },
    { icon: Monitor, delay: 4, duration: 13, left: '10%', top: '55%', size: 'md' as const },
    
    // Lower middle section
    { icon: Clock, delay: 7, duration: 14, left: '30%', top: '60%', size: 'lg' as const },
    { icon: Sparkles, delay: 1, duration: 15, left: '85%', top: '58%', size: 'sm' as const },
    { icon: BookOpen, delay: 8, duration: 12, left: '65%', top: '65%', size: 'md' as const },
    { icon: Lightbulb, delay: 3, duration: 16, left: '20%', top: '70%', size: 'sm' as const },
    
    // Bottom section
    { icon: Atom, delay: 5, duration: 11, left: '12%', top: '80%', size: 'md' as const },
    { icon: GraduationCap, delay: 9, duration: 13, left: '45%', top: '85%', size: 'lg' as const },
    { icon: Beaker, delay: 6, duration: 14, left: '78%', top: '82%', size: 'sm' as const },
    { icon: Globe, delay: 2, duration: 15, left: '88%', top: '75%', size: 'md' as const },
    { icon: Zap, delay: 7, duration: 12, left: '35%', top: '90%', size: 'sm' as const },
    { icon: Monitor, delay: 4, duration: 17, left: '60%', top: '88%', size: 'md' as const },
    
    // Additional scattered particles
    { icon: Sparkles, delay: 8, duration: 13, left: '50%', top: '25%', size: 'sm' as const },
    { icon: Lightbulb, delay: 3, duration: 14, left: '42%', top: '48%', size: 'md' as const },
    { icon: Clock, delay: 6, duration: 11, left: '70%', top: '22%', size: 'sm' as const },
    { icon: Atom, delay: 9, duration: 16, left: '55%', top: '72%', size: 'lg' as const },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle, index) => (
        <FloatingParticle
          key={index}
          icon={particle.icon}
          delay={particle.delay}
          duration={particle.duration}
          left={particle.left}
          top={particle.top}
          size={particle.size}
        />
      ))}
    </div>
  );
};
