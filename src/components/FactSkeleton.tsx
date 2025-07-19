import { Skeleton } from "@/components/ui/skeleton";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { BookOpen } from "lucide-react";

interface FactSkeletonProps {
  index: number;
}

export const FactSkeleton = ({ index }: FactSkeletonProps) => {
  return (
    <AccordionItem 
      value={`skeleton-${index}`}
      className="border rounded-lg shadow-sm animate-pulse"
    >
      <AccordionTrigger className="px-6 py-4 hover:no-underline cursor-default" disabled>
        <div className="flex items-center gap-4 w-full">
          <BookOpen className="h-6 w-6 text-muted-foreground" />
          <div className="flex-1 text-left space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-6 w-16 ml-auto rounded-full" />
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-6">
        <div className="space-y-4">
          <div className="bg-muted/20 border rounded-lg p-4">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </div>
          
          <div className="bg-muted/20 border rounded-lg p-4">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6 mt-1" />
            <Skeleton className="h-4 w-2/3 mt-1" />
          </div>

          <div className="bg-muted/20 border rounded-lg p-4">
            <Skeleton className="h-5 w-44 mb-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5 mt-1" />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};