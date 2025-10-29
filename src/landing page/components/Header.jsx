import React, { useState, useEffect, useCallback, useRef } from 'react';
import { List, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '@/src/assets/images/logo.svg';

const navItems = [
  { label: 'Pricing', id: 'pricing', testId: 'pricing-link', to: '/pricing' },
  { label: 'Contact Us', id: 'contact', testId: 'contact-link', to: '/contact' },
  { label: 'FAQ', id: 'faq', testId: 'faq-link', to: '/faq' },
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Throttle function for scroll events using useRef for stable references
  const throttleRef = useRef({ lastFunc: null, lastRan: null });

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 30);
  }, []);

  useEffect(() => {
    function throttledScroll() {
      const { lastFunc, lastRan } = throttleRef.current;
      if (!lastRan) {
        handleScroll();
        throttleRef.current.lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        throttleRef.current.lastFunc = setTimeout(function () {
          if (Date.now() - throttleRef.current.lastRan >= 100) {
            handleScroll();
            throttleRef.current.lastRan = Date.now();
          }
        }, 100 - (Date.now() - throttleRef.current.lastRan));
      }
    }
    window.addEventListener('scroll', throttledScroll);
    return () => {
      window.removeEventListener('scroll', throttledScroll);
      if (throttleRef.current.lastFunc) {
        clearTimeout(throttleRef.current.lastFunc);
      }
    };
  }, [handleScroll]);

  // Scroll to top if on home page when logo is clicked
  const handleLogoClick = (e) => {
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Scroll to section or navigate
  const handleNavClick = (item, e) => {
    if (item.to) return; // Let Link handle navigation
    e.preventDefault();
    const element = document.getElementById(item.id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // If not on home page, navigate to home and scroll after navigation
      navigate('/', { state: { scrollTo: item.id } });
    }
  };

  // Helper to handle nav link clicks for <Link> items
  const handleLinkClick = (item, e) => {
    if (location.pathname === item.to) {
      // If already on the target route, force a state update to re-render
      navigate(item.to, { replace: true, state: { forceReload: Date.now() } });
    }
    // Otherwise, let <Link> handle navigation
  };

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.mobile-menu-container')) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  // Add this effect to scroll after navigation if state is present
  useEffect(() => {
    if (location.pathname === '/' && location.state && location.state.scrollTo) {
      const el = document.getElementById(location.state.scrollTo);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100); // wait for DOM
      }
    }
  }, [location]);

  const mobileMenuVariants = {
    hidden: { opacity: 0, y: -20, transition: { duration: 0.25, ease: 'easeInOut' } },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeInOut' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2, ease: 'easeInOut' } },
  };

  return (
    <header
      className={`fixed z-50 left-1/2 -translate-x-1/2 transition-all duration-500 ${isScrolled ? 'shadow-lg bg-white' : 'bg-transparent'} w-full lg:max-w-7xl lg:rounded-b-xl rounded-none translate-y-0 opacity-100 pointer-events-auto`}
      style={{ right: 'auto' }}
      aria-label="Main Navigation"
      data-testid="header"
    >
      {/* Mobile Header */}
      <div className="lg:hidden w-full px-3 py-3 flex items-center justify-between">
        <div>
          <Link to="/" className="flex items-center rounded" aria-label="Home" data-testid="logo-link" onClick={handleLogoClick} tabIndex={-1}>
            <img src={Logo} alt="Company Logo" className="w-24 h-auto" loading="lazy" width="96" height="auto" />
          </Link>
        </div>
        <div className="mobile-menu-container ml-2">
          <button
            type="button"
            tabIndex={0}
            className="text-gray-800 hover:bg-blue-50 rounded-full p-1.5 transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            aria-label={isOpen ? 'Close mobile menu' : 'Open mobile menu'}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            data-testid="mobile-menu-button"
          >
            {isOpen ? <X size={24} aria-hidden="true" /> : <List size={24} aria-hidden="true" />}
          </button>
          <AnimatePresence>
            {isOpen && (
              <motion.nav
                key="mobile-menu"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={mobileMenuVariants}
                className="absolute top-full left-0 w-screen bg-white shadow-2xl z-50 rounded-none border-t border-gray-200"
                id="mobile-menu"
              >
                <div className="flex flex-col gap-2 w-full p-3">
                  {navItems.map((item) => (
                    item.to ? (
                      <Link
                        key={item.id}
                        to={item.to}
                        onClick={(e) => handleLinkClick(item, e)}
                        className="relative text-gray-800 font-semibold px-3 py-2 rounded-md transition focus:outline-none whitespace-nowrap block text-base border border-transparent hover:bg-gray-200 bg-transparent"
                        data-testid={item.testId}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={(e) => handleNavClick(item, e)}
                        className="relative text-gray-800 font-semibold px-3 py-2 rounded-md transition focus:outline-none whitespace-nowrap block text-base border border-transparent hover:bg-gray-200 bg-transparent"
                        data-testid={item.testId}
                      >
                        {item.label}
                      </a>
                    )
                  ))}
                  <Link to="/auth" className="focus:outline-none w-full">
                    <button
                      className="relative w-full inline-flex items-center justify-center px-3 py-2 font-semibold text-white rounded-md shadow-xl bg-gradient-to-br from-blue-600 to-blue-500 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 text-base transition-none"
                      role="button"
                      aria-label="Go to Dashboard"
                      data-testid="dashboard-mobile-button"
                    >
                      Go to Dashboard
                    </button>
                  </Link>
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between mx-auto w-full max-w-screen-xl px-6 transition-all duration-300 ease-in-out py-4 relative min-h-[88px]">
        <div className="flex-shrink-0 flex items-center h-full pl-2">
          <Link to="/" className="flex items-center rounded justify-center pt-1" aria-label="Home" data-testid="logo-link" onClick={handleLogoClick} tabIndex={-1}>
            <img src={Logo} alt="Company Logo" className="w-32 h-auto" loading="lazy" width="112" height="auto" />
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-end h-full">
          <nav className="h-full flex items-center gap-3" aria-label="Desktop navigation">
            {navItems.map((item) => (
              item.to ? (
                <Link
                  key={item.id}
                  to={item.to}
                  onClick={(e) => handleLinkClick(item, e)}
                  className="relative text-gray-800 font-regular px-2.5 py-1.5 rounded-md transition focus:outline-none whitespace-nowrap inline-block text-[15px] border border-transparent hover:bg-gray-200 bg-transparent"
                  data-testid={item.testId}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => handleNavClick(item, e)}
                  className="relative text-gray-800 font-regular px-2.5 py-1.5 rounded-md transition focus:outline-none whitespace-nowrap inline-block text-[15px] border border-transparent hover:bg-gray-200 bg-transparent"
                  data-testid={item.testId}
                >
                  {item.label}
                </a>
              )
            ))}
            <Link to="/auth" className="focus:outline-none">
              <button
                className="relative inline-flex items-center px-2.5 py-1.5 font-regular text-white rounded-md bg-gradient-to-br from-blue-600 to-blue-500 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 text-[15px] transition-none"
                role="button"
                aria-label="Go to Dashboard"
                data-testid="dashboard-button"
              >
                Go to Dashboard
              </button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
