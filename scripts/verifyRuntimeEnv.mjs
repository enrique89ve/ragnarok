#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { config as parseDotenv } from 'dotenv';

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const match = arg.match(/^--([^=]+)=(.*)$/);
  if (match) args.set(match[1], match[2]);
}

const mode = args.get('mode') ?? process.env.MODE ?? process.env.NODE_ENV ?? '';
const root = process.cwd();

function loadEnvFile(file) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) return;
  const parsed = parseDotenv({ path: fullPath }).parsed ?? {};
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile('.env');
if (mode) {
  loadEnvFile(`.env.${mode}`);
}

function required(name) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

const stage = required('VITE_NETWORK_STAGE') ?? 'local';
const errors = [];

if (stage === 'testnet') {
  if (!required('VITE_RAGNAROK_RESET_EPOCH')) {
    errors.push('VITE_RAGNAROK_RESET_EPOCH is required when VITE_NETWORK_STAGE=testnet.');
  }
}

if (stage === 'mainnet') {
  if (!required('VITE_RAGNAROK_RESET_EPOCH')) {
    errors.push('VITE_RAGNAROK_RESET_EPOCH is required when VITE_NETWORK_STAGE=mainnet.');
  }
}

if (errors.length > 0) {
  console.error('[verifyRuntimeEnv] Invalid runtime environment:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[verifyRuntimeEnv] ok stage=${stage} resetEpoch=${required('VITE_RAGNAROK_RESET_EPOCH') ?? 'default'}`);
