/**
 * Utility functions to format mathematical expressions and LaTeX
 */

/**
 * Clean and format mathematical text by converting LaTeX to readable format
 * @param {string} text - Text containing LaTeX expressions
 * @returns {string} - Formatted text
 */
export const formatMathText = (text) => {
  if (!text) return '';
  
  let formatted = text;
  
  // Replace common LaTeX patterns with readable equivalents
  formatted = formatted
    // Remove \mathrm{} wrappers
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    // Replace \circ with degree symbol
    .replace(/\\circ/g, '°')
    // Replace ^ for superscripts (keep for now, could be enhanced)
    .replace(/\^{-1}/g, '⁻¹')
    .replace(/\^{2}/g, '²')
    .replace(/\^{3}/g, '³')
    // Replace common symbols
    .replace(/\\Omega/g, 'Ω')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\sim/g, '~')
    // Clean up extra spaces and tildes
    .replace(/~+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return formatted;
};

/**
 * Format question text with proper math rendering
 * @param {string} text - Question text
 * @returns {string} - Formatted question
 */
export const formatQuestionText = (text) => {
  if (!text) return '';
  
  // Process text within $ delimiters
  return text.replace(/\$([^$]+)\$/g, (match, mathContent) => {
    return formatMathText(mathContent);
  });
};

/**
 * Format option text
 * @param {string} text - Option text
 * @returns {string} - Formatted option
 */
export const formatOptionText = (text) => {
  if (!text) return '';
  return formatQuestionText(text);
};
