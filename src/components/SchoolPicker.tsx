import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SchoolPickerProps {
  schoolName: string;
  city: string;
  schoolType: string;
  onSchoolNameChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onSchoolTypeChange: (value: string) => void;
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

export const SchoolPicker = ({ 
  schoolName, 
  city, 
  schoolType, 
  onSchoolNameChange, 
  onCityChange, 
  onSchoolTypeChange 
}: SchoolPickerProps) => {
  return (
    <div className="space-y-4">
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