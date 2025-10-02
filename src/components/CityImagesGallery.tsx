import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Image as ImageIcon } from "lucide-react";

interface CityImage {
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
}

interface CityImagesGalleryProps {
  city: string;
  year: number;
  images: CityImage[];
}

export const CityImagesGallery = ({ city, year, images }: CityImagesGalleryProps) => {
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {city} in the {Math.floor(year / 10) * 10}s
        </CardTitle>
        <CardDescription>
          Atmospheric photos of {city} from around your graduation year
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <a
              key={index}
              href={image.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden rounded-lg border hover:border-primary transition-all duration-200"
            >
              <img
                src={image.thumbnail || image.url}
                alt={image.description || image.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  e.currentTarget.src = `https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=400&fit=crop&crop=center&auto=format&q=80`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-3">
                <p className="text-white text-xs font-medium line-clamp-2">
                  {image.title}
                </p>
              </div>
            </a>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          <p>Click on any image to view full size</p>
        </div>
      </CardContent>
    </Card>
  );
};
