/**
 * Push changes to GitHub using Octokit
 * Run with: npx tsx scripts/pushToGitHub.ts "commit message"
 * 
 * Uses Replit's GitHub connector for authentication
 * 
 * MANDATORY: This script reads replit.md before pushing.
 * replit.md is the project memory - it contains architecture decisions,
 * user preferences, and project state. It should NEVER be pushed to GitHub
 * but MUST be consulted before any push operation.
 * 
 * SECURITY: This script validates files against forbidden patterns
 * before pushing. See docs/GITHUB_SECURITY_GUIDE.md for details.
 */

import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// MANDATORY: Read project memory before push
// ============================================
function readProjectMemory(): void {
  const replitMdPath = path.join(process.cwd(), 'replit.md');
  
  if (fs.existsSync(replitMdPath)) {
    const content = fs.readFileSync(replitMdPath, 'utf-8');
    
    // Extract key sections for display
    const lines = content.split('\n');
    const overviewStart = lines.findIndex(l => l.includes('## Overview') || l.includes('# Norse'));
    const recentChangesStart = lines.findIndex(l => l.includes('## Recent Changes'));
    
    console.log('');
    console.log('📖 PROJECT MEMORY (replit.md):');
    console.log('─'.repeat(50));
    
    // Show project title
    const titleLine = lines.find(l => l.startsWith('# '));
    if (titleLine) {
      console.log(`   ${titleLine.replace('# ', '')}`);
    }
    
    // Show recent changes section (first 5 lines)
    if (recentChangesStart > -1) {
      console.log('   Recent Changes:');
      for (let i = recentChangesStart + 1; i < Math.min(recentChangesStart + 6, lines.length); i++) {
        if (lines[i].startsWith('## ')) break;
        if (lines[i].trim()) {
          console.log(`   ${lines[i].trim().substring(0, 60)}...`);
        }
      }
    }
    
    console.log('─'.repeat(50));
    console.log('   ⚠️  replit.md is LOCAL ONLY - never push to GitHub');
    console.log('');
  } else {
    console.log('');
    console.log('⚠️  WARNING: replit.md not found!');
    console.log('   This file contains project memory and should exist.');
    console.log('');
  }
}

// ============================================
// SECURITY: Files that should NEVER be pushed
// ============================================
const FORBIDDEN_FILES = [
  '.replit',
  'replit.nix',
  '.replit-rules.json',
  'replit.md',
  'replit_push_status.json',
  'log_mapping.json',
  'nohup.out',
  '.env',
  '.env.local',
  '.env.production',
];

const FORBIDDEN_PATTERNS = [
  /\.db$/,
  /\.sqlite$/,
  /\.pem$/,
  /\.key$/,
  /\.secret$/,
  /_credentials\.json$/,
  /^\.env\./,
];

const FORBIDDEN_CONTENT_PATTERNS = [
  /DATABASE_URL\s*[:=]\s*["'][^"']+["']/,
  /API_KEY\s*[:=]\s*["'][^"']+["']/,
  /SECRET_KEY\s*[:=]\s*["'][^"']+["']/,
  /postgresql:\/\/[^"'\s]+/,
  /REPLIT_DB_URL/,
];

function isForbiddenFile(filePath: string): { forbidden: boolean; reason?: string } {
  const fileName = path.basename(filePath);
  
  // Check exact matches
  if (FORBIDDEN_FILES.includes(fileName)) {
    return { forbidden: true, reason: `'${fileName}' is a Replit internal file` };
  }
  
  // Check patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(filePath)) {
      return { forbidden: true, reason: `'${filePath}' matches forbidden pattern ${pattern}` };
    }
  }
  
  return { forbidden: false };
}

function checkContentForSecrets(content: string, filePath: string): { safe: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  for (const pattern of FORBIDDEN_CONTENT_PATTERNS) {
    if (pattern.test(content)) {
      warnings.push(`'${filePath}' may contain sensitive data matching ${pattern}`);
    }
  }
  
  return { safe: warnings.length === 0, warnings };
}

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function pushFiles() {
  const owner = 'Dhenz14';
  const repo = 'norse-mythos-card-game';
  const branch = 'main';
  const commitMessage = process.argv[2] || 'Update from Replit';

  // MANDATORY: Read project memory before any push operation
  readProjectMemory();

  console.log('🚀 Pushing to GitHub...');
  console.log(`   Repository: ${owner}/${repo}`);
  console.log(`   Branch: ${branch}`);
  console.log(`   Message: ${commitMessage}`);
  console.log('');
  console.log('🔒 Security check enabled');

  try {
    const octokit = await getGitHubClient();

    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const currentCommitSha = refData.object.sha;

    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: currentCommitSha,
    });
    const treeSha = commitData.tree.sha;

    // Files to push - SECURITY: Never include Replit internal files
    const filesToPush = [
      // Essential build configuration files
      'package.json',
      'package-lock.json',
      'vite.config.ts',
      'vite.config.local.ts',
      'vite.config.local.js',
      'tsconfig.json',
      'tsconfig.node.json',
      'drizzle.config.ts',
      'tailwind.config.js',
      'postcss.config.js',
      // Client entry files
      'client/index.html',
      'client/src/main.tsx',
      'client/src/App.tsx',
      'client/src/index.css',
      // Server entry files
      'server/index.ts',
      'server/routes.ts',
      'server/db.ts',
      'server/database.ts',
      // Shared types (if exists)
      'shared/schema.ts',
      // Quest system - types, utilities, store, hooks, components
      'client/src/game/utils/quests/types.ts',
      'client/src/game/utils/quests/questUtils.ts',
      'client/src/game/utils/quests/questProgress.ts',
      'client/src/game/utils/quests/index.ts',
      'client/src/game/stores/questStore.ts',
      'client/src/game/hooks/useQuestTracker.ts',
      'client/src/game/components/quest/QuestTracker.tsx',
      // Game utils with quest integration
      'client/src/game/utils/gameUtils.ts',
      'client/src/game/utils/deathrattleUtils.ts',
      'client/src/game/utils/battlecryUtils.ts',
      'client/src/game/utils/heroPowerUtils.ts',
      'client/src/game/utils/spells/spellUtils.ts',
      'client/src/game/utils/mechanics/colossalUtils.ts',
      // Combat store slices (new modular architecture)
      'client/src/game/stores/combat/types.ts',
      'client/src/game/stores/combat/sharedCombatSlice.ts',
      'client/src/game/stores/combat/pokerCombatSlice.ts',
      'client/src/game/stores/combat/activePlayerUtils.ts',
      'client/src/game/stores/combat/chessCombatSlice.ts',
      'client/src/game/stores/combat/minionBattleSlice.ts',
      'client/src/game/stores/combat/kingAbilitySlice.ts',
      'client/src/game/stores/combat/pokerSpellSlice.ts',
      // King Divine Command display system
      'client/src/game/utils/chess/kingAbilityUtils.ts',
      'client/src/game/utils/chess/kingAbilityDisplayUtils.ts',
      'client/src/game/hooks/useKingChessAbility.ts',
      'client/src/game/hooks/useKingDivineCommandDisplay.ts',
      'client/src/game/types/ChessTypes.ts',
      'client/src/game/components/HeroDetailPopup.tsx',
      'client/src/game/stores/combat/index.ts',
      'client/src/game/stores/unifiedCombatStore.ts',
      // Poker Spells system
      'client/src/game/types/CardTypes.ts',
      'client/src/game/data/pokerSpellCards.ts',
      'client/src/game/utils/poker/pokerSpellUtils.ts',
      'client/src/game/hooks/usePokerSpells.ts',
      'client/src/game/data/cardRegistry/ID_RANGES.md',
      // Art Management system
      'client/src/game/utils/art/types.ts',
      'client/src/game/utils/art/artUtils.ts',
      'client/src/game/utils/art/index.ts',
      'client/src/game/hooks/useArtManager.ts',
      'client/src/game/components/art/ArtCard.tsx',
      'client/src/game/components/art/ArtGallery.tsx',
      'client/src/game/components/art/index.ts',
      'client/src/game/components/HeroDeckBuilder.tsx',
      'client/public/art/metadata.json',
      // Combat hooks and utils
      'client/src/game/combat/hooks/useRagnarokCombatController.ts',
      'client/src/game/combat/utils/combatArenaUtils.ts',
      'client/src/game/combat/RagnarokCombatArena.tsx',
      'client/src/game/combat/debugConfig.ts',
      // Combat UI components
      'client/src/game/combat/components/ShowdownCelebration.tsx',
      // Documentation
      'README.md',
      'docs/RULEBOOK.md',
      'docs/DESIGN_PHILOSOPHY.md',
      'docs/DECK_BUILDER_AUDIT.md',
      'docs/GITHUB_SECURITY_GUIDE.md',
      'scripts/pushToGitHub.ts',
      'scripts/cleanupGitHub.ts',
      '.gitignore',
    ];

    const treeItems: any[] = [];
    const securityWarnings: string[] = [];

    for (const filePath of filesToPush) {
      // Security check: forbidden file
      const forbiddenCheck = isForbiddenFile(filePath);
      if (forbiddenCheck.forbidden) {
        console.log(`   ⛔ BLOCKED: ${forbiddenCheck.reason}`);
        continue;
      }

      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // Security check: content patterns
        const contentCheck = checkContentForSecrets(content, filePath);
        if (!contentCheck.safe) {
          securityWarnings.push(...contentCheck.warnings);
          console.log(`   ⚠️  WARNING: ${filePath} may contain sensitive data`);
        }

        const { data: blob } = await octokit.git.createBlob({
          owner,
          repo,
          content,
          encoding: 'utf-8',
        });
        treeItems.push({
          path: filePath,
          mode: '100644',
          type: 'blob',
          sha: blob.sha,
        });
        console.log(`   ✓ Added: ${filePath}`);
      }
    }

    if (securityWarnings.length > 0) {
      console.log('');
      console.log('⚠️  Security warnings detected:');
      securityWarnings.forEach(w => console.log(`   - ${w}`));
      console.log('   Review files before proceeding.');
    }

    if (treeItems.length === 0) {
      console.log('No files to push.');
      return;
    }

    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: treeSha,
      tree: treeItems,
    });

    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTree.sha,
      parents: [currentCommitSha],
    });

    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });

    console.log('');
    console.log('✅ Successfully pushed to GitHub!');
    console.log(`   Commit: ${newCommit.sha.substring(0, 7)}`);
    console.log(`   URL: https://github.com/${owner}/${repo}/commit/${newCommit.sha}`);

  } catch (error: any) {
    console.error('❌ Error pushing to GitHub:', error.message);
    process.exit(1);
  }
}

pushFiles();
