import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { SingleFactChecker } from "./SingleFactChecker";

export const Navigation = () => {
  const [isFactCheckerOpen, setIsFactCheckerOpen] = useState(false);

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="font-bold text-lg">FactsDebunker</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Dialog open={isFactCheckerOpen} onOpenChange={setIsFactCheckerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Search className="h-4 w-4" />
                Quick Fact Check
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Quick Fact Checker</DialogTitle>
              </DialogHeader>
              <SingleFactChecker />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </nav>
  );
};