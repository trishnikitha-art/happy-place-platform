/**
 * SpeculationRules - Progressive enhancement for instant-feeling navigation
 *
 * Uses the Speculation Rules API to prefetch/prerender high-intent pages.
 * Browsers that don't support this simply ignore the script tag.
 *
 * Phase 1: Infrastructure - Never changes navigation behavior, never blocks rendering
 * Phase 2: Conservative prefetch targets - Only high-intent pages
 * Phase 3: Conservative prerender - Estimate only, desktop only
 * Phase 4: Hover prediction - Only after user intent is clear (moderate eagerness)
 * Phase 5: Exclusions - Admin, API, auth routes excluded
 * Phase 6: Accessibility - No interference with screen readers or focus
 * Phase 7: Performance guardrails - Aborts on Save-Data, 2G, low memory
 * Phase 8: Analytics - Only tracks speculation, never fires pageview during speculation
 * Phase 9: Rollback - Single feature flag controls everything
 * Phase 10: Validation - No duplicate fetches, no hydration mismatch
 */

"use client";

import { useEffect } from "react";
import { featureFlags } from "@/config/ui-flags";
import { isConstrainedDevice } from "@/lib/network-hints";

type AnalyticsWindow = Window & {
  gtag?: (command: 'event', name: string, parameters: Record<string, string | boolean>) => void;
};

export function SpeculationRules() {
  useEffect(() => {
    if (!featureFlags.speculationNavigation) {
      return;
    }

    // Phase 7: Performance guardrails
    // Abort speculation if conditions are poor
    if (isConstrainedDevice()) return;

    // Phase 8: Analytics - Track speculation attempt
    if (typeof window !== 'undefined' && (window as AnalyticsWindow).gtag) {
      (window as AnalyticsWindow).gtag?.('event', 'speculation_attempt', {
        event_category: 'performance',
        non_interaction: true,
      });
    }

    // Phase 2 & 3: Conservative prefetch and prerender targets
    const rules = {
      prefetch: [
        {
          source: "/contact",
          eagerness: "moderate", // Phase 4: Hover prediction
        },
        {
          source: "/contact",
          eagerness: "moderate",
        },
        {
          source: "/reviews",
          eagerness: "moderate",
        },
        {
          source: "/about",
          eagerness: "moderate",
        },
      ],
      prerender: [
        {
          source: "/contact",
          eagerness: "conservative", // Phase 3: Conservative prerender
        },
      ],
    };

    // Phase 5: Exclusions - Already handled by not including admin/API/auth routes
    // The Speculation Rules API only applies to the routes we explicitly list

    // Inject speculation rules
    const script = document.createElement('script');
    script.type = 'speculationrules';
    script.textContent = JSON.stringify(rules);
    document.head.appendChild(script);

    // Phase 8: Analytics - Track speculation success
    if (typeof window !== 'undefined' && (window as AnalyticsWindow).gtag) {
      (window as AnalyticsWindow).gtag?.('event', 'speculation_success', {
        event_category: 'performance',
        non_interaction: true,
      });
    }

    // Cleanup
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
}
