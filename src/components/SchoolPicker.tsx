import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
  { value: "germany", label: "🇩🇪 Germany" },
  { value: "usa", label: "🇺🇸 United States" },
  { value: "uk", label: "🇬🇧 United Kingdom" },
  { value: "france", label: "🇫🇷 France" },
  { value: "spain", label: "🇪🇸 Spain" },
  { value: "italy", label: "🇮🇹 Italy" },
  { value: "netherlands", label: "🇳🇱 Netherlands" },
  { value: "austria", label: "🇦🇹 Austria" },
  { value: "switzerland", label: "🇨🇭 Switzerland" },
  { value: "other", label: "🌍 Other" }
];

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
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{name: string, city: string, type: string}>>([]);

  // Generate suggestions based on search query (could be enhanced with real API)
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    // Simulate school search suggestions - in production, this could call a real API
    const mockSuggestions = [
      { name: "Gymnasium Musterstadt", city: "Berlin", type: "gymnasium" },
      { name: "Albert Einstein Gymnasium", city: "München", type: "gymnasium" },
      { name: "Realschule am Park", city: "Hamburg", type: "realschule" },
      { name: "Hauptschule Nord", city: "Köln", type: "hauptschule" },
      { name: "International School", city: "Frankfurt", type: "other" },
    ].filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setSuggestions(mockSuggestions);
  }, [searchQuery]);

  const handleSelectSuggestion = (suggestion: {name: string, city: string, type: string}) => {
    onSchoolNameChange(suggestion.name);
    onCityChange(suggestion.city);
    onSchoolTypeChange(suggestion.type);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Select value={country} onValueChange={onCountryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select country..." />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto bg-background border shadow-lg z-50">
            {countries.map((country) => (
              <SelectItem key={country.value} value={country.value}>
                {country.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="school-search">School Search</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              {schoolName || "Search for your school..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Type school name or city..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No schools found. Enter manually below.</CommandEmpty>
                <CommandGroup>
                  {suggestions.map((suggestion, idx) => (
                    <CommandItem
                      key={idx}
                      value={suggestion.name}
                      onSelect={() => handleSelectSuggestion(suggestion)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          schoolName === suggestion.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{suggestion.name}</span>
                        <span className="text-sm text-muted-foreground">{suggestion.city}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="school-name">School Name (or enter manually)</Label>
        <Input
          id="school-name"
          value={schoolName}
          onChange={(e) => onSchoolNameChange(e.target.value)}
          placeholder="Enter your school name..."
          className="w-full"
        />
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