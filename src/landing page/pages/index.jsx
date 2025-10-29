// This file exports two landing page components: Index and Contact
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import HeroSection from "../components/Hero";
import OverviewSection from "../components/Overview";
import KeyFeatures from "../components/Features";
import Value from "../components/Value";
import SampleReport from "../components/SampleReport";
import UpcomingFeatures from "../components/Process";
import FAQ from "../components/FAQ";
import ContactUs from "../components/Contact";
import Pricing from "../components/Pricing";

// Main landing page: header, hero, all except contact, footer
export function Index() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);

  return (
    <>
      <Header />
      <div className="relative w-full min-h-screen">
        <main>
          <HeroSection />
          <OverviewSection />
          <KeyFeatures />
          <UpcomingFeatures />
          <SampleReport />
          <Value />
        </main>
      </div>
      <Footer />
    </>
  );
}

// Contact page: header, contact, footer
export function Contact() {
  return (
    <>
      <Header />
      <ContactUs />
      <Footer />
    </>
  );
}

// Pricing page: header, pricing, footer
export function PricingPage() {
  return (
    <>
      <Header />
      <Pricing />
      <Footer />
    </>
  );
}

// FAQ: header, faq, footer
export function FAQPage() {
  return (
    <>
      <Header />
      <FAQ />
      <Footer />
    </>
  );
}

export default Index;
