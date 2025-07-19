const Imprint = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Imprint</h1>
        
        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Information according to § 5 TMG</h2>
            <div className="bg-muted p-6 rounded-lg">
              <p><strong>Klexgetier</strong></p>
              <p>Maximilian Leistner</p>
              <p>Hasberger Dorfstraße 67</p>
              <p>27751 Delmenhorst</p>
              <p>Germany</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact</h2>
            <div className="bg-muted p-6 rounded-lg">
              <p>Email: <a href="mailto:hallo@klexgetier.de" className="text-primary hover:underline">hallo@klexgetier.de</a></p>
              <p>Phone: <a href="tel:+491736936644" className="text-primary hover:underline">+49 173 6936644</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Responsible for Content</h2>
            <p>According to § 55 Abs. 2 RStV:</p>
            <div className="bg-muted p-6 rounded-lg">
              <p>Maximilian Leistner</p>
              <p>Hasberger Dorfstraße 67</p>
              <p>27751 Delmenhorst</p>
              <p>Germany</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Disclaimer</h2>
            
            <h3 className="text-xl font-semibold mb-2">Liability for Contents</h3>
            <p>As service providers, we are liable for own contents of these websites according to Paragraph 7, Sect. 1 German Telemedia Act (TMG). However, according to Paragraphs 8 to 10 German Telemedia Act (TMG), service providers are not under obligation to monitor external information provided or stored on their website. Once we have become aware of a specific infringement of law, we will immediately remove the content in question. Any liability concerning this matter can only be assumed from the point in time at which the infringement becomes known to us.</p>

            <h3 className="text-xl font-semibold mb-2">Liability for Links</h3>
            <p>Our website contains links to external websites, over which we have no control. For this reason, we cannot assume any liability for these external contents. In all cases, the provider of information of the linked websites is liable for the contents and accuracy of the information provided. At the point in time when the links were placed, no infringements of law were recognisable to us. As soon as an infringement of law becomes known to us, we will immediately remove the link in question.</p>

            <h3 className="text-xl font-semibold mb-2">Copyright</h3>
            <p>The contents and works on these pages created by the site operators are subject to German copyright law. The duplication, processing, distribution and any form of commercialization of such material beyond the scope of copyright law shall require the prior written consent of the author or creator. Downloads and copies of these pages are only permitted for private and non-commercial use. In so far as the contents of this site are not created by the operator, the copyrights of third parties are respected. The contributions of third parties on this site are indicated as such. Should you nevertheless become aware of a copyright infringement, please inform us accordingly. As soon as we become aware of any infringements, we will immediately remove such content.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Imprint;