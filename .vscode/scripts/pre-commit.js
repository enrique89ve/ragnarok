#!/usr/bin/env node

/**
 * Pre-commit hook to remind developers about the development rules
 * 
 * This script checks if modifications include critical files and
 * provides reminders to follow the development rules.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get list of files staged for commit
const stagedFiles = execSync('git diff --cached --name-only').toString().trim().split('\n');

// Critical file patterns that warrant rule reminders
const criticalPatterns = [
  /card.*\.tsx?$/i,      // Card definitions
  /game\/engine/i,       // Game engine files
  /3D/i,                 // 3D rendering
  /effects/i,            // Visual effects
  /performance/i,        // Performance-critical code
  /server/i,             // Server-side code
];

// Check if any staged files match critical patterns
const criticalFilesModified = stagedFiles.some(file => 
  criticalPatterns.some(pattern => pattern.test(file))
);

if (criticalFilesModified) {
  console.log('\n🚨 ATTENTION: You are modifying critical game files!\n');
  console.log('📋 Please ensure you have reviewed the development rules:');
  console.log('   .vscode/DEVELOPMENT_RULES.md\n');
  console.log('⚠️ Remember these key requirements:');
  console.log(' • Performance thresholds: 60 FPS, <50ms response, <512MB memory');
  console.log(' • Include verification steps for all changes');
  console.log(' • Update BUG_MEMORY.md with any fixes or system insights');
  console.log(' • Run comprehensive tests before committing\n');
  
  // Ask for confirmation to continue
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('Have you reviewed the development rules? (y/n) ', (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('Please review the development rules before committing.');
      process.exit(1);
    }
    readline.close();
    process.exit(0);
  });
} else {
  // No critical files modified, allow commit without prompting
  process.exit(0);
}