/**
 * Reveal Animations
 * 
 * Scroll-triggered reveal animations for content sections.
 * Uses Framer Motion's useInView hook for viewport detection.
 * Respects reduced motion preferences - uses immediate opacity changes instead.
 */

import { Variants } from "framer-motion";

/**
 * Reveal from bottom (most common)
 * Under reduced motion: immediate opacity change, no movement
 */
export const revealUp: Variants = {
  hidden: { 
    opacity: 0, 
    y: 30 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  reducedMotion: {
    opacity: 1,
    y: 0,
    transition: { duration: 0 }
  }
};

/**
 * Reveal from top
 * Under reduced motion: immediate opacity change, no movement
 */
export const revealDown: Variants = {
  hidden: { 
    opacity: 0, 
    y: -30 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  reducedMotion: {
    opacity: 1,
    y: 0,
    transition: { duration: 0 }
  }
};

/**
 * Reveal from left
 * Under reduced motion: immediate opacity change, no movement
 */
export const revealLeft: Variants = {
  hidden: { 
    opacity: 0, 
    x: 30 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  reducedMotion: {
    opacity: 1,
    x: 0,
    transition: { duration: 0 }
  }
};

/**
 * Reveal from right
 * Under reduced motion: immediate opacity change, no movement
 */
export const revealRight: Variants = {
  hidden: { 
    opacity: 0, 
    x: -30 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  reducedMotion: {
    opacity: 1,
    x: 0,
    transition: { duration: 0 }
  }
};

/**
 * Reveal with scale (for cards, images)
 * Under reduced motion: immediate opacity change, no scale
 */
export const revealScale: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  reducedMotion: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0 }
  }
};

/**
 * Reveal with blur (for text content)
 * Under reduced motion: immediate opacity change, no blur
 */
export const revealBlur: Variants = {
  hidden: { 
    opacity: 0, 
    filter: "blur(10px)" 
  },
  visible: { 
    opacity: 1, 
    filter: "blur(0px)",
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  reducedMotion: {
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0 }
  }
};
