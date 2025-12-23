import React from 'react';
import { CheckCircle, Target, Lightbulb } from 'lucide-react';
import { Card } from '../../../components/ui/card.jsx';

/**
 * ActionPlanCard - Displays a student's top 5 personalized action items
 * 
 * @param {Array} actionPlan - Array of top 5 action items across all weak topics
 * Each action object contains:
 *   - topic: string
 *   - subject: string
 *   - accuracy: number (0-1)
 *   - action: string (single actionable insight)
 */
const ActionPlanCard = ({ actionPlan = [] }) => {
  if (!actionPlan || actionPlan.length === 0) {
    return (
      <Card className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-1 rounded-md bg-blue-100">
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Action Plan</h3>
            <p className="text-xs text-gray-600">Your personalized improvement roadmap</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
          <p className="text-gray-700">Great job!</p>
          <p className="text-xs text-gray-500 mt-1">
            No weaknesses detected. Keep up the excellent work!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="space-y-2">
        {actionPlan.map((actionItem, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded-md p-3 shadow-sm border border-gray-100 hover:shadow transition-shadow"
          >
            <div className="flex gap-3">
              {/* Priority Number */}
              <div className="flex-shrink-0">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                  {index + 1}
                </div>
              </div>

              {/* Action Content */}
              <div className="flex-1 min-w-0">
                {/* Topic and Subject */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-700">
                    {actionItem.topic}
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700">
                    {actionItem.subject}
                  </span>
                </div>

                {/* Action Text */}
                <div className="flex items-start gap-2">
                  <p className="text-sm text-gray-800 leading-tight">
                    {actionItem.action}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ActionPlanCard;
