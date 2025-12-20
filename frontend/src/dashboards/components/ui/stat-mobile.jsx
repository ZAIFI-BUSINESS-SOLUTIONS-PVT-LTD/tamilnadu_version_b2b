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
const Stat = ({ icon, label, value, badge, info, className = '', style = {}, iconBgClass = 'bg-gray-100' }) => (
  <div
    className={`card rounded-xl shadow-md bg-white flex flex-col justify-between w-48 h-28 ${className} px-3 py-2 mb-1`}
    style={{ ...style }}
  >
    <div className="flex items-center gap-2 mb-2">
      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${iconBgClass} text-[1rem] p-1.5`}>
        {icon}
      </span>
    </div>
    <span className="block text-gray-500 text-xs font-medium mb-1 text-left">
      <span className="inline-flex items-center">
        {label}
        {info && (
          <span style={{ position: 'relative', display: 'inline-block', marginLeft: '4px', top: '-0.5em' }}>
            <Tooltip content={info}>
              <Info size={12} className="inline-block text-gray-400 hover:text-primary" />
            </Tooltip>
          </span>
        )}
      </span>
    </span>
    <div className="flex items-center">
      <span className="text-xl font-extrabold text-gray-900 tracking-tight flex-1 text-left">{value}</span>
      {badge && (
        <span className="ml-1">{badge}</span>
      )}
    </div>
  </div>
);

export default Stat;

/**
 * Skeleton loading state for the Stat component.
 * Displays placeholder content with pulse animation while data is loading.
 */
const StatSkeleton = () => (
  <div className="card rounded-2xl bg-white flex flex-col justify-between w-48 h-28 p-3 animate-pulse">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
    </div>
    <div className="block text-gray-500 text-xs font-medium mb-1 text-left">
      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
    </div>
    <div className="flex items-center">
      <div className="h-5 bg-gray-200 rounded w-1/2 flex-1"></div>
      <div className="h-4 bg-gray-200 rounded w-8 ml-1"></div>
    </div>
  </div>
);

export { StatSkeleton };
