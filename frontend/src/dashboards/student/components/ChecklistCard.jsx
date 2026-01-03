import React from 'react';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Card } from '../../../components/ui/card.jsx';

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
      <Card className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
          <p className="text-foreground">No critical issues found!</p>
          <p className="text-xs text-muted-foreground mt-1">
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
    if (accuracy < 0.4) return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/40';
    if (accuracy < 0.6) return 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40';
    return 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/40';
  };

  return (
    <Card className="rounded-lg border border-border bg-card p-3">

      <div className="space-y-2">
        {checklist.map((checkpoint, index) => {
          const severityColor = getSeverityColor(checkpoint.accuracy);
          const severityIcon = getSeverityIcon(checkpoint.accuracy);
          const severityBg = getSeverityBg(checkpoint.accuracy);

          return (
            <div
              key={index}
              className={`rounded-md p-3 shadow-sm border ${severityBg} transition-all`}
            >
              <div className="flex gap-3">
                {/* Checkpoint Number with Severity Icon */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                  <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                    {index + 1}
                  </div>
                </div>

                {/* Problem Content */}
                <div className="flex-1 min-w-0">
                  {/* Topic and Subject */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-foreground">
                      {checkpoint.topic}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary border border-primary/30 dark:bg-primary-950/20 dark:border-primary-800/40 dark:text-primary-300">
                      {checkpoint.subject}
                    </span>
                  </div>

                  {/* Problem Description */}
                  <div className="flex items-start gap-2">
                    <p className="text-sm text-foreground leading-tight">
                      {checkpoint.problem}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ChecklistCard;
