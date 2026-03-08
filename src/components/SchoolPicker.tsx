import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle, Loader2 } from "lucide-react";

interface SchoolPickerProps {
  schoolName: string;
  city: string;
  schoolType: string;
  country: string;
  onSchoolNameChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onSchoolTypeChange: (value: string) => void;
  onCountryChange: (value: string) => void;
}

interface WikipediaSuggestion {
  title: string;
  description: string;
  url: string;
}

const schoolTypes = [
  { value: "high-school", label: "High School" },
  { value: "university", label: "University" },
  { value: "college", label: "College" },
  { value: "gymnasium", label: "Gymnasium" },
  { value: "realschule", label: "Realschule" },
  { value: "hauptschule", label: "Hauptschule" },
  { value: "comprehensive", label: "Comprehensive School" },
  { value: "grammar", label: "Grammar School" },
  { value: "technical", label: "Technical School" },
  { value: "vocational", label: "Vocational School" },
  { value: "other", label: "Other" }
];

const countries = [
  { value: "Germany", label: "🇩🇪 Germany" },
  { value: "USA", label: "🇺🇸 United States" },
  { value: "United Kingdom", label: "🇬🇧 United Kingdom" },
  { value: "France", label: "🇫🇷 France" },
  { value: "Spain", label: "🇪🇸 Spain" },
  { value: "Italy", label: "🇮🇹 Italy" },
  { value: "Netherlands", label: "🇳🇱 Netherlands" },
  { value: "Austria", label: "🇦🇹 Austria" },
  { value: "Switzerland", label: "🇨🇭 Switzerland" },
  { value: "Canada", label: "🇨🇦 Canada" },
  { value: "Australia", label: "🇦🇺 Australia" },
  { value: "Sweden", label: "🇸🇪 Sweden" },
  { value: "Other", label: "🌍 Other" }
];

async function searchWikipediaSchools(query: string, lang = 'en'): Promise<WikipediaSuggestion[]> {
  if (query.length < 3) return [];
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + ' school')}&srlimit=5&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.query?.search || []).map((r: any) => ({
      title: r.title,
      description: r.snippet.replace(/<[^>]*>/g, ''),
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`,
    }));
  } catch {
    return [];
  }
}

export const SchoolPicker = ({
  schoolName,
  city,
  schoolType,
  country,
  onSchoolNameChange,
  onCityChange,
  onSchoolTypeChange,
  onCountryChange
}: SchoolPickerProps) => {
  const [suggestions, setSuggestions] = useState<WikipediaSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [verified, setVerified] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const langMap: Record<string, string> = {
    'Germany': 'de', 'Austria': 'de', 'Switzerland': 'de',
    'France': 'fr', 'Spain': 'es', 'Italy': 'it', 'Netherlands': 'nl',
  };

  const handleSchoolSearch = useCallback((value: string) => {
    onSchoolNameChange(value);
    setVerified(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const lang = langMap[country] || 'en';
      const searchQuery = city ? `${value} ${city}` : value;
      const results = await searchWikipediaSchools(searchQuery, lang);
      // Also search in English if not already
      if (lang !== 'en') {
        const enResults = await searchWikipediaSchools(searchQuery, 'en');
        const combined = [...results, ...enResults].filter(
          (r, i, arr) => arr.findIndex(a => a.title === r.title) === i
        ).slice(0, 6);
        setSuggestions(combined);
      } else {
        setSuggestions(results);
      }
      setIsSearching(false);
      setShowSuggestions(true);
    }, 400);
  }, [city, country, onSchoolNameChange]);

  const selectSuggestion = (suggestion: WikipediaSuggestion) => {
    onSchoolNameChange(suggestion.title);
    setVerified(true);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Select value={country} onValueChange={onCountryChange}>
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

      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          placeholder="Enter city/region..."
          className="w-full"
        />
      </div>

      <div className="space-y-2 relative" ref={containerRef}>
        <Label htmlFor="school-name" className="flex items-center gap-2">
          School Name
          {verified && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" /> Wikipedia verified
            </span>
          )}
        </Label>
        <div className="relative">
          <Input
            id="school-name"
            value={schoolName}
            onChange={(e) => handleSchoolSearch(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Start typing to search..."
            className="w-full pr-8"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0"
                onClick={() => selectSuggestion(s)}
              >
                <div className="font-medium text-sm">{s.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{s.description}</div>
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Tip: Enter city first for better results. You can also type a custom name.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="school-type">School Type</Label>
        <Select value={schoolType} onValueChange={onSchoolTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select school type..." />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto bg-background border shadow-lg z-50">
            {schoolTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
