import React from 'react';

/**
 * InsightCard component displays a detailed insight card.
 * It features a main title, a specific item to which the insights pertain,
 * and a list of individual insights. The card is styled with shadows,
 * rounded corners, and hover effects.
 *
 * @param {object} props - The component props.
 * @param {string} props.title - The main title of the insight card (e.g., "Topic Analysis").
 * @param {string} props.item - The specific item or subject that the insights are about (e.g., "Physics - Optics").
 * @param {string[]} props.insights - An array of strings, where each string is a distinct insight.
 * @param {string} [props.className=''] - Optional CSS class names to apply to the outermost div for additional styling.
 * @returns {React.Element} A React component rendering an insight card.
 */
const InsightCard = ({ title, item, insights, className = '' }) => (
  <div
    className={`card bg-white shadow-lg rounded-2xl p-5 transition-all duration-300 
      hover:shadow-xl border border-gray-100 h-full ${className}`}
  >
    <div className="flex flex-col h-full">
      {/* Card Header Section */}
      <div>
        <h3 className="text-primary text-xl font-semibold mb-4 border-b pb-2">
          {title}
        </h3>
        <p className="text-base text-gray-600 mb-3">
          Detailed analysis for{' '}
          <span className="font-semibold text-gray-800">{item}</span>:
        </p>
      </div>

      {/* Insights List Section (occupies remaining vertical space) */}
      <div className="flex-grow">
        <ul className="list-disc list-inside text-gray-700 space-y-2 text-base leading-relaxed">
          {insights.length > 0 ? (
            // Render each insight if the array is not empty
            insights.map((insight, idx) => (
              <li key={idx} className="hover:text-primary transition-colors duration-200">
                {insight}
              </li>
            ))
          ) : (
            // Display a fallback message if no insights are available
            <li className="text-gray-500">No insights available</li>
          )}
        </ul>
      </div>
    </div>
  </div>
);

export default InsightCard;