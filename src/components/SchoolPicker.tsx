import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SchoolPickerProps {
  schoolName: string;
  city: string;
  schoolType: string;
  country: string;
  language: string;
  onSchoolNameChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onSchoolTypeChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
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

const languages = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "it", label: "Italiano" },
  { value: "nl", label: "Nederlands" }
];

export const SchoolPicker = ({ 
  schoolName, 
  city, 
  schoolType,
  country,
  language,
  onSchoolNameChange, 
  onCityChange, 
  onSchoolTypeChange,
  onCountryChange,
  onLanguageChange
}: SchoolPickerProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select value={country} onValueChange={onCountryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select country..." />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select language..." />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="school-name">School Name</Label>
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
          <SelectContent>
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