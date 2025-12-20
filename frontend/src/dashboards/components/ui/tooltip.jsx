import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tooltip UI component for showing a tooltip on hover.
 * @param {Object} props
 * @param {React.ReactNode} props.children - The element that triggers the tooltip
 * @param {React.ReactNode} props.content - The tooltip content
 * @param {string} [props.className] - Additional classes for the tooltip
 */
const Tooltip = ({ children, content, className = '' }) => {
    const triggerRef = useRef(null);
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ left: 0, top: 0, placement: 'top' });

    // compute tooltip coordinates relative to viewport and pick placement (top/bottom)
    const computePos = () => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;

        let placement = 'top';
        let top = rect.top - 8; // prefer above trigger
        if (spaceAbove < 48 && spaceBelow > spaceAbove) {
            placement = 'bottom';
            top = rect.bottom + 8; // place below trigger when not enough space above
        }

        // clamp horizontally so tooltip doesn't overflow viewport
        const clampedLeft = Math.min(Math.max(centerX, 8), window.innerWidth - 8);
        setPos({ left: clampedLeft, top, placement });
    };

    useEffect(() => {
        if (!visible) return;
        // update position on scroll/resize while visible
        const handle = () => computePos();
        window.addEventListener('scroll', handle, true);
        window.addEventListener('resize', handle);
        return () => {
            window.removeEventListener('scroll', handle, true);
            window.removeEventListener('resize', handle);
        };
    }, [visible]);

    const show = () => {
        computePos();
        setVisible(true);
    };
    const hide = () => setVisible(false);

    // tooltip node rendered into body via portal to avoid clipping by parent overflow
    const tooltipNode = visible ? (
        <div
            className={`opacity-100 transition-opacity duration-150 z-[9999] px-2 py-1 rounded text-white text-xs pointer-events-none shadow-lg break-words border border-white/10 ${className}`}
            style={{
                position: 'fixed',
                left: pos.left,
                top: pos.top,
                transform: pos.placement === 'top' ? 'translateX(-50%) translateY(-100%)' : 'translateX(-50%)',
                maxWidth: '420px',
                minWidth: '120px',
                textAlign: 'center',
                whiteSpace: 'pre-line',
                background: '#1f2937', // solid dark background
                boxShadow: '0 6px 30px rgba(0,0,0,0.18)'
            }}
            role="tooltip"
        >
            {content}
        </div>
    ) : null;

    return (
        <>
            <span
                ref={triggerRef}
                className="inline-block"
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
            >
                {children}
            </span>
            {typeof document !== 'undefined' ? createPortal(tooltipNode, document.body) : tooltipNode}
        </>
    );
};

export default Tooltip;
