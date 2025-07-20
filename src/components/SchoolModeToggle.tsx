import { Button } from "@/components/ui/button";
import { GraduationCap, Globe } from "lucide-react";

interface SchoolModeToggleProps {
  isSchoolMode: boolean;
  onToggle: (isSchoolMode: boolean) => void;
}

export const SchoolModeToggle = ({ isSchoolMode, onToggle }: SchoolModeToggleProps) => {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      <Button
        variant={!isSchoolMode ? "default" : "outline"}
        onClick={() => onToggle(false)}
        className="flex items-center gap-2"
      >
        <Globe className="h-4 w-4" />
        Country Mode
      </Button>
      <Button
        variant={isSchoolMode ? "default" : "outline"}
        onClick={() => onToggle(true)}
        className="flex items-center gap-2"
      >
        <GraduationCap className="h-4 w-4" />
        School Mode
      </Button>
    </div>
  );
};