import { motion, useAnimation } from "motion/react";
import { useEffect } from "react";

// Activity Component
const activityPathVariants = {
  normal: {
    pathLength: 1,
    pathOffset: 0,
    opacity: 1,
  },
  animate: {
    pathLength: [0, 1],
    pathOffset: [1, 0],
    opacity: [0.3, 1],
    transition: {
      duration: 1.5,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: 0.5,
    },
  },
};

const Activity = ({ width = 28, height = 28, strokeWidth = 2, stroke = "#3b82f6", color, animate = "normal", ...props }) => {
  return (
    <div
      style={{ cursor: "pointer", userSelect: "none", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color || stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <motion.path
          d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"
          variants={activityPathVariants}
          animate={animate}
          initial="normal"
        />
      </svg>
    </div>
  );
};

// AlarmClockCheck Component
const checkmarkVariants = {
  normal: {
    pathLength: 0,
    opacity: 0,
  },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: 1,
    },
  },
};

const bellVariants = {
  normal: { rotate: 0 },
  animate: {
    rotate: [-10, 10, -10],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatType: "reverse",
    },
  },
};

const AlarmClockCheck = ({ width = 28, height = 28, strokeWidth = 2, stroke = "#3b82f6", color, animate = "normal", ...props }) => {
  return (
    <div
      style={{ cursor: "pointer", userSelect: "none", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color || stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <circle cx="12" cy="13" r="8" />
        <motion.g variants={bellVariants} animate={animate} initial="normal">
          <path d="M5 3 2 6" />
          <path d="m22 6-3-3" />
          <path d="M6.38 18.7 4 21" />
          <path d="M17.64 18.67 20 21" />
        </motion.g>
        <motion.path
          d="m9 13 2 2 4-4"
          variants={checkmarkVariants}
          animate={animate}
          initial="normal"
        />
      </svg>
    </div>
  );
};

// ChartLine Component
const frameVariants = {
  visible: { opacity: 1 },
  hidden: { opacity: 1 },
};

const lineVariants = {
  visible: { pathLength: 1, opacity: 1 },
  hidden: { pathLength: 0, opacity: 0 },
};

const ChartLine = ({ width = 28, height = 28, strokeWidth = 2, stroke = "#3b82f6", color, animate = "visible", ...props }) => {
  const controls = useAnimation();

  useEffect(() => {
    let isMounted = true;
    const loop = async () => {
      while (isMounted && animate === "animate") {
        await controls.start((i) => ({
          pathLength: 0,
          opacity: 0,
          transition: { delay: i * 0.1, duration: 0.3 },
        }));
        await controls.start((i) => ({
          pathLength: 1,
          opacity: 1,
          transition: { delay: i * 0.1, duration: 0.3 },
        }));
      }
    };
    if (animate === "animate") {
      loop();
    } else {
      controls.start("visible");
    }
    return () => { isMounted = false; };
  }, [animate, controls]);

  return (
    <div
      style={{ cursor: "pointer", userSelect: "none", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color || stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <motion.path variants={frameVariants} d="M3 3v16a2 2 0 0 0 2 2h16" />
        <motion.path
          variants={lineVariants}
          initial="visible"
          animate={controls}
          custom={1}
          d="m19 9-5 5-4-4-3 3"
        />
      </svg>
    </div>
  );
};

// HeartHandshake Component
const transition = {
  duration: 0.3,
  opacity: { delay: 0.15 },
};

const variants = {
  normal: {
    pathLength: 1,
    opacity: 1,
  },
  animate: (custom) => ({
    pathLength: [0, 1],
    opacity: [0, 1],
    transition: {
      ...transition,
      delay: 0.1 * custom,
      repeat: Infinity,
      repeatDelay: 0.5,
    },
  }),
};

const HeartHandshake = ({ width = 28, height = 28, strokeWidth = 2, stroke = "#3b82f6", color, animate = "normal", ...props }) => {
  const controls = useAnimation();

  useEffect(() => {
    if (animate === "animate") {
      controls.start((i) => variants.animate(i));
    } else {
      controls.start("normal");
    }
  }, [animate, controls]);

  return (
    <div
      style={{ cursor: "pointer", userSelect: "none", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color || stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <motion.path
          d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          variants={variants}
          animate={controls}
          custom={0}
          initial="normal"
        />
        <motion.path
          d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"
          variants={variants}
          animate={controls}
          custom={1}
          initial="normal"
        />
        <motion.path
          d="m18 15-2-2"
          variants={variants}
          animate={controls}
          custom={2}
          initial="normal"
        />
        <motion.path
          d="m15 18-2-2"
          variants={variants}
          animate={controls}
          custom={3}
          initial="normal"
        />
      </svg>
    </div>
  );
};

// SmartphoneNfc Component
const smartphonePathVariants = {
  normal: {
    opacity: 1,
    scale: 1,
  },
  animate: (i) => ({
    opacity: [0.3, 1, 0.3],
    scale: [0.8, 1, 0.8],
    transition: {
      duration: 2,
      ease: "easeInOut",
      repeat: Infinity,
      delay: i * 0.2,
    },
  }),
};

const SmartphoneNfc = ({ width = 28, height = 28, strokeWidth = 2, stroke = "#3b82f6", color, animate = "normal", ...props }) => {
  return (
    <div
      style={{ cursor: "pointer", userSelect: "none", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color || stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <rect width="7" height="12" x="2" y="6" rx="1" />
        <motion.path
          d="M13 8.32a7.43 7.43 0 0 1 0 7.36"
          variants={smartphonePathVariants}
          animate={animate}
          custom={0}
        />
        <motion.path
          d="M16.46 6.21a11.76 11.76 0 0 1 0 11.58"
          variants={smartphonePathVariants}
          animate={animate}
          custom={1}
        />
        <motion.path
          d="M19.91 4.1a15.91 15.91 0 0 1 .01 15.8"
          variants={smartphonePathVariants}
          animate={animate}
          custom={2}
        />
      </svg>
    </div>
  );
};

// Sparkles Component
const starVariants = {
  normal: {
    scale: 1,
  },
  animate: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 2,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "reverse",
    },
  },
};

const sparkleVariants = {
  normal: {
    x: 0,
    y: 0,
    opacity: 1,
  },
  animate: (i) => ({
    x: [0, 2, -1, 1, -2, 0][i % 6],
    y: [0, -1, 1, -2, 1, 0][i % 6],
    opacity: [1, 0.7, 1, 0.5, 1],
    transition: {
      duration: 4,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "reverse",
      delay: i * 0.2,
    },
  }),
};

const Sparkles = ({ width = 28, height = 28, strokeWidth = 2, stroke = "#3b82f6", color, animate = "normal", ...props }) => {
  return (
    <div
      style={{ cursor: "pointer", userSelect: "none", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color || stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <motion.path
          d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
          variants={starVariants}
          animate={animate}
          initial="normal"
        />
        <motion.g
          variants={sparkleVariants}
          animate={animate}
          initial="normal"
          custom={0}
        >
          <motion.path d="M20 3v4" />
          <motion.path d="M22 5h-4" />
        </motion.g>
        <motion.g
          variants={sparkleVariants}
          animate={animate}
          initial="normal"
          custom={1}
        >
          <motion.path d="M4 17v2" />
          <motion.path d="M5 18H3" />
        </motion.g>
      </svg>
    </div>
  );
};

export { Activity, AlarmClockCheck, ChartLine, HeartHandshake, SmartphoneNfc, Sparkles };
