import { useState, useEffect, useSyncExternalStore } from "react";
import { getLang, setLang, subscribe, t, type Lang, type TranslationKey } from "@/lib/i18n";

export function useLanguage() {
  const lang = useSyncExternalStore(subscribe, getLang, getLang);
  return { lang, setLang, t };
}
