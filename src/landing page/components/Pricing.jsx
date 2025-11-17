import React, { useEffect } from "react";
import { Check, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export const pricingPlans = [
  {
    title: "Free Plan",
    price: "Free",
  currency: 'INR',
  billingCycle: 'monthly',
    period: "",
    description:
      "Ideal for students and individuals to get started with test preparation.",
    features: [
      "Unlimited Mock Tests",
      "Custom Quizzes",
      "Access to all previous year question papers",
      "Progress Tracking",
      "Basic AI Analysis",
    ],
    cta: "Start for Free",
    // point Free plan to the NEET beta site
  href: "https://neet.inzighted.com/",
  url: "https://neet.inzighted.com/",
    highlight: false,
    locked: false,
  },
  {
    title: "Student Premium",
    // Premium is being offered free during beta for NEET aspirants
    price: "Free",
  currency: 'INR',
  billingCycle: 'monthly',
    period: "",
    description: "Unlock advanced AI features and personalized support.",
    features: [
      "Everything in Free Plan",
      "Advanced AI Suggestions",
      "Personalized AI Chatbot",
      "Early Access to upcoming New Features",
    ],
    cta: "Get Premium",
    // point Student Premium to the NEET beta site as requested
    href: "https://neet.inzighted.com/",
  url: "https://neet.inzighted.com/",
    highlight: true,
    locked: false,
    promoMessage:
      "Beta Offer: Student Premium is free for all NEET aspirants during the beta stage.",
  },
  {
    title: "Institutes Premium",
    price: "Get In Touch",
  currency: 'INR',
  billingCycle: 'yearly',
    period: "",
    description: "Best for schools and institutes seeking tailored solutions.",
    features: [
      "Everything in Free Plan",
      "Tailored Classroom Tools",
      "Offline Report Downloads",
      "Dedicated Support Team",
      "Offline Test Paper Upload & Auto Evaluation",
    ],
    cta: "Contact Us",
  href: "/contact",
  url: "/contact",
    highlight: false,
    locked: false,
  },
];

// slug helper for deep links
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");

const introAnimation = {
  initial: { opacity: 0, y: 50 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 1, ease: "easeOut" },
};
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const Pricing = () => (
  <motion.section
    id="pricing"
    className="bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pt-16 sm:pt-44 pb-8 sm:pb-40 "
    {...introAnimation}
  >
  {/* Structured data for pricing plans (ItemList of Services/Offers) */}
  {/* injected at runtime to avoid build-time differences and keep SPA-friendly */}
  <ScriptInjector />
    <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4 sm:px-4 md:px-8">
      {/* Section Header */}
      <motion.div
        className="mx-auto max-w-screen-md text-center mb-6 sm:mb-12 mt-10"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
          Choose Your{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600">
            Perfect Plan
          </span>
        </h2>
        <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
          Select the plan that fits your needs and start your journey to NEET
          success today.
        </p>
      </motion.div>
      {/* Plans Grid */}
      <motion.div
        className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {pricingPlans.map((plan) => (
          <motion.div
            key={plan.title}
            variants={itemVariants}
            className={`flex flex-col h-full bg-white rounded-3xl shadow border p-6 ${plan.highlight ? "border-2 border-blue-500" : ""
              }`}
          >
            {/* Plan Info */}
            <div className="mb-6 px-5">
              <h3 id={`pricing-plan-${slugify(plan.title)}`} className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                {plan.title}
              </h3>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4">
                {plan.description}
              </p>
              <div className="flex items-baseline mb-4 justify-center">
                <span className="text-4xl font-extrabold text-gray-800">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-gray-500 ml-1">
                    {plan.period}
                  </span>
                )}
              </div>
              {/* CTA Button */}
              {plan.cta && plan.href && (
                plan.locked ? (
                  <div className="mb-6">
                    <button
                      className="btn w-full mb-2 text-base flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                      disabled
                    >
                      <Lock className="w-4 h-4 text-gray-500" />
                      {plan.cta}
                    </button>
                    <p className="text-xs text-gray-500 text-center">
                      {plan.lockedMessage}
                    </p>
                  </div>
                ) : (
                  <>
                    {/^https?:\/\//.test(plan.href) ? (
                      <a
                        href={plan.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`btn w-full mb-2 text-base ${plan.title === "Free Plan"
                          ? "btn-outline btn-primary"
                          : plan.title === "Student Premium"
                            ? "btn-secondary"
                            : "btn-outline btn-secondary"
                        }`}
                      >
                        {plan.cta}
                      </a>
                    ) : (
                      <Link
                        to={plan.href}
                        className={`btn w-full mb-2 text-base ${plan.title === "Free Plan"
                          ? "btn-outline btn-primary"
                          : plan.title === "Student Premium"
                            ? "btn-secondary"
                            : "btn-outline btn-secondary"
                        }`}
                      >
                        {plan.cta}
                      </Link>
                    )}

                    {/* Promo message for Premium plans during beta (not shown under Free Plan) */}
                    {plan.promoMessage && (
                      <p className="text-xs text-center text-blue-600 mt-1">
                        {plan.promoMessage}
                      </p>
                    )}
                  </>
                )
              )}
            </div>
            {/* Features List */}
            <ul role="list" className="space-y-3 text-left ">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-base md:text-lg text-gray-700 leading-relaxed">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </motion.section>
);

export default Pricing;

function ScriptInjector() {
  useEffect(() => {
    if (!pricingPlans || pricingPlans.length === 0) return;

    const productSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "InzightEd",
      description: "AI-powered NEET mock tests and personalized feedback platform",
      brand: {
        "@type": "Brand",
        name: "InzightEd"
      },
      offers: pricingPlans.map(p => ({
        "@type": "Offer",
        name: p.title,
        description: p.description,
        price: p.price === "Free" || p.price === "Get In Touch" ? "0" : p.price.replace(/[^\d.]/g, ''),
        priceCurrency: p.currency || "INR",
        url: p.url || p.href,
        availability: p.price === "Free" ? "https://schema.org/InStock" : "https://schema.org/InStock"
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(productSchema);
    document.head.appendChild(script);

    return () => script.remove();
  }, []);

  return null;
}