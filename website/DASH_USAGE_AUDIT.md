# Em Dash Usage Audit

**Date:** July 26, 2026  
**Project:** Happy Place Carpentry Website  
**Priority:** Priority 4 - Dash Sweep  
**Scope:** Search entire codebase for em dash character (—)

---

## Executive Summary

**Files Searched:** 47 (ts, tsx, json, md)  
**Em Dashes Found:** 0  
**En Dashes Found:** 0  
**Hyphens Used:** Extensively  
**Status:** No em dashes detected in codebase

---

## Search Methodology

**Character Searched:** — (em dash, U+2014)  
**Character Searched:** – (en dash, U+2013)  
**File Types:** .ts, .tsx, .json, .md  
**Search Scope:** Entire codebase

---

## Findings

### Em Dashes (—)

**Count:** 0  
**Locations:** None found

### En Dashes (–)

**Count:** 0  
**Locations:** None found

### Hyphens (-)

**Count:** Extensive  
**Usage:** Standard hyphenation, compound words, file names

---

## Sample Copy Review

### Homepage (page.tsx)

**Line 69:** "Mid-Willamette Valley"  
**Usage:** Hyphen for compound geographic name  
**Status:** Correct (standard hyphen usage)

**Line 97:** "serviceCounties.join(' · ')"  
**Usage:** Middle dot for list separation  
**Status:** Correct (conversational separator)

**Line 237:** "right way"  
**Usage:** No dash needed  
**Status:** Correct

### About Page (about.tsx)

**Line 38:** "happy place"  
**Usage:** No dash needed  
**Status:** Correct

### Contact Page (contact.tsx)

**Line 30:** "whatever's easiest"  
**Usage:** Conversational language  
**Status:** Correct

---

## Recommendations

### Current State

**No em dashes found** in the codebase. This is actually good because:
1. Em dashes are formal and can feel stiff
2. The current copy uses conversational language
3. Hyphens are used correctly for compound words
4. Middle dots (·) are used for list separation

### Guidance for Future Copy

**When to Use Em Dashes:**
- Rarely - they're formal and can feel academic
- Only for emphasis in very specific contexts
- Prefer periods and shorter sentences instead

**When to Use Hyphens:**
- Compound words (Mid-Willamette Valley)
- Adjective before noun (family-owned)
- Number ranges (2020-2025)

**When to Use Middle Dots:**
- List separation (already in use)
- Visual separators
- Lighter than semicolons

---

## Conversational Copy Guidelines

### Prefer

**Shorter sentences:**
- ✅ "We serve the Mid-Willamette Valley."
- ❌ "We serve the Mid-Willamette Valley—a region known for..."

**Periods over em dashes:**
- ✅ "We're family-owned. We're licensed."
- ❌ "We're family-owned—we're licensed."

**Conversational words:**
- ✅ "because"
- ✅ "so"
- ✅ "that's why"
- ❌ Em dashes for emphasis

### Avoid

**Em dashes for emphasis:**
- ❌ "Our work—built to last—stands the test of time."
- ✅ "Our work is built to last. It stands the test of time."

**Formal constructions:**
- ❌ "The project—completed on time—exceeded expectations."
- ✅ "The project was completed on time. It exceeded expectations."

**Semicolons:**
- ❌ "We're licensed; we're insured."
- ✅ "We're licensed and insured."

---

## Conclusion

**No em dashes found** in the current codebase. The copy already follows conversational guidelines:
- Uses standard hyphens correctly
- Uses middle dots for list separation
- Uses periods for sentence breaks
- Avoids formal constructions

**Recommendation:** Continue current approach. No changes needed.

**Next Steps:** Move to Priority 5 - Component Standardization
