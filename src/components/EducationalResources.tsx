import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, GraduationCap, BookOpen, Globe, Microscope, History } from "lucide-react";

export const EducationalResources = () => {
  const resources = [
    {
      category: "Science & Research",
      icon: Microscope,
      description: "Leading scientific research and discovery platforms",
      links: [
        {
          title: "MIT OpenCourseWare",
          url: "https://ocw.mit.edu/",
          description: "Free lecture notes, exams, and videos from MIT"
        },
        {
          title: "Stanford Encyclopedia of Philosophy",
          url: "https://plato.stanford.edu/",
          description: "Comprehensive scholarly resources in philosophy"
        },
        {
          title: "NASA Education",
          url: "https://www.nasa.gov/stem/",
          description: "Space science and exploration educational content"
        },
        {
          title: "National Science Foundation",
          url: "https://www.nsf.gov/news/classroom/",
          description: "Science news and educational resources"
        }
      ]
    },
    {
      category: "History & Social Sciences",
      icon: History,
      description: "Historical archives and social science resources",
      links: [
        {
          title: "Library of Congress Digital Collections",
          url: "https://www.loc.gov/collections/",
          description: "Historical documents, photos, and recordings"
        },
        {
          title: "Yale Avalon Project",
          url: "https://avalon.law.yale.edu/",
          description: "Historical documents in law, history, and diplomacy"
        },
        {
          title: "Harvard University Archives",
          url: "https://library.harvard.edu/libraries/harvard-university-archives",
          description: "Historical records and academic resources"
        },
        {
          title: "UC Berkeley Library",
          url: "https://www.lib.berkeley.edu/",
          description: "Extensive digital collections and research materials"
        }
      ]
    },
    {
      category: "Open Educational Resources",
      icon: BookOpen,
      description: "Free educational content for lifelong learning",
      links: [
        {
          title: "Khan Academy",
          url: "https://www.khanacademy.org/",
          description: "Free courses in math, science, and humanities"
        },
        {
          title: "Open Yale Courses",
          url: "https://oyc.yale.edu/",
          description: "Free access to introductory courses taught by Yale faculty"
        },
        {
          title: "Cornell University Library Digital Collections",
          url: "https://digital.library.cornell.edu/",
          description: "Digitized historical and research materials"
        },
        {
          title: "Princeton University Press Scholarship Online",
          url: "https://press.princeton.edu/",
          description: "Academic books and research publications"
        }
      ]
    },
    {
      category: "Global Knowledge Platforms",
      icon: Globe,
      description: "International educational and research institutions",
      links: [
        {
          title: "Oxford Academic",
          url: "https://academic.oup.com/",
          description: "Scholarly research across all academic disciplines"
        },
        {
          title: "Cambridge University Press",
          url: "https://www.cambridge.org/",
          description: "Academic books, journals, and research"
        },
        {
          title: "ETH Zurich Digital Collections",
          url: "https://www.library.ethz.ch/en/",
          description: "Swiss Federal Institute of Technology resources"
        },
        {
          title: "Smithsonian Learning Lab",
          url: "https://learninglab.si.edu/",
          description: "Educational resources from Smithsonian museums"
        }
      ]
    }
  ];

  return (
    <section className="w-full py-16 bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-4">Educational Resources</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Explore trusted academic sources and educational platforms to continue your learning journey. 
            All resources are from reputable universities and research institutions.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {resources.map((resource, idx) => {
            const Icon = resource.icon;
            return (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{resource.category}</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    {resource.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {resource.links.map((link, linkIdx) => (
                      <div key={linkIdx} className="group">
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-auto p-4 hover:bg-muted"
                          asChild
                        >
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3"
                          >
                            <ExternalLink className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1 text-left">
                              <div className="font-semibold group-hover:text-primary transition-colors">
                                {link.title}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {link.description}
                              </div>
                            </div>
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-2">Why These Sources Matter</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                These educational resources represent some of the world's leading academic institutions. 
                They provide peer-reviewed research, historical documentation, and educational content that 
                helps us understand how knowledge evolves over time. By exploring these sources, you're 
                accessing the same materials used by researchers and scholars worldwide to advance human understanding.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
