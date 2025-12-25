import React from 'react';
import { Info } from '@phosphor-icons/react';
import Tooltip from './tooltip';
/**
 * Stat Card UI component for displaying a statistic with icon, label, value, and optional badge.
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon to display at the top
 * @param {string} props.label - Label for the stat (e.g., "Overall Performance")
 * @param {string} [props.info] - Tooltip text for the info icon
 * @param {React.ReactNode|string|number} props.value - Main value to display
 * @param {React.ReactNode} [props.badge] - Optional badge or status (e.g., improvement rate)
 * @param {string} [props.className] - Additional classes for the card
 * @param {Object} [props.style] - Inline style for the card
 */
const Stat = ({ icon, label, value, badge, info, className = '', style = {}, compact = false, iconBg = 'bg-gray-100', iconClass = '' }) => {
  // compact: reduce vertical spacing and sizes while keeping outer padding intact (p-4 sm:p-6)
  const iconSizes = compact ? 'w-8 h-8 sm:w-10 sm:h-10 text-[1rem] sm:text-[1.25rem]' : 'w-10 h-10 sm:w-12 sm:h-12 text-[1.25rem] sm:text-[1.5rem]';
  const containerGap = compact ? 'gap-2 mb-2 sm:mb-3' : 'gap-3 mb-4 sm:mb-6';
  const labelClass = compact ? 'block text-gray-500 text-xs sm:text-sm font-medium mb-0 text-left' : 'block text-gray-500 text-sm sm:text-base font-medium mb-1 text-left';
  const valueClass = compact ? 'text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight flex-1 text-left' : 'text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight flex-1 text-left';

  return (
    <div
      className={`card rounded-2xl border border-gray-250 bg-white flex flex-col justify-between ${className} p-4 sm:p-6`}
      style={{ minHeight: 'auto', ...style }}
    >
      <div className={`flex items-center ${containerGap}`}>
        <span className={`inline-flex items-center justify-center ${iconSizes} rounded-lg ${iconBg}`}>
          {icon && React.isValidElement(icon) ? React.cloneElement(icon, { className: `${(icon.props && icon.props.className) || ''} ${iconClass}`.trim() }) : icon}
        </span>
      </div>
      <span className={labelClass}>
        <span className="inline-flex items-center mb-1">
          {label}
          {info && (
            <span style={{ position: 'relative', display: 'inline-block', marginLeft: '6px', top: compact ? '-0.35em' : '-0.6em' }}>
              <Tooltip content={info}>
                <Info size={compact ? 12 : 14} className="inline-block text-gray-400 hover:text-primary" />
              </Tooltip>
            </span>
          )}
        </span>
      </span>
      <div className={`flex items-center ${compact ? 'mt-0' : 'mt-1'}`}>
        <span className={valueClass}>{value}</span>
        {badge && (
          <span className="ml-2">{badge}</span>
        )}
      </div>
    </div>
  );
};

export default Stat;
