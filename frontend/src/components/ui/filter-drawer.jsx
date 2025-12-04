import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './button.jsx';

/**
 * Generic FilterDrawer for Mobile
 * Props:
 * - open: boolean
 * - onOpenChange: (open) => void
 * - testOptions: Array<{value,label}>
 * - subjectOptions: Array<{value,label}>
 * - selectedTest, selectedSubject
 * - onSelectTest: (value) => void
 * - onSelectSubject: (value) => void
 */
const FilterDrawer = ({
    open,
    onOpenChange,
    // backward-compatible single lists
    testOptions = [],
    subjectOptions = [],
    selectedTest,
    selectedSubject,
    onSelectTest,
    onSelectSubject,
    // new generic panels prop: [{ key, label, options, selected, onSelect }]
    panels,
    initialActivePanel,
    // optional header title for the drawer (defaults to Subject & Test for backward compat)
    title = 'Subject & Test',
}) => {
    const [isMounted, setIsMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    // Local selections stored while the drawer is open. These are applied to
    // the parent only when the user clicks "Done". This prevents the parent
    // content from updating immediately as the user clicks options in the drawer.
    const [localSelections, setLocalSelections] = useState({});
    // compute panels to show: prefer `panels` prop, otherwise fallback to test/subject for compatibility
    const panelsToShow = React.useMemo(() => {
        if (Array.isArray(panels) && panels.length > 0) return panels;
        return [
            { key: 'test', label: 'Test', options: testOptions, selected: selectedTest, onSelect: onSelectTest },
            { key: 'subject', label: 'Subject', options: subjectOptions, selected: selectedSubject, onSelect: onSelectSubject },
        ];
    }, [panels, testOptions, subjectOptions, selectedTest, selectedSubject, onSelectTest, onSelectSubject]);

    // active panel key (initialize to initialActivePanel or first panel)
    const [activePanel, setActivePanel] = useState(() => initialActivePanel || (panelsToShow[0] && panelsToShow[0].key) || 'panel-0');

    // Initialize the active panel and local selections when the drawer opens.
    // We only do this when `open` becomes true so the user can navigate freely
    // while the drawer is open without parent-driven re-syncs overwriting their
    // choices. Local selections are copied from the incoming `panelsToShow`
    // `selected` values and applied only when Done is clicked.
    useEffect(() => {
        if (open) {
            const defaultPanel = initialActivePanel || (panelsToShow[0] && panelsToShow[0].key) || 'panel-0';
            setActivePanel(defaultPanel);

            // Initialize local selections from the panels provided by parent.
            const init = {};
            panelsToShow.forEach((p) => {
                init[p.key] = p.selected;
            });
            setLocalSelections(init);
        }
        // intentionally only depend on `open` so we do not re-init while the
        // drawer is open if parent state changes.
    }, [open]);
    const ANIM_DURATION = 300; // ms

    // Mount when open becomes true
    useEffect(() => {
        if (open) {
            setIsMounted(true);
            requestAnimationFrame(() => setIsVisible(true));
        } else if (isMounted) {
            setIsVisible(false);
            const t = setTimeout(() => setIsMounted(false), ANIM_DURATION);
            return () => clearTimeout(t);
        }
    }, [open, isMounted]);

    if (!isMounted) return null;

    return (
        <div className="fixed inset-0 z-[70] flex sm:hidden">
            {/* backdrop */}
            <div
                className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                onClick={() => onOpenChange && onOpenChange(false)}
                aria-hidden
            />

            {/* drawer panel - slides from bottom */}
            <aside
                className={`relative mt-auto w-full h-1/2 bg-white rounded-t-2xl shadow-2xl overflow-hidden transform-gpu transition-all duration-300 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
                style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
            >
                {/* drag handle */}
                <div className="flex justify-center pt-2 pb-1">
                    <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                </div>

                <div className="flex items-center justify-between p-3 border-b">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button
                        aria-label="Close drawer"
                        onClick={() => onOpenChange && onOpenChange(false)}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* adaptive layout: when there's only one panel, hide the left nav and center the list */}
                {/* use max-height so the content can shrink to fit its children but won't exceed available space */}
                <div className="flex flex-col max-h-[calc(100%-96px)]">
                    <div className="flex flex-1 min-h-0 ">
                        {(() => {
                            const singlePanel = panelsToShow.length <= 1;

                            // compute current panel and options once so we can reuse in both layouts
                            const panel = panelsToShow.find((p) => p.key === activePanel) || panelsToShow[0];
                            if (!panel) return null;
                            // Support dynamic options: panel.options can be either
                            // - an array of {value,label} options, or
                            // - a function that receives the current localSelections and returns an array
                            const opts = typeof panel.options === 'function'
                                ? panel.options(localSelections || {})
                                : Array.isArray(panel.options)
                                    ? panel.options
                                    : [];

                            const panelContent = (() => {
                                if (opts.length === 0) return <div className="text-sm text-gray-500">No options available.</div>;
                                return (
                                    <ul className="space-y-2 w-full">
                                        {opts.map((opt) => {
                                            // Use local selection while the drawer is open. Falls back to
                                            // the panel's provided `selected` value when local not present.
                                            const current = (localSelections && localSelections[panel.key]) ?? panel.selected;
                                            const isSelected = String(opt.value) === String(current);
                                            return (
                                                <li key={String(opt.value)}>
                                                    <button
                                                        onClick={() => setLocalSelections((prev) => ({ ...prev, [panel.key]: opt.value }))}
                                                        className="w-full flex items-start justify-between pr-2 py-2 text-left"
                                                    >
                                                        {/* Left-align and allow wrapping in the right-column label.
                                                            Place the "updated" dot centered vertically next to the label
                                                            and use a slightly stronger color so it's visible on light backgrounds. */}
                                                        <span className="flex items-center gap-2">
                                                            <span className="text-sm text-left whitespace-normal break-words">{opt.label}</span>
                                                            {opt.updated && (
                                                                <span aria-hidden className="inline-flex flex-shrink-0 w-2 h-2 rounded-full bg-blue-200 ml-1" />
                                                            )}
                                                        </span>
                                                        <span className="pl-2">
                                                            {isSelected ? (
                                                                // squared selection indicator with slightly rounded corners
                                                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-md bg-blue-600">
                                                                    <span className="w-1.5 h-1.5 rounded-sm bg-white" />
                                                                </span>
                                                            ) : (
                                                                // squared unselected box
                                                                <span className="inline-block w-4 h-4 rounded-md border-2 border-slate-600/60" />
                                                            )}
                                                        </span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                );
                            })();

                            if (singlePanel) {
                                // Centered single-column layout for cases where only one panel exists
                                // The scroll container fills all available space and always scrolls if content overflows
                                return (
                                    <div className="flex-1 bg-white overflow-hidden mb-10">
                                        <div className="h-full overflow-y-auto p-3">
                                            {panelContent}
                                        </div>
                                    </div>
                                );
                            }

                            // Default: two-column layout with left nav
                            return (
                                <>
                                    {/* Left nav */}
                                    <nav className="w-auto min-w-max bg-gray-50 border-r flex-shrink-0" aria-label="Filter sections">
                                        <ul className="flex flex-col h-full">
                                            {panelsToShow.map((p) => (
                                                <li key={p.key} className="flex-shrink-0">
                                                    <button
                                                        className={`w-full text-left px-4 py-4 ${activePanel === p.key ? 'bg-blue-50 text-blue-500' : ''}`}
                                                        onClick={() => setActivePanel(p.key)}
                                                        aria-selected={activePanel === p.key}
                                                    >
                                                        {p.label}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </nav>

                                    {/* Right content list - FIXED SCROLL CONTAINER */}
                                    <div className="flex-1 bg-white overflow-hidden mb-10">
                                        <div className="h-full p-4 overflow-y-auto">
                                            {panelContent}
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            size="md"
                            variant="default"
                            className="rounded-xl"
                            onClick={() => {
                                // Apply local selections to parent only when Apply is clicked.
                                if (typeof onOpenChange === 'function') {
                                    panelsToShow.forEach((p) => {
                                        const newVal = localSelections[p.key];
                                        // Only call parent's onSelect if provided and value changed
                                        if (p.onSelect && newVal !== undefined && String(newVal) !== String(p.selected)) {
                                            p.onSelect(newVal);
                                        }
                                    });
                                    onOpenChange(false);
                                }
                            }}
                        >
                            Apply
                        </Button>
                    </div>
                </div>
            </aside>
        </div>
    );
};

export default FilterDrawer;