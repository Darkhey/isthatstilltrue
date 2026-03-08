import { Button } from "@/components/ui/button";
import { GraduationCap, Globe } from "lucide-react";

interface SchoolModeToggleProps {
  isSchoolMode: boolean;
  onToggle: (isSchoolMode: boolean) => void;
}

export const SchoolModeToggle = ({ isSchoolMode, onToggle }: SchoolModeToggleProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
        <Button
          variant={!isSchoolMode ? "default" : "outline"}
          onClick={() => onToggle(false)}
          className="flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 h-9 sm:h-10"
          size="sm"
        >
          <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Country Mode
        </Button>
        <Button
          variant={isSchoolMode ? "default" : "outline"}
          onClick={() => onToggle(true)}
          className="flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 h-9 sm:h-10"
          size="sm"
        >
          <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          School Mode
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center max-w-xs sm:max-w-md px-2">
        {isSchoolMode 
          ? "✨ Nostalgic journey: Relive your school memories with personalized research"
          : "📚 Educational facts: Discover what you learned that's now outdated"
        }
      </p>
    </div>
  );
};