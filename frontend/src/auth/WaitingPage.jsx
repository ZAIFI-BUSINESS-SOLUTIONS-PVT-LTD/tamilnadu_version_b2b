import React, { useState, useEffect } from "react";
import { SpinnerGap, CheckCircle } from "@phosphor-icons/react";


const WaitingPage = () => {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const steps = ["Initializing", "Processing", "Finalizing", "Redirecting"];
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 1;
        if (newProgress >= 100) {
          clearInterval(interval);
          setCompleted(true);
          return 100;
        }
        return newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress < 25) setStep(0);
    else if (progress < 65) setStep(1);
    else if (progress < 90) setStep(2);
    else setStep(3);
  }, [progress]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 text-center overflow-hidden px-6">
      {/* Animated circles background */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full bg-blue-${200 + i * 100} opacity-${5 + i} blur-xl`}
            style={{
              width: `${100 + i * 50}px`,
              height: `${100 + i * 50}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${20 + i * 5}s`,
              animationDelay: `${i * 0.5}s`
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center max-w-md w-full">
        {/* Glowing orb */}
        <div className="relative mb-8">
          <div className="relative w-24 h-24 flex items-center justify-center">
            {completed ? (
              <CheckCircle className="w-16 h-16 text-green-500 animate-scale-in" />
            ) : (
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 animate-pulse opacity-30" />
            )}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500 to-blue-700 animate-ping-slow opacity-50" />
            {!completed && (
              <SpinnerGap className="w-12 h-12 text-white animate-spin relative z-10" />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status message */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            {completed ? "Ready!" : steps[step]}
          </h2>
          <p className="text-gray-600 text-lg animate-fade">
            {completed
              ? "Redirecting to dashboard..."
              : "Please wait while we prepare your experience"}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex justify-between w-full max-w-xs mb-4">
          {steps.map((stepName, index) => (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center mb-1 transition-colors duration-300 ${
                  index <= step ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
              <span className="text-xs text-gray-500">{stepName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes ping-slow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.1;
          }
        }
        .animate-ping-slow {
          animation: ping-slow 3s ease-in-out infinite;
        }

        @keyframes fade {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade {
          animation: fade 0.8s ease-out both;
        }

        @keyframes scale-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default WaitingPage;