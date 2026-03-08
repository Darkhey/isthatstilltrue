import { useState, useCallback, useEffect } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";
import { Share2, RotateCcw, Zap, CheckCircle2, XCircle, Loader2, Brain, Trophy, Sparkles } from "lucide-react";

interface QuizQuestion {
  claim: string;
  isStillTrue: boolean;
  explanation: string;
  category: string;
  mindBlown?: string;
}

type Phase = "start" | "loading" | "playing" | "reveal" | "results";

export const QuizMode = () => {
  const { lang, t } = useLanguage();
  const [phase, setPhase] = useState<Phase>("start");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(boolean | null)[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);

  const startQuiz = useCallback(async () => {
    setPhase("loading");
    setAnswers([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);

    try {
      const { data, error } = await supabase.functions.invoke("quiz-generator", {
        body: { language: lang },
      });
      if (error) throw error;
      const q = data.questions as QuizQuestion[];
      setQuestions(q);
      setAnswers(new Array(q.length).fill(null));
      setPhase("playing");
    } catch (e) {
      console.error("Quiz generation failed:", e);
      setPhase("start");
    }
  }, [lang]);

  const handleAnswer = (answer: boolean) => {
    setSelectedAnswer(answer);
    const isCorrect = answer === questions[currentIndex].isStillTrue;
    const newAnswers = [...answers];
    newAnswers[currentIndex] = isCorrect;
    setAnswers(newAnswers);
    setPhase("reveal");
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    if (currentIndex + 1 >= questions.length) {
      setPhase("results");
    } else {
      setCurrentIndex(currentIndex + 1);
      setPhase("playing");
    }
  };

  // 🎉 Confetti when score >= 8
  useEffect(() => {
    if (phase === "results" && score >= 8) {
      const duration = 2500;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#a855f7", "#ec4899", "#f59e0b"] });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#a855f7", "#ec4899", "#f59e0b"] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [phase, score]);

  const score = answers.filter(Boolean).length;
  const progress = ((currentIndex + (phase === "reveal" ? 1 : 0)) / questions.length) * 100;

  const shareResult = () => {
    const emoji = score >= 8 ? "🧠" : score >= 5 ? "📚" : "🤔";
    const text = `${emoji} I scored ${score}/${questions.length} on the "Is That Still True?" Quiz!\n\nHow much of your school knowledge is still correct?\n👉 https://isthatstilltrue.com/quiz`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const getScoreEmoji = () => {
    if (score >= 9) return "🏆";
    if (score >= 7) return "🧠";
    if (score >= 5) return "📚";
    if (score >= 3) return "🤔";
    return "😅";
  };

  const getScoreMessage = () => {
    if (score >= 9) return lang === "de" ? "Absoluter Wissensboss!" : "Absolute knowledge boss!";
    if (score >= 7) return lang === "de" ? "Sehr gut! Fast alles richtig!" : "Great! Almost perfect!";
    if (score >= 5) return lang === "de" ? "Solide! Aber da geht noch was." : "Solid! But room to improve.";
    if (score >= 3) return lang === "de" ? "Naja… Zeit für ein Update!" : "Well… time for an update!";
    return lang === "de" ? "Uff! Dein Schulwissen braucht ein Upgrade! 😂" : "Oof! Your school knowledge needs an upgrade! 😂";
  };

  // START SCREEN
  if (phase === "start") {
    return (
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-2">
          <Brain className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">{t("quizTitle")}</h2>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">{t("quizSubtitle")}</p>
        <Button onClick={startQuiz} size="lg" className="gap-2 text-lg px-8 py-6">
          <Zap className="h-5 w-5" />
          {t("quizStart")}
        </Button>
      </div>
    );
  }

  // LOADING
  if (phase === "loading") {
    return (
      <div className="text-center space-y-4 py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground text-lg">{t("quizLoading")}</p>
        <div className="flex justify-center gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // RESULTS
  if (phase === "results") {
    return (
      <div className="space-y-6 text-center">
        <div className="text-6xl mb-2">{getScoreEmoji()}</div>
        <h2 className="text-3xl font-bold text-foreground">{t("quizResult")}</h2>
        <div className="inline-flex items-baseline gap-2">
          <span className="text-6xl font-black text-primary">{score}</span>
          <span className="text-2xl text-muted-foreground">/ {questions.length}</span>
        </div>
        <p className="text-lg text-muted-foreground">{getScoreMessage()}</p>

        {/* Answers overview */}
        <div className="flex justify-center gap-2 flex-wrap max-w-xs mx-auto">
          {answers.map((correct, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                correct
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-center pt-4">
          <Button onClick={startQuiz} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {t("quizPlayAgain")}
          </Button>
          <Button onClick={shareResult} className="gap-2">
            <Share2 className="h-4 w-4" />
            {t("quizShare")}
          </Button>
        </div>
      </div>
    );
  }

  // PLAYING / REVEAL
  const q = questions[currentIndex];
  const isCorrect = selectedAnswer === q.isStillTrue;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{t("quizQuestion")} {currentIndex + 1} {t("quizOf")} {questions.length}</span>
          <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">{q.category}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="p-6 md:p-8">
        <p className="text-xl md:text-2xl font-semibold text-foreground leading-relaxed">
          „{q.claim}"
        </p>
      </Card>

      {/* Answer Buttons */}
      {phase === "playing" && (
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => handleAnswer(true)}
            variant="outline"
            className="h-16 text-lg gap-2 border-2 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 transition-all"
          >
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {t("quizTrue")}
          </Button>
          <Button
            onClick={() => handleAnswer(false)}
            variant="outline"
            className="h-16 text-lg gap-2 border-2 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
          >
            <XCircle className="h-5 w-5 text-red-600" />
            {t("quizFalse")}
          </Button>
        </div>
      )}

      {/* Reveal */}
      {phase === "reveal" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div
            className={`p-4 rounded-xl border-2 ${
              isCorrect
                ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
            }`}
          >
            <p className="text-lg font-bold mb-1">
              {isCorrect ? t("quizCorrect") : t("quizWrong")}
            </p>
            <p className="text-muted-foreground">
              {q.isStillTrue ? (lang === "de" ? "✅ Das stimmt tatsächlich noch!" : "✅ This is actually still true!") : (lang === "de" ? "❌ Das stimmt nicht mehr!" : "❌ This is no longer true!")}
            </p>
          </div>

          <Card className="p-4 bg-secondary/50">
            <p className="text-foreground">{q.explanation}</p>
            {q.mindBlown && (
              <p className="mt-2 text-sm text-primary flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> {q.mindBlown}
              </p>
            )}
          </Card>

          <Button onClick={nextQuestion} className="w-full gap-2" size="lg">
            {currentIndex + 1 >= questions.length ? (
              <>
                <Trophy className="h-4 w-4" />
                {t("quizResult")}
              </>
            ) : (
              t("quizNext")
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
