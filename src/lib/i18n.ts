export type Lang = "de" | "en";

export const translations = {
  de: {
    heroQuestion: "Stimmt das eigentlich noch?",
    askBot: "Frag den Bot",
    gotQuestion: "Hast du eine Frage zu Schulfakten?",
    gotQuestionSub: "Frag unseren KI Fact-Checker Bot, ob das was du gelernt hast noch stimmt!",
    quiz: "Quiz",
    quizTitle: "Stimmt das noch? Quiz",
    quizSubtitle: "10 Fakten aus der Schule – weißt du, welche noch stimmen?",
    quizStart: "Quiz starten",
    quizLoading: "Fragen werden generiert…",
    quizTrue: "Stimmt noch!",
    quizFalse: "Stimmt nicht mehr!",
    quizNext: "Nächste Frage",
    quizResult: "Dein Ergebnis",
    quizScore: "richtig",
    quizPlayAgain: "Nochmal spielen",
    quizShare: "Ergebnis teilen",
    quizQuestion: "Frage",
    quizOf: "von",
    quizCorrect: "Richtig! 🎉",
    quizWrong: "Falsch! 😮",
    about: "Über uns",
    howItWorks: "Wie funktioniert's",
    privacy: "Datenschutz",
    terms: "Nutzungsbedingungen",
    imprint: "Impressum",
    factCheckerBot: "🤓 Fact-Checker Bot",
    quickFactCheck: "Quick Fact Check",
    supportUs: "Unterstütze uns:",
    donate: "Spenden",
    regenerateFacts: "🎲 Andere Fakten zeigen",
    regenerating: "Generiere neue Fakten…",
    whyItMatters: "💡 Warum das heute noch zählt",
    heroSubtitle: "Wähle dein Land und Abschlussjahr – wir zeigen dir, was deine Schule falsch erzählt hat.",
    copyFact: "Kopieren",
    copied: "Kopiert!",
    copiedDesc: "Der Fakt wurde in die Zwischenablage kopiert.",
    copyFailed: "Kopieren fehlgeschlagen",
    factSource: "Quelle",
    factTaughtIn: "Was gelehrt wurde in",
    factWeKnowNow: "Was wir heute wissen",
    filterAll: "Alle",
    filterBy: "Filter:",
    leaderboardTitle: "🏆 Top 10 Bestenliste",
    leaderboardEmpty: "Sei der/die Erste auf der Bestenliste!",
    leaderboardLoading: "Lade Bestenliste…",
    leaderboardYourRank: "Dein Platz",
    submitScore: "Auf die Bestenliste eintragen",
    submittingScore: "Wird gespeichert…",
    scoreSubmitted: "Eingetragen!",
    nicknamePlaceholder: "Dein Nickname (optional)",
    anonymousPlayer: "Anonym",
    copyright: "© 2024 Klexgetier - Maximilian Leistner. Alle Rechte vorbehalten.",
  },
  en: {
    heroQuestion: "Is that actually still true?",
    askBot: "Ask the Bot",
    gotQuestion: "Got a question about school facts?",
    gotQuestionSub: "Ask our AI Fact-Checker Bot if what you learned is still true!",
    quiz: "Quiz",
    quizTitle: "Is That Still True? Quiz",
    quizSubtitle: "10 school facts – do you know which ones are still true?",
    quizStart: "Start Quiz",
    quizLoading: "Generating questions…",
    quizTrue: "Still true!",
    quizFalse: "Not true anymore!",
    quizNext: "Next question",
    quizResult: "Your Result",
    quizScore: "correct",
    quizPlayAgain: "Play again",
    quizShare: "Share result",
    quizQuestion: "Question",
    quizOf: "of",
    quizCorrect: "Correct! 🎉",
    quizWrong: "Wrong! 😮",
    about: "About",
    howItWorks: "How It Works",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    imprint: "Imprint",
    factCheckerBot: "🤓 Fact-Checker Bot",
    quickFactCheck: "Quick Fact Check",
    supportUs: "Support us:",
    donate: "Donate",
    regenerateFacts: "🎲 Show me different facts",
    regenerating: "Generating fresh facts…",
    whyItMatters: "💡 Why this still matters",
    heroSubtitle: "Pick your country and graduation year — we'll show you what your school got wrong.",
    copyFact: "Copy",
    copied: "Copied!",
    copiedDesc: "The fact has been copied to your clipboard.",
    copyFailed: "Copy failed",
    factSource: "Source",
    factTaughtIn: "Taught in",
    factWeKnowNow: "What we know now",
    filterAll: "All",
    filterBy: "Filter:",
    copyright: "© 2024 Klexgetier - Maximilian Leistner. All rights reserved.",
  },
} as const;

export type TranslationKey = keyof typeof translations.de;

// Simple global language state
let currentLang: Lang = (typeof window !== "undefined" && localStorage.getItem("lang") as Lang) || "en";
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang) {
  currentLang = lang;
  if (typeof window !== "undefined") localStorage.setItem("lang", lang);
  listeners.forEach((fn) => fn());
}

export function t(key: TranslationKey): string {
  return translations[currentLang][key] || translations.en[key] || key;
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
