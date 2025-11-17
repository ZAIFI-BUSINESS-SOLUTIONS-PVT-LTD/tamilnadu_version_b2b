import React, { useEffect, useMemo, useState } from 'react';

// 4x4 puzzle animation: pieces auto-animate into place with smooth easing.
const TOTAL_PIECES = 16;
const COLS = 4;
const ROWS = 4;

// shared canvas size for landing-page animations (exported so other animations can stay aligned)
export const CANVAS_W = 520;
export const CANVAS_H = 520;

const LongitudinalInsightsAnimation = () => {
  // --- State ---
  const [placedCount, setPlacedCount] = useState(0); // Number of pieces placed
  const [showCard, setShowCard] = useState(false);   // Show assembled card
  const [typedLen, setTypedLen] = useState(0);       // Typewriter effect
  const [showCursor, setShowCursor] = useState(true);
  // cycle counter to restart the animation loop
  const [cycle, setCycle] = useState(0);
  // when true, immediately hide pieces with no transitions while we reset the DOM
  const [resetting, setResetting] = useState(false);

  // --- Animation: Place pieces one by one ---
  useEffect(() => {
    // start placing pieces for this cycle
    setPlacedCount(0);
    const interval = setInterval(() => {
      setPlacedCount(c => {
        if (c >= TOTAL_PIECES) {
          clearInterval(interval);
          return TOTAL_PIECES;
        }
        return c + 1;
      });
    }, 420);
    return () => clearInterval(interval);
  }, [cycle]);

  // --- Layout constants ---
  const vw = CANVAS_W, vh = CANVAS_H;
  const padding = 30, gap = 0;
  const pieceW = Math.floor((vw - padding * 2 - gap * (COLS - 1)) / COLS);
  const pieceH = Math.floor((vh - padding * 2 - gap * (ROWS - 1)) / ROWS);

  // --- Calculate slot positions ---
  const slots = useMemo(() => {
    const arr = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        const x = padding + c * (pieceW + gap);
        const y = padding + r * (pieceH + gap);
        arr.push({ x, y, w: pieceW, h: pieceH, idx });
      }
    }
    return arr;
  }, [pieceW, pieceH]);

  // --- Start offsets for animation (pieces fly in from a circle) ---
  const startOffsets = useMemo(() => {
    const arr = [];
    const radius = Math.max(vw, vh) * 0.6;
    for (let i = 0; i < TOTAL_PIECES; i++) {
      const angle = (i / TOTAL_PIECES) * Math.PI * 2;
      arr.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }
    return arr;
  }, [vw, vh]);

  // --- Randomized starting rotations per piece for a lively entrance ---
  const startRotations = useMemo(() => {
    const arr = [];
    for (let i = 0; i < TOTAL_PIECES; i++) {
      const seed = Math.sin(i * 12.9898) * 43758.5453;
      const rand = seed - Math.floor(seed);
      arr.push(rand * 30 - 15); // -15deg to +15deg
    }
    return arr;
  }, []);

  // --- Ascending test labels with randomized gaps (recomputed each cycle) ---
  // Labels will be strictly increasing, but differences between adjacent labels are random.
  const randomizedLabels = useMemo(() => {
    const arr = [];
    const maxGap = 6; // maximum random step between adjacent labels (1..maxGap)
    let value = 1;
    for (let i = 0; i < TOTAL_PIECES; i++) {
      arr.push(value);
      const gap = Math.floor(Math.random() * maxGap) + 1; // 1..maxGap
      value += gap;
    }
    return arr;
  }, [cycle]);

  // --- Create matching tab directions for internal edges ---

  // --- Tab directions for puzzle pieces ---
  const horizontalTabs = useMemo(() => {
    const arr = Array.from({ length: ROWS }, () => Array(COLS - 1).fill(false));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        arr[r][c] = (r + c) % 2 === 0;
      }
    }
    return arr;
  }, []);

  const verticalTabs = useMemo(() => {
    const arr = Array.from({ length: ROWS - 1 }, () => Array(COLS).fill(false));
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS; c++) {
        arr[r][c] = (r + c) % 2 === 0;
      }
    }
    return arr;
  }, []);

  const allPlaced = placedCount >= TOTAL_PIECES;

  // --- Color palette ---
  const palette = [
    '#0ea5e9', '#06b6d4', '#7c3aed', '#6366f1',
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#2563eb', '#8b5cf6', '#ec4899', '#fb7185'
  ];
  const blue500 = '#3b82f6';
  const assembledBg = '#3b82f6';

  // --- Show assembled card after puzzle is solved ---
  useEffect(() => {
    if (!allPlaced) {
      setShowCard(false);
      return;
    }
    const t = setTimeout(() => setShowCard(true), 3000);
    return () => clearTimeout(t);
  }, [allPlaced]);

  // --- Typewriter state for assembled message ---
  const line1 = 'Beyond one mock test';
  const line2 = 'your full journey.';
  const combined = line1 + '\n' + line2;
  useEffect(() => {
    let ti;
    let ci;
    if (showCard) {
      setTypedLen(0);
      ti = setInterval(() => {
        setTypedLen(n => {
          if (n >= combined.length) {
            clearInterval(ti);
            return combined.length;
          }
          return n + 1;
        });
      }, 60);
      ci = setInterval(() => setShowCursor(s => !s), 500);
    } else {
      setTypedLen(0);
      setShowCursor(true);
    }
    return () => {
      clearInterval(ti);
      clearInterval(ci);
    };
  }, [showCard]);

  // --- Looping: when typing completes, wait 4s then restart animation by incrementing cycle ---
  useEffect(() => {
    if (!showCard) return undefined;
    if (typedLen < combined.length) return undefined; // not finished typing
    const t = setTimeout(() => {
      // Begin reset: immediately hide everything (no transitions)
      setResetting(true);
      setShowCard(false);
      setTypedLen(0);
      setShowCursor(true);
      setPlacedCount(0);
      // after a short pause to allow DOM to update, bump cycle to replay
      const restart = setTimeout(() => {
        setCycle(c => c + 1);
        // clear resetting after the new cycle starts so transitions resume
        setTimeout(() => setResetting(false), 60);
      }, 140);
      return () => clearTimeout(restart);
    }, 4000);
    return () => clearTimeout(t);
  }, [showCard, typedLen, combined.length]);

  // --- Helper: build a rectangle path with selectively rounded corners ---
  const roundedRectPath = (w, h, r, { tl = false, tr = false, br = false, bl = false } = {}) => {
    const x = -w / 2;
    const y = -h / 2;
    const rx = Math.max(0, Math.min(r, w / 2));
    const ry = Math.max(0, Math.min(r, h / 2));
    const right = x + w;
    const bottom = y + h;
    let d = '';
    d += `M ${x + (tl ? rx : 0)} ${y}`;
    d += ` H ${right - (tr ? rx : 0)}`;
    if (tr) d += ` A ${rx} ${ry} 0 0 1 ${right} ${y + ry}`;
    d += ` V ${bottom - (br ? ry : 0)}`;
    if (br) d += ` A ${rx} ${ry} 0 0 1 ${right - rx} ${bottom}`;
    d += ` H ${x + (bl ? rx : 0)}`;
    if (bl) d += ` A ${rx} ${ry} 0 0 1 ${x} ${bottom - ry}`;
    d += ` V ${y + (tl ? ry : 0)}`;
    if (tl) d += ` A ${rx} ${ry} 0 0 1 ${x + rx} ${y}`;
    d += ' Z';
    return d;
  };

  return (
    <div className="w-full h-full flex items-center justify-center relative">
  <svg className="w-full h-full" width="100%" height="100%" viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" style={{ pointerEvents: 'none' }}>
        <defs>
          <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0ea5e9" floodOpacity="0.08" />
          </filter>
          {/* Background gradient and extra glow removed to keep background fully transparent */}
          {/* Shine sweep used on assembled state */}
          <linearGradient id="shineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff00" />
            <stop offset="50%" stopColor="#ffffffff" />
            <stop offset="100%" stopColor="#ffffff00" />
          </linearGradient>
        </defs>

          {/* Slight zoom: scale the artwork around the SVG center so it appears slightly zoomed out */}
        <g transform={`translate(${vw / 2} ${vh / 2}) scale(0.86) translate(${-vw / 2} ${-vh / 2})`}>

          {/* Background made fully transparent (no gradient/shadow) */}
          <rect x="0" y="0" width={vw} height={vh} fill="transparent" />

          {/* Empty slots background */}
          {slots.map(s => {
            const slotCorner = Math.min(12, Math.floor(Math.min(s.w, s.h) * 0.12));
            return (
              <g key={`slot-${s.idx}`} transform={`translate(${s.x}, ${s.y})`}>
                <rect x={0} y={0} width={s.w} height={s.h} rx={slotCorner} fill={showCard ? assembledBg : '#F8FAFC'} stroke="none" style={{ transition: 'fill 520ms ease' }} />
              </g>
            );
          })}

          {/* Pieces: draw bodies + inward cuts first (so outward knobs can render above) */}
          {slots.map((s, i) => {
            const placed = i < placedCount;
            const delay = `${i * 120}ms`;
            // label uses randomizedLabels to keep numbers random while leaving piece layout unchanged
            const label = `Test ${randomizedLabels[i]}`;
            const rIdx = Math.floor(i / COLS);
            const cIdx = i % COLS;
            const tabR = Math.min(18, Math.floor(Math.min(s.w, s.h) * 0.12));
            const slotBg = showCard ? assembledBg : '#F8FAFC';
            // corner rounding for outer corner pieces
            const isCorner = i === 0 || i === 3 || i === 12 || i === 15;
            const cornerRadius = isCorner ? Math.min(16, Math.floor(Math.min(s.w, s.h) * 0.12)) : 0;
            // Tab directions
            const rightTab = cIdx < COLS - 1 && horizontalTabs[rIdx][cIdx];
            const leftTab = cIdx > 0 && horizontalTabs[rIdx][cIdx - 1];
            const bottomTab = rIdx < ROWS - 1 && verticalTabs[rIdx][cIdx];
            const topTab = rIdx > 0 && verticalTabs[rIdx - 1][cIdx];
            // Outward/inward
            const rightOut = rightTab;
            const leftOut = cIdx > 0 ? !horizontalTabs[rIdx][cIdx - 1] : false;
            const bottomOut = bottomTab;
            const topOut = rIdx > 0 ? !verticalTabs[rIdx - 1][cIdx] : false;
            // start offset for flying-in animation
            const start = startOffsets[i] || { x: 0, y: 0 };
            // use translate3d to enable GPU acceleration and smoother transforms
            const initialTransform = `translate3d(${start.x}px, ${start.y}px, 0) scale(0.28) rotate(${startRotations[i] || 0}deg)`;
            const finalTransform = 'translate3d(0, 0, 0) scale(1) rotate(0deg)';
            const pieceStyle = resetting ? {
              transform: initialTransform,
              opacity: 0,
              transition: 'none',
              willChange: 'transform, opacity'
            } : {
              transform: placed ? finalTransform : initialTransform,
              transformOrigin: 'center center',
              transition: `transform var(--piece-duration,820ms) var(--piece-ease,cubic-bezier(.16,.84,.32,1)), opacity 320ms ease`,
              transitionDelay: delay,
              opacity: placed ? 1 : 0,
              willChange: 'transform, opacity'
            };
            const popAnim = (placed && !resetting) ? `pop var(--pop-duration,520ms) var(--pop-ease,cubic-bezier(.22,.9,.28,1)) ${delay} both` : 'none';

            return (
              <g key={`body-${i}`} transform={`translate(${s.x + s.w / 2}, ${s.y + s.h / 2})`}>
                <g className={`piece ${placed ? 'placed' : ''}`} style={pieceStyle}>
                  <g className="pop-wrap" style={{ animation: popAnim, transformOrigin: 'center center' }}>
                    {isCorner ? (
                      // draw path with only the specified outer corner rounded
                      (() => {
                        const tl = i === 0;
                        const tr = i === 3;
                        const bl = i === 12;
                        const br = i === 15;
                        const d = roundedRectPath(s.w, s.h, cornerRadius, { tl, tr, br, bl });
                        const color = showCard ? blue500 : palette[i % palette.length];
                        return (
                          <path d={d} fill={placed ? color : 'transparent'} stroke={placed ? 'rgba(255,255,255,0.12)' : 'none'} strokeWidth={placed ? 1 : 0} filter={placed ? 'url(#softShadow)' : undefined} style={{ transition: 'fill 520ms ease' }} />
                        );
                      })()
                    ) : (
                      <rect
                        x={-s.w / 2}
                        y={-s.h / 2}
                        width={s.w}
                        height={s.h}
                        rx={0}
                        fill={placed ? (showCard ? blue500 : palette[i % palette.length]) : 'transparent'}
                        style={{ transition: 'fill 520ms ease' }}
                        stroke={placed ? 'rgba(255,255,255,0.12)' : 'none'}
                        strokeWidth={placed ? 1 : 0}
                        filter={placed ? 'url(#softShadow)' : undefined}
                      />
                    )}
                    {/* Inward cuts */}
                    {!leftOut && cIdx > 0 && placed && (
                      <circle cx={-s.w / 2} cy={0} r={tabR} fill={slotBg} stroke={showCard ? 'rgba(255,255,255,0.06)' : 'none'} strokeWidth={showCard ? 1 : 0} />
                    )}
                    {!rightOut && cIdx < COLS - 1 && placed && (
                      <circle cx={s.w / 2} cy={0} r={tabR} fill={slotBg} stroke={showCard ? 'rgba(255,255,255,0.06)' : 'none'} strokeWidth={showCard ? 1 : 0} />
                    )}
                    {!topOut && rIdx > 0 && placed && (
                      <circle cx={0} cy={-s.h / 2} r={tabR} fill={slotBg} stroke={showCard ? 'rgba(255,255,255,0.06)' : 'none'} strokeWidth={showCard ? 1 : 0} />
                    )}
                    {!bottomOut && rIdx < ROWS - 1 && placed && (
                      <circle cx={0} cy={s.h / 2} r={tabR} fill={slotBg} stroke={showCard ? 'rgba(255,255,255,0.06)' : 'none'} strokeWidth={showCard ? 1 : 0} />
                    )}

                    {/* Label */}
                    {placed && !showCard && (
                      <text x={0} y={6} fontSize={18} fill="#fff" textAnchor="middle" style={{ fontWeight: 700, letterSpacing: 0.3 }}>
                        {label}
                      </text>
                    )}
                  </g>
                </g>
              </g>


            );
          })}

          {/* Knob layer on top: animate knobs with the same transforms/delays as pieces */}
          <g>
            {slots.map((s, i) => {
              const placed = i < placedCount;
              const rIdx = Math.floor(i / COLS);
              const cIdx = i % COLS;
              const tabR = Math.min(18, Math.floor(Math.min(s.w, s.h) * 0.12));
              const start = startOffsets[i] || { x: 0, y: 0 };
              const delay = `${i * 120}ms`;
              const initialTransform = `translate3d(${start.x}px, ${start.y}px, 0) scale(0.28) rotate(${startRotations[i] || 0}deg)`;
              const finalTransform = 'translate3d(0, 0, 0) scale(1) rotate(0deg)';
              const pieceStyle = resetting ? {
                transform: initialTransform,
                opacity: 0,
                transition: 'none',
                willChange: 'transform, opacity'
              } : {
                transform: placed ? finalTransform : initialTransform,
                transformOrigin: 'center center',
                transition: `transform var(--piece-duration,820ms) var(--piece-ease,cubic-bezier(.16,.84,.32,1)), opacity 320ms ease`,
                transitionDelay: delay,
                opacity: placed ? 1 : 0,
                willChange: 'transform, opacity'
              };
              const popAnim = (placed && !resetting) ? `pop var(--pop-duration,520ms) var(--pop-ease,cubic-bezier(.22,.9,.28,1)) ${delay} both` : 'none';
              // Tab directions
              const rightTab = cIdx < COLS - 1 && horizontalTabs[rIdx][cIdx];
              const leftTab = cIdx > 0 && horizontalTabs[rIdx][cIdx - 1];
              const bottomTab = rIdx < ROWS - 1 && verticalTabs[rIdx][cIdx];
              const topTab = rIdx > 0 && verticalTabs[rIdx - 1][cIdx];
              const rightOut = rightTab;
              const leftOut = cIdx > 0 ? !horizontalTabs[rIdx][cIdx - 1] : false;
              const bottomOut = bottomTab;
              const topOut = rIdx > 0 ? !verticalTabs[rIdx - 1][cIdx] : false;

              return (
                <g key={`knobs-${i}`} transform={`translate(${s.x + s.w / 2}, ${s.y + s.h / 2})`}>
                  <g style={pieceStyle}>
                    <g className="pop-wrap" style={{ animation: popAnim, transformOrigin: 'center center' }}>
                      {leftOut && <circle className="knob" cx={-s.w / 2} cy={0} r={tabR} fill={showCard ? blue500 : palette[i % palette.length]} stroke={showCard ? 'rgba(255,255,255,0.14)' : 'none'} strokeWidth={showCard ? 1 : 0} filter={showCard ? 'url(#softShadow)' : undefined} style={{ transition: 'fill 520ms ease, stroke 520ms ease' }} />}
                      {rightOut && <circle className="knob" cx={s.w / 2} cy={0} r={tabR} fill={showCard ? blue500 : palette[i % palette.length]} stroke={showCard ? 'rgba(255,255,255,0.14)' : 'none'} strokeWidth={showCard ? 1 : 0} filter={showCard ? 'url(#softShadow)' : undefined} style={{ transition: 'fill 520ms ease, stroke 520ms ease' }} />}
                      {topOut && <circle className="knob" cx={0} cy={-s.h / 2} r={tabR} fill={showCard ? blue500 : palette[i % palette.length]} stroke={showCard ? 'rgba(255,255,255,0.14)' : 'none'} strokeWidth={showCard ? 1 : 0} filter={showCard ? 'url(#softShadow)' : undefined} style={{ transition: 'fill 520ms ease, stroke 520ms ease' }} />}
                      {bottomOut && <circle className="knob" cx={0} cy={s.h / 2} r={tabR} fill={showCard ? blue500 : palette[i % palette.length]} stroke={showCard ? 'rgba(255,255,255,0.14)' : 'none'} strokeWidth={showCard ? 1 : 0} filter={showCard ? 'url(#softShadow)' : undefined} style={{ transition: 'fill 520ms ease, stroke 520ms ease' }} />}
                    </g>
                  </g>
                </g>
              );
            })}
          </g>

          <style>{`
          /* Inline styles handle the piece transitions; keep small helpers here */
          :root {
            --piece-duration: 820ms;
            --piece-ease: cubic-bezier(.16,.84,.32,1);
            --pop-duration: 520ms;
            --pop-ease: cubic-bezier(.22,.9,.28,1);
            --card-in-duration: 420ms;
            --card-in-ease: cubic-bezier(.2,.9,.25,1);
          }

          .knob { pointer-events: none; transform-origin: center; }

          @keyframes pop {
            0% { transform: scale(0.98); }
            28% { transform: scale(1.08); }
            60% { transform: scale(0.995); }
            100% { transform: scale(1); }
          }

          /* knobPulse removed to disable continuous knob pulsing */

          @keyframes cardIn {
            0% { transform: translateY(8px) scale(0.98); opacity: 0; }
            100% { transform: translateY(0) scale(1); opacity: 1; }
          }
          
          /* Respect user's reduced motion preferences */
          @media (prefers-reduced-motion: reduce) {
            :root { --piece-duration: 1ms; --pop-duration: 1ms; --card-in-duration: 1ms; }
            .pop-wrap, .piece, .knob { transition: none !important; animation: none !important; }
          }

          /* Rendering hints */
          .piece, .knob, .pop-wrap { backface-visibility: hidden; -webkit-font-smoothing: antialiased; }
        `}</style>
        </g>
      </svg>
      {/* Centered assembled message */}
      {showCard && !resetting && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ maxWidth: '70%', textAlign: 'center', animation: 'cardIn var(--card-in-duration) var(--card-in-ease) both' }}>
            <div style={{ fontWeight: 600, fontSize: 18, lineHeight: '1.2', textShadow: '0 4px 18px rgba(0,0,0,0.35)', background: 'linear-gradient(90deg, #ffffff, #e0f2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              <div style={{ minHeight: 24 }}>
                {line1.substring(0, Math.min(typedLen, line1.length))}
                {typedLen < line1.length && showCursor && <span style={{ marginLeft: 4 }}>|</span>}
              </div>
              <div style={{ marginTop: 8, fontSize: 30, fontWeight: 800 }}>
                {typedLen > line1.length ? line2.substring(0, Math.max(0, typedLen - line1.length - 1)) : ''}
                {typedLen >= line1.length && typedLen < combined.length && showCursor && <span style={{ marginLeft: 4 }}>|</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shine sweep overlay when assembled */}
      {showCard && !resetting && (
        <svg className="pointer-events-none" width="100%" height="100%" viewBox={`0 0 ${vw} ${vh}`} style={{ position: 'absolute', inset: 0 }}>
          <g opacity={0.12} transform={`rotate(20 ${vw / 2} ${vh / 2})`}>
            <rect x={-vw} y={0} width={vw / 2} height={vh} fill="url(#shineGrad)">
              <animateTransform attributeName="transform" type="translate" from={`-${vw} 0`} to={`${vw * 1.5} 0`} dur="3.2s" repeatCount="indefinite" />
            </rect>
          </g>
        </svg>
      )}
    </div>
  );
};

export default LongitudinalInsightsAnimation;
