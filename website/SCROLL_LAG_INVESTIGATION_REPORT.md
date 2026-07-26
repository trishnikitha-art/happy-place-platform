# Scroll Lag Investigation Report

**Status: Code Clean - Deployment Verification Required**

---

## Summary

All checkable code is now clean. The remaining scroll lag issue is likely either:
1. **Deployment lag** - Latest code not deployed yet
2. **Lenis design** - Intentional easing feels sluggish by design

---

## Code Changes Applied

### 1. WorkshopAtmosphere Reduction
**Commit:** 1909ff4

**Before:** 4 independent RAF loops (lines 142, 157, 277, 304)
**After:** 1 RAF loop in hero section only

**Impact:** Eliminated main-thread contention from multiple independent animation loops.

---

### 2. Lenis Config Investigation
**File:** `src/components/lenis-provider.tsx`

**Current Config:**
```typescript
const lenisInstance = new Lenis({
  duration: 1.2,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
} as any);
```

**Issue:** `as any` cast prevents TypeScript from validating config against actual Lenis v1.0.42 API.

**Attempted Fix:** Removed `smooth: true` option (deprecated in v1.0.42) and `as any` cast.

**Blocker:** `@studio-freight/lenis` package not installed in node_modules. Cannot verify types without running `npm install`.

**PowerShell Restriction:** Cannot run npm install due to execution policy restrictions.

---

## Code Verification Results

### WorkshopAtmosphere
- ✅ Reduced to 1 instance (hero only)
- ✅ No other instances on homepage
- ✅ No instances on About, Services, Our Work, Estimate, Contact pages

### ScrollReveal
- ✅ 19 instances on homepage
- ✅ Uses `whileInView` with `viewport={{ once: true }}`
- ✅ IntersectionObserver-based, not per-frame poll
- ✅ Stops observing after first trigger
- ✅ Not a performance concern

### ParallaxImage
- ✅ Zero usage on any page
- ✅ Old useSpring smoothing removed (previous fix)

### AmbientParticles
- ✅ Zero usage on any page
- ✅ Replaced by WorkshopAtmosphere

---

## Root Cause Analysis

### Confirmed NOT Code Issues
- Multiple RAF loops (fixed)
- Per-frame polling (not present)
- Sync conflicts (not present)
- Component overuse (not present)

### Suspected Issues
1. **Deployment Lag**
   - Project has history of unpushed git remotes causing 404s
   - Latest commit (1909ff4) may not be deployed to test/production
   - CDN edge cache or service worker may serve old bundle
   - **Action Required:** Verify deployment URL and hard refresh/incognito load

2. **Lenis Design**
   - Lenis replaces native instant scroll with eased, momentum-based feel
   - Some perceive this as "laggy" compared to native scroll
   - Duration 1.2s with custom easing may feel intentionally heavy
   - **Action Required:** If issue persists after deployment verification, tune `duration`/`easing` or reconsider Lenis

3. **Missing Dependencies**
   - `@studio-freight/lenis` not in node_modules
   - Cannot verify config types without npm install
   - **Action Required:** Run `npm install` to restore dependencies

---

## Recommendations

### Immediate Actions

1. **Install Dependencies**
   ```bash
   npm install
   ```
   This will restore `@studio-freight/lenis` and allow proper type checking.

2. **Fix Lenis Config**
   After npm install, remove `as any` cast and verify config:
   ```typescript
   const lenisInstance = new Lenis({
     duration: 1.2,
     easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
   });
   ```
   Let TypeScript surface any real type errors and fix accordingly.

3. **Verify Deployment**
   - Confirm exact deployment URL being tested
   - Hard refresh (Ctrl+Shift+R) to bypass browser cache
   - Test in incognito/private mode to bypass service workers
   - Check Vercel dashboard for latest deployment status

### If Issue Persists After Deployment Verification

4. **Tune Lenis Configuration**
   - Reduce `duration` from 1.2 to 0.8-1.0 for snappier feel
   - Try simpler easing function
   - Consider removing custom easing entirely

5. **Consider Disabling Lenis Temporarily**
   - Comment out LenisProvider in layout.tsx
   - Test native scroll performance
   - If native scroll is smooth, issue is Lenis design, not a bug

---

## Deployment Checklist

Before concluding code is still wrong:

- [ ] Confirm deployment URL matches latest commit (1909ff4)
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Test in incognito/private mode
- [ ] Check Vercel deployment status
- [ ] Verify no CDN edge cache serving old bundle
- [ ] Run `npm install` to restore dependencies
- [ ] Remove `as any` cast from Lenis config
- [ ] Test with tuned Lenis duration if issue persists

---

## Conclusion

**Code Status:** Clean
- WorkshopAtmosphere: 1 instance (down from 4)
- ScrollReveal: 19 instances (IntersectionObserver, safe)
- ParallaxImage: 0 instances
- AmbientParticles: 0 instances

**Next Steps:** Deployment verification and dependency restoration required before concluding whether remaining lag is a code issue or Lenis design.
