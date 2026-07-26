/**
 * Page Transition Animations
 * 
 * Smooth transitions between pages using Framer Motion's AnimatePresence.
 * Creates seamless navigation experience.
 */

import { Variants } from "framer-motion";

/**
 * Fade transition between pages
 */
export const pageFade: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: "easeIn"
    }
  }
};

/**
 * Slide up transition between pages
 */
export const pageSlideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: {
      duration: 0.3,
      ease: "easeIn"
    }
  }
};

/**
 * Scale transition between pages
 */
export const pageScale: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: { 
    opacity: 0, 
    scale: 1.02,
    transition: {
      duration: 0.3,
      ease: "easeIn"
    }
  }
};
