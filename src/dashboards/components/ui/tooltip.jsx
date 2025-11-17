import React from 'react';

/**
 * Tooltip UI component for showing a tooltip on hover.
 * @param {Object} props
 * @param {React.ReactNode} props.children - The element that triggers the tooltip
 * @param {React.ReactNode} props.content - The tooltip content
 * @param {string} [props.className] - Additional classes for the tooltip
 */
const Tooltip = ({ children, content, className = '' }) => (
    <span className="group relative cursor-pointer">
        <span
            className={`opacity-0 group-hover:opacity-100 transition-opacity absolute z-50 left-1/2 -translate-x-1/2 mb-2 px-4 py-0.5 rounded text-white text-xs pointer-events-none shadow-lg break-words border border-white/20 backdrop-blur-md ${className}`}
            style={{
                bottom: '100%',
                maxWidth: '420px',
                minWidth: '180px',
                textAlign: 'center',
                whiteSpace: 'pre-line',
                background: 'rgba(24, 33, 48, 0.55)', // glassy dark bg
                boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)',
                WebkitBackdropFilter: 'blur(8px)',
                backdropFilter: 'blur(8px)',
                zIndex: 9999 // ensure tooltip is above all cards
            }}
        >
            {content}
        </span>
        {children}
    </span>
);

export default Tooltip;
