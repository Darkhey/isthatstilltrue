
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MindBlowingFact {
  emoji: string;
  title: string;
  explanation: string;
  source: string;
  sourceUrl: string;
}

const facts: MindBlowingFact[] = [
  {
    emoji: '🦈',
    title: 'Sharks are older than trees',
    explanation: 'Sharks have been around for about 400 million years, while trees only appeared roughly 350 million years ago. Sharks survived 5 mass extinctions!',
    source: 'BBC Science Focus',
    sourceUrl: 'https://www.sciencefocus.com/nature/sharks-older-than-trees',
  },
  {
    emoji: '🪐',
    title: 'A day on Venus is longer than its year',
    explanation: 'Venus takes 243 Earth days to rotate once but only 225 Earth days to orbit the Sun. So a single day outlasts an entire year.',
    source: 'NASA',
    sourceUrl: 'https://science.nasa.gov/venus/',
  },
  {
    emoji: '💧',
    title: 'Water can boil and freeze at the same time',
    explanation: 'At the "triple point" (0.01°C and 611.73 Pa), water exists as solid, liquid, and gas simultaneously. It\'s a real physics phenomenon.',
    source: 'ScienceNewsToday',
    sourceUrl: 'https://www.sciencenewstoday.org/',
  },
  {
    emoji: '🦥',
    title: 'Sloths can hold their breath longer than dolphins',
    explanation: 'Sloths can hold their breath for up to 40 minutes underwater by slowing their heart rate, while dolphins max out at about 10 minutes.',
    source: 'BBC Science Focus',
    sourceUrl: 'https://www.sciencefocus.com/',
  },
  {
    emoji: '🐙',
    title: 'Octopuses have 3 hearts and blue blood',
    explanation: 'Two hearts pump blood to the gills, one to the body. Their blood is copper-based (hemocyanin) instead of iron-based, making it blue.',
    source: 'Smithsonian',
    sourceUrl: 'https://ocean.si.edu/',
  },
  {
    emoji: '🧬',
    title: 'Your DNA stretches to the Sun and back 330 times',
    explanation: 'If you uncoiled all the DNA in your body, it would stretch about 74 trillion meters — enough to reach the Sun and back over 300 times.',
    source: 'BBC Science Focus',
    sourceUrl: 'https://www.sciencefocus.com/',
  },
  {
    emoji: '🍌',
    title: 'Bananas are berries, strawberries aren\'t',
    explanation: 'Botanically, a berry develops from a single ovary. Bananas qualify; strawberries are "accessory fruits" from a flower with multiple ovaries.',
    source: 'Britannica',
    sourceUrl: 'https://www.britannica.com/story/is-a-banana-a-berry',
  },
  {
    emoji: '🪚',
    title: 'Chainsaws were invented for childbirth',
    explanation: 'The first chainsaw prototype was designed in the 1780s by Scottish doctors to help with difficult childbirths by cutting pelvic bone. Seriously.',
    source: 'BBC Science Focus',
    sourceUrl: 'https://www.sciencefocus.com/',
  },
  {
    emoji: '🦛',
    title: 'Hippos can\'t actually swim',
    explanation: 'Despite living in water, hippos are too dense to float. They gallop along the riverbed instead — at surprisingly fast speeds.',
    source: 'National Geographic',
    sourceUrl: 'https://www.nationalgeographic.com/',
  },
  {
    emoji: '☁️',
    title: 'A single cloud weighs about 1 million tons',
    explanation: 'An average cumulus cloud contains around 500,000 kg of water per cubic km. A typical cloud spans multiple cubic km, reaching ~1 million tons.',
    source: 'BBC Science Focus',
    sourceUrl: 'https://www.sciencefocus.com/',
  },
];

type Vote = 'real' | 'fake' | null;

const FactCard: React.FC<{ fact: MindBlowingFact; index: number; isVisible: boolean }> = ({ fact, index, isVisible }) => {
  const [vote, setVote] = useState<Vote>(null);
  const [revealed, setRevealed] = useState(false);

  const handleVote = (choice: Vote) => {
    if (revealed) return;
    setVote(choice);
    // Short delay before reveal for suspense
    setTimeout(() => setRevealed(true), 400);
  };

  const gotItRight = vote === 'real';

  return (
    <Card
      className={cn(
        'border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-500 overflow-hidden',
        revealed && gotItRight && 'ring-2 ring-primary/40',
        revealed && !gotItRight && 'ring-2 ring-destructive/30',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      )}
      style={{ transitionDelay: isVisible ? `${index * 80}ms` : '0ms' }}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className={cn(
            "text-3xl sm:text-4xl shrink-0 transition-transform duration-500",
            revealed && "scale-110"
          )}>
            {fact.emoji}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent/15 text-accent border-accent/30 shrink-0">
                {revealed ? '✅ 100% Real' : 'Real or Fake? 🤔'}
              </Badge>
            </div>
            <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug">
              {fact.title}
            </h3>

            {/* Voting buttons */}
            {!revealed && !vote && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs gap-1.5 h-8 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                  onClick={() => handleVote('real')}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  I believe it
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs gap-1.5 h-8 border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50"
                  onClick={() => handleVote('fake')}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  No way!
                </Button>
              </div>
            )}

            {/* Voted but not yet revealed - suspense */}
            {vote && !revealed && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                Checking...
              </div>
            )}

            {/* Revealed answer */}
            {revealed && (
              <div className="mt-3 space-y-2 animate-fade-in">
                <div className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold",
                  gotItRight ? "text-primary" : "text-destructive"
                )}>
                  {gotItRight ? (
                    <><Check className="h-3.5 w-3.5" /> You got it right! 🎉</>
                  ) : (
                    <><X className="h-3.5 w-3.5" /> Surprise — it's actually true! 🤯</>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {fact.explanation}
                </p>
                <a
                  href={fact.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[10px] text-primary/70 hover:text-primary underline transition-colors"
                >
                  Source: {fact.source}
                </a>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const MindBlowingFacts: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-10 sm:py-16">
      <div className={cn(
        'text-center mb-8 transition-all duration-700',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      )}>
        <span className="text-4xl sm:text-5xl block mb-3">🤯</span>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Sounds Fake, But It's True
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          10 mind-blowing facts that sound completely made up. Vote first — then see if you were right!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {facts.map((fact, i) => (
          <FactCard key={i} fact={fact} index={i} isVisible={isVisible} />
        ))}
      </div>
    </section>
  );
};
