import React from 'react';
import {
  ChartLine,
  ClipboardText,
  TrendUp,
  Archive,
  Question // Added for fallback
} from '@phosphor-icons/react';

/**
 * ICON_MAPPING
 * Maps string names to Phosphor React icon components.
 * Icons are marked with `aria-hidden="true"` as they are decorative.
 * Includes a 'Default' fallback icon for when an icon name is not found.
 *
 * @type {Object.<string, JSX.Element>}
 */
const ICON_MAPPING = {
  ChartLine: <ChartLine aria-hidden="true" />,
  ClipboardText: <ClipboardText aria-hidden="true" />,
  TrendUp: <TrendUp aria-hidden="true" />,
  Archive: <Archive aria-hidden="true" />,
  Default: <Question aria-hidden="true" /> // Fallback icon
};

/**
 * Helper function to format the raw statistic value for display.
 * Handles null, undefined, or empty strings, attempts robust numeric parsing,
 * formats numbers to one decimal place (unless originally an integer),
 * and preserves percentage signs.
 *
 * @param {*} value - The raw value of the statistic to format.
 * @returns {string} The formatted string representation of the value.
 */
const formatStatValue = (value) => {
  // Handle null, undefined, or empty string values gracefully
  if (value === null || value === undefined || String(value).trim() === '') {
    return 'N/A'; // Or some other placeholder like '-'
  }

  const valueStr = String(value);
  const isPercentage = valueStr.includes('%');

  // Attempt to extract numeric part more robustly
  // This regex removes common currency symbols, commas, and then the percentage sign if present.
  // It aims to keep the core number (including decimals and negative sign).
  const numericString = valueStr.replace(/[^0-9.-]+/g, "");
  const rawValue = parseFloat(numericString);

  if (!isNaN(rawValue)) {
    // Check if the original value string indicates it was an integer (e.g., "10", not "10.0" or "10.5")
    // and the parsed rawValue is indeed an integer.
    const wasIntendedAsInteger = Number.isInteger(rawValue) && !valueStr.includes('.');
    const formattedValue = wasIntendedAsInteger ? rawValue : rawValue.toFixed(1);
    return isPercentage ? `${formattedValue}%` : formattedValue;
  }

  // If parsing fails, return the original value as a fallback
  return valueStr;
};

/**
 * SummaryCards Component
 *
 * Displays a collection of summary statistic cards. Each card shows an icon,
 * a title, and a formatted value. The layout adapts to different screen sizes
 * (vertical on small screens, horizontal on larger screens).
 *
 * @param {object} props - The component props.
 * @param {Array<object>} props.data - An array of card data objects.
 * Each object should have:
 * - `icon` (string, optional): A key from `ICON_MAPPING` to specify the icon. Defaults to 'Default'.
 * - `title` (string, optional): The title of the statistic. Defaults to 'Untitled Stat'.
 * - `value` (*): The raw value of the statistic. It will be formatted by `formatStatValue`.
 * - `id` (string, optional): A unique identifier for the card, used as the React `key`.
 * If not provided, a generated index-based key will be used.
 * @returns {JSX.Element} The rendered summary cards or an alert message if no data is available.
 */
const SummaryCards = ({ data }) => {
  // Define the desired order of titles
  const desiredOrder = [
    'Overall Performance',
    'Improvement Rate',
    'Consistency Score',
    'Tests Taken'
  ];

  // Sort the data array according to the desired order
  const sortedData = Array.isArray(data)
    ? [...data].sort((a, b) => {
        const aIndex = desiredOrder.indexOf(a.title);
        const bIndex = desiredOrder.indexOf(b.title);
        // Items not in the list go to the end, preserving their original order
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      })
    : data;

  // Render an empty state if data is not a valid array or is empty
  if (!Array.isArray(sortedData) || !sortedData.length) {
    return (
      <div role="alert" className="alert alert-info shadow-lg my-4">
        {/* DaisyUI info icon SVG */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>No Summary Data Available.</span>
      </div>
    );
  }

  return (
    <div className="stats stats-vertical lg:stats-horizontal w-full shadow-lg items-stretch">
      {sortedData.map((card, index) => {
        // Destructure card properties with default fallbacks for robustness
        const {
          icon: iconName = 'Default', // Fallback to 'Default' icon if not specified
          title = 'Untitled Stat',    // Fallback title
          value,
          id // Unique ID for React key, if available in data
        } = card;

        // Retrieve the icon component from the mapping, or use the default fallback
        const IconComponent = ICON_MAPPING[iconName] || ICON_MAPPING.Default;

        // Determine the key for the list item. Prefer a unique `id` from data, otherwise use an index-based key.
        const key = id || `summary-card-${index}`;

        return (
          <div
            key={key}
            className="stat flex-1 basis-0 min-w-0 w-full hover:bg-base-200 transition-colors duration-150 ease-in-out" // Added subtle hover effect
          >
            {/* Icon display area */}
            <div className="stat-figure bg-secondary/10 rounded-full p-2 border border-secondary">
              <div className="text-3xl flex items-center justify-center font-bold text-secondary">
                {IconComponent}
              </div>
            </div>
            {/* Statistic Title */}
            <div className="stat-title text-primary text-base font-semibold">
              {title}
            </div>
            {/* Statistic Value, formatted */}
            <div className="stat-value text-3xl font-bold text-text">
              {formatStatValue(value)}
            </div>
            {/* Optional: Uncomment if `card.description` is available in your data */}
            {/* {card.description && <div className="stat-desc text-xs opacity-75">{card.description}</div>} */}
          </div>
        );
      })}
    </div>
  );
};

export default SummaryCards;