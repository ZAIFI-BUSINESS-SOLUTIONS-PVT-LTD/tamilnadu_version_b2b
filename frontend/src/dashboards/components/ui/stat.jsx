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
const Stat = ({ icon, label, value, badge, info, className = '', style = {} }) => (
  <div
    className={`card rounded-2xl border border-gray-250 bg-white flex flex-col justify-between ${className} p-4 sm:p-6`}
    style={{ minHeight: 'auto', ...style }}
  >
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <span className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-100 text-[1.25rem] sm:text-[1.5rem]">
        {icon}
      </span>
    </div>
    <span className="block text-gray-500 text-sm sm:text-base font-medium mb-1 text-left">
      <span className="inline-flex items-center">
        {label}
        {info && (
          <span style={{ position: 'relative', display: 'inline-block', marginLeft: '6px', top: '-0.6em' }}>
            <Tooltip content={info}>
              <Info size={14} className="inline-block text-gray-400 hover:text-primary" />
            </Tooltip>
          </span>
        )}
      </span>
    </span>
    <div className="flex items-center mt-1">
      <span className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight flex-1 text-left">{value}</span>
      {badge && (
        <span className="ml-2">{badge}</span>
      )}
    </div>
  </div>
);

export default Stat;
