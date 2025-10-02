import { useState, useRef } from "react";
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
import { CityImagesGallery } from "./CityImagesGallery";
import { HistoricalSourcesCard } from "./HistoricalSourcesCard";
import { SchoolPhotoGallery } from "./SchoolPhotoGallery";

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
  }>;
  nostalgiaFactors: Array<{
    memory: string;
    shareableText: string;
  }>;
  localContext: Array<{
    event: string;
    relevance: string;
  }>;
  shareableQuotes: string[];
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

// Sims-style loading messages for school research
const simsLoadingMessages = [
  "Reticulating splines...",
  "Calibrating blue nexus...", 
  "Gathering historical data...",
  "Consulting the school archives...",
  "Loading nostalgia coefficient...",
  "Extracting memory fragments...",
  "Analyzing educational wavelengths...",
  "Compiling classroom chronicles...",
  "Downloading graduation vibes...",
  "Processing time capsule data...",
  "Reconstructing cafeteria mysteries...",
  "Decoding yearbook algorithms...",
  "Synchronizing with the education matrix...",
  "Fetching forgotten homework memories...",
  "Loading teacher's pet protocols...",
  "Calculating detention probability...",
  "Accessing hall pass database...",
  "Retrieving locker combination magic...",
  "Scanning school spirit frequencies...",
  "Initializing friendship subroutines...",
  "Loading teenage drama protocols...",
  "Compiling test anxiety data...",
  "Processing sports day algorithms...",
  "Extracting school trip coordinates...",
  "Analyzing lunch break patterns..."
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
  
  const messages = {
    ancient: [
      "Respect! You've chosen a fascinating historical era 🏛️",
      "Ancient times - when the world was so different! ⏰",
      "You're exploring deep history! 📚",
      "Medieval worldviews incoming! 🕰️"
    ],
    vintage: [
      "Historical era - what a different world! 📻",
      "Back when everything was changing 🎭",
      "You've picked an interesting century! 🎓",
      "Classic historical period! 🕰️"
    ],
    retro: [
      "Retro times! 📼",
      "When life was so different 📺",
      "Classic era, nice choice! 🎸",
      "You remember when... 💭"
    ],
    nineties: [
      "90s kid! Peak nostalgia 📱",
      "Dial-up internet survivor 💻",
      "When MTV still played music 🎵",
      "You had a Nokia brick phone 📞"
    ],
    earlyTwoThousands: [
      "Y2K survivor! 💾",
      "MySpace era graduate 🌐",
      "iPod generation 🎧",
      "When flip phones were cool 📱"
    ],
    recession: [
      "2008 recession graduate... tough times! 📉",
      "You graduated into chaos, respect 💪",
      "Financial crisis couldn't stop you! 🚀",
      "Economy was rough but you made it 🎯"
    ],
    modern: [
      "You probably still can't afford a house 🏠",
      "Student loans are forever, right? 💸",
      "Graduated into the gig economy 📱",
      "Adulting is harder than expected 😅"
    ],
    pandemic: [
      "Zoom graduation, been there! 💻",
      "Masks and hand sanitizer era 😷",
      "You graduated during apocalypse mode 🦠",
      "Remote everything graduate! 🏠"
    ],
    fresh: [
      "Fresh grad! Job market is... interesting 📊",
      "Entry level: 5+ years experience required 😂",
      "You need 10 years experience for your first job 💼",
      "Welcome to inflation nation! 💰"
    ]
  };

  let categoryMessages;
  if (yearNum <= 1500) {
    categoryMessages = messages.ancient;
  } else if (yearNum <= 1700) {
    categoryMessages = messages.vintage;
  } else if (yearNum <= 1850) {
    categoryMessages = messages.retro;
  } else if (yearNum <= 1950) {
    categoryMessages = messages.retro;
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
  const [country, setCountry] = useState("germany");
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
  const [schoolImages, setSchoolImages] = useState<any[]>([]);
  const [cityImages, setCityImages] = useState<any[]>([]);
  const [historicalSources, setHistoricalSources] = useState<any[]>([]);
  const [loadingMessage, setLoadingMessage] = useState<string>("Researching...");
  const [language, setLanguage] = useState<'en' | 'de'>('en');
  const [processingStage, setProcessingStage] = useState<string>('initialization');
  const [useEnhancedAPI, setUseEnhancedAPI] = useState(true);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);
  const [cacheInfo, setCacheInfo] = useState<any>(null);

  const factsResultsRef = useRef<HTMLDivElement>(null);

  // Function to get random Sims loading message
  const getRandomLoadingMessage = () => {
    return simsLoadingMessages[Math.floor(Math.random() * simsLoadingMessages.length)];
  };

  // Update loading message every 2 seconds during research
  const startLoadingMessageRotation = () => {
    const interval = setInterval(() => {
      if (isLoading) {
        setLoadingMessage(getRandomLoadingMessage());
      }
    }, 2000);
    return interval;
  };

  const handleNextStep = () => {
    if (isSchoolMode) {
      if (!schoolName || !city || !schoolType) {
        setError("Please fill in all school information.");
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
    
    const messageInterval = startLoadingMessageRotation();
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
        if (data.historicalHeadlines) {
          setHistoricalHeadlines(data.historicalHeadlines);
        }
        // Set school images from research results if available
        if (data.researchResults?.schoolImages?.length > 0) {
          setSchoolImages(data.researchResults.schoolImages);
          setSchoolImage(data.researchResults.schoolImages[0].url);
        }
        // Set city images from research results if available
        if (data.researchResults?.cityImages?.length > 0) {
          setCityImages(data.researchResults.cityImages);
        }
        // Set historical sources from research results if available
        if (data.researchResults?.historicalSources?.length > 0) {
          setHistoricalSources(data.researchResults.historicalSources);
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
      clearInterval(messageInterval);
      setIsLoading(false);
      setShowSkeletons(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setIsSchoolMode(false);
    setCountry("");
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
  };

  const handleReportFact = (fact: OutdatedFact) => {
    setSelectedFactForReport(fact);
    setReportDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-8 md:mb-12">
          <AnimatedHeadline />
          <p className="text-base md:text-xl text-muted-foreground max-w-3xl mx-auto px-4 mt-4">
            {isSchoolMode 
              ? "Discover personalized memories and events from your specific school and graduation year."
              : "Discover what you learned in school that has since been proven wrong. Find out how knowledge has evolved since you graduated."
            }
          </p>
        </div>

        <SchoolModeToggle isSchoolMode={isSchoolMode} onToggle={setIsSchoolMode} />

        <Card className="max-w-lg mx-auto mb-8 shadow-glow">{/*Increased width for better responsive display*/}
          {step === 1 ? (
            <>
              <CardHeader>
                <CardTitle className="text-center">
                  {isSchoolMode ? "Step 1: Enter School Information" : "Step 1: Select Country"}
                </CardTitle>
                <CardDescription className="text-center">
                  {isSchoolMode 
                    ? "Enter your school details for personalized memories" 
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
                  <div className="flex items-start gap-2 text-green-700 text-sm bg-green-50 p-3 rounded-md border border-green-200">
                    <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="break-words">{successMessage}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={resetForm}
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
            {/* School Photo Gallery - PROMINENT AT TOP */}
            {schoolImages.length > 0 && (
              <SchoolPhotoGallery
                schoolName={schoolName}
                photos={schoolImages}
              />
            )}
            
            <SchoolMemoryCard 
              schoolName={schoolName}
              city={city}
              graduationYear={parseInt(graduationYear)}
              memoryData={schoolMemories}
              shareableText={schoolShareableContent?.mainShare}
              schoolImage={schoolImage || undefined}
            />
            
            {/* City Images Gallery */}
            {cityImages.length > 0 && (
              <CityImagesGallery
                city={city}
                year={parseInt(graduationYear)}
                images={cityImages}
              />
            )}
            
            {/* Historical Sources */}
            {historicalSources.length > 0 && (
              <HistoricalSourcesCard
                sources={historicalSources}
                year={parseInt(graduationYear)}
              />
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
          <div ref={factsResultsRef} className="max-w-4xl mx-auto">
            <Card className="animate-fade-in overflow-hidden">
              <div className="relative h-80 bg-gradient-to-br from-primary/80 via-primary-glow/60 to-primary/90">
                {schoolImages.length > 0 && (
                  <img 
                    src={schoolImages[0].url} 
                    alt="School building"
                    className="w-full h-full object-cover opacity-40 absolute inset-0"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                <div className="relative h-full flex items-center justify-center">
                  <div className="text-center space-y-6 p-8 max-w-2xl">
                    <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-t-4 border-primary mx-auto"></div>
                    <div className="space-y-4">
                      <h3 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                        Intensive Recherche läuft...
                      </h3>
                      <p className="text-xl font-medium text-foreground/90 animate-pulse">
                        {loadingMessage}
                      </p>
                      <div className="space-y-2 mt-6">
                        <p className="text-foreground/90 font-medium">
                          🔍 Sammle Schulfotos und historische Quellen
                        </p>
                        <p className="text-foreground/90 font-medium">
                          📰 Durchsuche Zeitungsarchive und lokale Berichte
                        </p>
                        <p className="text-foreground/90 font-medium">
                          🏫 Recherchiere Schulevents mit verifizierten Quellen
                        </p>
                        <p className="text-foreground/90 font-medium">
                          ✨ Erstelle nostalgische Erinnerungen
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-6 bg-background/80 rounded-lg p-3">
                        ⏱️ Dies kann 20-40 Sekunden dauern für akkurate Ergebnisse mit verifizierten Quellen
                      </p>
                    </div>
                    <div className="flex justify-center gap-3 mt-8">
                      <div className="h-4 w-4 bg-primary rounded-full animate-bounce"></div>
                      <div className="h-4 w-4 bg-primary rounded-full animate-bounce delay-100"></div>
                      <div className="h-4 w-4 bg-primary rounded-full animate-bounce delay-200"></div>
                    </div>
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
                         <Card key={index} className="border-orange-200 bg-orange-50/50">
                           <CardHeader className="pb-2 md:pb-3">
                             <CardTitle className="text-orange-800 text-sm md:text-base leading-tight">
                               {problem.problem}
                             </CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-2 md:space-y-3 pt-0">
                             <p className="text-xs md:text-sm text-orange-700 leading-relaxed break-words">
                               {problem.description}
                             </p>
                             <div className="pt-2 border-t border-orange-200">
                               <p className="text-xs font-medium text-orange-600 leading-relaxed break-words">
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
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                              <h4 className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                                <Lightbulb className="w-4 h-4" />
                                Why This Matters:
                              </h4>
                              <p className="text-sm text-amber-800 break-words">
                                {fact.mindBlowingFactor}
                              </p>
                            </div>
                          )}

                          {(fact.sourceUrl || fact.sourceName) && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                              <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
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
                                <p className="text-sm text-slate-600 break-words">{fact.sourceName}</p>
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
