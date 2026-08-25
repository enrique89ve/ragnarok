#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { config as parseDotenv } from 'dotenv';

const P2P_SECRET_MIN_LENGTH = 32;

const args = new Map();
const rawArgs = process.argv.slice(2);
for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];
  const equalsMatch = arg.match(/^--([^=]+)=(.*)$/);
  if (equalsMatch) {
    args.set(equalsMatch[1], equalsMatch[2]);
    continue;
  }
  const flagMatch = arg.match(/^--(.+)$/);
  if (!flagMatch) continue;
  const next = rawArgs[i + 1];
  if (next && !next.startsWith('--')) {
    args.set(flagMatch[1], next);
    i += 1;
  } else {
    args.set(flagMatch[1], 'true');
  }
}

const mode = args.get('mode') ?? process.env.MODE ?? process.env.RAGNAROK_RUNTIME_MODE ?? process.env.NODE_ENV ?? '';
const scope = args.get('scope') ?? 'build';
const root = process.cwd();

function loadEnvFile(file, { override = false } = {}) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) return;
  const parsed = parseDotenv({ path: fullPath }).parsed ?? {};
  for (const [key, value] of Object.entries(parsed)) {
    if (override || process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile('.env');
if (mode) {
  loadEnvFile(`.env.${mode}`, { override: true });
}

function value(name) {
  const resolved = process.env[name]?.trim();
  return resolved && resolved.length > 0 ? resolved : null;
}

const errors = [];

function requireValue(name) {
  const resolved = value(name);
  if (!resolved) errors.push(`${name} is required.`);
  return resolved;
}

function requireEqual(name, expected) {
  const resolved = requireValue(name);
  if (resolved && resolved !== expected) {
    errors.push(`${name} must be ${expected}; got ${resolved}.`);
  }
}

function optionalEqual(name, expected) {
  const resolved = value(name);
  if (resolved && resolved !== expected) {
    errors.push(`${name} must be ${expected}; got ${resolved}.`);
  }
}

function requireMatching(firstName, secondName) {
  const first = value(firstName);
  const second = value(secondName);
  if (first && second && first !== second) {
    errors.push(`${firstName} must match ${secondName}; got ${first} vs ${second}.`);
  }
}

function requirePrefix(name, prefix) {
  const resolved = requireValue(name);
  if (resolved && !resolved.startsWith(prefix)) {
    errors.push(`${name} must start with ${prefix}; got ${resolved}.`);
  }
}

function requirePositiveInteger(name) {
  const resolved = requireValue(name);
  if (!resolved) return null;
  const parsed = Number(resolved);
  if (!Number.isInteger(parsed) || parsed < 1) {
    errors.push(`${name} must be a positive integer; got ${resolved}.`);
    return null;
  }
  return parsed;
}

function requireIsoDate(name) {
  const resolved = requireValue(name);
  if (!resolved) return null;
  const parsed = Date.parse(resolved);
  if (!Number.isFinite(parsed)) {
    errors.push(`${name} must be an ISO date string; got ${resolved}.`);
  }
  return resolved;
}

const stage = value('VITE_NETWORK_STAGE') ?? 'local';
if (!['local', 'testnet', 'mainnet'].includes(stage)) {
  errors.push(`VITE_NETWORK_STAGE must be local, testnet, or mainnet; got ${stage}.`);
}

const clientResetEpoch = value('VITE_RAGNAROK_RESET_EPOCH');
const serverResetEpoch = value('RAGNAROK_RESET_EPOCH');
const effectiveResetEpoch = serverResetEpoch ?? clientResetEpoch;
const isClosedBeta = [clientResetEpoch, serverResetEpoch]
  .filter((epoch) => typeof epoch === 'string' && epoch.length > 0)
  .some((epoch) => epoch.toLowerCase().startsWith('closed-beta-'));

if (stage === 'testnet' || stage === 'mainnet') {
  requireValue('VITE_RAGNAROK_RESET_EPOCH');
  requireIsoDate('VITE_SEASON_START');
  requirePositiveInteger('VITE_RAGNAROK_INDEX_START_BLOCK');
}

if (isClosedBeta) {
  const protocolId = value('RAGNAROK_PROTOCOL_ID') ?? value('VITE_RAGNAROK_PROTOCOL_ID');
  if (protocolId !== 'rk_game_testnet') {
    errors.push(`Closed Beta requires protocol id rk_game_testnet; got ${protocolId ?? 'missing'}.`);
  }
  requireEqual('VITE_NETWORK_STAGE', 'testnet');
  requireValue('VITE_RAGNAROK_COLLECTION_ID');
  requireEqual('RAGNAROK_HIVE_KEYCHAIN_SMOKE', 'passed');
  requireEqual('RAGNAROK_P2P_TWO_BROWSER_SMOKE', 'passed');
  requireEqual('RAGNAROK_CLOSED_BETA_OPERATOR_SIGNOFF', 'approved');
  requireMatching('RAGNAROK_RESET_EPOCH', 'VITE_RAGNAROK_RESET_EPOCH');
  requireMatching('RAGNAROK_PROTOCOL_ID', 'VITE_RAGNAROK_PROTOCOL_ID');
  requireMatching('RAGNAROK_SEASON_START', 'VITE_SEASON_START');
  requireMatching('RAGNAROK_INDEX_START_BLOCK', 'VITE_RAGNAROK_INDEX_START_BLOCK');
  if (scope === 'runtime') {
    requirePrefix('RAGNAROK_RESET_EPOCH', 'closed-beta-');
    requireEqual('RAGNAROK_PROTOCOL_ID', 'rk_game_testnet');
    requireEqual('RAGNAROK_SEASON_START', value('VITE_SEASON_START') ?? '');
    requireValue('RAGNAROK_CHAIN_STATE_FILE');
    requireEqual('RAGNAROK_NFT_OWNERSHIP_SOURCE', 'json');
    requireEqual('RAGNAROK_INDEX_START_BLOCK', value('VITE_RAGNAROK_INDEX_START_BLOCK') ?? '');
    const p2pSecret = requireValue('P2P_CHALLENGE_SIGNING_SECRET');
    if (p2pSecret && p2pSecret.length < P2P_SECRET_MIN_LENGTH) {
      errors.push(`P2P_CHALLENGE_SIGNING_SECRET must be at least ${P2P_SECRET_MIN_LENGTH} characters.`);
    }
  }
  // NFTLox variables remain optional legacy inputs. F2 policy keeps NFTLox
  // writes disabled; collection proof is an F3 gate, not a Closed Beta gate.
}

if (stage === 'mainnet') {
  requireEqual('VITE_RAGNAROK_PROTOCOL_ID', 'ragnarok-cards');
}

if (mode === 'alfa-testnet') {
  requireEqual('VITE_NETWORK_STAGE', 'testnet');
  requireEqual('VITE_RAGNAROK_PROTOCOL_ID', 'rk_game_testnet');
  requireEqual('VITE_RAGNAROK_COLLECTION_ID', 'ragnarok-testnet');
  optionalEqual('VITE_NFTLOX_PROTOCOL_ID', 'nftlox_testnet');
  requirePrefix('VITE_RAGNAROK_RESET_EPOCH', 'alfa-testnet-');
  requireEqual('VITE_SEASON_START', '2026-06-14T23:28:54Z');
  requireEqual('VITE_RAGNAROK_INDEX_START_BLOCK', '109016418');

  if (scope === 'runtime') {
    requirePrefix('RAGNAROK_RESET_EPOCH', 'alfa-testnet-');
    requireValue('RAGNAROK_PROTOCOL_ID');
    requireMatching('RAGNAROK_RESET_EPOCH', 'VITE_RAGNAROK_RESET_EPOCH');
    requireMatching('RAGNAROK_PROTOCOL_ID', 'VITE_RAGNAROK_PROTOCOL_ID');
    requireMatching('RAGNAROK_SEASON_START', 'VITE_SEASON_START');
    requireMatching('RAGNAROK_INDEX_START_BLOCK', 'VITE_RAGNAROK_INDEX_START_BLOCK');
    requireEqual('RAGNAROK_SEASON_START', value('VITE_SEASON_START') ?? '2026-06-14T23:28:54Z');
    requireValue('RAGNAROK_CHAIN_STATE_FILE');
    requireEqual('RAGNAROK_NFT_OWNERSHIP_SOURCE', 'json');
    requireEqual('RAGNAROK_INDEX_START_BLOCK', value('VITE_RAGNAROK_INDEX_START_BLOCK') ?? '109016418');
    const p2pSecret = requireValue('P2P_CHALLENGE_SIGNING_SECRET');
    if (p2pSecret && p2pSecret.length < P2P_SECRET_MIN_LENGTH) {
      errors.push(`P2P_CHALLENGE_SIGNING_SECRET must be at least ${P2P_SECRET_MIN_LENGTH} characters.`);
    }
  }
}

if (errors.length > 0) {
  console.error('[verifyRuntimeEnv] Invalid runtime environment:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const resetEpoch = value('VITE_RAGNAROK_RESET_EPOCH') ?? value('RAGNAROK_RESET_EPOCH') ?? 'default';
console.log(`[verifyRuntimeEnv] ok mode=${mode || 'default'} scope=${scope} stage=${stage} resetEpoch=${resetEpoch}`);
