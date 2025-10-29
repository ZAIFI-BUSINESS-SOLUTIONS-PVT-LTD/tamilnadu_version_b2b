import React from 'react';
import { LinkedinLogo } from "@phosphor-icons/react";
import { Phone, Mail, MapPin } from 'lucide-react';
import Logo from '@/src/assets/images/logo inverted.svg';

const Footer = () => {
  return (
    <footer
      id="footer"
      className="relative bg-slate-900 text-gray-300 pt-16 pb-6 overflow-hidden shadow-2xl border-t border-accent/20"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16 items-start">
          {/* Left: Logo & Social */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <img src={Logo} alt="Inzighted Logo" className="w-32 md:w-40 h-auto" />
            <span className="text-lg font-semibold text-white text-center md:text-left">AI-powered Evaluation for Modern Education</span>
            <a
              href="https://www.linkedin.com/company/zai-fi/"
              aria-label="LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-800 hover:bg-accent/80 transition-colors rounded-full p-2 shadow-lg border border-gray-700 hover:border-accent text-accent hover:text-white mt-2"
            >
              <LinkedinLogo size={28} weight="fill" />
            </a>
          </div>

          {/* Center: Quick Links & About */}
          <div className="flex flex-col gap-6 items-center md:items-start">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-wide">Quick Links</h3>
              <ul className="flex flex-wrap gap-4 text-gray-400 text-base justify-center md:justify-start">
                {/*
                  Updated Quick Links to use proper hrefs for Home, Pricing, Contact, and Go to Dashboard.
                */}
                {[
                  { text: 'Home', href: '/' },
                  { text: 'Pricing', href: '/pricing' },
                  { text: 'Contact', href: '/contact' },
                  { text: 'FAQ', href: '/faq' },
                  { text: 'Go to Dashboard', href: '/auth' },
                ].map((link, i) => (
                  <li key={i}>
                    <a href={link.href} className="hover:text-accent transition-colors duration-150 font-medium">{link.text}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-wide">About Us</h3>
              <p className="text-gray-400 text-base leading-relaxed max-w-xs text-center md:text-left">
                InzightEd is an AI-powered evaluation system transforming how assessments are understood. Our proprietary <span className="text-accent font-semibold">AI</span> delivers meaningful insights beyond traditional grading.
              </p>
            </div>
          </div>

          {/* Right: Contact & Newsletter */}
          <div className="flex flex-col gap-6 items-center md:items-end w-full">
            <div className="w-full max-w-xs">
              <h3 className="text-xl font-bold text-white mb-2 tracking-wide">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center">
                  <span className="flex items-center justify-center w-8 h-8 aspect-square mr-3 bg-transparent rounded-full">
                    <Phone size={20} strokeWidth={2} className="text-accent" />
                  </span>
                  +91 63859-21669
                </li>
                <li className="flex items-center">
                  <span className="flex items-center justify-center w-8 h-8 aspect-square mr-3 bg-transparent rounded-full">
                    <Mail size={20} strokeWidth={2} className="text-accent" />
                  </span>
                  contact@zai-fi.com
                </li>
                <li className="flex items-start">
                  <span className="flex items-center justify-center w-8 h-8 aspect-square mr-3 bg-transparent rounded-full">
                    <MapPin size={20} strokeWidth={2} className="text-accent" />
                  </span>
                  <span>Nehru Group of Institutions Technology Business Incubator (NGI TBI), Nehru Gardens, Thirumalayampalayam, Coimbatore, Tamil Nadu - 641 105</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-800 pt-4 text-center text-sm text-gray-500 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2">
            <span>&copy; {new Date().getFullYear()} InzightEd. All rights reserved.</span>
            <div className="flex space-x-4">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((text, i) => (<a key={i} href="#" className="hover:text-accent underline underline-offset-4">{text}</a>))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
