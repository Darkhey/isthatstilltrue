import { Link } from "react-router-dom";
import { CreditCard } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Legal Navigation */}
          <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link to="/imprint" className="hover:text-primary transition-colors">
              Imprint
            </Link>
          </nav>

          {/* PayPal Donate Button */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Support us:</span>
            <a
              href="https://www.paypal.com/donate/?hosted_button_id=CRF92JRY9SW4J"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#0070ba] hover:bg-[#005ea6] text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 animate-pulse hover:animate-none"
            >
              <CreditCard className="w-4 h-4" />
              Donate
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-4 pt-4 border-t text-center text-sm text-muted-foreground">
          <p>© 2024 Klexgetier - Maximilian Leistner. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;