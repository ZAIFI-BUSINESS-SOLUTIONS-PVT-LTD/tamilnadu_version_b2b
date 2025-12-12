import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/select.jsx';
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
    satisfaction_rate: null,
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
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
      <Card className="max-w-xl w-full">
        <CardHeader className="relative flex items-center justify-center">
          <div>
            <CardTitle className="text-lg">Share Your Feedback</CardTitle>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            aria-label="Close feedback modal"
            className="absolute right-4 top-2 text-gray-400 hover:text-gray-600 rounded-full"
          >
            <X size={22} aria-hidden="true" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Satisfaction Rate</label>
              <Select value={formData.satisfaction_rate} onValueChange={(v) => setFormData(prev => ({ ...prev, satisfaction_rate: v }))}>
                <SelectTrigger className="w-full text-left">
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Very Dissatisfied</SelectItem>
                  <SelectItem value="2">2 - Dissatisfied</SelectItem>
                  <SelectItem value="3">3 - Neutral</SelectItem>
                  <SelectItem value="4">4 - Satisfied</SelectItem>
                  <SelectItem value="5">5 - Very Satisfied</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">What needs improvement?</label>
              <textarea
                name="need_improvement"
                value={formData.need_improvement}
                onChange={handleInputChange}
                rows={4}
                className="w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring resize-none"
                placeholder="Share your thoughts on areas that need improvement..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">What do you like most?</label>
              <textarea
                name="what_you_like"
                value={formData.what_you_like}
                onChange={handleInputChange}
                rows={4}
                className="w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring resize-none"
                placeholder="Share what you appreciate most..."
                required
              />
            </div>

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

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isSubmitting || submitStatus === 'success'}>
                {isSubmitting ? 'Submitting...' : submitStatus === 'success' ? '✓ Submitted' : (<><Send size={16} /> Submit Feedback</>)}
              </Button>
              <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackModal;
