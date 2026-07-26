# Phase 4 Atmospheric Scale Increase

**Objective:** Increase atmospheric gradient scale to make atmosphere feel farther away, like distant ambient illumination rather than localized glowing objects.

---

## What Changed

Only radial gradient sizes were increased. No other properties changed.

---

## Body Background Radial Gradients

### Gradient 1 (Upper Left Morning Light)

**Before:**
```css
radial-gradient(ellipse at 17% 23%, rgba(94, 98, 89, 0.02) 0%, transparent 50%)
```
- Dimensions: Default ellipse (no explicit size)
- Position: 17% 23%
- Color: rgba(94, 98, 89, 0.02) (Pewter Green)
- Opacity: 0.02

**After:**
```css
radial-gradient(ellipse 150% 120% at 17% 23%, rgba(94, 98, 89, 0.02) 0%, transparent 50%)
```
- Dimensions: 150% 120% (expanded)
- Position: 17% 23% (unchanged)
- Color: rgba(94, 98, 89, 0.02) (unchanged)
- Opacity: 0.02 (unchanged)

---

### Gradient 2 (Lower Right Shadow)

**Before:**
```css
radial-gradient(ellipse at 73% 81%, rgba(133, 141, 129, 0.008) 0%, transparent 50%)
```
- Dimensions: Default ellipse (no explicit size)
- Position: 73% 81%
- Color: rgba(133, 141, 129, 0.008) (Carolina Gull)
- Opacity: 0.008

**After:**
```css
radial-gradient(ellipse 160% 130% at 73% 81%, rgba(133, 141, 129, 0.008) 0%, transparent 50%)
```
- Dimensions: 160% 130% (expanded)
- Position: 73% 81% (unchanged)
- Color: rgba(133, 141, 129, 0.008) (unchanged)
- Opacity: 0.008 (unchanged)

---

## PNW Fog Mask Radial Gradient

**Before:**
```css
mask-image: radial-gradient(ellipse 100% 60% at 47% 97%, black, transparent 70%);
-webkit-mask-image: radial-gradient(ellipse 100% 60% at 47% 97%, black, transparent 70%);
```
- Dimensions: 100% 60%
- Position: 47% 97%
- Colors: black → transparent 70%

**After:**
```css
mask-image: radial-gradient(ellipse 140% 80% at 47% 97%, black, transparent 70%);
-webkit-mask-image: radial-gradient(ellipse 140% 80% at 47% 97%, black, transparent 70%);
```
- Dimensions: 140% 80% (expanded)
- Position: 47% 97% (unchanged)
- Colors: black → transparent 70% (unchanged)

---

## Verification

### What Changed
- Body gradient 1: Default ellipse → 150% 120%
- Body gradient 2: Default ellipse → 160% 130%
- PNW fog mask: 100% 60% → 140% 80%

### What Did NOT Change
- Colors: All colors unchanged (Pewter Green, Carolina Gull)
- Opacity: All opacity values unchanged
- Animation timing: All animation durations unchanged
- Gradient positions: All positions unchanged (17% 23%, 73% 81%, 47% 97%)
- Blur: No blur properties exist in these gradients
- Masks: Only PNW fog mask size changed, not behavior
- Layering: All z-index and layering unchanged

---

## Design Goal

The expanded gradients should now feel like:
- Ambient daylight filling hundreds of feet of forest
- Environmental depth rather than localized glowing objects
- Indirect reflected light rather than floating blobs

The viewer should perceive:
- Calm, natural atmosphere
- Distant ambient illumination
- Not: a glow, a blob, or a radial

---

## Summary

**Total gradients resized:** 3
- Body background: 2 gradients
- PNW fog mask: 1 gradient

**Scale increase:** 40-60% larger on average
- Body gradient 1: +50% width, +20% height
- Body gradient 2: +60% width, +30% height
- PNW fog mask: +40% width, +20% height

**No other properties modified.**
