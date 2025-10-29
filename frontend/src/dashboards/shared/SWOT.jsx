import React from 'react';
import PropTypes from 'prop-types'; // Import PropTypes

/**
 * SwotSection Component
 * Renders a single section of a SWOT analysis (e.g., Strengths, Weaknesses)
 * for a specified subject.
 *
 * @param {Object} props - The component props.
 * @param {string} props.label - The label for the SWOT section (e.g., "Strengths", "Weaknesses").
 * @param {React.ReactNode} props.icon - The icon element to display next to the label.
 * @param {string} props.color - Tailwind CSS class string for the label's text color (e.g., "text-green-600").
 * @param {string} props.border - Tailwind CSS class string for the border color of the individual items (e.g., "border-green-300").
 * @param {Object} props.data - The full SWOT data object, structured by subject and then by SWOT category.
 * Expected structure: `{ [subjectName]: { Strengths: [], Weaknesses: [], ... } }`.
 * @param {string} props.selectedSubject - The name of the subject for which to display SWOT data.
 */
const SwotSection = ({ label, icon, color, border, data, selectedSubject }) => {
  // Safely access the data for the selected subject and the current label.
  // Fallback to an empty array if the path doesn't exist to prevent errors.
  const itemsToRender = data?.[selectedSubject]?.[label] || [];

  return (
    <div className="card bg-base-100 shadow-xl p-4">
      {/* Section Title with Icon */}
      <h3 className={`${color} font-semibold flex items-center mb-4 text-xl`}>
        {icon}
        <span className="ml-2">{label}</span> {/* Added margin for spacing between icon and text */}
      </h3>

      {/* List of SWOT Items for the selected subject/label */}
      <div className="space-y-4">
        {itemsToRender.length > 0 ? (
          itemsToRender.map((item, idx) => (
            // Using a more robust key: combine label, subject, and item title (if unique), fallback to index if necessary.
            // Ideally, each 'item' should have a unique ID from the data source.
            <div key={item.id || `${label}-${selectedSubject}-${item.title || ''}-${idx}`} className={`p-3 border ${border} rounded-lg`}>
              <h4 className="font-bold text-lg mb-1">{item.title}</h4> {/* Added margin-bottom */}
              <p className="text-base text-gray-600 mb-2">{item.description}</p> {/* Added margin-bottom */}
              
              {item.topics && item.topics.length > 0 && (
                <ul className="list-disc list-inside mt-2 text-base text-gray-700">
                  {item.topics.map((topic, i) => (
                    // Using a composite key for topics for better stability
                    <li key={`${item.id || item.title || ''}-topic-${topic}-${i}`}>{topic}</li>
                  ))}
                </ul>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500 italic">No data available for this category.</p>
        )}
      </div>
    </div>
  );
};

// Prop Types for validation and documentation
SwotSection.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.element.isRequired, // Expects a React element (e.g., <Icon />)
  color: PropTypes.string.isRequired, // Tailwind CSS class for text color
  border: PropTypes.string.isRequired, // Tailwind CSS class for border color
  selectedSubject: PropTypes.string.isRequired,
  data: PropTypes.objectOf( // data is an object where keys are subject names
    PropTypes.objectOf( // each subject value is an object where keys are SWOT labels (Strengths, Weaknesses, etc.)
      PropTypes.arrayOf( // the value for each SWOT label is an array of item objects
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // Optional unique ID for the item
          title: PropTypes.string.isRequired,
          description: PropTypes.string.isRequired,
          topics: PropTypes.arrayOf(PropTypes.string).isRequired,
        })
      )
    )
  ).isRequired,
};

export default SwotSection;