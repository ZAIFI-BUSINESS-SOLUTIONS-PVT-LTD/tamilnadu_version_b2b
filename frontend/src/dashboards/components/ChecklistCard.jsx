import React from 'react';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Card } from '../../components/ui/card.jsx';

/**
 * ChecklistCard - Displays diagnostic checklist of student's problems/mistakes
 * 
 * @param {Array} checklist - Array of top 6 problem checkpoints across all weak topics
 * Each checkpoint object contains:
 *   - topic: string
 *   - subject: string
 *   - accuracy: number (0-1)
 *   - problem: string (identified mistake or misconception)
 */
const ChecklistCard = ({ checklist = [] }) => {
  if (!checklist || checklist.length === 0) {
    return (
      <Card className="rounded-2xl border border-gray-250 bg-gradient-to-br from-green-50 to-emerald-50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-green-100">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Problem Checklist</h3>
            <p className="text-sm text-gray-600">Diagnostic review of mistakes</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
          <p className="text-gray-700 font-medium">No critical issues found!</p>
          <p className="text-sm text-gray-500 mt-1">
            Your performance shows no major problem patterns.
          </p>
        </div>
      </Card>
    );
  }

  // Determine severity color based on accuracy
  const getSeverityColor = (accuracy) => {
    if (accuracy < 0.4) return 'red'; // Critical
    if (accuracy < 0.6) return 'amber'; // Warning
    return 'orange'; // Moderate
  };

  const getSeverityIcon = (accuracy) => {
    if (accuracy < 0.4) return <XCircle className="w-4 h-4 text-red-500" />;
    if (accuracy < 0.6) return <AlertCircle className="w-4 h-4 text-amber-500" />;
    return <AlertCircle className="w-4 h-4 text-orange-500" />;
  };

  const getSeverityBg = (accuracy) => {
    if (accuracy < 0.4) return 'bg-red-50 border-red-200 hover:bg-red-100';
    if (accuracy < 0.6) return 'bg-amber-50 border-amber-200 hover:bg-amber-100';
    return 'bg-orange-50 border-orange-200 hover:bg-orange-100';
  };

  return (
    <Card className="rounded-2xl border border-gray-250 bg-gradient-to-br from-red-50 to-orange-50 p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-red-100">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">Problem Checklist</h3>
          <p className="text-sm text-gray-600">Issues identified in your performance</p>
        </div>
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
          {checklist.length} {checklist.length === 1 ? 'Issue' : 'Issues'}
        </span>
      </div>

      <div className="space-y-3">
        {checklist.map((checkpoint, index) => {
          const severityColor = getSeverityColor(checkpoint.accuracy);
          const severityIcon = getSeverityIcon(checkpoint.accuracy);
          const severityBg = getSeverityBg(checkpoint.accuracy);

          return (
            <div 
              key={index} 
              className={`bg-white rounded-xl p-4 shadow-sm border-2 ${severityBg} transition-all`}
            >
              <div className="flex gap-3">
                {/* Checkpoint Number with Severity Icon */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 text-white flex items-center justify-center text-sm font-bold shadow-md">
                    {index + 1}
                  </div>
                  {severityIcon}
                </div>

                {/* Problem Content */}
                <div className="flex-1 min-w-0">
                  {/* Topic and Subject */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">
                      {checkpoint.subject}
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      {checkpoint.topic}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({Math.round(checkpoint.accuracy * 100)}%)
                    </span>
                  </div>

                  {/* Problem Description */}
                  <div className="flex items-start gap-2">
                    <XCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      checkpoint.accuracy < 0.4 ? 'text-red-500' : 
                      checkpoint.accuracy < 0.6 ? 'text-amber-500' : 
                      'text-orange-500'
                    }`} />
                    <p className="text-sm text-gray-800 leading-relaxed font-medium">
                      {checkpoint.problem}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-4 p-3 bg-amber-100 rounded-lg border border-amber-200">
        <p className="text-xs text-amber-900">
          <strong>Note:</strong> This checklist identifies what went wrong. Review these issues to understand your mistakes before working on improvements.
        </p>
      </div>
    </Card>
  );
};

export default ChecklistCard;
