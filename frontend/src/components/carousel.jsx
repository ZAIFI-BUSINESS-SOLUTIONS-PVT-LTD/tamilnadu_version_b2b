
import React, { useState } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip.jsx';


/**
 * General-purpose Carousel component for displaying sections of content.
 *
 * Backward compatible:
 * - Use `section.items` (array) for the default bulleted list UI.
 * - Use `section.content` (ReactNode) to render arbitrary UI for a slide.
 *
 * @param {Object} props
 * @param {Array<{title: string, items?: Array, content?: React.ReactNode, icon?: React.ReactNode, subtitle?: string, tag?: React.ReactNode}>} props.sections
 * @param {string} [props.emptyMessage] - Message to show if no sections or items
 * @param {number} [props.height] - Height of the carousel in px (default 330)
 */
const Carousel = ({ sections = [], emptyMessage = 'No content available', height = 330 }) => {
  const [current, setCurrent] = useState(0);
  if (!Array.isArray(sections) || sections.length === 0) {
    return <p className="text-muted-foreground text-center py-4">{emptyMessage}</p>;
  }
  const section = sections[current];
  const handlePrev = () => setCurrent((prev) => (prev === 0 ? sections.length - 1 : prev - 1));
  const handleNext = () => setCurrent((prev) => (prev === sections.length - 1 ? 0 : prev + 1));

  const renderTag = () => {
    if (!section.tag) return null;

    const tagContent = typeof section.tag === 'string' || typeof section.tag === 'number'
      ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-medium">
          {section.tag}
        </span>
      )
      : section.tag;

    if (section.tagTooltip) {
      return (
        <span className="ml-2 inline-flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              {tagContent}
            </TooltipTrigger>
            <TooltipContent>
              {section.tagTooltip}
            </TooltipContent>
          </Tooltip>
        </span>
      );
    }

    return <span className="ml-2 inline-flex items-center">{tagContent}</span>;
  };
  return (
    <div className="w-full">
      <div
        className="card rounded-2xl border border-border bg-card w-full relative flex flex-col"
        style={{ height: `${height}px`, overflow: 'visible' }}
      >
        {/* Title bar at the top */}
        <div className="py-6 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {section.icon && <span className="inline-flex items-center">{section.icon}</span>}
              <h3 className="text-foreground text-xl font-semibold">{section.title}</h3>
              {renderTag()}
            </div>
            <div className="flex gap-2">
              <button
                aria-label="Previous section"
                onClick={handlePrev}
                className="flex items-center justify-center w-8 h-8 rounded-md bg-muted border border-border text-muted-foreground hover:bg-card hover:text-primary transition-colors focus:outline-none focus:ring-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                aria-label="Next section"
                onClick={handleNext}
                className="flex items-center justify-center w-8 h-8 rounded-md bg-muted border border-border text-muted-foreground hover:bg-card hover:text-primary transition-colors focus:outline-none focus:ring-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
          {section.subtitle && <div className="text-muted-foreground text-sm mt-1">{section.subtitle}</div>}
        </div>

        {/* Content area with fixed height and scrolling if needed */}
        <div className="px-6 py-2 flex items-start justify-center overflow-y-auto flex-1">
          {section.content ? (
            <div className="w-full">{section.content}</div>
          ) : Array.isArray(section.items) && section.items.length > 0 ? (
            <ul className="space-y-3 w-full max-w-3xl">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground leading-relaxed">
                  <div className="flex-shrink-0 mt-2">
                    <div className="w-1 h-1 rounded-full bg-foreground"></div>
                  </div>
                  <div className="text-md">{item}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-muted-foreground text-xl">No {String(section.title || 'content').toLowerCase()} available.</div>
          )}
        </div>

        {/* Dots indicator showing total cards and current active card */}
        <div className="flex items-center justify-center pb-6 pt-1">
          <div className="flex gap-2">
            {sections.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to section ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-0 ${current === i
                    ? 'bg-primary w-6'
                    : 'bg-primary/30 hover:bg-primary/60'
                  }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Carousel;
