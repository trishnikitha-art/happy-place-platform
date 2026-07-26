# Phase 3 Atmospheric Lighting Audit

**Objective:** Unify atmospheric lighting system with single lighting language, eliminate competing light sources, and introduce natural imperfection.

---

## Current Atmospheric Components

### 1. Body Background (globals.css lines 165-176)
```css
background:
  /* Pacific Northwest atmospheric lighting - environmental depth */
  radial-gradient(ellipse at 20% 30%, rgba(94, 98, 89, 0.03) 0%, transparent 50%),
  radial-gradient(ellipse at 80% 70%, rgba(133, 141, 129, 0.01) 0%, transparent 50%),
  radial-gradient(ellipse at 50% 50%, rgba(94, 98, 89, 0.02) 0%, transparent 70%),
  var(--color-background);
```

**Issues:**
- Competing light sources (20% 30% vs 80% 70%)
- Perfectly centered gradient (50% 50%)
- Symmetrical positioning
- Multiple gradients creating confusion

**Role:** Environmental depth (should be unified to single direction)

---

### 2. Hero Atmospheric Layer (globals.css lines 222-235)
```css
.hero-craft::before {
  background: linear-gradient(
    135deg,
    rgba(250, 251, 252, 0.04) 0%,
    rgba(94, 98, 89, 0.03) 50%,
    rgba(94, 98, 89, 0.02) 100%
  );
  mix-blend-mode: overlay;
  opacity: 0.5;
}
```

**Issues:**
- Symmetrical gradient (centered at 50%)
- Creates competing highlight with body background

**Role:** Soft reflected light (should reinforce primary lighting direction)

---

### 3. PNW Fog Layer (globals.css lines 585-602)
```css
.pnw-fog {
  opacity: 0.05;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(94, 98, 89, 0.04) 40%,
    rgba(133, 141, 129, 0.06) 60%,
    rgba(94, 98, 89, 0.04) 80%,
    transparent 100%
  );
  mask-image: radial-gradient(ellipse 100% 60% at 50% 100%, black, transparent 70%);
}
```

**Issues:**
- Perfectly centered mask (50% 100%)
- Symmetrical gradient stops (40% / 60% / 80%)

**Role:** Forest haze (should be asymmetric)

---

### 4. Hero Parallax Animation (globals.css lines 458-467)
```css
.hero-parallax {
  animation: heroDrift 45s ease-in-out infinite alternate;
}
@keyframes heroDrift {
  from { transform: scale(1.06) translateY(0); }
  to { transform: scale(1.12) translateY(-2.5%); }
}
```

**Duration:** 45s

**Role:** Subtle slow drift (good, but conflicts with shimmer-slow)

---

### 5. Shimmer Slow Animation (globals.css lines 515-537)
```css
@keyframes shimmer-slow {
  0%, 85%, 100% {
    background-position: -200% 0;
    opacity: 0;
  }
  90%, 95% {
    background-position: 100% 0;
    opacity: 1;
  }
}
.animate-shimmer-slow {
  animation: shimmer-slow 45s ease-in-out infinite;
}
```

**Duration:** 45s

**Issue:** Same duration as hero parallax (45s)

**Role:** Brand signature shimmer

---

### 6. Happy Gold Sweep Animation (globals.css lines 562-571)
```css
@keyframes happy-gold-sweep {
  0%, 50% { background-position: 200% 0; opacity: 0; }
  55% { opacity: 1; }
  85% { background-position: -100% 0; }
  90%, 100% { opacity: 0; background-position: -100% 0; }
}
.animate-happy-gold-idle {
  animation: happy-gold-sweep 30s ease-in-out infinite;
}
```

**Duration:** 30s

**Role:** Brand accent shimmer

---

## Current Animation Durations

| Animation | Duration | Conflict |
|-----------|----------|----------|
| heroDrift | 45s | ✓ (conflicts with shimmer-slow) |
| shimmer-slow | 45s | ✓ (conflicts with heroDrift) |
| happy-gold-sweep | 30s | ✗ (unique) |

---

## Current Gradient Positions

| Gradient | Position | Issue |
|----------|----------|-------|
| Body radial 1 | 20% 30% | Competing with radial 2 |
| Body radial 2 | 80% 70% | Competing with radial 1 |
| Body radial 3 | 50% 50% | Perfectly centered |
| Hero linear | 135deg | Symmetrical |
| PNW fog mask | 50% 100% | Perfectly centered |

---

## Proposed Changes

### Rule 1: Single Lighting Direction
**Choose:** Upper left morning light (17% 23%)

**Rationale:** Natural morning light from upper left creates warmth and depth without competing highlights.

### Rule 2: Eliminate Competing Light Sources
**Action:** Remove symmetrical gradients, consolidate to single direction

### Rule 3: Vary Scale, Not Color
**Action:** Keep existing colors (Pewter Green, Carolina Gull), vary radius and opacity only

### Rule 4: Layer by Distance
**Proposed Layering:**
1. **Foreground:** Content (no atmospheric effects)
2. **Soft reflected light:** Hero atmospheric layer (upper left)
3. **Forest haze:** PNW fog layer (bottom, asymmetric)
4. **Deep canopy shadow:** Body background (upper right, darker)
5. **Background:** Base color

### Rule 5: Introduce Imperfection
**Proposed Off-Axis Positions:**
- Body radial 1: 17% 23% (upper left, morning light)
- Body radial 2: 73% 81% (lower right, shadow)
- Hero linear: 127deg (slightly off 135deg)
- PNW fog mask: 47% 97% (slightly off center)

### Rule 6: Desynchronize Animations
**Proposed Durations:**
- heroDrift: 37s (was 45s)
- shimmer-slow: 53s (was 45s)
- happy-gold-sweep: 71s (was 30s)

### Rule 7: Reduce Visibility
**Proposed Opacity Reductions:**
- Body radial 1: 0.03 → 0.02
- Body radial 2: 0.01 → 0.008
- Hero atmospheric: 0.5 → 0.35
- PNW fog: 0.05 → 0.03

---

## Implementation Plan

1. **Body Background**
   - Remove centered gradient (50% 50%)
   - Shift remaining gradients to 17% 23% and 73% 81%
   - Reduce opacities

2. **Hero Atmospheric Layer**
   - Shift angle from 135deg to 127deg
   - Reduce opacity from 0.5 to 0.35

3. **PNW Fog Layer**
   - Shift mask from 50% 100% to 47% 97%
   - Shift gradient stops from 40%/60%/80% to 37%/63%/79%
   - Reduce opacity from 0.05 to 0.03

4. **Animation Durations**
   - heroDrift: 45s → 37s
   - shimmer-slow: 45s → 53s
   - happy-gold-sweep: 30s → 71s

5. **Verification**
   - Check for no additional repaint cost
   - Verify all animations are unique durations
   - Verify no perfectly centered gradients

---

## Expected Outcome

**Visual Description:**
- Calm, warm, natural atmosphere
- Single dominant lighting direction (upper left morning light)
- Asymmetric, organic feel
- Atmosphere disappears into perception
- No perceived loops or competing highlights

**Performance:**
- No additional repaint cost
- Same or better performance than current implementation
