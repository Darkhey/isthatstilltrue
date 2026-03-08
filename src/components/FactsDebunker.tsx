import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, AlertTriangle, BookOpen, Beaker, Atom, Zap, Clock, Globe, Monitor, ExternalLink, Lightbulb, GraduationCap, AlertCircle, ChevronDown, Flag, Shield, CheckCircle, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FactSkeleton } from "./FactSkeleton";
import { FactShare } from "./FactShare";
import { ReportFactDialog } from "./ReportFactDialog";
import { AnimatedHeadline } from "./AnimatedHeadline";
import { TimeMachinePicker } from "./TimeMachinePicker";
import { SchoolModeToggle } from "./SchoolModeToggle";
import { SchoolPicker } from "./SchoolPicker";
import { SchoolMemoryCard } from "./SchoolMemoryCard";
import { SchoolShareCard } from "./SchoolShareCard";
import { HistoricalHeadlines } from "./HistoricalHeadlines";
import { EnhancedProgressTracker } from "./EnhancedProgressTracker";
import { LanguageSelector } from "./LanguageSelector";
import { AnimatedLoader } from "./AnimatedLoader";

interface OutdatedFact {
  category: string;
  fact: string;
  correction: string;
  yearDebunked: number;
  mindBlowingFactor: string;
  sourceUrl?: string;
  sourceName?: string;
  qualityScore?: number;
  confidenceLevel?: 'high' | 'medium' | 'low';
  validation?: {
    isValid: boolean;
    confidenceScore: number;
    sources: string[];
    wikipediaContext?: string;
  };
}

interface EducationSystemProblem {
  problem: string;
  description: string;
  impact: string;
}

interface SchoolMemoryData {
  whatHappenedAtSchool: Array<{
    title: string;
    description: string;
    category: "facilities" | "academics" | "sports" | "culture" | "technology";
    sourceUrl?: string;
    sourceName?: string;
  }>;
  nostalgiaFactors: Array<{
    memory: string;
    shareableText: string;
    sourceUrl?: string;
    sourceName?: string;
  }>;
  localContext: Array<{
    event: string;
    relevance: string;
    sourceUrl?: string;
    sourceName?: string;
  }>;
  shareableQuotes: string[];
}

interface WikipediaSource {
  title: string;
  url: string;
  type: string;
}

interface HistoricalHeadline {
  title: string;
  date: string;
  description: string;
  category: 'world' | 'national' | 'local' | 'culture' | 'technology' | 'sports';
  source?: string;
}

interface ShareableContent {
  mainShare: string;
  whatsappShare: string;
  instagramStory: string;
  twitterPost: string;
  variants: string[];
  historicalHeadlines?: HistoricalHeadline[];
}

const countries = [
  { value: "Germany", label: "Germany" },
  { value: "USA", label: "USA" },
  { value: "Austria", label: "Austria" },
  { value: "Switzerland", label: "Switzerland" },
  { value: "France", label: "France" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Canada", label: "Canada" },
  { value: "Australia", label: "Australia" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "Sweden", label: "Sweden" },
  { value: "Russia", label: "Russia" },
  { value: "Moldova", label: "Moldova" },
  { value: "China", label: "China" },
  { value: "Iran", label: "Iran" },
  { value: "North Korea", label: "North Korea" },
  { value: "Venezuela", label: "Venezuela" },
  { value: "Cuba", label: "Cuba" },
  { value: "Belarus", label: "Belarus" },
  { value: "Serbia", label: "Serbia" },
  { value: "Turkey", label: "Turkey" },
];

// Animated loading messages for school research
const loadingMessages = [
  "Searching Wikipedia for your school...",
  "Researching historical context...",
  "Analyzing Wikipedia sources...",
  "Looking up local events from that year...",
  "Gathering verified facts...",
  "Cross-referencing historical data...",
  "Loading nostalgia coefficient...",
  "Extracting memory fragments...",
  "Compiling classroom chronicles...",
  "Processing time capsule data...",
  "Decoding yearbook algorithms...",
  "Initializing friendship subroutines...",
  "Compiling test anxiety data...",
  "Scanning school spirit frequencies...",
];

const getLocalGreeting = (country: string) => {
  const greetings: Record<string, string> = {
    "Germany": "Hallo",
    "Austria": "Servus",
    "Switzerland": "Grüezi",
    "France": "Bonjour",
    "United Kingdom": "Hello",
    "USA": "Hello",
    "Canada": "Hello",
    "Australia": "G'day",
    "Netherlands": "Hallo",
    "Sweden": "Hej",
    "Russia": "Привет",
    "Moldova": "Salut",
    "China": "你好",
    "Iran": "سلام",
    "North Korea": "안녕하세요",
    "Venezuela": "Hola",
    "Cuba": "Hola",
    "Belarus": "Прывітанне",
    "Serbia": "Здраво",
    "Turkey": "Merhaba",
  };
  return greetings[country] || "Hello";
};

const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, LucideIcon> = {
    "Politics": Flag,
    "International Relations": Flag,
    "Historical Politics": Flag,
    "Ancient Worldview": Flag,
    "Science": Beaker,
    "Historical Science": Beaker,
    "Natural Philosophy": Beaker,
    "Ancient Natural Beliefs": Beaker,
    "Technology": Monitor,
    "Physics": Zap,
    "Medicine": Beaker,
    "Society": Globe,
    "Laws": BookOpen,
    "Culture": Clock,
    "Environment": Globe,
    "Space": Atom,
    "Astronomy": Atom,
    "Nutrition": Beaker,
    "History": BookOpen,
    "Geography": Globe,
  };
  return iconMap[category] || BookOpen;
};

const getCategoryColor = (category: string) => {
  if (category === "Politics" || category === "International Relations" || 
      category === "Historical Politics" || category === "Ancient Worldview") {
    return "bg-red-500";
  }
  return "bg-destructive";
};

const getFactGenerationType = (year: number): 'modern' | 'historical' | 'ancient' => {
  if (year >= 1900) return 'modern';
  if (year >= 1800) return 'historical';
  return 'ancient';
};

const getLoadingMessage = (year: number) => {
  const factType = getFactGenerationType(year);
  
  switch (factType) {
    case 'modern':
      return "Researching Outdated Facts...";
    case 'historical':
      return "Researching Historical Perspectives...";
    case 'ancient':
      return "Researching Ancient Worldviews...";
    default:
      return "Researching...";
  }
};

const getResultsTitle = (year: number) => {
  const factType = getFactGenerationType(year);
  
  switch (factType) {
    case 'modern':
      return "What You Learned vs. What We Know Now";
    case 'historical':
      return "Historical Beliefs vs. Modern Understanding";
    case 'ancient':
      return "Ancient Worldviews vs. Modern Knowledge";
    default:
      return "Educational Facts";
  }
};

const getResultsDescription = (facts: OutdatedFact[], year: number) => {
  const factType = getFactGenerationType(year);
  
  switch (factType) {
    case 'modern':
      return `${facts.length} facts from your school days that have since been updated`;
    case 'historical':
      return `${facts.length} beliefs from ${year} that we now understand differently`;
    case 'ancient':
      return `${facts.length} worldviews from ${year} that have been transformed by modern knowledge`;
    default:
      return `${facts.length} interesting facts`;
  }
};

const generateFunMessage = (year: number) => {
  const yearNum = parseInt(year.toString());

  // Year-specific Easter eggs first
  const yearSpecific: Record<number, string[]> = {
    1969: ["One small step for man... one giant leap for your education 🌕", "You graduated the year we walked on the Moon! 🚀"],
    1977: ["Star Wars just came out — may the Force be with your diploma 🌟", "A New Hope... for your career! ⚔️"],
    1984: ["Big Brother is watching your grades 👁️", "George Orwell's year — at least school wasn't THAT dystopian 📖"],
    1989: ["The Wall came down — and so did your school stress! 🧱", "Freedom year! Berlin Wall fell, you graduated 🎉"],
    1990: ["Germany reunited, you graduated — big year! 🇩🇪", "Fresh into a brand new world order 🌍"],
    1991: ["The Soviet Union collapsed — your school too? 😅", "World Wide Web went public — you had no idea what was coming 🌐"],
    1994: ["Friends premiered — were your school friends as iconic? ☕", "Kurt Cobain's last year... grunge graduation 🎸"],
    1995: ["Windows 95 launched — your PC probably had 8MB RAM 💾", "Toy Story came out — you were still a kid at heart 🤠"],
    1996: ["Dolly the sheep was cloned — science was wild 🐑", "The Macarena was everywhere. EVERYWHERE. 💃"],
    1997: ["Titanic in cinemas — 'I'm the king of the world!' 🚢", "Harry Potter Book 1 — a magical graduation year ⚡"],
    1998: ["Google was founded — you survived without it 🔍", "France won the World Cup — Zidane era! ⚽"],
    1999: ["Y2K panic — did you store canned food? 🥫", "The Matrix came out — were you in the simulation? 💊", "Napster launched — free music, guilty conscience 🎵"],
    2000: ["Millennium baby! You survived Y2K 🎆", "The future is here... where's my flying car? 🚗"],
    2001: ["The year everything changed. Respect. 🕊️", "iPod launched — 1000 songs in your pocket 🎶", "Wikipedia was born — your future cheat sheet 📚"],
    2002: ["Euro coins arrived — goodbye Deutsche Mark! 💶", "Spider-Man in cinemas — with great power... 🕷️"],
    2003: ["MySpace launched — your first HTML was on your profile 💫", "Finding Nemo — just keep swimming through school 🐠"],
    2004: ["Facebook launched — from dorm project to... everything 👤", "Tsunami year — the world held its breath 🌊", "Google went public at $85/share... if only you'd invested 📈"],
    2005: ["YouTube started — 'Me at the zoo' era 📹", "Hurricane Katrina — a year of resilience 💪"],
    2006: ["Twitter launched — 140 characters of wisdom 🐦", "Wii Sports era — your arm still hurts 🎮"],
    2007: ["The iPhone changed EVERYTHING 📱", "The last generation to graduate without smartphones 🤳"],
    2008: ["Obama's 'Yes We Can' — and you graduated into a recession 📉", "Iron Man launched the MCU — Avengers, assemble your resume! 🦸"],
    2009: ["Bitcoin was born — worth $0. ZERO. 💸", "Michael Jackson died — end of an era 🎤", "Avatar in 3D — the future seemed so close 🌿"],
    2010: ["Instagram launched — your food has never been the same 📸", "Vuvuzelas traumatized us all at the World Cup 📯"],
    2011: ["Bin Laden found. Royal Wedding. Fukushima. What a year 🌍", "Snapchat launched — your messages now self-destruct 👻"],
    2012: ["The world didn't end — Mayans were wrong! 🗓️", "Gangnam Style broke YouTube's view counter 🐴", "Curiosity landed on Mars — your curiosity landed you here 🔴"],
    2013: ["Frozen came out — Let It Go... let your school years go ❄️", "Edward Snowden — now you know they read everything 🕵️"],
    2014: ["Ice Bucket Challenge graduate — you got soaked 🪣", "The year of the selfie stick — dark times 🤳"],
    2015: ["Back to the Future Day was Oct 21 — where's our hoverboard? 🛹", "Star Wars came back — so did your childhood 🌟"],
    2016: ["Brexit, Trump, Harambe — nobody saw any of it coming 🦍", "Pokémon Go — you walked into a pole for a Pikachu ⚡"],
    2017: ["Fidget spinners were a personality trait 🌀", "Bitcoin hit $20K — your classmate who bought at $100 retired 💰"],
    2018: ["Fortnite took over — default dance at graduation? 💃", "Royal Wedding 2.0 — Meghan Markle era 👑"],
    2019: ["Area 51 raid (that didn't happen) 👽", "The last 'normal' year... enjoy it while it lasts 😬", "Baby Yoda stole everyone's heart 💚"],
    2020: ["Zoom University graduate 🎓💻", "Tiger King was your professor now 🐯", "Banana bread baker with a diploma 🍞", "Graduated in pajamas — still valid! 🩳"],
    2021: ["Vaccinated and graduated! Double shot 💉🎓", "Dogecoin to the moon... your degree too? 🚀", "Supply chain issues — couldn't even get a graduation gown 📦"],
    2022: ["Wordle was your morning routine 🟩🟨", "Nobody knows what an NFT was anymore 🖼️", "Queen Elizabeth — end of a 70-year era 👑"],
    2023: ["ChatGPT wrote half your thesis, didn't it? 🤖", "Barbenheimer graduate — pink or boom? 💗💣", "Taylor Swift's Eras Tour — your school era ends too 🎤"],
    2024: ["AI might take your job before you even start 🤖", "Olympic year — graduating is also a sport 🏅", "TikTok brain with a diploma — respect 🧠"],
    2025: ["Fresh out! The world is... complicated 🌍", "You graduated into the AI revolution 🚀", "Gen Alpha is right behind you — run 🏃"],
    2026: ["You literally just graduated — go touch grass 🌿", "The ink on your diploma is still wet 📜"],
  };

  // Check for year-specific messages first
  if (yearSpecific[yearNum]) {
    const specific = yearSpecific[yearNum];
    return specific[Math.floor(Math.random() * specific.length)];
  }

  const messages = {
    ancient: [
      "Respect! You've chosen a fascinating historical era 🏛️",
      "Ancient times — when leeches were healthcare 🩸",
      "Back when 'going viral' meant the plague 💀",
      "Your teachers literally used stone tablets 🪨",
      "Flat Earth was mainstream opinion — not a meme 🌍",
    ],
    vintage: [
      "The Enlightenment era — candles were high-tech 🕯️",
      "Before electricity — homework by candlelight 🔥",
      "Industrial Revolution loading... ⚙️",
      "Steam power was the 'AI' of your century 🚂",
    ],
    earlyModern: [
      "World Wars shaped everything — heavy times 🌍",
      "Radio was social media — imagine waiting for news 📻",
      "Your teachers survived actual history 📖",
      "Rock'n'Roll was born — rebels with a cause 🎸",
    ],
    sixties: [
      "Flower power graduate! ✌️🌸",
      "Beatles or Stones? The eternal question 🎵",
      "Moon landing generation — one small step! 🌕",
      "Woodstock vibes — peace, love & diplomas ☮️",
    ],
    seventies: [
      "Disco fever graduate! 🕺",
      "Platform shoes to the graduation ceremony 👠",
      "Star Wars generation — the Force is with you ⚔️",
      "Oil crisis — even gas was drama 🛢️",
    ],
    eighties: [
      "Big hair, bigger dreams! 💇‍♀️",
      "Walkman generation — you were wireless before AirPods 🎧",
      "Pac-Man was your after-school therapy 👾",
      "Neon colors were a lifestyle, not a mistake 🌈",
      "Your mixtape game was legendary 📼",
    ],
    nineties: [
      "90s kid! Peak nostalgia 📱",
      "Dial-up internet survivor — that SOUND 💻",
      "When MTV still played actual music 🎵",
      "You had a Nokia 3310 — indestructible 📞",
      "Tamagotchi parent — your first responsibility 🥚",
      "MSN Messenger status was your social media 💬",
      "You burned CDs — literally curated playlists 💿",
      "Frosted tips were acceptable. Somehow. 🧊",
    ],
    earlyTwoThousands: [
      "Y2K survivor! The computers didn't explode 💾",
      "MySpace era — your top 8 defined friendships 🌐",
      "iPod generation — 1000 songs, one white cable 🎧",
      "Flip phone master — T9 texting speed record 📱",
      "LimeWire gave your PC every virus known to man 🦠",
      "You waited 3 minutes to download one song on Napster 🎵",
      "Low-rise jeans. We don't talk about it. 👖",
    ],
    recession: [
      "2008 recession graduate... your timing was *chef's kiss* 📉",
      "You graduated into financial chaos — built different 💪",
      "Banks collapsed but your spirit didn't 🏦",
      "Economy was rough — at least memes were free 🎯",
      "Your first job paid in 'experience' 💼",
    ],
    modern: [
      "You probably still can't afford a house 🏠",
      "Student loans are your longest relationship 💸",
      "Graduated into the gig economy — side hustles only 📱",
      "Adulting is a scam and nobody warned you 😅",
      "Instagram made everyone else's life look better 📸",
      "Avocado toast > home ownership, apparently 🥑",
    ],
    pandemic: [
      "Zoom graduation — your cat made a cameo 💻🐱",
      "Masks, hand sanitizer, and existential dread 😷",
      "You graduated during the actual apocalypse 🦠",
      "Remote everything — pants were optional 🩳",
      "Sourdough starter had more attention than your thesis 🍞",
      "Class of COVID — unkillable 💪",
    ],
    fresh: [
      "Fresh grad! The world is... a lot right now 📊",
      "Entry level job: requires 5+ years + PhD + time travel 😂",
      "AI might automate your job before you start it 🤖",
      "Welcome to inflation nation — $7 coffee ☕",
      "Your diploma costs more than your first car 📜",
      "LinkedIn influencers are your new nightmare 💼",
    ]
  };

  let categoryMessages;
  if (yearNum <= 1500) {
    categoryMessages = messages.ancient;
  } else if (yearNum <= 1700) {
    categoryMessages = messages.vintage;
  } else if (yearNum <= 1950) {
    categoryMessages = messages.earlyModern;
  } else if (yearNum <= 1969) {
    categoryMessages = messages.sixties;
  } else if (yearNum <= 1979) {
    categoryMessages = messages.seventies;
  } else if (yearNum <= 1989) {
    categoryMessages = messages.eighties;
  } else if (yearNum <= 1999) {
    categoryMessages = messages.nineties;
  } else if (yearNum <= 2007) {
    categoryMessages = messages.earlyTwoThousands;
  } else if (yearNum <= 2012) {
    categoryMessages = messages.recession;
  } else if (yearNum <= 2019) {
    categoryMessages = messages.modern;
  } else if (yearNum <= 2022) {
    categoryMessages = messages.pandemic;
  } else {
    categoryMessages = messages.fresh;
  }

  return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
};

export const FactsDebunker = () => {
  const [isSchoolMode, setIsSchoolMode] = useState(false);
  const [country, setCountry] = useState("Germany");
  const [graduationYear, setGraduationYear] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [city, setCity] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [schoolMemories, setSchoolMemories] = useState<SchoolMemoryData | null>(null);
  const [schoolShareableContent, setSchoolShareableContent] = useState<ShareableContent | null>(null);
  const [facts, setFacts] = useState<OutdatedFact[]>([]);
  const [educationProblems, setEducationProblems] = useState<EducationSystemProblem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showSkeletons, setShowSkeletons] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEducationProblemsOpen, setIsEducationProblemsOpen] = useState(false);
  const [funMessage, setFunMessage] = useState<string | null>(null);
  const [quickFunFact, setQuickFunFact] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedFactForReport, setSelectedFactForReport] = useState<OutdatedFact | null>(null);
  const [historicalHeadlines, setHistoricalHeadlines] = useState<HistoricalHeadline[]>([]);
  const [schoolImage, setSchoolImage] = useState<string | null>(null);
  const [wikipediaSources, setWikipediaSources] = useState<WikipediaSource[]>([]);
  const [loadingMessage, setLoadingMessage] = useState<string>("Researching...");
  const [language, setLanguage] = useState<'en' | 'de'>('en');
  const [processingStage, setProcessingStage] = useState<string>('initialization');
  const [useEnhancedAPI, setUseEnhancedAPI] = useState(true);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);
  const [cacheInfo, setCacheInfo] = useState<any>(null);

  const factsResultsRef = useRef<HTMLDivElement>(null);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup loading interval on unmount
  useEffect(() => {
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    };
  }, []);
  
  // Handle mode toggle with proper state reset
  const handleModeToggle = (newSchoolMode: boolean) => {
    setIsSchoolMode(newSchoolMode);
    // CRITICAL: Always reset to step 1 when switching modes
    setStep(1);
    setGraduationYear(""); // Also reset year when switching
    setError(null);
    setSuccessMessage(null);
    setFacts([]);
    setSchoolMemories(null);
    setSchoolShareableContent(null);
    setHistoricalHeadlines([]);
    setWikipediaSources([]);
    setSchoolImage(null);
    setFunMessage(null);
    // Keep country selection but clear school-specific fields when going back to country mode
    if (!newSchoolMode) {
      setSchoolName("");
      setCity("");
      setSchoolType("");
    }
  };

  // Function to get random loading message
  const getRandomLoadingMessage = () => {
    return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
  };

  // Update loading message every 2 seconds during research
  const startLoadingMessageRotation = useCallback(() => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
    }
    loadingIntervalRef.current = setInterval(() => {
      setLoadingMessage(getRandomLoadingMessage());
    }, 2000);
  }, []);

  const stopLoadingMessageRotation = useCallback(() => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  }, []);

  const handleNextStep = () => {
    if (isSchoolMode) {
      if (!schoolName?.trim()) {
        setError("Please enter your school name.");
        return;
      }
      if (!city?.trim()) {
        setError("Please enter your city.");
        return;
      }
      if (!schoolType) {
        setError("Please select your school type.");
        return;
      }
      if (!country) {
        setError("Please select your country.");
        return;
      }
    } else {
      if (!country) {
        setError("Please select your country.");
        return;
      }
    }
    setError(null);
    setStep(2);
  };

  const handleYearChange = (value: string) => {
    setGraduationYear(value);
    const message = generateFunMessage(parseInt(value));
    setFunMessage(message);
    setError(null);
  };

  const generateFacts = async () => {
    if (!graduationYear || parseInt(graduationYear) < 1200 || parseInt(graduationYear) > new Date().getFullYear()) {
      setError("Please enter a valid graduation year between 1200 and current year.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setShowSkeletons(true);
    setLoadingMessage(getRandomLoadingMessage());
    
    startLoadingMessageRotation();
    setFacts([]);
    setSchoolMemories(null);
    setSchoolShareableContent(null);
    setHistoricalHeadlines([]);
    
    // Scroll to facts section after a short delay to allow the UI to update
    setTimeout(() => {
      factsResultsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
    
    try {
      if (isSchoolMode) {
        console.log(`Researching school memories for ${schoolName} in ${city}, graduation year ${graduationYear}`);
        
        const { data, error } = await supabase.functions.invoke('research-school-memories', {
          body: {
            schoolName,
            city,
            graduationYear: parseInt(graduationYear),
            country
          }
        });

        if (error) {
          console.error('School research error:', error);
          setError("Error researching school memories. Please try again.");
          setShowSkeletons(false);
          return;
        }

        if (!data || !data.schoolMemories) {
          setError("No school memories found. Please check the school information.");
          setShowSkeletons(false);
          return;
        }

        setSchoolMemories(data.schoolMemories);
        setSchoolShareableContent(data.shareableContent);
        if (data.schoolImage) {
          setSchoolImage(data.schoolImage);
        }
        if (data.historicalHeadlines) {
          setHistoricalHeadlines(data.historicalHeadlines);
        }
        if (data.wikipediaSources?.length > 0) {
          setWikipediaSources(data.wikipediaSources);
        }
        setShowSkeletons(false);
        
        if (data.cached) {
          setSuccessMessage(`School memories found (researched ${data.cacheAge} days ago)`);
        } else {
          setSuccessMessage(`School memories for ${schoolName} successfully researched!`);
        }
      } else {
        console.log(`Generating facts for ${country} ${graduationYear} (Enhanced: ${useEnhancedAPI})`);
        
        // Choose API endpoint based on enhancement setting
        const apiEndpoint = useEnhancedAPI ? 'enhanced-fact-generator' : 'generate-facts';
        
        // First, quickly get the fun fact and show it immediately if not using enhanced API
        if (!useEnhancedAPI) {
          try {
            const { data: quickFactData } = await supabase.functions.invoke('quick-fun-fact', {
              body: {
                country,
                graduationYear: parseInt(graduationYear)
              }
            });
            
            if (quickFactData?.quickFunFact) {
              setQuickFunFact(quickFactData.quickFunFact);
            }
          } catch (quickFactError) {
            console.warn('Failed to generate quick fun fact:', quickFactError);
          }
        }
        
        // Generate facts with enhanced or standard API
        const { data, error } = await supabase.functions.invoke(apiEndpoint, {
          body: {
            country,
            graduationYear: parseInt(graduationYear),
            language
          }
        });

        if (error) {
          console.error('Fact generation error:', error);
          
          // Enhanced error handling
          let errorMessage = "Error generating facts. Please try again.";
          if (data?.stage) {
            setProcessingStage(data.stage);
            errorMessage = `Error during ${data.stage}: ${data.suggestion || errorMessage}`;
          }
          
          setError(errorMessage);
          setShowSkeletons(false);
          return;
        }

        if (!data.facts || data.facts.length === 0) {
          const factType = getFactGenerationType(parseInt(graduationYear));
          let errorMsg = "No facts could be found for this combination. Try a different country or year.";
          
          if (factType === 'historical') {
            errorMsg = "Could not generate historical perspectives for this era. Try a different combination.";
          } else if (factType === 'ancient') {
            errorMsg = "Could not generate ancient worldviews for this time period. Try a different combination.";
          }
          
          setError(errorMsg);
          setShowSkeletons(false);
          return;
        }

        setFacts(data.facts);
        setEducationProblems(data.educationProblems || []);
        setShowSkeletons(false);
        
        const factType = getFactGenerationType(parseInt(graduationYear));
        if (data.cached) {
          if (factType === 'modern') {
            setSuccessMessage(`Found ${data.facts.length} facts (researched ${data.cacheAge} days ago)`);
          } else if (factType === 'historical') {
            setSuccessMessage(`Found ${data.facts.length} historical perspectives (researched ${data.cacheAge} days ago)`);
          } else {
            setSuccessMessage(`Found ${data.facts.length} ancient worldviews (researched ${data.cacheAge} days ago)`);
          }
        } else {
          if (factType === 'modern') {
            setSuccessMessage(`Successfully researched ${data.facts.length} educational facts!`);
          } else if (factType === 'historical') {
            setSuccessMessage(`Successfully researched ${data.facts.length} historical perspectives!`);
          } else {
            setSuccessMessage(`Successfully researched ${data.facts.length} ancient worldviews!`);
          }
        }
      }
    } catch (error) {
      console.error('Error researching facts:', error);
      setError("Research error. Please try again.");
      setShowSkeletons(false);
    } finally {
      stopLoadingMessageRotation();
      setIsLoading(false);
      setShowSkeletons(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setCountry("Germany");
    setGraduationYear("");
    setSchoolName("");
    setCity("");
    setSchoolType("");
    setFacts([]);
    setEducationProblems([]);
    setSchoolMemories(null);
    setSchoolShareableContent(null);
    setShowSkeletons(false);
    setError(null);
    setSuccessMessage(null);
    setIsEducationProblemsOpen(false);
    setFunMessage(null);
    setQuickFunFact(null);
    setReportDialogOpen(false);
    setSelectedFactForReport(null);
    setHistoricalHeadlines([]);
    setWikipediaSources([]);
    setSchoolImage(null);
  };

  const handleBack = () => {
    setStep(1);
    setError(null);
    setSuccessMessage(null);
    setFunMessage(null);
  };

  const handleReportFact = (fact: OutdatedFact) => {
    setSelectedFactForReport(fact);
    setReportDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="text-center mb-6 md:mb-12">
          <AnimatedHeadline />
          <p className="text-sm sm:text-base md:text-xl text-muted-foreground max-w-3xl mx-auto px-2 sm:px-4 mt-3 sm:mt-4 leading-relaxed">
            {isSchoolMode 
              ? "✨ Relive the magic of your school days with personalized memories and verified sources."
              : "Discover what you learned in school that has since been proven wrong."
            }
          </p>
        </div>

        <SchoolModeToggle isSchoolMode={isSchoolMode} onToggle={handleModeToggle} />

        <Card className="max-w-lg mx-auto mb-8 shadow-glow">{/*Increased width for better responsive display*/}
          {step === 1 ? (
            <>
              <CardHeader>
                <CardTitle className="text-center">
                  {isSchoolMode ? "Step 1: Enter School Information" : "Step 1: Select Country"}
                </CardTitle>
                <CardDescription className="text-center">
                  {isSchoolMode 
                    ? "🎓 Enter your school details to unlock nostalgic memories and relive the best years!" 
                    : "Choose your country for curriculum-specific analysis"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isSchoolMode ? (
                  <SchoolPicker
                    schoolName={schoolName}
                    city={city}
                    schoolType={schoolType}
                    country={country}
                    onSchoolNameChange={setSchoolName}
                    onCityChange={setCity}
                    onSchoolTypeChange={setSchoolType}
                    onCountryChange={setCountry}
                  />
                ) : (
                  <div className="space-y-2">
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto bg-background border shadow-lg z-50">
                        {countries.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {error && (
                  <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md border border-destructive/20">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="break-words">{error}</span>
                  </div>
                )}
                <Button 
                  onClick={handleNextStep}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                >
                  Next
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-center text-lg sm:text-xl">Step 2: Enter Graduation Year</CardTitle>
                <CardDescription className="text-center text-sm sm:text-base">
                  <div className="break-words">
                    {isSchoolMode 
                      ? `${schoolName} in ${city} • We'll research what happened during your graduation year`
                      : `${country} • We'll analyze your school curriculum from that era`
                    }
                  </div>
                </CardDescription>
                {!isSchoolMode && (
                  <div className="text-center mt-3">
                    <span className="text-xl sm:text-2xl font-bold text-primary">
                      {getLocalGreeting(country)}!
                    </span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <TimeMachinePicker
                  value={graduationYear}
                  onValueChange={handleYearChange}
                  placeholder="Select graduation year..."
                />
                {funMessage && (
                  <div className="flex items-start gap-2 text-primary text-sm bg-primary/10 p-3 rounded-md border border-primary/20">
                    <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="break-words">{funMessage}</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md border border-destructive/20">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="break-words">{error}</span>
                  </div>
                )}
                {successMessage && (
                  <div className="flex items-start gap-2 text-primary text-sm bg-primary/10 p-3 rounded-md border border-primary/20">
                    <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="break-words">{successMessage}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 order-2 sm:order-1"
                  >
                    Back
                  </Button>
                   <Button 
                     onClick={generateFacts}
                     disabled={isLoading}
                      className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity order-1 sm:order-2"
                     >
                       {isLoading ? (
                         <div className="flex items-center justify-center min-w-0">
                           <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
                           <span className="animate-fade-in truncate text-xs sm:text-sm">{loadingMessage}</span>
                         </div>
                       ) : (
                         isSchoolMode ? "Research My School!" : "Research My Education!"
                       )}
                   </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* School Memory Results */}
        {isSchoolMode && schoolMemories && schoolShareableContent && (
          <div ref={factsResultsRef} className="max-w-4xl mx-auto space-y-6">
            <SchoolMemoryCard 
              schoolName={schoolName}
              city={city}
              graduationYear={parseInt(graduationYear)}
              memoryData={schoolMemories}
              shareableText={schoolShareableContent?.mainShare}
              schoolImage={schoolImage || undefined}
            />

            {/* Wikipedia Sources */}
            {wikipediaSources.length > 0 && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ExternalLink className="h-5 w-5" />
                    Wikipedia Sources Used
                  </CardTitle>
                  <CardDescription>
                    These verified sources were used to research your school memories
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {wikipediaSources.map((source, index) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/5 transition-colors text-sm"
                    >
                      <Badge variant="outline" className="text-xs capitalize">{source.type}</Badge>
                      <span className="text-primary underline underline-offset-2 flex-1">{source.title}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Historical Headlines */}
            {historicalHeadlines.length > 0 && (
              <HistoricalHeadlines 
                headlines={historicalHeadlines} 
                year={parseInt(graduationYear)} 
              />
            )}
            
            <SchoolShareCard
              schoolName={schoolName}
              city={city}
              graduationYear={parseInt(graduationYear)}
              shareableContent={schoolShareableContent}
            />
            <div className="text-center mt-8">
              <Button 
                onClick={resetForm}
                variant="outline"
                className="px-8"
              >
                Research Another School
              </Button>
            </div>
          </div>
        )}

        {/* School Mode Loading Screen */}
        {isSchoolMode && isLoading && !schoolMemories && (
          <div ref={factsResultsRef} className="max-w-2xl mx-auto mt-6">
            <Card className="animate-fade-in overflow-hidden border-primary/20 shadow-glow">
              <div className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 p-6 sm:p-10">
                <div className="text-center space-y-5 sm:space-y-8">
                  <AnimatedLoader messages={loadingMessages} />
                  
                  <div className="space-y-3">
                    <h3 className="text-lg sm:text-2xl font-bold text-foreground">
                      🔬 Researching Your School...
                    </h3>
                    <div className="space-y-2 text-left max-w-sm mx-auto">
                      {[
                        { emoji: "🔍", text: "Searching Wikipedia for your school" },
                        { emoji: "📚", text: "Analyzing historical context" },
                        { emoji: "🏫", text: "Cross-referencing verified sources" },
                        { emoji: "✨", text: "Creating nostalgic memories" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2.5 p-2 rounded-md bg-background/60">
                          <span className="text-base">{item.emoji}</span>
                          <span className="text-sm text-foreground/80">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-background/80 rounded-lg p-3 border border-border/50 max-w-sm mx-auto">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      ⏱️ This may take 20-40 seconds for verified results
                    </p>
                  </div>

                  <div className="flex justify-center gap-2">
                    <div className="h-2.5 w-2.5 bg-primary rounded-full animate-bounce" />
                    <div className="h-2.5 w-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="h-2.5 w-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Country Facts Results */}
        {!isSchoolMode && (showSkeletons || facts.length > 0) && (
          <div ref={factsResultsRef} className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                {showSkeletons ? getLoadingMessage(parseInt(graduationYear)) : getResultsTitle(parseInt(graduationYear))}
              </h2>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {country} • Graduated {graduationYear}
              </Badge>
              {!showSkeletons && facts.length > 0 && (
                <p className="text-muted-foreground mt-2">
                  {getResultsDescription(facts, parseInt(graduationYear))}
                </p>
              )}
              {quickFunFact && (
                <div className="mt-4 max-w-2xl mx-auto">
                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-lg p-4 animate-fade-in">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-primary mb-1">Historical Fun Fact</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed break-words">
                          {quickFunFact}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Education System Problems - Collapsible */}
            {!showSkeletons && educationProblems.length > 0 && (
              <div className="mb-8">
                <Collapsible open={isEducationProblemsOpen} onOpenChange={setIsEducationProblemsOpen}>
                  <CollapsibleTrigger asChild>
                     <Button variant="outline" className="w-full justify-between p-4 md:p-6 h-auto border-2 hover:shadow-md transition-all">
                       <div className="text-left flex-1 min-w-0 pr-4">
                         <h3 className="text-lg md:text-xl font-bold leading-tight text-foreground">
                           Education System Challenges in {country} around {graduationYear}
                         </h3>
                         <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed break-words">
                           Click to see what problems affected your education system during that era
                         </p>
                       </div>
                       <ChevronDown className={`h-5 w-5 md:h-6 md:w-6 shrink-0 transition-transform duration-200 ${isEducationProblemsOpen ? 'rotate-180' : ''}`} />
                     </Button>
                   </CollapsibleTrigger>
                   <CollapsibleContent className="mt-4">
                     <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
                      {educationProblems.map((problem, index) => (
                          <Card key={index} className="border-destructive/20 bg-destructive/5">
                            <CardHeader className="pb-2 md:pb-3">
                              <CardTitle className="text-destructive text-sm md:text-base leading-tight">
                                {problem.problem}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 md:space-y-3 pt-0">
                              <p className="text-xs md:text-sm text-destructive/80 leading-relaxed break-words">
                                {problem.description}
                              </p>
                              <div className="pt-2 border-t border-destructive/20">
                                <p className="text-xs font-medium text-destructive/70 leading-relaxed break-words">
                                  <strong>Impact:</strong> {problem.impact}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
            
            <Accordion type="multiple" className="space-y-4">
              {showSkeletons ? (
                Array.from({ length: 6 }, (_, index) => (
                  <FactSkeleton key={`skeleton-${index}`} index={index} />
                ))
              ) : (
                facts
                  .sort((a, b) => {
                    const categoryOrder = [
                      'Space/Astronomy', 'Medicine', 'Technology', 'Science', 
                      'Nutrition', 'Health', 'Environment', 'Geography',
                      'Historical Science', 'Natural Philosophy', 'Ancient Natural Beliefs',
                      'Views on Specific Countries', 'International Conflicts',
                      'Colonial/Post-colonial Perspectives', 'Economic Systems',
                      'Political Systems', 'Diplomatic Relations',
                      'Historical Politics', 'Ancient Worldview'
                    ];
                    
                    const indexA = categoryOrder.indexOf(a.category);
                    const indexB = categoryOrder.indexOf(b.category);
                    
                    if (indexA === -1 && indexB === -1) return a.category.localeCompare(b.category);
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    
                    return indexA - indexB;
                  })
                  .map((fact, index) => {
                  const IconComponent = getCategoryIcon(fact.category);
                  const categoryColor = getCategoryColor(fact.category);
                  const isPolitics = fact.category === "Politics" || fact.category === "International Relations" || 
                                   fact.category === "Historical Politics" || fact.category === "Ancient Worldview";
                  
                  return (
                    <AccordionItem 
                      key={index} 
                      value={`item-${index}`}
                      className="border rounded-lg shadow-sm hover:shadow-md transition-shadow animate-fade-in"
                    >
                       <AccordionTrigger className="px-3 md:px-6 py-3 md:py-4 hover:no-underline">
                         <div className="flex flex-col gap-3 w-full text-left">
                           <div className="flex items-start gap-3">
                             <div className={`p-2 rounded-full ${isPolitics ? 'bg-red-100' : 'bg-primary/10'} shrink-0`}>
                               <IconComponent className={`h-4 w-4 md:h-5 md:w-5 ${isPolitics ? 'text-red-600' : 'text-primary'}`} />
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                 <span className="font-semibold text-sm md:text-base">{fact.category}</span>
                                 {isPolitics && (
                                   <Badge variant="destructive" className="text-xs self-start w-fit">
                                     {getFactGenerationType(parseInt(graduationYear)) === 'modern' ? 'Controversial' : 'Historical'}
                                   </Badge>
                                 )}
                               </div>
                               <div className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                                 <span className="line-clamp-2">
                                   {fact.fact.length > 100 ? `${fact.fact.substring(0, 100)}...` : fact.fact}
                                 </span>
                               </div>
                             </div>
                           </div>
                           <div className="flex justify-between items-center">
                             <Badge variant="destructive" className={`${categoryColor} text-xs`}>
                               <AlertTriangle className="w-3 h-3 mr-1" />
                               {getFactGenerationType(parseInt(graduationYear)) === 'modern' ? 'Debunked' : 'Changed'} {fact.yearDebunked}
                             </Badge>
                           </div>
                         </div>
                       </AccordionTrigger>
                      <AccordionContent className="px-4 md:px-6 pb-4 md:pb-6">
                        <div className="space-y-4">
                          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 md:p-4">
                            <h4 className="font-semibold text-destructive mb-2 flex items-start gap-2 text-sm md:text-base">
                              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>
                                {getFactGenerationType(parseInt(graduationYear)) === 'modern' 
                                  ? `What you were taught in ${graduationYear}:` 
                                  : `What people believed in ${graduationYear}:`}
                              </span>
                            </h4>
                            <p className="text-sm italic leading-relaxed break-words">
                              „{fact.fact.replace(`In ${graduationYear}, students in ${country} were taught that`, '')
                                        .replace(`In ${graduationYear}, ${country} students were taught that`, '')
                                        .replace(`In ${graduationYear}, educated people in ${country} commonly believed that`, '')
                                        .replace(`In ${graduationYear}, people in ${country} commonly believed that`, '')
                                        .replace(`In ${graduationYear}, people in ${country} believed that`, '')}"
                            </p>
                          </div>
                          
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 md:p-4">
                            <h4 className="font-semibold text-primary mb-2 flex items-start gap-2 text-sm md:text-base">
                              <BookOpen className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>What we know now:</span>
                            </h4>
                            <p className="text-sm leading-relaxed break-words">
                              {fact.correction}
                            </p>
                          </div>

                          {fact.mindBlowingFactor && (
                            <div className="bg-accent/50 border border-accent rounded-lg p-4">
                              <h4 className="font-semibold text-accent-foreground mb-2 flex items-center gap-2">
                                <Lightbulb className="w-4 h-4" />
                                Why This Matters:
                              </h4>
                              <p className="text-sm text-accent-foreground/80 break-words">
                                {fact.mindBlowingFactor}
                              </p>
                            </div>
                          )}

                          {(fact.sourceUrl || fact.sourceName) && (
                            <div className="bg-muted/50 border border-border rounded-lg p-4">
                              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                <ExternalLink className="w-4 h-4" />
                                Source:
                              </h4>
                              {fact.sourceUrl ? (
                                <a 
                                  href={fact.sourceUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  {fact.sourceName || fact.sourceUrl}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <p className="text-sm text-muted-foreground break-words">{fact.sourceName}</p>
                              )}
                            </div>
                          )}

                          <FactShare 
                            fact={fact} 
                            country={country} 
                            graduationYear={graduationYear} 
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReportFact(fact)}
                            className="flex items-center gap-2 text-muted-foreground hover:text-destructive"
                          >
                            <Flag className="h-4 w-4" />
                            Report
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })
              )}
            </Accordion>
            
            {!showSkeletons && (
              <div className="text-center mt-8">
                <Button 
                  onClick={resetForm}
                  variant="outline"
                  className="px-8"
                >
                  Analyze Another Era
                </Button>
              </div>
            )}
          </div>
        )}

        {selectedFactForReport && (
          <ReportFactDialog
            open={reportDialogOpen}
            onOpenChange={setReportDialogOpen}
            fact={selectedFactForReport}
            country={country}
            graduationYear={parseInt(graduationYear)}
          />
        )}
      </div>
    </div>
  );
};
