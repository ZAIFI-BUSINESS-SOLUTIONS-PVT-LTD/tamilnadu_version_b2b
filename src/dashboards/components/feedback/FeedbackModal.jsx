import React, { useState } from 'react';
import { X, PaperPlaneTilt } from '@phosphor-icons/react';
import { submitStudentFeedback, submitEducatorFeedback, submitInstitutionFeedback } from '../../../utils/api';

/**
 * FeedbackModal Component
 * 
 * A reusable modal for collecting feedback from students, educators, or institutions.
 * Automatically determines the correct API endpoint based on userType.
 * 
 * @param {object} props
 * @param {function} props.onClose - Function to close the modal
 * @param {string} props.userType - Type of user: 'student', 'educator', or 'institution'
 */
const FeedbackModal = ({ onClose, userType = 'student' }) => {
  const [formData, setFormData] = useState({
    satisfaction_rate: '',
    need_improvement: '',
    what_you_like: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' or 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.satisfaction_rate || !formData.need_improvement || !formData.what_you_like) {
      setErrorMessage('Please fill in all fields');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage('');

    try {
      let response;
      
      // Choose the correct API function based on user type
      switch (userType) {
        case 'educator':
          response = await submitEducatorFeedback(formData);
          break;
        case 'institution':
          response = await submitInstitutionFeedback(formData);
          break;
        case 'student':
        default:
          response = await submitStudentFeedback(formData);
          break;
      }

      if (response.success) {
        setSubmitStatus('success');
        // Close modal after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setSubmitStatus('error');
        setErrorMessage(response.error || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
      setErrorMessage(error.message || 'An error occurred while submitting feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Share Your Feedback</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close feedback modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Satisfaction Rate */}
          <div>
            <label htmlFor="satisfaction_rate" className="block text-sm font-medium text-gray-700 mb-2">
              Satisfaction Rate (1-5)
            </label>
            <select
              id="satisfaction_rate"
              name="satisfaction_rate"
              value={formData.satisfaction_rate}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select rating</option>
              <option value="1">1 - Very Dissatisfied</option>
              <option value="2">2 - Dissatisfied</option>
              <option value="3">3 - Neutral</option>
              <option value="4">4 - Satisfied</option>
              <option value="5">5 - Very Satisfied</option>
            </select>
          </div>

          {/* Need Improvement */}
          <div>
            <label htmlFor="need_improvement" className="block text-sm font-medium text-gray-700 mb-2">
              What needs improvement?
            </label>
            <textarea
              id="need_improvement"
              name="need_improvement"
              value={formData.need_improvement}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Share your thoughts on areas that need improvement..."
              required
            />
          </div>

          {/* What You Like Most */}
          <div>
            <label htmlFor="what_you_like" className="block text-sm font-medium text-gray-700 mb-2">
              What do you like most?
            </label>
            <textarea
              id="what_you_like"
              name="what_you_like"
              value={formData.what_you_like}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Share what you appreciate most..."
              required
            />
          </div>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              <p className="font-medium">Thank you for your feedback!</p>
              <p className="text-sm">Your response has been submitted successfully.</p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              <p className="font-medium">Error</p>
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || submitStatus === 'success'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin">⏳</span>
                Submitting...
              </>
            ) : submitStatus === 'success' ? (
              <>
                ✓ Submitted
              </>
            ) : (
              <>
                <PaperPlaneTilt size={20} />
                Submit Feedback
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
