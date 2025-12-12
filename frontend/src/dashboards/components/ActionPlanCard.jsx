import React from 'react';
import { CheckCircle, Target, Lightbulb } from 'lucide-react';
import { Card } from '../../components/ui/card.jsx';

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
      <Card className="rounded-2xl border border-gray-250 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-100">
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Action Plan</h3>
            <p className="text-sm text-gray-600">Your personalized improvement roadmap</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
          <p className="text-gray-700 font-medium">Great job!</p>
          <p className="text-sm text-gray-500 mt-1">
            No weaknesses detected. Keep up the excellent work!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-gray-250 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-blue-100">
          <Target className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">Your Action Plan</h3>
          <p className="text-sm text-gray-600">Top 5 priority actions to improve your performance</p>
        </div>
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
          Top {actionPlan.length}
        </span>
      </div>

      <div className="space-y-3">
        {actionPlan.map((actionItem, index) => (
          <div 
            key={index} 
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex gap-3">
              {/* Priority Number */}
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-md">
                  {index + 1}
                </div>
              </div>

              {/* Action Content */}
              <div className="flex-1 min-w-0">
                {/* Topic and Subject */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-indigo-100 text-indigo-700">
                    {actionItem.subject}
                  </span>
                  <span className="text-xs font-medium text-gray-700">
                    {actionItem.topic}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({Math.round(actionItem.accuracy * 100)}%)
                  </span>
                </div>

                {/* Action Text */}
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-800 leading-relaxed font-medium">
                    {actionItem.action}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Tip */}
      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Tip:</strong> These are your highest-impact actions. Focus on #1 first for maximum improvement.
        </p>
      </div>
    </Card>
  );
};

export default ActionPlanCard;
