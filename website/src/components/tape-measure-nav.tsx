"use client";

import * as React from "react";
import { motion, useMotionValue, animate } from "framer-motion";

interface TapeMeasureNavProps {
  items: Array<{ href: string; label: string }>;
  activeHref: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * TapeMeasureNav — premium measuring tape navigation indicator
 * 
 * Replaces standard navigation underline with a mechanical tape measure interaction.
 * The tape extends from the logo as the user moves across navigation items.
 * 
 * Motion characteristics:
 * - Confident, precise, engineered
 * - 250-350ms duration (crisp, premium)
 * - Mechanical feel (not elastic, not bouncy)
 * 
 * Color direction:
 * - Body: warm ivory / aged steel
 * - Measurement marks: Ripe Olive
 * - Active highlight: Cavern Clay
 * - Metallic reflections: warm paper white
 */
export function TapeMeasureNav({ items, activeHref, containerRef }: TapeMeasureNavProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [itemPositions, setItemPositions] = React.useState<Array<{ left: number; width: number }>>([]);

  const tapeX = useMotionValue(0);
  const tapeWidth = useMotionValue(0);

  // Calculate item positions on mount and resize
  React.useEffect(() => {
    const updatePositions = () => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const navItems = containerRef.current.querySelectorAll('a');
      const positions = Array.from(navItems).map((item) => {
        const itemRect = item.getBoundingClientRect();
        return {
          left: itemRect.left - containerRect.left,
          width: itemRect.width,
        };
      });
      
      setItemPositions(positions);
      
      // Set initial active position
      const activeIdx = items.findIndex(item => item.href === activeHref);
      if (activeIdx !== -1 && positions[activeIdx]) {
        setActiveIndex(activeIdx);
        tapeX.set(positions[activeIdx].left);
        tapeWidth.set(positions[activeIdx].width);
      }
    };

    // Small delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(updatePositions, 100);
    updatePositions();
    
    window.addEventListener('resize', updatePositions);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updatePositions);
    };
  }, [items, activeHref, containerRef, tapeX, tapeWidth]);

  // Animate tape to active item
  React.useEffect(() => {
    const activeIdx = items.findIndex(item => item.href === activeHref);
    if (activeIdx !== -1 && itemPositions[activeIdx]) {
      setActiveIndex(activeIdx);
      
      // Mechanical, crisp animation (300ms)
      animate(tapeX, itemPositions[activeIdx].left, {
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1], // Premium cubic-bezier
      });
      
      animate(tapeWidth, itemPositions[activeIdx].width, {
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1],
      });
    }
  }, [activeHref, itemPositions, tapeX, tapeWidth, items]);

  return (
    <motion.div
      className="absolute bottom-0 left-0 h-[4px] pointer-events-none z-20"
      style={{
        x: tapeX,
        width: tapeWidth,
      }}
    >
      {/* Tape body - warm ivory / aged steel */}
      <div className="relative h-full w-full bg-[#E6DFD3] overflow-hidden shadow-sm">
        {/* Measurement marks - Ripe Olive */}
        <div className="absolute inset-0 flex items-center">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-full w-[1px] bg-[#5E6259]/30"
              style={{ left: `${(i / 20) * 100}%` }}
            />
          ))}
        </div>
        
        {/* Numbered intervals every few divisions */}
        <div className="absolute inset-0 flex items-center justify-between px-1">
          {[0, 5, 10, 15].map((i) => (
            <span
              key={i}
              className="text-[7px] font-medium text-[#5E6259]/40 leading-none"
            >
              {i}
            </span>
          ))}
        </div>
        
        {/* Active highlight - Cavern Clay */}
        <motion.div
          className="absolute inset-0 bg-[#AC6B53]/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
        
        {/* Tiny metallic highlight - warm paper white */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-[#F8F5F0]/40" />
      </div>
    </motion.div>
  );
}
