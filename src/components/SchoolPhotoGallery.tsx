import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, ExternalLink, Download } from "lucide-react";
import { useState } from "react";

interface SchoolPhoto {
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
  source_type?: string;
}

interface SchoolPhotoGalleryProps {
  schoolName: string;
  photos: SchoolPhoto[];
}

export const SchoolPhotoGallery = ({ schoolName, photos }: SchoolPhotoGalleryProps) => {
  const [selectedPhoto, setSelectedPhoto] = useState<SchoolPhoto | null>(null);

  if (!photos || photos.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-background">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {schoolName} - Photo Gallery
          </CardTitle>
          <CardDescription>
            Historical and current photos of your school ({photos.length} photos found)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div
                key={index}
                className="group relative aspect-square overflow-hidden rounded-lg border-2 border-border hover:border-primary transition-all duration-200 cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.thumbnail || photo.url}
                  alt={photo.description || photo.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = `https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=400&fit=crop&auto=format&q=80`;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs font-medium line-clamp-2">
                      {photo.title}
                    </p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Full Size
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-start gap-3">
              <Camera className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">About these photos:</p>
                <p>
                  These images were found through comprehensive web search and may include 
                  historical photos, current building views, and archived school materials. 
                  Click any photo to view the full-size version and original source.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full-size photo modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 backdrop-blur-sm transition-colors z-10"
            >
              ✕
            </button>
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.description || selectedPhoto.title}
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                e.currentTarget.src = `https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=800&fit=crop&auto=format&q=80`;
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
              <h3 className="text-white font-semibold text-lg mb-2">
                {selectedPhoto.title}
              </h3>
              {selectedPhoto.description && (
                <p className="text-white/80 text-sm mb-3">
                  {selectedPhoto.description}
                </p>
              )}
              <div className="flex gap-2">
                <a
                  href={selectedPhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm backdrop-blur-sm transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4" />
                  View Original Source
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
