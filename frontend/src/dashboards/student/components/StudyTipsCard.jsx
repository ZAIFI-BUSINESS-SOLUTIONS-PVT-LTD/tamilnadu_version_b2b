import React from 'react';
import { CheckCircle, Lightbulb, BookOpen, Clock, Brain, Target, Zap } from 'lucide-react';
import { Card } from '../../../components/ui/card.jsx';

/**
 * StudyTipsCard - Displays personalized study techniques and habits
 * 
 * @param {Array} studyTips - Array of 5 study tips with practical techniques
 * Each tip object contains:
 *   - category: string (Time Management, Revision Strategy, etc.)
 *   - tip: string (practical study technique)
 *   - relevance: string (why this applies to the student)
 */
const StudyTipsCard = ({ studyTips = [] }) => {
  // Category icon mapping
  const getCategoryIcon = (category) => {
    const iconClass = "w-4 h-4";
    switch (category) {
      case 'Time Management':
        return <Clock className={iconClass} />;
      case 'Revision Strategy':
        return <BookOpen className={iconClass} />;
      case 'Practice Method':
        return <Target className={iconClass} />;
      case 'Learning Technique':
        return <Brain className={iconClass} />;
      case 'Mistake Analysis':
        return <Zap className={iconClass} />;
      default:
        return <Lightbulb className={iconClass} />;
    }
  };

  // Category color mapping
  const getCategoryColor = (category) => {
    switch (category) {
      case 'Time Management':
        return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
      case 'Revision Strategy':
        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
      case 'Practice Method':
        return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
      case 'Learning Technique':
        return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' };
      case 'Mistake Analysis':
        return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  if (!studyTips || studyTips.length === 0) {
    return (
      <Card className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-1 rounded-md bg-purple-100">
            <Brain className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Study Tips</h3>
            <p className="text-xs text-gray-600">Personalized learning techniques</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
          <p className="text-gray-700">Coming soon!</p>
          <p className="text-xs text-gray-500 mt-1">
            Study tips will be available after more performance data is collected.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="space-y-2">
        {studyTips.map((tip, index) => {
          const colors = getCategoryColor(tip.category);
          const icon = getCategoryIcon(tip.category);

          return (
            <div
              key={index}
              className="bg-gray-50 rounded-md p-3 shadow-sm border border-gray-100 hover:shadow transition-shadow"
            >
              <div className="flex gap-3">
                {/* Tip Number */}
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                    {index + 1}
                  </div>
                </div>

                {/* Tip Content */}
                <div className="flex-1 min-w-0">
                  {/* Category Badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${colors.bg} ${colors.text}`}>
                      {icon}
                      <span className="text-xs">{tip.category}</span>
                    </span>
                  </div>

                  {/* Tip Text */}
                  <div className="mb-1">
                    <p className="text-sm text-gray-800 leading-tight">
                      {tip.tip}
                    </p>
                  </div>

                  {/* Relevance */}
                  {tip.relevance && (
                    <div className={`flex items-start gap-2 p-2 rounded-md border ${colors.border} ${colors.bg} bg-opacity-20`}>
                      <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-700 leading-tight">
                        <span className="font-medium">Why this helps:</span> {tip.relevance}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default StudyTipsCard;
