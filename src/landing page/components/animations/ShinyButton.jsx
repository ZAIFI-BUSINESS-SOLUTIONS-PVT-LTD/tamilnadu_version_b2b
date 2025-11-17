import React from 'react';

const ShinyButton = ({ children, disabled = false, speed = 5, className = '', ...props }) => {
    const animationDuration = `${speed}s`;

    return (
        <button
            className={`relative overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 text-white font-medium rounded-md px-6 py-3 transition-opacity ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'
                } ${className}`}
            disabled={disabled}
            {...props}
        >
            {/* Shine overlay */}
            {!disabled && (
                <span
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none bg-[length:200%_200%] animate-shine"
                    style={{
                        backgroundImage: 'linear-gradient(125deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.18) 40%, rgba(255,255,255,0.36) 50%, rgba(255,255,255,0.18) 60%, rgba(255,255,255,0) 80%)',
                        animationDuration: animationDuration,
                        animationTimingFunction: 'ease-in-out',
                        zIndex: 1,
                        mixBlendMode: 'overlay',
                    }}
                />
            )}
            <span className="relative z-10 flex items-center justify-center w-full h-full">
                {children}
            </span>
        </button>
    );
};

export default ShinyButton;