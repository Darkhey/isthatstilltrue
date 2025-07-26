import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Clock, AlertTriangle, Wifi, Database, Brain, Shield } from 'lucide-react';

interface ProcessingStage {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  estimatedDuration: number; // in seconds
}

interface EnhancedProgressTrackerProps {
  isLoading: boolean;
  stage?: string;
  onRetry?: () => void;
  showRetryOption?: boolean;
  estimatedTimeRemaining?: number;
  language?: 'en' | 'de';
}

const processingStages: ProcessingStage[] = [
  {
    id: 'initialization',
    name: 'Initialization',
    description: 'Setting up research parameters...',
    icon: Clock,
    estimatedDuration: 2
  },
  {
    id: 'cache_check',
    name: 'Cache Check',
    description: 'Checking for existing research...',
    icon: Database,
    estimatedDuration: 3
  },
  {
    id: 'wikipedia_rag',
    name: 'Knowledge Retrieval',
    description: 'Gathering reliable source context...',
    icon: Wifi,
    estimatedDuration: 8
  },
  {
    id: 'fact_generation',
    name: 'Fact Generation',
    description: 'AI analyzing educational misconceptions...',
    icon: Brain,
    estimatedDuration: 15
  },
  {
    id: 'fact_processing',
    name: 'Processing Facts',
    description: 'Filtering and organizing results...',
    icon: CheckCircle,
    estimatedDuration: 5
  },
  {
    id: 'fact_validation',
    name: 'Fact Validation',
    description: 'Verifying against reliable sources...',
    icon: Shield,
    estimatedDuration: 10
  },
  {
    id: 'duplicate_removal',
    name: 'Deduplication',
    description: 'Removing duplicate findings...',
    icon: CheckCircle,
    estimatedDuration: 3
  },
  {
    id: 'caching',
    name: 'Finalizing',
    description: 'Caching results for future use...',
    icon: Database,
    estimatedDuration: 2
  }
];

const germanTranslations = {
  'Initialization': 'Initialisierung',
  'Cache Check': 'Cache-Prüfung',
  'Knowledge Retrieval': 'Wissensbeschaffung',
  'Fact Generation': 'Faktengenerierung',
  'Processing Facts': 'Faktenverarbeitung',
  'Fact Validation': 'Faktenvalidierung',
  'Deduplication': 'Duplikatentfernung',
  'Finalizing': 'Finalisierung',
  'Setting up research parameters...': 'Forschungsparameter einrichten...',
  'Checking for existing research...': 'Prüfung auf vorhandene Forschung...',
  'Gathering reliable source context...': 'Sammlung zuverlässiger Quellenkontexte...',
  'AI analyzing educational misconceptions...': 'KI analysiert Bildungsmissverständnisse...',
  'Filtering and organizing results...': 'Ergebnisse filtern und organisieren...',
  'Verifying against reliable sources...': 'Überprüfung gegen zuverlässige Quellen...',
  'Removing duplicate findings...': 'Entfernung doppelter Befunde...',
  'Caching results for future use...': 'Ergebnisse für zukünftige Verwendung zwischenspeichern...',
  'Processing Time': 'Verarbeitungszeit',
  'Estimated Time Remaining': 'Geschätzte Restzeit',
  'Current Stage': 'Aktuelle Phase',
  'Taking longer than expected?': 'Dauert länger als erwartet?',
  'Retry': 'Wiederholen',
  'Quality Enhancement': 'Qualitätsverbesserung',
  'Enhanced fact-checking with Wikipedia validation': 'Erweiterte Faktenprüfung mit Wikipedia-Validierung'
};

export const EnhancedProgressTracker = ({
  isLoading,
  stage = 'initialization',
  onRetry,
  showRetryOption = false,
  estimatedTimeRemaining,
  language = 'en'
}: EnhancedProgressTrackerProps) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [animationProgress, setAnimationProgress] = useState(0);

  const translate = (text: string): string => {
    if (language === 'de' && germanTranslations[text as keyof typeof germanTranslations]) {
      return germanTranslations[text as keyof typeof germanTranslations];
    }
    return text;
  };

  useEffect(() => {
    if (!isLoading) {
      setElapsedTime(0);
      setAnimationProgress(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading]);

  useEffect(() => {
    const stageIndex = processingStages.findIndex(s => s.id === stage);
    if (stageIndex !== -1) {
      setCurrentStageIndex(stageIndex);
    }
  }, [stage]);

  useEffect(() => {
    if (!isLoading) return;

    const timer = setInterval(() => {
      setAnimationProgress(prev => {
        const currentStage = processingStages[currentStageIndex];
        const progressIncrement = 100 / (currentStage?.estimatedDuration || 10);
        return Math.min(prev + progressIncrement, 95);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading, currentStageIndex]);

  // Reset progress when stage changes
  useEffect(() => {
    setAnimationProgress(0);
  }, [currentStageIndex]);

  if (!isLoading) return null;

  const currentStage = processingStages[currentStageIndex];
  const overallProgress = ((currentStageIndex / processingStages.length) * 100) + 
                         ((animationProgress / processingStages.length));

  const isStageCompleted = (index: number) => index < currentStageIndex;
  const isCurrentStage = (index: number) => index === currentStageIndex;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6 space-y-6">
        {/* Enhanced Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <h3 className="text-lg font-semibold">{translate('Quality Enhancement')}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {translate('Enhanced fact-checking with Wikipedia validation')}
          </p>
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{translate('Current Stage')}: {translate(currentStage?.name || '')}</span>
            <Badge variant="outline">{Math.round(overallProgress)}%</Badge>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Stage Details */}
        <div className="space-y-3">
          {processingStages.map((stageItem, index) => {
            const StageIcon = stageItem.icon;
            return (
              <div 
                key={stageItem.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isCurrentStage(index) 
                    ? 'bg-primary/10 border border-primary/20' 
                    : isStageCompleted(index)
                    ? 'bg-green-50 dark:bg-green-950/20'
                    : 'bg-muted/30'
                }`}
              >
                <StageIcon 
                  className={`h-4 w-4 ${
                    isStageCompleted(index) 
                      ? 'text-green-600' 
                      : isCurrentStage(index)
                      ? 'text-primary animate-pulse'
                      : 'text-muted-foreground'
                  }`} 
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{translate(stageItem.name)}</div>
                  <div className="text-xs text-muted-foreground">
                    {translate(stageItem.description)}
                  </div>
                </div>
                {isStageCompleted(index) && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                {isCurrentStage(index) && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
              </div>
            );
          })}
        </div>

        {/* Time Information */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{translate('Processing Time')}</div>
            <div className="font-mono text-sm">{formatTime(elapsedTime)}</div>
          </div>
          {estimatedTimeRemaining && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{translate('Estimated Time Remaining')}</div>
              <div className="font-mono text-sm">{formatTime(estimatedTimeRemaining)}</div>
            </div>
          )}
        </div>

        {/* Stage Progress for Current Step */}
        {currentStage && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {translate(currentStage.description)}
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round(animationProgress)}%
              </span>
            </div>
            <Progress value={animationProgress} className="h-1" />
          </div>
        )}

        {/* Retry Option */}
        {showRetryOption && elapsedTime > 30 && (
          <div className="text-center space-y-3 pt-4 border-t">
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{translate('Taking longer than expected?')}</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 text-sm bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg transition-colors"
              >
                {translate('Retry')}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};