import React from 'react';
import { CheckCircle, AlertTriangle, Lightbulb, Clock } from 'lucide-react';

/**
 * KeyInsights Component
 *
 * Displays a set of categorized insights (Strengths, Areas for Improvement, Recommendations, Consistency Vulnerability).
 * It renders each category as a card within a responsive grid layout.
 *
 * @param {object} props - The component props.
 * @param {object} props.data - An object containing arrays of insights for each category.
 * Expected structure:
 * `{
 * keyStrengths: string[],
 * areasForImprovement: string[],
 * quickRecommendations: string[],
 * yetToDecide: string[]
 * }`
 * If a category array is missing or empty, a "No [Category] available." message will be displayed.
 * @param {number} [props.columns=4] - An optional prop to control the number of columns in the grid layout.
 * - `1`: Always a single column.
 * - `2`: Two columns on medium screens (`md`) and up.
 * - `4`: Four columns on large screens (`lg`) and up (default).
 * @returns {JSX.Element} The rendered key insights section or a "No Insights Available" message.
 */
const KeyInsights = ({ data, columns = 4 }) => {
  // Guard clause for invalid or missing data
  if (!data || typeof data !== 'object') {
    return <p className="text-gray-500 text-center py-4">No Insights Available</p>;
  }

  // Destructure insights arrays from data, providing default empty arrays
  const {
    keyStrengths = [],
    areasForImprovement = [],
    quickRecommendations = [],
    yetToDecide = [] // Renamed "yetToDecide" to "consistencyVulnerability" in the UI logic for clarity
  } = data;

  /**
   * Defines the structure and content for each insight section.
   * Each object specifies the title, the corresponding data array,
   * the icon to display, and the Tailwind CSS text color class.
   * @type {Array<Object>}
   */
  const sections = [
    {
      title: 'Key Strengths',
      items: keyStrengths,
      icon: <CheckCircle size={20} className="text-green-500" />,
      textColor: 'text-green-600',
    },
    {
      title: 'Areas for Improvement',
      items: areasForImprovement,
      icon: <AlertTriangle size={20} className="text-amber-500" />,
      textColor: 'text-amber-600',
    },
    {
      title: 'Quick Recommendations',
      items: quickRecommendations,
      icon: <Lightbulb size={20} className="text-blue-500" />,
      textColor: 'text-blue-600',
    },
    {
      title: 'Consistency Vulnerability', // Display name for 'yetToDecide' data
      items: yetToDecide,
      icon: <Clock size={20} className="text-purple-500" />,
      textColor: 'text-purple-600',
    }
  ];

  /**
   * Dynamically generates Tailwind CSS grid classes based on the `columns` prop.
   * @type {string}
   */
  const gridClass = `grid grid-cols-1 ${columns >= 2 ? 'md:grid-cols-2' : ''} ${columns >= 4 ? 'lg:grid-cols-4' : ''} gap-6`;

  return (
    <div className={gridClass}>
      {sections.map((section, idx) => (
        <div
          key={idx} // Using index as key is acceptable here as the list is static and its order won't change
          className={`card shadow-lg rounded-2xl p-5 transition-all duration-300 hover:shadow-xl border bg-white border-gray-100`}
          role="region" // Semantic role for accessibility
          aria-labelledby={`section-title-${idx}`} // Link to the section title for accessibility
        >
          <div className="card-body p-0">
            {/* Section Header: Icon and Title */}
            <div className="flex items-center gap-2 mb-4 border-b pb-2">
              {section.icon}
              <h3 id={`section-title-${idx}`} className={`${section.textColor} text-lg font-semibold`}>
                {section.title}
              </h3>
            </div>
            {/* List of Insights */}
            <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed">
              {section.items.length > 0 ? (
                section.items.map((item, i) => (
                  <li
                    key={i} // Using index as key is acceptable for simple static lists of strings
                    className={`text-primary hover:opacity-80 transition-colors duration-200`}
                  >
                    {item}
                  </li>
                ))
              ) : (
                // Message for empty sections
                <li className="text-gray-500">No {section.title.toLowerCase()} available.</li>
              )}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};

export default KeyInsights;