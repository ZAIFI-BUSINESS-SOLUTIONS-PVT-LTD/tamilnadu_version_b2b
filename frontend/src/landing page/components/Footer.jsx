import React, { useEffect } from 'react';
import { Phone, Mail, MapPin, Linkedin } from 'lucide-react';
import Logo from '@/src/assets/images/logo-inverted.svg';

const Footer = () => {
  return (
    <footer
      id="footer"
      role="contentinfo"
      aria-labelledby="footer-heading"
      className="relative bg-slate-900 text-gray-300 pt-16 pb-6 overflow-hidden shadow-2xl border-t border-accent/20"
    >
      <h2 id="footer-heading" className="sr-only">Site footer</h2>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-16 relative z-10">
        {/* grid: 1 col on xs, 2 on sm, 3 on md+; center text on mobile, left on md+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 lg:gap-16 items-start text-center md:text-left">
          {/* Left: Logo & Social */}
          <div className="flex flex-col items-center md:items-start gap-4 w-full">
            <img src={Logo} alt="InzightEd logo — AI-powered evaluation for modern education" width={160} height={48} loading="lazy" className="w-28 md:w-40 h-auto" />
            <span className="text-lg font-semibold text-white text-center md:text-left">AI-powered Evaluation for Modern Education</span>
            <a
              href="https://www.linkedin.com/company/zai-fi/"
              aria-label="LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-800 hover:bg-accent/80 transition-colors rounded-full p-3 md:p-2 shadow-lg border border-gray-700 hover:border-accent text-accent hover:text-white mt-2"
            >
              <Linkedin size={28} aria-hidden="true" />
            </a>
          </div>

          {/* Center: Quick Links & About */}
          <div className="flex flex-col gap-6 items-center md:items-start">
            <div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-wide">Quick Links</h3>
                <nav aria-label="Quick links">
                <ul className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-4 text-gray-400 text-base justify-center md:justify-start items-center md:items-start">
                {/*
                  Updated Quick Links to use proper hrefs for Home, Pricing, Contact, and Go to Dashboard.
                */}
                {[
                  { text: 'Home', href: '/' },
                  { text: 'Contact', href: '/contact' },
                  { text: 'FAQ', href: '/faq' },
                ].map((link, i) => (
                  <li key={i} className="w-full md:w-auto">
                    <a href={link.href} className="block hover:text-accent transition-colors duration-150 font-medium py-1 md:py-0">{link.text}</a>
                  </li>
                ))}
                </ul>
                </nav>
              </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-wide">About Us</h3>
              <p className="text-gray-400 text-base leading-relaxed max-w-full md:max-w-xs text-center md:text-left">
                InzightEd is an AI-powered evaluation system transforming how assessments are understood. Our proprietary <span className="text-accent font-semibold">AI</span> delivers meaningful insights beyond traditional grading.
              </p>
            </div>
          </div>

          {/* Right: Contact & Newsletter */}
          <div className="flex flex-col gap-6 items-center md:items-end w-full text-left md:text-left">
            <div className="w-full max-w-full md:max-w-xs">
              <h3 className="text-xl font-bold text-white mb-2 tracking-wide">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center justify-start md:justify-start">
                  <span className="flex items-center justify-start w-8 h-8 aspect-square mr-3 bg-transparent rounded-full" aria-hidden="true">
                    <Phone size={20} strokeWidth={2} className="text-accent" />
                  </span>
                  <a href="tel:+916385921669" aria-label="Call +91 63859 21669" className="hover:text-white">+91 63859-21669</a>
                </li>
                <li className="flex items-center justify-start md:justify-start">
                  <span className="flex items-center justify-start w-8 h-8 aspect-square mr-3 bg-transparent rounded-full" aria-hidden="true">
                    <Mail size={20} strokeWidth={2} className="text-accent" />
                  </span>
                  <a href="mailto:contact@zai-fi.com" aria-label="Email contact at contact@zai-fi.com" className="hover:text-white">contact@zai-fi.com</a>
                </li>
                <li className="flex items-start justify-start md:justify-start">
                  <span className="flex items-center justify-start w-8 h-8 aspect-square mr-3 bg-transparent rounded-full" aria-hidden="true">
                    <MapPin size={20} strokeWidth={2} className="text-accent" />
                  </span>
                  <address className="not-italic text-sm md:text-base">iTamilnadu Technology (iTNT) Hub, ANNA UNIVERSITY, Sir C V Raman Science Block 3rd, Campus, Kotturpuram, Chennai, Tamil Nadu 600025</address>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

// Inject minimal Organization + ContactPoint JSON-LD for the site footer
export function FooterSchemaInjector() {
  useEffect(() => {
    try {
      const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
      let logoUrl = '';
      try {
        logoUrl = new URL(Logo, origin).href;
      } catch (e) {
        logoUrl = origin + Logo;
      }

      const schema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "InzightEd",
        url: origin || undefined,
        logo: logoUrl || undefined,
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: "+91 63859-21669",
            contactType: "customer support",
            email: "contact@zai-fi.com",
            areaServed: "IN"
          }
        ]
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
      return () => script.remove();
    } catch (err) {
      // defensive: fail silently
      return undefined;
    }
  }, []);

  return null;
}
