import React from 'react';
import { CheckCircle, Lightbulb, BookOpen, Clock, Brain, Target, Zap } from 'lucide-react';
import { Card } from '../../components/ui/card.jsx';

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
      <Card className="rounded-2xl border border-gray-250 bg-gradient-to-br from-purple-50 to-pink-50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-100">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Study Tips</h3>
            <p className="text-sm text-gray-600">Personalized learning techniques</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
          <p className="text-gray-700 font-medium">Coming soon!</p>
          <p className="text-sm text-gray-500 mt-1">
            Study tips will be available after more performance data is collected.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-gray-250 bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-purple-100">
          <Brain className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">Study Smarter</h3>
          <p className="text-sm text-gray-600">Practical techniques tailored for you</p>
        </div>
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
          {studyTips.length} {studyTips.length === 1 ? 'Tip' : 'Tips'}
        </span>
      </div>

      <div className="space-y-3">
        {studyTips.map((tip, index) => {
          const colors = getCategoryColor(tip.category);
          const icon = getCategoryIcon(tip.category);

          return (
            <div 
              key={index} 
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex gap-3">
                {/* Tip Number */}
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center text-sm font-bold shadow-md">
                    {index + 1}
                  </div>
                </div>

                {/* Tip Content */}
                <div className="flex-1 min-w-0">
                  {/* Category Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 ${colors.bg} ${colors.text}`}>
                      {icon}
                      <span>{tip.category}</span>
                    </span>
                  </div>

                  {/* Tip Text */}
                  <div className="mb-2">
                    <p className="text-sm text-gray-800 leading-relaxed font-medium">
                      {tip.tip}
                    </p>
                  </div>

                  {/* Relevance */}
                  {tip.relevance && (
                    <div className={`flex items-start gap-2 p-2 rounded-lg border ${colors.border} ${colors.bg} bg-opacity-30`}>
                      <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-700 leading-relaxed">
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

      {/* Footer Tip */}
      <div className="mt-4 p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200">
        <p className="text-xs text-purple-900">
          <strong>Pro Tip:</strong> Try implementing one technique at a time. Master it before adding the next one for best results.
        </p>
      </div>
    </Card>
  );
};

export default StudyTipsCard;
