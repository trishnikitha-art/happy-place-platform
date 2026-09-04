# Git Branch State Analysis (2026-09-03)

## Critical Finding

**main**: 3138c31 (Revert static fallback commits per CEO order)
**DEPLOY**: 0343d46 (638 commits ahead of main)
**Status**: main is 638 commits behind DEPLOY

## DEPLOY Branch Analysis

**Latest DEPLOY commits**:
- c2cf5a1: feat(media): complete Drive and Shared Drive media workbench
- 5454b0f: Drive Explorer architectural corrections
- 1a3b7d1: Drive Explorer: Google Drive as source-of-truth file browser
- 0343d46: feat: enable hero background VisualSlot and improve gallery duplicate prevention

**Main vs DEPLOY**:
- main behind DEPLOY: 638 commits
- main ahead of DEPLOY: 0 commits
- merge base: 0343d46
- DEPLOY is ancestor of main, not the other way around

## Critical Decision

**DO NOT merge DEPLOY into main**
- This would introduce 638 commits without verification
- The objective is to preserve current main architecture
- The current main explicitly requires actual KV authority (no static fallbacks)

## Current Main Architecture

**Latest main commits**:
- 9edf4c4: Fix Redis integration test namespace isolation
- 3138c31: Revert static fallback commits per CEO order
- 2f98c40: Fix CI encryption contract and unskip Redis state tests
- 76405fd: Add static fallback to getMediaByIdAsync (development mode)
- 5c31917: Add static fallback for brand media resolution (development mode)
- 28a48a5: Restore Services and Our Work gallery by using static configuration

**Architectural State**:
- Static fallbacks reverted ✅
- Requires actual KV authority ✅
- CI encryption contract fixed ✅
- Redis test namespace isolation fixed ✅

## Authority Chain to Verify

```
Canonical record (media.v1.json)
    ↓
Runtime KV record (MEDIA_KV)
    ↓
storage field validation
    ↓
Public media gate
    ↓
Resolver (resolvePublicMedia)
    ↓
Projection
    ↓
React component
    ↓
Actual image URL
```

## Next Steps

1. Do NOT merge DEPLOY into main
2. Trace authority chain for current main (3138c31)
3. Identify first broken edge in the chain
4. Repair only that edge
5. Execute production KV reconciliation
6. Verify end-to-end: canonical → KV → public gate → resolver → projection → React → image
