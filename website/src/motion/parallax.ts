/**
 * Parallax Animations
 * 
 * Parallax effects for hero images and background elements.
 * Uses Framer Motion's useScroll and useTransform for smooth parallax.
 */

import { Variants } from "framer-motion";

/**
 * Subtle parallax for hero backgrounds
 */
export const parallaxSlow: Variants = {
  initial: { scale: 1.05, y: 0 },
  animate: { 
    scale: 1.12, 
    y: -20,
    transition: {
      duration: 18,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "reverse"
    }
  }
};

/**
 * Medium parallax for featured images
 */
export const parallaxMedium: Variants = {
  initial: { scale: 1.05, y: 0 },
  animate: { 
    scale: 1.1, 
    y: -15,
    transition: {
      duration: 12,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "reverse"
    }
  }
};

/**
 * Fast parallax for decorative elements
 */
export const parallaxFast: Variants = {
  initial: { scale: 1.05, y: 0 },
  animate: { 
    scale: 1.08, 
    y: -10,
    transition: {
      duration: 8,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "reverse"
    }
  }
};

/**
 * Horizontal parallax (for horizontal scroll sections)
 */
export const parallaxHorizontal: Variants = {
  initial: { x: 0 },
  animate: { 
    x: -30,
    transition: {
      duration: 15,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "reverse"
    }
  }
};
