import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";
import { Loader2, Trophy, Medal, Award } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  nickname: string;
  score: number;
  total_questions: number;
  created_at: string;
}

interface QuizLeaderboardProps {
  score: number;
  totalQuestions: number;
}

export const QuizLeaderboard = ({ score, totalQuestions }: QuizLeaderboardProps) => {
  const { lang, t } = useLanguage();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [nickname, setNickname] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const loadLeaderboard = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quiz_scores")
      .select("id, nickname, score, total_questions, created_at")
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10);
    if (!error && data) setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const submitScore = async () => {
    setSubmitting(true);
    const trimmed = nickname.trim().slice(0, 30);
    const { data, error } = await supabase
      .from("quiz_scores")
      .insert({
        nickname: trimmed || t("anonymousPlayer"),
        score,
        total_questions: totalQuestions,
        language: lang,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (!error) {
      setSubmitted(true);
      if (data?.id) setSubmittedId(data.id);
      await loadLeaderboard();
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="h-4 w-4 text-primary" />;
    if (rank === 1) return <Medal className="h-4 w-4 text-muted-foreground" />;
    if (rank === 2) return <Award className="h-4 w-4 text-accent-foreground" />;
    return <span className="text-xs font-bold text-muted-foreground w-4 text-center">{rank + 1}</span>;
  };

  return (
    <Card className="p-5 mt-4 text-left space-y-4">
      <h3 className="text-lg font-bold text-foreground text-center">{t("leaderboardTitle")}</h3>

      {/* Submit form */}
      {!submitted && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t("nicknamePlaceholder")}
            maxLength={30}
            disabled={submitting}
            className="flex-1"
          />
          <Button onClick={submitScore} disabled={submitting} className="gap-2">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("submittingScore")}
              </>
            ) : (
              t("submitScore")
            )}
          </Button>
        </div>
      )}
      {submitted && (
        <div className="text-sm text-center text-primary font-semibold">
          ✅ {t("scoreSubmitted")}
        </div>
      )}

      {/* Leaderboard list */}
      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t("leaderboardLoading")}</span>
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">{t("leaderboardEmpty")}</p>
      ) : (
        <ol className="space-y-1.5">
          {entries.map((entry, i) => {
            const isYou = submittedId === entry.id;
            return (
              <li
                key={entry.id}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isYou
                    ? "bg-primary/10 border border-primary/30 font-semibold"
                    : "bg-secondary/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center justify-center w-6">
                    {getRankIcon(i)}
                  </div>
                  <span className="truncate text-foreground">
                    {entry.nickname}
                    {isYou && <span className="ml-2 text-xs text-primary">({t("leaderboardYourRank")})</span>}
                  </span>
                </div>
                <span className="font-bold text-foreground tabular-nums shrink-0">
                  {entry.score}/{entry.total_questions}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
};
