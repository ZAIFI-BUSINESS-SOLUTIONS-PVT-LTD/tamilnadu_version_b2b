import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '@/src/assets/images/logo.svg';
import { Button } from '../../components/ui/button';

const navItems = [
  { label: 'Home', id: 'home', testId: 'home-link', to: '/' },
  { label: 'Blog', id: 'blog', testId: 'blog-link', to: '/blog' },
  { label: 'FAQ', id: 'faq', testId: 'faq-link' }, // section
  { label: 'Contact Us', id: 'contact', testId: 'contact-link', to: '/contact' }, // page
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false); // desktop dropdown
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false); // mobile menu expand
  const [mounted, setMounted] = useState(false);
  const productsCloseTimeout = useRef(null);
  // Ensure portal only renders after mount (avoids any SSR or initial hydration quirks)
  useEffect(() => { setMounted(true); }, []);

  // Close the mobile menu when Escape is pressed
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Esc') setIsOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);
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
    // Only for section items (no .to property)
    e.preventDefault();
    // Try to find the target element first (works when already on the page)
    const element = document.getElementById(item.id);
    if (element) {
      // account for fixed header height so the section isn't hidden underneath
      const headerEl = document.querySelector('[data-testid="header"]');
      const headerOffset = headerEl ? headerEl.offsetHeight : 0;
      const top = element.getBoundingClientRect().top + window.scrollY - headerOffset - 8;
      window.scrollTo({ top, behavior: 'smooth' });
      // close mobile menu if open
      setIsOpen(false);
      return;
    }

    // If element not present (we're on a different route), navigate to home and request scroll
    navigate('/', { state: { scrollTo: item.id } });
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
      // Close only when clicking outside the portal menu (#mobile-menu) and the menu button
      if (
        isOpen &&
        !event.target.closest('#mobile-menu') &&
        !event.target.closest('[data-testid="mobile-menu-button"]')
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  // Clear any pending products close timer when unmounting
  useEffect(() => {
    return () => {
      if (productsCloseTimeout.current) {
        clearTimeout(productsCloseTimeout.current);
        productsCloseTimeout.current = null;
      }
    };
  }, []);

  const openProducts = () => {
    if (productsCloseTimeout.current) {
      clearTimeout(productsCloseTimeout.current);
      productsCloseTimeout.current = null;
    }
    setProductsOpen(true);
  };

  const scheduleCloseProducts = (delay = 250) => {
    if (productsCloseTimeout.current) clearTimeout(productsCloseTimeout.current);
    productsCloseTimeout.current = setTimeout(() => {
      setProductsOpen(false);
      productsCloseTimeout.current = null;
    }, delay);
  };

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
      className={`fixed top-0 left-0 z-50 transition-all duration-500 border-b border-gray-200 bg-white w-full translate-y-0 opacity-100 pointer-events-auto`}
      style={{ right: 'auto' }}
      aria-label="Main Navigation"
      data-testid="header"
    >
      {/* Mobile Header */}
      <div className="lg:hidden w-full px-3 py-3 flex items-center justify-between">
        <div>
          <Link to="/" className="flex items-center rounded" aria-label="Home" data-testid="logo-link" onClick={handleLogoClick} tabIndex={-1}>
            <img src={Logo} alt="Company Logo" className="w-28 h-auto" loading="lazy" width="96" height="auto" />
          </Link>
        </div>
        <div className="mobile-menu-container ml-2">
          <Button asChild variant="ghost" size="icon" className="text-gray-800 hover:bg-blue-50 rounded-full transition">
            <button
              type="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
              aria-label={isOpen ? 'Close mobile menu' : 'Open mobile menu'}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              data-testid="mobile-menu-button"
            >
              {isOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
            </button>
          </Button>
          {mounted && isOpen && createPortal(
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/30"
                style={{ zIndex: 9998 }}
                aria-hidden="true"
              />
              <motion.nav
                key="mobile-menu"
                initial="hidden"
                animate="visible"
                variants={mobileMenuVariants}
                className="fixed inset-0 bg-white shadow-2xl border-t border-gray-200 overflow-hidden"
                id="mobile-menu"
                style={{ zIndex: 9999 }}
              >
                <div className="flex flex-col h-full">
                  {/* Top bar inside overlay with logo and close button */}
                  <div className="relative px-4 py-4 border-b flex-shrink-0 flex items-center justify-center">
                    <Link to="/" className="flex items-center rounded" aria-label="Home" onClick={handleLogoClick} tabIndex={-1}>
                      <img src={Logo} alt="Company Logo" className="w-28 h-auto" loading="lazy" width="96" height="auto" />
                    </Link>
                    <Button asChild variant="ghost" size="icon" className="absolute right-4 text-gray-800 hover:bg-blue-50 rounded-full p-1.5 transition">
                      <button
                        type="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                        aria-label="Close mobile menu"
                        data-testid="mobile-menu-close"
                      >
                        <X size={24} aria-hidden="true" />
                      </button>
                    </Button>
                  </div>

                  <div className="flex-1 overflow-auto p-6 flex flex-col gap-3 items-center w-full">
                    {navItems.map((item) => (
                      item.submenu ? (
                        <div key={item.id} className="w-full max-w-md">
                          <button
                            type="button"
                            onClick={() => setMobileProductsOpen((s) => !s)}
                            aria-expanded={mobileProductsOpen}
                            aria-controls="mobile-products"
                            className="text-gray-800 font-semibold px-3 py-3 rounded-md transition focus:outline-none text-center block text-lg border border-transparent hover:bg-gray-200 bg-transparent w-full max-w-md"
                            data-testid={item.testId}
                          >
                            <span className="inline-flex items-center justify-center gap-2 w-full">
                              <span>{item.label}</span>
                              <ChevronDown
                                size={16}
                                className={`motion-safe:transition-transform ${mobileProductsOpen ? 'rotate-180' : ''}`}
                                aria-hidden="true"
                              />
                            </span>
                          </button>
                          {mobileProductsOpen && (
                            <div id="mobile-products" className="mt-2 flex flex-col gap-2 px-2">
                              {item.submenu.map((sub) => (
                                <Link
                                  key={sub.testId}
                                  to={sub.to}
                                  onClick={() => { setIsOpen(false); setMobileProductsOpen(false); }}
                                  className="block text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 w-full text-center max-w-md mx-auto"
                                  data-testid={sub.testId}
                                >
                                  {sub.label}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : item.to ? (
                        <Link
                          key={item.id}
                          to={item.to}
                          onClick={(e) => handleLinkClick(item, e)}
                          className="text-gray-800 font-semibold px-3 py-3 rounded-md transition focus:outline-none text-center block text-lg border border-transparent hover:bg-gray-200 bg-transparent w-full max-w-md"
                          data-testid={item.testId}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          onClick={(e) => handleNavClick(item, e)}
                          className="text-gray-800 font-semibold px-3 py-3 rounded-md transition focus:outline-none text-center block text-lg border border-transparent hover:bg-gray-200 bg-transparent w-full max-w-md"
                          data-testid={item.testId}
                        >
                          {item.label}
                        </a>
                      )
                    ))}
                  </div>

                  <div className="p-6 border-t flex-shrink-0">
                    <div className="w-full flex flex-col gap-3">
                      <Button asChild variant="outline" size="lg" className="w-full focus:outline-none">
                        <Link to="/auth" role="button" aria-label="Go to Dashboard" data-testid="dashboard-mobile-button">
                          Login
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.nav></>,
            document.body
          )}
        </div>
      </div>
      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between mx-auto w-full max-w-screen-2xl px-6 transition-all duration-300 ease-in-out py-4 relative">
        <div className="flex-shrink-0 flex items-center h-full pl-2">
          <Link to="/" className="flex items-center rounded justify-center pt-1" aria-label="Home" data-testid="logo-link" onClick={handleLogoClick} tabIndex={-1}>
            <img src={Logo} alt="Company Logo" className="w-32 h-auto" loading="lazy" width="112" height="auto" />
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-end h-full">
          <nav className="h-full flex items-center gap-3" aria-label="Desktop navigation">
            {navItems.map((item) => (
              item.submenu ? (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={openProducts}
                  onMouseLeave={() => scheduleCloseProducts(220)}
                >
                  <button
                    type="button"
                    onClick={() => setProductsOpen((s) => !s)}
                    onFocus={openProducts}
                    onBlur={() => scheduleCloseProducts(220)}
                    aria-expanded={productsOpen}
                    aria-controls="products-menu"
                    className="relative text-gray-800 font-medium px-3 py-2 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 whitespace-nowrap bg-transparent hover:bg-gray-50"
                    data-testid={item.testId}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span>{item.label}</span>
                      <ChevronDown
                        size={16}
                        className={`motion-safe:transition-transform transform ${productsOpen ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </span>
                  </button>

                  {/* Dropdown panel */}
                  {productsOpen && (
                    <div
                      id="products-menu"
                      className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg z-50 overflow-hidden motion-safe:transition-opacity motion-safe:duration-150"
                      role="menu"
                      aria-label="Products"
                      onMouseEnter={openProducts}
                      onMouseLeave={() => scheduleCloseProducts(220)}
                    >
                      <div className="py-2">
                        {item.submenu.map((sub) => (
                          <Link
                            key={sub.testId}
                            to={sub.to}
                            onClick={() => setProductsOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem"
                            data-testid={sub.testId}
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : item.to ? (
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
            <Button asChild variant="outline" className="focus:outline-none">
              <Link to="/auth" role="button" aria-label="Go to Dashboard" data-testid="dashboard-button">
                Login
              </Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;