import React from 'react';
import { Info } from '@phosphor-icons/react';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip.jsx';
import { Badge } from './ui/badge.jsx';
import { Button } from './ui/button.jsx';
/**
 * Stat Card UI component for displaying a statistic with icon, label, value, and optional badge.
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon to display at the top
 * @param {string} props.label - Label for the stat (e.g., "Overall Performance")
 * @param {string} [props.info] - Tooltip text for the info icon
 * @param {React.ReactNode|string|number} props.value - Main value to display
 * @param {React.ReactNode|Object} [props.badge] - Optional badge (ReactNode or {text, variant, className})
 * @param {React.ReactNode|Object} [props.action] - Optional action button ({label, onClick, variant})
 * @param {string} [props.className] - Additional classes for the card
 * @param {Object} [props.style] - Inline style for the card
 */
const Stat = ({ icon, label, value, badge, action, info, className = '', style = {}, compact = false, iconBg = 'bg-muted', iconClass = '' }) => {
  // compact: reduce vertical spacing and sizes while keeping outer padding intact (p-4 sm:p-6)
  const iconSizes = compact ? 'w-8 h-8 sm:w-10 sm:h-10 text-[1rem] sm:text-[1.25rem]' : 'w-10 h-10 sm:w-12 sm:h-12 text-[1.25rem] sm:text-[1.5rem]';
  const containerGap = compact ? 'gap-2 mb-2 sm:mb-3' : 'gap-3 mb-4 sm:mb-6';
  const labelClass = compact ? 'block text-muted-foreground text-xs sm:text-sm font-medium mb-0 text-left' : 'block text-muted-foreground text-sm sm:text-base font-medium mb-1 text-left';
  const valueClass = compact ? 'text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex-1 text-left' : 'text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight flex-1 text-left';

  return (
    <div
      className={`card rounded-2xl border border-border bg-card flex flex-col justify-between ${className} p-4 sm:p-6`}
      style={{ minHeight: 'auto', ...style }}
    >
      <div className={`flex items-center ${containerGap}`}>
        <span className={`inline-flex items-center justify-center ${iconSizes} rounded-lg ${iconBg}`}>
          {icon && React.isValidElement(icon) ? React.cloneElement(icon, { className: `${(icon.props && icon.props.className) || ''} ${iconClass}`.trim() }) : icon}
        </span>
      </div>
      <span className={labelClass}>
        <span className="inline-flex items-center mb-1">
          {label}
          {info && (
            <span style={{ position: 'relative', display: 'inline-block', marginLeft: '6px', top: compact ? '-0.35em' : '-0.6em' }}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={compact ? 12 : 14} className="inline-block text-muted-foreground hover:text-primary cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>{info}</TooltipContent>
              </Tooltip>
            </span>
          )}
        </span>
      </span>
      <div className={`flex items-center ${compact ? 'mt-0' : 'mt-1'}`}>
        <span className={valueClass}>{value}</span>
        {badge && (
          <span className="ml-2">
            {typeof badge === 'string' ? (
              <Badge variant="outline">{badge}</Badge>
            ) : React.isValidElement(badge) ? (
              badge
            ) : badge?.text ? (
              <Badge variant={badge.variant || 'outline'} className={badge.className}>
                {badge.text}
              </Badge>
            ) : null}
          </span>
        )}
        {action && (
          <span className="ml-2">
            {typeof action === 'object' && action?.label ? (
              <Button
                variant={action.variant || 'link'}
                size="sm"
                className={action.className || 'px-0 h-auto text-primary hover:text-primary underline-offset-4 hover:underline font-medium shadow-none'}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ) : React.isValidElement(action) ? (
              action
            ) : null}
          </span>
        )}
      </div>
    </div>
  );
};

export default Stat;
