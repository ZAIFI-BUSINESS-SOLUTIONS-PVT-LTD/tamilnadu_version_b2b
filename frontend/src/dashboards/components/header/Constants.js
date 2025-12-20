export const mobileSidebarVariants = {
  /**
   * Defines the initial (hidden) state of the mobile sidebar.
   * The sidebar is positioned off-screen to the left.
   */
  hidden: { x: "-100%" },
  /**
   * Defines the visible state of the mobile sidebar.
   * The sidebar slides into view (x: 0) with a spring-based animation.
   * - `type: "spring"`: Provides a natural, bouncy animation effect.
   * - `stiffness: 300`: Controls the spring's stiffness, making the animation snappier.
   * - `damping: 30`: Controls the friction, reducing oscillation/bounciness.
   */
  visible: {
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  /**
   * Defines the exit state of the mobile sidebar.
   * The sidebar slides out of view to the left with a quick transition.
   * - `duration: 0.2`: Specifies a short duration for the exit animation.
   */
  exit: { x: "-100%", transition: { duration: 0.2 } }
};

export const mobileOverlayVariants = {
  /**
   * Defines the initial (hidden) state of the mobile overlay.
   * The overlay is fully transparent.
   */
  hidden: { opacity: 0 },
  /**
   * Defines the visible state of the mobile overlay.
   * The overlay fades in to a semi-transparent state.
   * - `duration: 0.3`: Specifies the duration for the fade-in animation.
   */
  visible: { opacity: 0.5, transition: { duration: 0.3 } },
  /**
   * Defines the exit state of the mobile overlay.
   * The overlay fades out to full transparency.
   * - `duration: 0.2`: Specifies a short duration for the fade-out animation.
   */
  exit: { opacity: 0, transition: { duration: 0.2 } }
};