import React from "react";
import Lottie from 'lottie-react';
import animationData from './Loading animation.json';

/**
 * LoadingPage
 * Props:
 * - fixed (boolean) default true: when true the loader will be fixed full-screen (backwards compatible).
 * - className (string) additional classes applied to the root container (merged).
 */
export default function PageLoader({ fixed = true, className = '' }) {
    const baseClass = fixed ? 'fixed inset-0 z-50 flex items-center justify-center' : 'absolute inset-0 flex items-center justify-center';
    // When used in non-fixed mode we don't force a background; caller can pass bg classes via className.
    const bgClass = fixed ? 'bg-white dark:bg-gray-900' : '';

    return (
        <div
            className={`${baseClass} ${bgClass} ${className}`.trim()}
            role="status"
            aria-live="polite"
            aria-label="Loading"
        >
            <div className="flex flex-col items-center space-y-3 p-4">
                {/* Lottie animation */}
                <Lottie animationData={animationData} loop={true} style={{ width: 200, height: 200 }} />
            </div>
        </div>
    );
}
