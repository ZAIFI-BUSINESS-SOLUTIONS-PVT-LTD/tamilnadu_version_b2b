import React from "react";
import { Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const pricingPlans = [
  {
    title: "Monthly Plan",
    price: "₹199",
    period: "per student per month",
    description: "Flexible monthly subscription for enterprises",
    features: [
      "Offline Compatibility",
      "All evaluation features",
      "Unlimited student submissions",
      "Advanced analytics dashboard",
      "Priority email support",
      "Cloud storage for results",

    ],
    cta: "Start Monthly Plan",
    highlight: false,
  },
  {
    title: "Annual Plan",
    price: "₹149",
    period: "per student per month (billed annually)",
    description: "Cost-effective annual subscription for enterprises",
    features: [
      "Everything in Monthly Plan",
      "2 months free compared to monthly",
      "Dedicated onboarding support",
      "Early access to new features",
      "Annual usage reports",
    ],
    cta: "Save with Annual Plan",
    highlight: true,
  },
];

const Pricing = () => {
  return (
    <section
      id="pricing"
      className="bg-blue-50 pt-28 pb-20 px-4 sm:px-6 lg:px-8 text-gray-700"
    >

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight tracking-tight">
            Simple, Transparent{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
              Pricing
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Choose the plan that works best for your institution. Cancel
            anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {pricingPlans.map((plan, idx) => (
            <div
              key={plan.title}
              className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col h-full border ${plan.highlight
                ? "border-blue-500 ring-2 ring-blue-100 transform lg:scale-[1.02]"
                : "border-gray-200"
                }`}
            >
              <div className="p-8 flex flex-col flex-grow">
                <div className="mb-6 text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {plan.title}
                  </h3>
                  <div className="flex flex-col items-center justify-center mb-2">
                    <span className="text-4xl font-extrabold text-blue-600">
                      {plan.price}
                    </span>
                    <span className="text-lg text-gray-600 mt-1">
                      {plan.period}
                    </span>
                  </div>
                  <p className="mt-6 text-gray-600">{plan.description}</p>
                </div>

                <ul className="mb-8 space-y-3 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start text-gray-700">
                      <Check className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Need a custom solution for your organization?
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 font-semibold py-3 px-8 rounded-xl shadow-md transition-all justify-center"
          >
            Contact us{" "}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Pricing;