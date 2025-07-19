const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <p><strong>Automatically Collected Information:</strong> When you visit our website, we automatically collect certain information including your IP address, browser type, device information, and pages visited.</p>
            <p><strong>Game Data:</strong> We store your game scores locally in your browser. No personal information is required to play our games.</p>
            <p><strong>Analytics:</strong> We use analytics services to understand how visitors use our website to improve user experience.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain our gaming service</li>
              <li>To improve user experience and website functionality</li>
              <li>To analyze website traffic and usage patterns</li>
              <li>To display relevant advertisements through Google Ads</li>
              <li>To ensure website security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Cookies and Tracking</h2>
            <p>We use cookies and similar tracking technologies to enhance your browsing experience. This includes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Essential cookies for website functionality</li>
              <li>Analytics cookies to understand user behavior</li>
              <li>Advertising cookies for personalized ads</li>
              <li>Local storage for game scores and preferences</li>
            </ul>
            <p>You can control cookie settings through your browser, but some features may not work properly if disabled.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services</h2>
            <p>Our website integrates with third-party services including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google AdSense:</strong> For displaying advertisements</li>
              <li><strong>Google Analytics:</strong> For website analytics</li>
              <li><strong>Social Media Platforms:</strong> For sharing features</li>
            </ul>
            <p>These services have their own privacy policies and data collection practices.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p>We implement appropriate security measures to protect your information. However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p>Depending on your location, you may have rights regarding your personal data including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to access your personal data</li>
              <li>Right to correct inaccurate data</li>
              <li>Right to delete your data</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Children's Privacy</h2>
            <p>Our service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Changes to Privacy Policy</h2>
            <p>We may update this privacy policy from time to time. Changes will be posted on this page with an updated "Last updated" date. We encourage you to review this privacy policy periodically.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact Information</h2>
            <p>If you have questions about this Privacy Policy, please contact us:</p>
            <div className="bg-muted p-4 rounded-lg">
              <p><strong>Klexgetier</strong></p>
              <p>Maximilian Leistner</p>
              <p>Hasberger Dorfstraße 67</p>
              <p>27751 Delmenhorst, Germany</p>
              <p>Email: <a href="mailto:hallo@klexgetier.de" className="text-primary hover:underline">hallo@klexgetier.de</a></p>
              <p>Phone: <a href="tel:+491736936644" className="text-primary hover:underline">+49 173 6936644</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;