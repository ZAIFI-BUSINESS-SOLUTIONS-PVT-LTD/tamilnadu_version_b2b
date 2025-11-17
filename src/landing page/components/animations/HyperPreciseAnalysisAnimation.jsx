import React, { useEffect, useMemo, useState, useRef } from 'react';
import { CANVAS_W, CANVAS_H } from './LongitudinalInsightsAnimation';
const SUBJECTS = [ 'Chemistry','Physics', 'Botany', 'Zoology'];
const TOPICS = {
  Physics: [ 'Optics','Mechanics', 'Thermodynamics', 'Electromagnetism', 'Quantum Mechanics', 'Relativity', 'Waves', 'Modern Physics']
};
const SUBTOPICS = {
  Mechanics: ['Kinematics', 'Dynamics', 'Statics', 'Rotational Motion']
};


const HyperPreciseAnalysisAnimation = ({ cycleDuration = 3800 }) => {
  const [stage, setStage] = useState(1); // 1 subjects, 2 topics, 3 subtopics (scroll-only)
  const [pulse, setPulse] = useState(false);

  // targets chosen per cycle
  const [targetSubject, setTargetSubject] = useState(0);
  const [targetTopic, setTargetTopic] = useState(0);
  const [targetSubtopic, setTargetSubtopic] = useState(0);

  // cycle counter removed (previously unused)

  // allow temporarily pausing stage advancement (used to hold Rotational Motion)
  const [pauseStageAdvance, setPauseStageAdvance] = useState(false);
  const pauseStageAdvanceRef = useRef(false);
  const pauseTimeoutRef = useRef(null);
  const subjectsAutoCancelRef = useRef(null);
  useEffect(() => { pauseStageAdvanceRef.current = pauseStageAdvance; }, [pauseStageAdvance]);

  useEffect(() => {
    return () => { if (pauseTimeoutRef.current) { clearTimeout(pauseTimeoutRef.current); pauseTimeoutRef.current = null; } };
  }, []);

  // animation tuning constants
  const TRANS_DUR = 520; // ms for panel transitions
  const TRANS_BEZIER = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const ITEM_STAGGER = 70; // ms between staggered items
  const PULSE_MS = 900; // ms for pulse lifecycle

  // cancel handles for in-progress RAF-driven auto-scrolls
  const autoScrollCancelRef = useRef({ subjects: null });

  // easing helper (smooth ease-in-out)
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // Cycle stages and pick random targets when entering a stage
  useEffect(() => {
    // Cycle through 3 scroll stages only: subjects -> topics -> subtopics
    const t = setInterval(() => {
      if (pauseStageAdvanceRef.current) return; // hold advancement while paused
      setStage(s => {
        const next = s === 3 ? 1 : s + 1;
        // entering Subjects stage: pick a new subject for the cycle
        if (next === 1) {
          const subjIdx = Math.floor(Math.random() * SUBJECTS.length);
          setTargetSubject(subjIdx);
        }
        // entering Topics stage: pick topic within selected subject (prefer Mechanics)
        if (next === 2) {
          const subs = TOPICS[SUBJECTS[targetSubject]] || [];
          const mechIdx = subs.indexOf('Mechanics');
          const tIdx = mechIdx >= 0 ? mechIdx : (subs.length ? Math.floor(Math.random() * subs.length) : 0);
          setTargetTopic(tIdx);
        }
        // entering Subtopics stage: pick subtopic within chosen topic (prefer Rotational Motion)
        if (next === 3) {
          const subs = TOPICS[SUBJECTS[targetSubject]] || [];
          const topicName = subs[targetTopic];
          const available = SUBTOPICS[topicName] || [];
          const rotIdx = available.indexOf('Rotational Motion');
          const st = rotIdx >= 0 ? rotIdx : (available.length ? Math.floor(Math.random() * available.length) : 0);
          setTargetSubtopic(st);
        }
  setPulse(true);
  setTimeout(() => setPulse(false), PULSE_MS);
        return next;
      });
    }, cycleDuration);
    return () => clearInterval(t);
  }, [cycleDuration, targetSubject, targetTopic]);

  useEffect(() => {
    setTargetSubject(Math.floor(Math.random() * SUBJECTS.length));
  }, []);



  const paperW = 380, paperH = 260;
  const offsetX = (CANVAS_W - paperW) / 2;
  const offsetY = (CANVAS_H - paperH) / 2;

  // list sizing to guarantee at least three full items are visible
  const ITEM_HEIGHT = 48;
  const ITEM_GAP = 6; // gap between items
  const ITEM_FONT_SIZE = 20; // slightly larger word size (increased)

  // solo overlay size (centered on magnifier)
  const SOLO_W = 320;
  const SOLO_H = 140;

  const lensRadius = 190;
  const magnifier = useMemo(() => ({ x: offsetX + paperW / 2, y: offsetY + paperH / 2 }), [offsetX, offsetY, paperW, paperH]);

  // Handle dimensions
  const handleW = 92, handleH = 18;

  const clipId = useMemo(() => `lensClip-${Math.random().toString(36).slice(2)}`, []);

  // safe access helpers (moved up so useMemo can call them)
  const getAvailableTopics = (subjectIdx) => {
    const subj = SUBJECTS[subjectIdx] || SUBJECTS[0];
    return TOPICS[subj] || [subj];
  };
  const getAvailableSubtopics = (subjectIdx, topicIdx) => {
    const topics = getAvailableTopics(subjectIdx);
    const topicName = topics[topicIdx] || topics[0];
    return SUBTOPICS[topicName] || [topicName];
  };

  // refs for scrollable lists so we can scroll to the selected item
  const subjectsListRef = useRef(null);
  const topicsListRef = useRef(null);
  const subtopicsListRef = useRef(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [highlightLocked, setHighlightLocked] = useState(false);
  const [snappedIndex, setSnappedIndex] = useState(null);
  // Diagonal blue gradient used for selected item backgrounds
  const HIGHLIGHT_COLOR = 'linear-gradient(135deg, #2563eb 0%, #3b82f6 40%, #60a5fa 70%, #06b6d4 100%)';
  const [subjectsFading, setSubjectsFading] = useState(false);
  const [topicsEntering, setTopicsEntering] = useState(false);
  const [topicsSnappedIndex, setTopicsSnappedIndex] = useState(null);
  const [topicsHighlightLocked, setTopicsHighlightLocked] = useState(false);
  const [topicsFading, setTopicsFading] = useState(false);
  const [subtopicsEntering, setSubtopicsEntering] = useState(false);
  const [subtopicsSnappedIndex, setSubtopicsSnappedIndex] = useState(null);
  const [subtopicsHighlightLocked, setSubtopicsHighlightLocked] = useState(false);
  // solo note / final highlight state
  const [showSoloNote, setShowSoloNote] = useState(false);
  const [soloSubtopic, setSoloSubtopic] = useState('');
  const soloTimeoutRef = useRef({ t1: null, t2: null });

  // After subjects have locked on Physics, wait 2s then transition to topics
  useEffect(() => {
    if (!highlightLocked) return;
    const t = setTimeout(() => {
      setSubjectsFading(true);
      setTopicsEntering(true);
      // start topics auto-scroll similar to subjects
      if (!topicsListRef.current) return;
      const listEl = topicsListRef.current;
      const items = Array.from(listEl.querySelectorAll('li'));
      if (!items.length) return;
      let start = null;
  const duration = 2000;
      let rafId = null;
      setTopicsHighlightLocked(false);
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
  // apply easing for a smooth acceleration/deceleration
  const tnorm = Math.min(1, elapsed / duration);
  const eased = easeInOutCubic(tnorm);
  const totalHeight = items.reduce((acc, it) => acc + it.offsetHeight + ITEM_GAP, 0);
  const offset = (eased * totalHeight) % (totalHeight / 3);
        listEl.scrollTop = offset;
        if (elapsed < duration) {
          rafId = requestAnimationFrame(step);
        } else {
          const firstTopic = items.find(it => !!it.textContent.trim());
          if (firstTopic) {
            // Prefer 'Mechanics' when available
            const availableTopics = TOPICS[SUBJECTS[targetSubject]] || [];
            const mechIdx = availableTopics.indexOf('Mechanics');
            const chosenIdx = mechIdx >= 0 ? mechIdx : 0;
            setTargetTopic(chosenIdx);

            // Snap to the repeated list item that corresponds to the chosen topic.
            const allItems = Array.from(listEl.querySelectorAll('li'));
            const repeats = Math.max(1, Math.floor(allItems.length / Math.max(1, availableTopics.length)));
            const middleRepeat = Math.floor(repeats / 2);
            let repeatedIndex = middleRepeat * availableTopics.length + chosenIdx;
            // fallback to the first visible topic index if calculation overruns
            if (repeatedIndex >= allItems.length) repeatedIndex = Array.from(listEl.querySelectorAll('li')).indexOf(firstTopic);

            const targetEl = allItems[repeatedIndex] || firstTopic;
            listEl.scrollTop = Math.max(0, targetEl.offsetTop - (listEl.clientHeight / 2) + (targetEl.offsetHeight / 2));
            setTopicsSnappedIndex(repeatedIndex);
            setTopicsHighlightLocked(true);
          }
        }
      };
      rafId = requestAnimationFrame(step);
      return () => { if (rafId) cancelAnimationFrame(rafId); };
    }, 2000);
    return () => clearTimeout(t);
  }, [highlightLocked]);

  // After topics have locked (e.g., Mechanics), wait 2s then transition to subtopics
  useEffect(() => {
    if (!topicsHighlightLocked) return;
    // Only proceed to subtopics when the currently selected topic is Mechanics
    const availableTopics = TOPICS[SUBJECTS[targetSubject]] || [];
    const selectedTopicName = availableTopics[targetTopic];
    if (selectedTopicName !== 'Mechanics') return;
    const t = setTimeout(() => {
      setTopicsFading(true);
      setSubtopicsEntering(true);
      if (!subtopicsListRef.current) return;
      const listEl = subtopicsListRef.current;
      const items = Array.from(listEl.querySelectorAll('li'));
      if (!items.length) return;
      let start = null;
  const duration = 2000;
      let rafId = null;
      setSubtopicsHighlightLocked(false);
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
  const tnorm = Math.min(1, elapsed / duration);
  const eased = easeInOutCubic(tnorm);
  const totalHeight = items.reduce((acc, it) => acc + it.offsetHeight + ITEM_GAP, 0);
  const offset = (eased * totalHeight) % (totalHeight / 3);
        listEl.scrollTop = offset;
        if (elapsed < duration) {
          rafId = requestAnimationFrame(step);
        } else {
          const firstSub = items.find(it => !!it.textContent.trim());
          if (firstSub) {
            // Determine chosen subtopic index (prefer Rotational Motion)
            const subs = SUBTOPICS[availableTopics[targetTopic]] || [];
            const rotIdx = subs.indexOf('Rotational Motion');
            const chosenIdx = rotIdx >= 0 ? rotIdx : 0;
            setTargetSubtopic(chosenIdx);

            // Choose the repeated-item index to snap to. We prefer the middle repetition
            // so the chosen subtopic appears centered in the list.
            const allItems = Array.from(listEl.querySelectorAll('li'));
            const repeats = Math.max(1, Math.floor(allItems.length / Math.max(1, subs.length)));
            const middleRepeat = Math.floor(repeats / 2);
            let repeatedIndex = middleRepeat * subs.length + chosenIdx;
            if (repeatedIndex >= allItems.length) repeatedIndex = chosenIdx; // fallback

            const targetEl = allItems[repeatedIndex] || firstSub;
            listEl.scrollTop = Math.max(0, targetEl.offsetTop - (listEl.clientHeight / 2) + (targetEl.offsetHeight / 2));
            setSubtopicsSnappedIndex(repeatedIndex);
            setSubtopicsHighlightLocked(true);

            // if Rotational Motion selected, hold the stage for 2 seconds
            if (subs[chosenIdx] === 'Rotational Motion') {
              setPauseStageAdvance(true);
              if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
              pauseTimeoutRef.current = setTimeout(() => {
                setPauseStageAdvance(false);
                pauseTimeoutRef.current = null;
              }, 2000);
            }
          }
        }
      };
      rafId = requestAnimationFrame(step);
      return () => { if (rafId) cancelAnimationFrame(rafId); };
    }, 2000);
    return () => clearTimeout(t);
  }, [topicsHighlightLocked]);

  // When subtopic highlight locks, run the requested sequence:
  // - wait 2s while subtopic is highlighted
  // - hide the subtopic panel and display the single highlighted subtopic + note for 5s
  // - then reset state so the whole animation loops again
  useEffect(() => {
    if (!subtopicsHighlightLocked) return;
    // determine current subtopic name
    const subs = getAvailableSubtopics(targetSubject, targetTopic);
    const name = subs[targetSubtopic] || '';
    setSoloSubtopic(name);

    // clear any previous timers
    if (soloTimeoutRef.current.t1) clearTimeout(soloTimeoutRef.current.t1);
    if (soloTimeoutRef.current.t2) clearTimeout(soloTimeoutRef.current.t2);

    // after 2s hide panels and show solo note
    soloTimeoutRef.current.t1 = setTimeout(() => {
      setSubtopicsEntering(false);
      setTopicsEntering(false);
      setSubjectsFading(true);
      setShowSoloNote(true);
      // pause the stage advancement while solo note shows
      setPauseStageAdvance(true);
    }, 2000);

    // after additional 5s (total 7s from highlight), hide solo and restart the loop
    soloTimeoutRef.current.t2 = setTimeout(() => {
      setShowSoloNote(false);
      setSubjectsFading(false);
      setTopicsEntering(false);
      setTopicsFading(false);
      setSubtopicsEntering(false);
      setSubtopicsSnappedIndex(null);
      setSubtopicsHighlightLocked(false);
      setTopicsSnappedIndex(null);
      setTopicsHighlightLocked(false);
      setHighlightLocked(false);
      setIsAutoScrolling(false);
      // pick a fresh random subject to start the next loop
      setTargetSubject(Math.floor(Math.random() * SUBJECTS.length));
      setPauseStageAdvance(false);
      setStage(1);
    }, 2000 + 5000);

    return () => {
      if (soloTimeoutRef.current.t1) { clearTimeout(soloTimeoutRef.current.t1); soloTimeoutRef.current.t1 = null; }
      if (soloTimeoutRef.current.t2) { clearTimeout(soloTimeoutRef.current.t2); soloTimeoutRef.current.t2 = null; }
    };
  }, [subtopicsHighlightLocked, targetSubject, targetTopic, targetSubtopic]);

  // Scroll selected item into view when targets change or when zoom stage is entered
  useEffect(() => {
    if (isAutoScrolling) return; // avoid interfering while auto-scroll animation runs
    const container = subjectsListRef.current;
    const el = container?.querySelector(`[data-subject-index=\"${targetSubject}\"]`);
    if (el && container) {
      // scroll only the list container (avoid scrolling the whole page)
      try {
        if (typeof container.scrollTo === 'function') {
          container.scrollTo({ top: el.offsetTop - container.clientHeight / 2, behavior: 'smooth' });
        } else {
          container.scrollTop = el.offsetTop - container.clientHeight / 2;
        }
      } catch (e) {
        container.scrollTop = el.offsetTop - container.clientHeight / 2;
      }
    }
  }, [targetSubject]);

  useEffect(() => {
    const container = topicsListRef.current;
    const el = container?.querySelector(`[data-topic-index=\"${targetTopic}\"]`);
    if (el && container) {
      try {
        if (typeof container.scrollTo === 'function') {
          container.scrollTo({ top: el.offsetTop - container.clientHeight / 2, behavior: 'smooth' });
        } else {
          container.scrollTop = el.offsetTop - container.clientHeight / 2;
        }
      } catch (e) {
        container.scrollTop = el.offsetTop - container.clientHeight / 2;
      }
    }
  }, [targetTopic, targetSubject]);

  useEffect(() => {
    const container = subtopicsListRef.current;
    const el = container?.querySelector(`[data-subtopic-index=\"${targetSubtopic}\"]`);
    if (el && container) {
      try {
        if (typeof container.scrollTo === 'function') {
          container.scrollTo({ top: el.offsetTop - container.clientHeight / 2, behavior: 'smooth' });
        } else {
          container.scrollTop = el.offsetTop - container.clientHeight / 2;
        }
      } catch (e) {
        container.scrollTop = el.offsetTop - container.clientHeight / 2;
      }
    }
  }, [targetSubtopic, targetTopic, targetSubject]);

  // Auto-scroll subjects list for 2s then snap to 'Physics' and lock.
  // Provide a reusable starter so we can reliably trigger it on mount and
  // whenever the cycle returns to stage === 1.
  const startSubjectsAutoScroll = () => {
    if (!subjectsListRef.current) return;
    if (isAutoScrolling || highlightLocked) return;

    const listEl = subjectsListRef.current;
    const items = Array.from(listEl.querySelectorAll('li'));
    if (!items.length) return;

    let start = null;
    const duration = 2200; // slightly longer for smoother feel
    const totalHeight = items.reduce((acc, it) => acc + it.offsetHeight + ITEM_GAP, 0);
    let rafId = null;

    setIsAutoScrolling(true);
    setHighlightLocked(false);
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeInOutCubic(t);
      const offset = (eased * totalHeight) % (totalHeight / 3);
      listEl.scrollTop = offset;
      if (elapsed < duration) {
        rafId = requestAnimationFrame(step);
      } else {
        const physicsItem = items.find(it => it.textContent.trim() === 'Physics');
        if (physicsItem) {
          const allItems = Array.from(listEl.querySelectorAll('li'));
          const repeatedIdx = allItems.indexOf(physicsItem);
          // read the base subject index from the DOM element so we set the correct subject
          const baseIdxAttr = physicsItem.getAttribute('data-subject-index');
          const baseIdx = baseIdxAttr != null ? parseInt(baseIdxAttr, 10) : (repeatedIdx % SUBJECTS.length);
          listEl.scrollTop = Math.max(0, physicsItem.offsetTop - (listEl.clientHeight / 2) + (physicsItem.offsetHeight / 2));
          setTargetSubject(isNaN(baseIdx) ? 0 : baseIdx);
          setSnappedIndex(repeatedIdx);
          setHighlightLocked(true);
          setIsAutoScrolling(false);
        }
      }
    };

    rafId = requestAnimationFrame(step);
    // provide a cancel function and keep a reference to it so callers can cleanup
    const cancel = () => { if (rafId) cancelAnimationFrame(rafId); rafId = null; };
    autoScrollCancelRef.current.subjects = cancel;
    return cancel;
  };

  // Ensure the auto-scroll starts on mount (allow DOM to settle), and
  // also restart whenever we enter stage 1.
  useEffect(() => {
    // small delay to ensure foreignObject content is mounted in DOM
    const t = setTimeout(() => {
      // cancel any previous auto-scroll in-flight
      if (autoScrollCancelRef.current.subjects) { try { autoScrollCancelRef.current.subjects(); } catch (e) {} }
      const cancel = startSubjectsAutoScroll();
      // store cancel handle
      if (cancel) autoScrollCancelRef.current.subjects = cancel;
    }, 60);
    return () => {
      clearTimeout(t);
      if (autoScrollCancelRef.current.subjects) { try { autoScrollCancelRef.current.subjects(); } catch (e) {} autoScrollCancelRef.current.subjects = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stage !== 1) return;
    // tiny delay to allow render update
    const t = setTimeout(() => {
      if (autoScrollCancelRef.current.subjects) { try { autoScrollCancelRef.current.subjects(); } catch (e) {} }
      const cancel = startSubjectsAutoScroll();
      if (cancel) autoScrollCancelRef.current.subjects = cancel;
    }, 40);
    return () => { clearTimeout(t); if (autoScrollCancelRef.current.subjects) { try { autoScrollCancelRef.current.subjects(); } catch (e) {} autoScrollCancelRef.current.subjects = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Restart/resume animation when the tab/window becomes visible again.
  // Browsers throttle requestAnimationFrame and timers when hidden which can
  // leave our animation state in a paused/stalled condition; on visibility
  // regain we reset a small set of state and restart the subjects auto-scroll.
  useEffect(() => {
    const resumeAnimation = () => {
      if (document.visibilityState !== 'visible') return;
      // clear pending timers we may have left behind
      if (pauseTimeoutRef.current) { clearTimeout(pauseTimeoutRef.current); pauseTimeoutRef.current = null; }
      if (soloTimeoutRef.current.t1) { clearTimeout(soloTimeoutRef.current.t1); soloTimeoutRef.current.t1 = null; }
      if (soloTimeoutRef.current.t2) { clearTimeout(soloTimeoutRef.current.t2); soloTimeoutRef.current.t2 = null; }

      // reset transient UI states so animation restarts cleanly
      setPauseStageAdvance(false);
      setShowSoloNote(false);
      setSubjectsFading(false);
      setTopicsEntering(false);
      setTopicsFading(false);
      setSubtopicsEntering(false);
      setSubtopicsSnappedIndex(null);
      setSubtopicsHighlightLocked(false);
      setTopicsSnappedIndex(null);
      setTopicsHighlightLocked(false);
      setHighlightLocked(false);
      setIsAutoScrolling(false);

      // pick a fresh subject and restart at stage 1 so the sequence runs again
      setTargetSubject(Math.floor(Math.random() * SUBJECTS.length));
      setStage(1);
      // small delay to ensure DOM is available
      setTimeout(() => startSubjectsAutoScroll(), 60);
    };

    document.addEventListener('visibilitychange', resumeAnimation);
    window.addEventListener('focus', resumeAnimation);
    return () => {
      document.removeEventListener('visibilitychange', resumeAnimation);
      window.removeEventListener('focus', resumeAnimation);
    };
    // intentionally no deps so listener installs once
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <svg
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        overflow="hidden"
      >
        <defs>
          <style>{`@keyframes ripplePulse { 0% { opacity: 0.18; transform: scale(0.96); } 60% { opacity: 0.08; transform: scale(1.04); } 100% { opacity: 0; transform: scale(1.12); } }`}</style>
          <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
            {/* disabled shadow: keep filter present but neutralize opacity */}
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0" />
          </filter>

          {/* glass gradient removed so underlying content is fully visible */}

          {/* metallic frame gradient */}
          <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a5568" />
            <stop offset="25%" stopColor="#2d3748" />
            <stop offset="50%" stopColor="#1a202c" />
            <stop offset="75%" stopColor="#2d3748" />
            <stop offset="100%" stopColor="#4a5568" />
          </linearGradient>

          {/* frame inner bevel gradient */}
          <linearGradient id="frameBevelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#718096" />
            <stop offset="100%" stopColor="#2d3748" />
          </linearGradient>

          {/* realistic handle metal gradient */}
          <linearGradient id="handleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a5568" />
            <stop offset="15%" stopColor="#2d3748" />
            <stop offset="35%" stopColor="#1a202c" />
            <stop offset="65%" stopColor="#0f1419" />
            <stop offset="85%" stopColor="#2d3748" />
            <stop offset="100%" stopColor="#4a5568" />
          </linearGradient>

          {/* handle highlight gradient */}
          <linearGradient id="handleHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a0aec0" />
            <stop offset="50%" stopColor="#718096" />
            <stop offset="100%" stopColor="#4a5568" />
          </linearGradient>

          {/* handle shadow gradient */}
          <linearGradient id="handleShadowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f1419" />
            <stop offset="100%" stopColor="#1a202c" />
          </linearGradient>

          {/* enhanced shadow filter for handle */}
          <filter id="handleShadow" x="-50%" y="-50%" width="200%" height="200%">
            {/* disabled handle shadow */}
            <feDropShadow dx="2" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0" />
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0" />
          </filter>

          {/* frame shadow filter */}
          <filter id="frameShadow" x="-20%" y="-20%" width="140%" height="140%">
            {/* disabled frame shadow */}
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0" />
          </filter>

          {/* background gradient intentionally left but visually neutralized */}
          <radialGradient id="bgRadial" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="60%" stopColor="transparent" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* clip everything to canvas bounds to prevent overflow */}
          <clipPath id="canvasClip">
            <rect x="0" y="0" width={CANVAS_W} height={CANVAS_H} />
          </clipPath>
        </defs>

  <g clipPath={`url(#canvasClip)`}>
  {/* transparent canvas background to allow underlying content to show */}
  <rect x="0" y="0" width={CANVAS_W} height={CANVAS_H} fill="transparent" />

        <g>
          <clipPath id={clipId}>
            <circle cx={magnifier.x} cy={magnifier.y} r={lensRadius} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>
            {/* Replace randomized word-cloud with a clear, scrollable three-column list
                Subjects | Topics | Subtopics. Each column is an HTML list embedded via
                foreignObject so we can programmatically scroll items into view and
                highlight the selected entry. */}
            <foreignObject x={offsetX} y={offsetY} width={paperW} height={paperH}>
              <div xmlns="http://www.w3.org/1999/xhtml" style={{ 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative',
                background: 'transparent' 
              }}>
                {/* Centered container for all panels */}
                <div style={{ 
                  position: 'relative',
                  width: '100%',
                  maxWidth: paperW - 48,
                  height: (3 * ITEM_HEIGHT) + (2 * ITEM_GAP),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                
                  {/* Subjects panel (now animates opacity/transform instead of toggling display) */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      // when fading out, lift and slightly scale down for a smooth exit
                      transform: subjectsFading ? 'translate(-50%, -60%) scale(0.98)' : 'translate(-50%, -50%) scale(1)',
                      width: '100%',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: subjectsFading ? 0 : 1,
                      transition: `opacity ${TRANS_DUR}ms ${TRANS_BEZIER}, transform ${TRANS_DUR}ms ${TRANS_BEZIER}`,
                      willChange: 'opacity, transform',
                      pointerEvents: subjectsFading ? 'none' : 'auto',
                      visibility: subjectsFading ? 'hidden' : 'visible'
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, textAlign: 'center' }}>Subjects</div>
                    <ul ref={subjectsListRef} style={{ 
                      listStyle: 'none', 
                      margin: 0, 
                      padding: 0, 
                      overflow: 'hidden', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: ITEM_GAP, 
                      height: (3 * ITEM_HEIGHT) + (2 * ITEM_GAP), 
                      width: '100%',
                      position: 'relative' 
                    }}>
                      {(() => {
                        const repeated = [];
                        for (let r = 0; r < 3; r++) SUBJECTS.forEach(s => repeated.push(s));
                        return repeated.map((s, i) => {
                          const baseIdx = i % SUBJECTS.length;
                          const isSelected = highlightLocked && snappedIndex === i;
                          // compute simple distance from center item for parallax and delay
                          const center = Math.floor(repeated.length / 2);
                          const dist = Math.abs(i - center);
                          const translateY = `${dist * 2}px`;
                          const delay = `${Math.min(6, dist) * ITEM_STAGGER}ms`;
                          return (
                            <li key={`sub-${i}`} data-subject-index={baseIdx} style={{ height: ITEM_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', borderRadius: 6, boxSizing: 'border-box', background: 'transparent', transform: `translateY(${isSelected ? '0px' : translateY})`, transition: `transform ${TRANS_DUR}ms ${TRANS_BEZIER} ${delay}` }}>
                              <span style={{ display: 'inline-block', fontSize: ITEM_FONT_SIZE, padding: isSelected ? '8px 14px' : '0px', borderRadius: 8, background: isSelected ? HIGHLIGHT_COLOR : 'transparent', color: isSelected ? '#fff' : '#0f172a', fontWeight: isSelected ? 800 : 600, boxShadow: 'none', transform: isSelected ? 'scale(1.03)' : 'scale(1)', transition: `transform ${TRANS_DUR}ms ${TRANS_BEZIER} ${delay}` }}>{s}</span>
                            </li>
                          );
                        });
                      })()}
                    </ul>
                  </div>

                  {/* Topics panel (animated entrance/exit) */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      // enter from slightly below and move to center; exit moves upward and fades
                      transform: (topicsEntering && !topicsFading) ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -56%) scale(0.98)',
                      width: '100%',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: (topicsEntering && !topicsFading) ? 1 : 0,
                      transition: `opacity ${TRANS_DUR}ms ${TRANS_BEZIER}, transform ${TRANS_DUR}ms ${TRANS_BEZIER}`,
                      willChange: 'opacity, transform',
                      pointerEvents: (topicsEntering && !topicsFading) ? 'auto' : 'none',
                      visibility: (topicsEntering && !topicsFading) ? 'visible' : 'hidden'
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, textAlign: 'center' }}>Topics</div>
                    <ul ref={topicsListRef} style={{ 
                      listStyle: 'none', 
                      margin: 0, 
                      padding: 0, 
                      overflow: 'hidden', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: ITEM_GAP, 
                      height: (3 * ITEM_HEIGHT) + (2 * ITEM_GAP), 
                      width: '100%',
                      position: 'relative' 
                    }}>
                      {(() => {
                        const currentSubject = SUBJECTS[targetSubject] || SUBJECTS[0];
                        const topics = TOPICS[currentSubject] || [];
                        const repeated = [];
                        for (let r = 0; r < 3; r++) topics.forEach(t => repeated.push(t));
                        return repeated.map((t, i) => {
                          const baseIdx = topics.length ? i % topics.length : 0;
                          const isSelected = topicsHighlightLocked && topicsSnappedIndex === i;
                          const center = Math.floor(repeated.length / 2);
                          const dist = Math.abs(i - center);
                          const translateY = `${dist * 3}px`;
                          const delay = `${Math.min(6, dist) * ITEM_STAGGER}ms`;
                          return (
                            <li key={`top-${i}`} data-topic-index={baseIdx} style={{ height: ITEM_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', borderRadius: 6, boxSizing: 'border-box', transform: `translateY(${isSelected ? '0px' : translateY})`, transition: `transform ${TRANS_DUR}ms ${TRANS_BEZIER} ${delay}` }}>
                              <span style={{ display: 'inline-block', fontSize: ITEM_FONT_SIZE, padding: isSelected ? '6px 14px' : '0px', borderRadius: 8, background: isSelected ? HIGHLIGHT_COLOR : 'transparent', color: isSelected ? '#fff' : '#0f172a', fontWeight: isSelected ? 800 : 600, boxShadow: 'none', transform: isSelected ? 'scale(1.02)' : 'scale(1)', transition: `transform ${TRANS_DUR}ms ${TRANS_BEZIER} ${delay}` }}>{t}</span>
                            </li>
                          );
                        });
                      })()}
                    </ul>
                  </div>

                  {/* Subtopics panel (animated entrance) */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      // pop up from below when entering
                      transform: subtopicsEntering ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -58%) scale(0.98)',
                      width: '100%',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: subtopicsEntering ? 1 : 0,
                      transition: `opacity ${TRANS_DUR}ms ${TRANS_BEZIER}, transform ${TRANS_DUR}ms ${TRANS_BEZIER}`,
                      willChange: 'opacity, transform',
                      pointerEvents: subtopicsEntering ? 'auto' : 'none',
                      visibility: subtopicsEntering ? 'visible' : 'hidden'
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, textAlign: 'center' }}>Subtopics</div>
                    <ul ref={subtopicsListRef} style={{ 
                      listStyle: 'none', 
                      margin: 0, 
                      padding: 0, 
                      overflow: 'hidden', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: ITEM_GAP, 
                      height: (3 * ITEM_HEIGHT) + (2 * ITEM_GAP), 
                      width: '100%',
                      position: 'relative' 
                    }}>
                      {(() => {
                        const currentSubject = SUBJECTS[targetSubject] || SUBJECTS[0];
                        const topics = TOPICS[currentSubject] || [];
                        const topicName = topics[targetTopic] || topics[0] || '';
                        const subs = SUBTOPICS[topicName] || [topicName];
                        const repeated = [];
                        for (let r = 0; r < 3; r++) subs.forEach(st => repeated.push(st));
                        return repeated.map((st, i) => {
                          const baseIdx = subs.length ? i % subs.length : 0;
                          const isSelected = subtopicsHighlightLocked && subtopicsSnappedIndex === i;
                          const center = Math.floor(repeated.length / 2);
                          const dist = Math.abs(i - center);
                          const translateY = `${dist * 2}px`;
                          const delay = `${Math.min(6, dist) * ITEM_STAGGER}ms`;
                          return (
                            <li key={`subt-${i}`} data-subtopic-index={baseIdx} style={{ height: ITEM_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', borderRadius: 6, boxSizing: 'border-box', transform: `translateY(${isSelected ? '0px' : translateY})`, transition: `transform ${TRANS_DUR}ms ${TRANS_BEZIER} ${delay}` }}>
                              <span style={{ display: 'inline-block', fontSize: ITEM_FONT_SIZE, padding: isSelected ? '6px 14px' : '0px', borderRadius: 8, background: isSelected ? HIGHLIGHT_COLOR : 'transparent', color: isSelected ? '#fff' : '#0f172a', fontWeight: isSelected ? 800 : 600, boxShadow: 'none', transform: isSelected ? 'scale(1.04)' : 'scale(1)', transition: `transform ${TRANS_DUR}ms ${TRANS_BEZIER} ${delay}` }}>{st}</span>
                            </li>
                          );
                        });
                      })()}
                    </ul>
                  </div>
                  
                </div>
              </div>
            </foreignObject>
          </g>
        </g>

        {/* Polished magnifier (on top) */}
        <g transform={`translate(${magnifier.x}, ${magnifier.y})`}>
          <g>
            {/* rim shadow removed for transparent background */}
            <circle cx={0} cy={0} r={lensRadius + 4} fill="none" stroke="transparent" strokeWidth={8} />

            {/* main rim - stroke-only so interior stays clear */}
            <circle cx={0} cy={0} r={lensRadius} fill="none" stroke="url(#frameGrad)" strokeWidth={6} filter="url(#frameShadow)" />

            {/* frame highlight ring */}
            <circle cx={0} cy={0} r={lensRadius - 2} fill="none" stroke="url(#frameBevelGrad)" strokeWidth={3} />

            {/* inner frame bevel */}
            <circle cx={0} cy={0} r={lensRadius - 6} fill="none" stroke="rgba(160,174,192,0.4)" strokeWidth={1} />

            {/* glass area - fully transparent (no gradient or glare) */}
            <circle cx={0} cy={0} r={lensRadius - 8} fill="transparent" stroke="transparent" strokeWidth={1} />

            {/* enhanced handle assembly rotated to 45deg */}
            <g transform={`rotate(45 0 0)`}> 
              {/* handle connection point - small metal joint */}
              <circle cx={lensRadius} cy={0} r={6} fill="url(#handleGrad)" stroke="rgba(160,174,192,0.3)" strokeWidth={1} />
              
              {/* main handle body */}
              <g transform={`translate(${lensRadius + 10}, ${-handleH / 2})`}>
                {/* handle shadow base - neutralized for transparent background */}
                <rect x={-2} y={2} width={handleW + 4} height={handleH} rx={handleH / 2} fill="transparent" />
                
                {/* main handle body */}
                <rect x={0} y={0} width={handleW} height={handleH} rx={handleH / 2} fill="url(#handleGrad)" stroke="rgba(160,174,192,0.2)" strokeWidth={1} filter="url(#handleShadow)" />
                
                {/* top highlight strip */}
                <rect x={6} y={2} width={handleW - 12} height={4} rx={2} fill="url(#handleHighlight)" opacity="0.6" />
                
                {/* bottom shadow groove - neutralized */}
                <rect x={6} y={handleH - 6} width={handleW - 12} height={3} rx={1.5} fill="transparent" opacity="0" />
                
                {/* central textured band */}
                <rect x={10} y={6} width={handleW - 20} height={6} rx={3} fill="rgba(0,0,0,0.1)" />
                <rect x={12} y={7} width={handleW - 24} height={4} rx={2} fill="rgba(255,255,255,0.05)" />
                
                {/* end cap with enhanced detail */}
                <ellipse cx={handleW + 2} cy={handleH / 2} rx={8} ry={handleH / 2 + 1} fill="url(#handleGrad)" stroke="rgba(160,174,192,0.3)" strokeWidth={1} />
                <ellipse cx={handleW + 2} cy={handleH / 2} rx={5} ry={handleH / 2 - 2} fill="rgba(255,255,255,0.08)" />
                
                {/* grip texture lines */}
                {[...Array(5)].map((_, i) => (
                  <line key={i} x1={15 + i * 12} y1={4} x2={15 + i * 12} y2={handleH - 4} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
                ))}
              </g>
            </g>

            {pulse && (
              <g>
                <circle cx={0} cy={0} r={lensRadius + 10} stroke="#4a5568" strokeWidth={1.2} fill="none" opacity={0.12} style={{ transformOrigin: 'center', animation: 'ripplePulse 900ms ease-out forwards' }} />
                <circle cx={0} cy={0} r={lensRadius + 4} stroke="#60a5fa" strokeWidth={0.8} fill="none" opacity={0.08} style={{ transformOrigin: 'center', animation: 'ripplePulse 1100ms ease-out forwards', mixBlendMode: 'screen' }} />
              </g>
            )}
          </g>
        </g>
    </g>

        {/* Solo highlighted subtopic overlay with note - centered on magnifier and using the same highlight gradient */}
        {showSoloNote && (
          <foreignObject x={magnifier.x - SOLO_W / 2} y={magnifier.y - SOLO_H / 2} width={SOLO_W} height={SOLO_H}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                padding: 12,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', height: '100%', boxSizing: 'border-box', justifyContent: 'center', textAlign: 'center'
              }}>
                <div style={{ display: 'inline-block', padding: '8px 14px', borderRadius: 8, background: HIGHLIGHT_COLOR, color: '#fff', fontSize: 20, fontWeight: 700 }}>{soloSubtopic}</div>
                <div style={{ fontSize: 14, color: '#374151', maxWidth: SOLO_W - 48 }}>{`${soloSubtopic} is an area that requires special attention compared to your past tests—improving here will greatly boost your overall performance.`}</div>
              </div>
            </div>
          </foreignObject>
        )}

      </svg>  
    </div>
  );
};

export default HyperPreciseAnalysisAnimation;
