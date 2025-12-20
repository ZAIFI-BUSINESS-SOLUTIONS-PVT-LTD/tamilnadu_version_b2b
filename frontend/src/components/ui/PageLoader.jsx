import React from "react";
import Logo from '../../assets/images/logo.svg';

// Full-page loader used as a Suspense fallback for routes/pages
export default function PageLoader() {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900"
            role="status"
            aria-live="polite"
            aria-label="Loading"
        >
            <div className="flex flex-col items-center space-y-3 p-4">
                {/* Use the project logo for branding; animate only when user allows motion */}
                <img
                    src={Logo}
                    alt="InzightEd logo"
                    // Wordmark logos shouldn't rotate — use a subtle pulse/scale to indicate activity
                    className="w-40 h-auto motion-safe:animate-pulse motion-reduce:animate-none"
                    width="160"
                    height="56"
                    aria-hidden="true"
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">Loading…</span>
            </div>
        </div>
    );
}
