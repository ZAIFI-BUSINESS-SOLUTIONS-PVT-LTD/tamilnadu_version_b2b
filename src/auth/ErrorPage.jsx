import React, { useState, useEffect } from "react";
import { WarningCircle, House, ArrowClockwise, Bug, Stack } from "@phosphor-icons/react";

const ErrorPage = ({ 
  errorCode = 500, 
  errorMessage = "Something went wrong", 
  showTechnicalDetails = false,
  errorDetails = null
}) => {
  const [countdown, setCountdown] = useState(10);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  // Handle countdown for auto-refresh
  useEffect(() => {
    let timer;
    if (isAutoRefreshing && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isAutoRefreshing && countdown === 0) {
      window.location.reload();
    }
    return () => clearTimeout(timer);
  }, [countdown, isAutoRefreshing]);

  // Get error message based on common error codes
  const getErrorTitle = () => {
    switch (errorCode) {
      case 404: return "Page Not Found";
      case 403: return "Access Forbidden";
      case 401: return "Unauthorized Access";
      case 500: return "Server Error";
      case 503: return "Service Unavailable";
      default: return "Something Went Wrong";
    }
  };

  // Get error description based on common error codes
  const getErrorDescription = () => {
    switch (errorCode) {
      case 404: return "The page you're looking for doesn't exist or has been moved.";
      case 403: return "You don't have permission to access this resource.";
      case 401: return "Please log in to access this resource.";
      case 500: return "Our server encountered an error. We're working to fix this issue.";
      case 503: return "Our service is temporarily unavailable. Please try again later.";
      default: return "We're having trouble loading this page. Please try again.";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-purple-100 flex items-center justify-center px-4 py-12">
      <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl flex flex-col md:flex-row items-center max-w-4xl w-full p-6 md:p-12 overflow-hidden relative border border-blue-100">
        {/* Error code badge */}
        <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2 rounded-bl-2xl font-mono text-base shadow-lg z-10">
          Error {errorCode}
        </div>

        <div className="w-full md:w-1/2 text-center md:text-left space-y-7">
          <div className="flex items-center justify-center md:justify-start gap-3 text-red-500">
            <WarningCircle size={38} weight="fill" className="animate-pulse" />
            <h1 className="text-3xl sm:text-4xl text-gray-800 font-extrabold tracking-tight">
              {getErrorTitle()}
            </h1>
          </div>

          <p className="text-gray-600 text-lg leading-relaxed">
            {getErrorDescription()}
            {errorMessage && errorMessage !== "Something went wrong" && (
              <span className="block mt-2 font-semibold text-gray-800">{errorMessage}</span>
            )}
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <button
              onClick={() => window.location.href = "/"}
              className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-500 transition-all text-base font-semibold shadow-lg gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <House size={20} weight="bold" />
              Home
            </button>
            <button
              onClick={() => {
                setIsAutoRefreshing(true);
                setCountdown(10);
              }}
              className="flex items-center justify-center px-6 py-3 bg-white text-blue-700 rounded-xl border border-blue-200 hover:bg-blue-50 transition-all text-base font-semibold gap-2 shadow focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <ArrowClockwise size={20} weight="bold" className={isAutoRefreshing ? "animate-spin" : ""} />
              {isAutoRefreshing ? `Refreshing in ${countdown}s` : "Refresh"}
            </button>
          </div>

          {/* Technical details accordion */}
          {showTechnicalDetails && errorDetails && (
            <div className="mt-7 border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-gray-50">
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 bg-gray-100 flex items-center justify-between text-left text-base font-semibold text-gray-700 hover:bg-gray-200 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Bug size={18} />
                  Technical Details
                </div>
                <span className="text-gray-500 text-xs">{isExpanded ? "Hide" : "Show"}</span>
              </button>
              {isExpanded && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-start gap-2">
                    <Stack size={18} className="mt-1 flex-shrink-0 text-blue-400" />
                    <pre className="text-xs font-mono bg-gray-100 p-3 rounded overflow-x-auto max-h-40 w-full text-gray-700">
                      {typeof errorDetails === 'object' 
                        ? JSON.stringify(errorDetails, null, 2) 
                        : errorDetails}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Support link */}
          <p className="text-sm text-gray-500 pt-4">
            Need help? <a className="text-blue-600 font-medium">support@zai-fi.com</a>
          </p>
        </div>
      </div>
      {/* Floating animation keyframes */}
      <style>{`
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
};

export default ErrorPage;