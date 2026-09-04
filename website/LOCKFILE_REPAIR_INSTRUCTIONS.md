# Lockfile Repair Instructions

## Problem

CI build fails with `Cannot find native binding` for `@tailwindcss/oxide` on Linux.

The `package-lock.json` was generated on Windows and only contains Windows native bindings. It's missing the Linux x64 GNU native package entries for:
- `@tailwindcss/oxide-linux-x64-gnu@4.3.3`
- `lightningcss-linux-x64-gnu@1.32.0`

## Root Cause

Platform-specific optional dependencies are not installed when running `npm install` on a different OS. The lockfile only contains the platform packages for the OS it was generated on.

## Solution

The lockfile must be regenerated on a Linux environment or via GitHub Actions with the Linux packages explicitly installed.

### Option A: Regenerate Lockfile via GitHub Actions (Recommended)

Create a workflow that regenerates the lockfile on a Linux runner:

```yaml
name: Regenerate Lockfile

on:
  workflow_dispatch:

jobs:
  regenerate-lockfile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: rm package-lock.json
      - run: npm install
      - run: npm install @tailwindcss/oxide-linux-x64-gnu@4.3.3 --save-optional
      - run: npm install lightningcss-linux-x64-gnu@1.32.0 --save-optional
      - run: git add package.json package-lock.json
      - run: git commit -m "Regenerate lockfile with Linux native bindings"
      - run: git push
```

### Option B: Manual Linux Environment

If you have access to a Linux machine or WSL:

```bash
cd website
rm package-lock.json
npm install
npm install @tailwindcss-linux-x64-gnu@4.3.3 --save-optional
npm install lightningcss-linux-x64-gnu@1.32.0 --save-optional
```

### Option C: GitHub Actions CI Workflow Patch

Modify the existing CI workflow to install Linux native packages before build:

```yaml
- name: Install Linux native dependencies
  run: |
    npm install @tailwindcss/oxide-linux-x64-gnu@4.3.3 --save-optional
    npm install lightningcss-linux-x64-gnu@1.32.0 --save-optional
```

## Verification

After the lockfile is repaired, verify:

1. `package-lock.json` contains entries for:
   - `node_modules/@tailwindcssoxide-linux-x64-gnu`
   - `node_modules/lightningcss-linux-x64-gnu`

2. CI build passes completely through:
   - Graph generation
   - Constitutional projection generation
   - Next.js build
   - Tailwind Oxide native binding resolution

3. Full CI workflow passes:
   - Build
   - Full Jest suite
   - Lint
   - OAuth integration tests

## Current State

- ✅ `package.json` updated with Linux native dependencies in `dependencies`
- ❌ `package-lock.json` deleted (cannot regenerate on Windows)
- ⏳ Awaiting Linux environment to regenerate lockfile

## Next Steps

Execute one of the above options to regenerate the lockfile with Linux native bindings, then push to main.
