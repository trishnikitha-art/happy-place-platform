"use client";

import { motion, AnimatePresence } from "framer-motion";

interface SchedulingQuestionRevealProps {
  isVisible: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * SchedulingQuestionReveal - Height/opacity reveal for scheduling question
 * 
 * Simple height/opacity reveal using CSS grid-template-rows transition.
 * No JS layout measurement needed, uses CSS grid for smooth height animation.
 */
export function SchedulingQuestionReveal({ isVisible, children, className }: SchedulingQuestionRevealProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ 
            height: { duration: 0.3, ease: "easeInOut" },
            opacity: { duration: 0.2 }
          }}
          className={className}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
