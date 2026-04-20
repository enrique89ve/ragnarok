# GitHub Security Guide

> Mandatory security practices for pushing code to GitHub from Replit.

---

## MANDATORY: replit.md is Project Memory

**`replit.md` is the project's internal documentation and memory.**

It contains:
- Project architecture and design decisions
- User preferences and coding style
- Recent changes and project state
- Technical documentation for the AI agent

### Rules for replit.md

1. **NEVER push to GitHub** - It's in `.gitignore` and blocked by the push script
2. **ALWAYS read before pushing** - The push script displays it automatically
3. **ALWAYS consult when starting work** - Contains context about the project
4. **Keep updated** - Document architecture changes and user preferences

The push script (`scripts/pushToGitHub.ts`) automatically reads and displays `replit.md` content before every push to ensure you're aware of the project context.

---

## How to Remove Files from GitHub

### The Process (Step by Step)

When files that shouldn't be in GitHub are already there, use the cleanup script:

```bash
npx tsx scripts/cleanupGitHub.ts
```

**What this script does:**
1. Connects to GitHub using Replit's GitHub connector (GITHUB_TOKEN)
2. Gets the full file tree from the repository
3. Identifies files matching forbidden patterns
4. Deletes each file one by one using the GitHub API
5. Creates individual commits for each deletion

**How it works technically:**
- Uses `@octokit/rest` library for GitHub API access
- Gets access token from `REPLIT_CONNECTORS_HOSTNAME` endpoint
- Uses `octokit.repos.deleteFile()` to remove each file
- Includes rate limiting (100ms delay between deletions) to avoid API limits

### When to Run Cleanup

Run the cleanup script when:
- After initial repository setup
- If you accidentally pushed sensitive files
- Periodically as a security audit
- When the script reports "No files to remove" - the repo is clean

### Script Location

```
scripts/
├── pushToGitHub.ts      # Push files with security validation
└── cleanupGitHub.ts     # Remove forbidden files from GitHub
```

---

## Critical: Files to NEVER Push to GitHub

### Replit Internal Files

These files contain Replit-specific configuration, internal URLs, and system data:

| File | Reason |
|------|--------|
| `.replit` | Replit workspace configuration |
| `replit.nix` | Nix environment configuration |
| `.replit-rules.json` | Replit agent rules |
| `replit.md` | Project memory/preferences |
| `replit_push_status.json` | Push status tracking |
| `log_mapping.json` | Internal log references |
| `nohup.out` | Process output logs |

### Database & Secrets

| Pattern | Reason |
|---------|--------|
| `*.db`, `*.sqlite` | Database files with data |
| `*.pem`, `*.key` | Private keys |
| `.env`, `.env.*` | Environment secrets |
| `*_credentials.json` | API credentials |
| `DATABASE_URL` references | Connection strings |

### Test & Utility Scripts

| Pattern | Reason |
|---------|--------|
| `*.cjs` (in root) | One-off fix/test scripts |
| `*.test.js`, `*.spec.ts` | Test files |
| `ast-analysis-results.json` | Analysis output |
| `all_files.txt` | Debug listings |

### Attached Assets with Internal Info

Some pasted content contains internal Replit information:
- Files matching `attached_assets/Pasted--Coframe-*`
- Any file mentioning internal Replit URLs

---

## How to Verify Before Pushing

### Step 1: Check .gitignore Coverage

Ensure `.gitignore` includes all patterns above. See the current file for the complete list.

### Step 2: Check What Will Be Pushed

```bash
# See files that will be included
git status

# See what's ignored
git status --ignored
```

### Step 3: Search for Sensitive Patterns

```bash
# Check for database URLs
grep -r "DATABASE_URL\|postgresql://" --include="*.ts" --include="*.js"

# Check for API keys
grep -r "API_KEY\|SECRET_KEY" --include="*.ts" --include="*.js"

# Check for Replit internal URLs
grep -r "repl\.co\|replit\.dev" --include="*.ts" --include="*.js"
```

---

## Files Already in Git History

If sensitive files were already pushed, they exist in git history. To fully remove them:

1. **Contact repository owner** - They must use `git filter-branch` or BFG Repo Cleaner
2. **Rotate any exposed secrets** - Assume compromised if pushed
3. **Force push cleaned history** - Requires repository admin access

---

## Push Script Security Check

The `scripts/pushToGitHub.ts` should validate files before pushing. Add this check:

```typescript
// Files that should NEVER be pushed
const FORBIDDEN_FILES = [
  '.replit',
  'replit.nix',
  '.replit-rules.json',
  'replit.md',
  '.env',
];

// Patterns that indicate sensitive content
const FORBIDDEN_PATTERNS = [
  /DATABASE_URL/,
  /API_KEY/,
  /SECRET_KEY/,
  /postgresql:\/\//,
  /\.replit\.dev/,
];
```

---

## Summary Checklist

Before every push to GitHub:

- [ ] `.gitignore` is up to date with all patterns
- [ ] No `.replit`, `replit.nix`, or `replit.md` staged
- [ ] No `.env` files or database files staged
- [ ] No `*.cjs` test scripts in root directory staged
- [ ] No files containing DATABASE_URL or API keys
- [ ] Ran `git status` to verify staged files
- [ ] Rotated any accidentally exposed secrets

---

## Quick Reference: What's Safe to Push

**Safe:**
- `client/src/` - Frontend source code
- `server/` - Backend source code (without secrets)
- `docs/` - Documentation
- `package.json`, `tsconfig.json` - Config (without secrets)
- `README.md`, `LICENSE` - Project info

**NOT Safe:**
- Anything in `.gitignore`
- Files with hardcoded secrets
- Database files or exports
- Replit-specific configuration

---

## Script Reference

### pushToGitHub.ts

**Purpose:** Push specific files to GitHub with security validation

**Usage:**
```bash
npx tsx scripts/pushToGitHub.ts "Your commit message"
```

**Security Features:**
- Blocks forbidden files (shows `⛔ BLOCKED`)
- Scans content for sensitive patterns (DATABASE_URL, API_KEY, etc.)
- Shows warnings for potential secrets

**To push new files:** Edit the `filesToPush` array in the script.

### cleanupGitHub.ts

**Purpose:** Remove forbidden files already in GitHub

**Usage:**
```bash
npx tsx scripts/cleanupGitHub.ts
```

**What it removes:**
- `.replit`, `replit.nix`, `.replit-rules.json`, `replit.md`
- All `*.cjs` and `*.js` test scripts in root (keeps config files)
- Database files (`*.db`, `*.sqlite`)
- Attached assets with Replit logs (`Pasted--Coframe-*`)

**Safe to run multiple times:** If repo is clean, shows "No files to remove"

---

## Troubleshooting

### "GitHub not connected" Error
- Ensure GitHub integration is set up in Replit
- Check that GITHUB_TOKEN secret exists

### Script Times Out
- The cleanup script deletes files one by one
- For large cleanups, run the script multiple times
- Each run continues where the last left off

### 502 Server Error
- GitHub API rate limit or large request
- The individual-file approach handles this automatically
