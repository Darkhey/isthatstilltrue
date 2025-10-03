import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

export const FAQSection = () => {
  const faqs = [
    {
      question: "What is 'Is That Still True?' and how does it work?",
      answer: "Is That Still True? is an educational platform that reveals how scientific understanding, historical perspectives, and commonly taught facts have evolved over time. By selecting your graduation year and country, you'll discover what was taught as fact during your school years that has since been updated, corrected, or completely revised by modern research. We use historical research and Wikipedia sources to provide accurate, verifiable information about how knowledge has changed."
    },
    {
      question: "Why do facts change over time?",
      answer: "Scientific knowledge evolves as new research methods emerge, better technology becomes available, and more data is collected. What seemed like established facts decades ago may be revised or disproven as our understanding deepens. This is the natural progression of science and scholarship - constantly questioning, testing, and refining our understanding of the world. Historical perspectives also shift as we discover new sources, develop better analytical methods, and gain access to previously unavailable information."
    },
    {
      question: "Are the facts on this website accurate and verified?",
      answer: "Yes! All facts presented on Is That Still True? are sourced from reputable educational resources including Wikipedia, Encyclopedia Britannica, academic institutions (.edu domains), government sources (.gov), JSTOR, Nature, Science.org, and Google Scholar. Each fact includes direct links to its sources so you can verify the information yourself. We implement strict quality controls and only accept facts with verifiable, clickable sources from trusted educational platforms."
    },
    {
      question: "Can I use this for educational purposes in my classroom?",
      answer: "Absolutely! Is That Still True? is an excellent resource for educators looking to demonstrate the scientific method, critical thinking, and how knowledge evolves. It's perfect for classroom discussions about the nature of science, media literacy, and the importance of questioning assumptions. Teachers can use specific examples to show students that learning is a lifelong process and that even 'facts' they learned recently may need updating as new research emerges."
    },
    {
      question: "What makes this different from other fact-checking websites?",
      answer: "Unlike traditional fact-checkers that focus on current misinformation, Is That Still True? takes a historical approach by examining what was taught as scientific consensus in the past. We don't just say 'this is wrong' - we explain what was believed, why it made sense at the time, and how modern research has changed our understanding. This helps users appreciate the evolution of human knowledge and understand that today's 'facts' may also be refined in the future."
    },
    {
      question: "How far back in history can I explore?",
      answer: "You can explore historical perspectives dating back to year 1 CE! The further back you go, the more dramatic the differences become between historical worldviews and modern understanding. Ancient and medieval periods are particularly fascinating, revealing how people understood everything from astronomy and medicine to geography and the natural world in completely different ways than we do today."
    },
    {
      question: "What is School Memory Mode?",
      answer: "School Memory Mode is a special feature that lets you research specific schools and discover what was happening during your graduation year. By entering your school name, city, and graduation year, you'll get personalized content including local historical context, nostalgia factors, and what made your school years unique. It's a fun way to reminisce while also learning about the broader historical context of your education."
    },
    {
      question: "How often is the information updated?",
      answer: "We continuously monitor sources and update our database as new research emerges. Because we rely on established sources like Wikipedia and academic publications, our information reflects the current scientific consensus. When significant new discoveries are made that change our understanding of a topic, we update the relevant facts to reflect this new knowledge."
    },
    {
      question: "Can I report incorrect information?",
      answer: "Yes! We encourage users to report any facts they believe are inaccurate or poorly sourced. Each fact card includes a 'Report' button that allows you to submit feedback. We review all reports and verify them against our sources. If we find an error, we correct it immediately. Quality and accuracy are our top priorities."
    },
    {
      question: "Why does this matter for understanding today's world?",
      answer: "Understanding how knowledge evolves helps develop critical thinking skills essential for navigating today's information landscape. By seeing how confidently held beliefs from the past were later updated or corrected, users learn to approach current information with appropriate skepticism and openness to new evidence. This historical perspective is crucial for media literacy, scientific literacy, and informed citizenship in an age of rapid information spread and occasional misinformation."
    }
  ];

  return (
    <section className="w-full py-16 bg-muted/30">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <HelpCircle className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Frequently Asked Questions</CardTitle>
            <CardDescription className="text-lg mt-2">
              Everything you need to know about how facts evolve and how this platform works
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left hover:text-primary transition-colors">
                    <span className="font-semibold">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
