# My Drive Authorization Requirement

## Current State

The code correctly requires explicit My Drive authorization via `HPP_AUTHORIZED_MY_DRIVE=true`.

## Production Evidence

Current production logs show:

```
[CORPUS_AUTHORIZATION]
My Drive NOT authorized
(HPP_AUTHORIZED_MY_DRIVE not set to true)
```

## Root Cause

This is a **production configuration gap**, not an OAuth problem.

The constitutional boundary is working correctly:
- Google OAuth is authenticated
- HPP refuses to expose My Drive as an authorized corpus
- This is fail-closed behavior (correct)

## Required Action

In the production Vercel environment, set:

```
HPP_AUTHORIZED_MY_DRIVE=true
```

## Why This Is Correct

The system maintains the constitutional rule: **Google OAuth access ≠ HPP authorization**

Even if Google permits access to My Drive, HPP must explicitly authorize it. The current code enforces this boundary correctly.

## Do NOT Fix This By

- ❌ Restoring implicit My Drive authorization
- ❌ Removing the explicit check
- ❌ Weakening corpus authorization
- ❌ Making My Drive available by default

## Verification Steps

After setting `HPP_AUTHORIZED_MY_DRIVE=true` in production:

1. Call `/api/drive/discovery`
2. Verify My Drive appears as an authorized corpus
3. Call `/api/drive/files?folderId=root`
4. Verify actual My Drive children are returned
