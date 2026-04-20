/**
 * Card Database - Backwards Compatibility Layer
 * 
 * This file now re-exports from the authoritative Card Registry.
 * All card data is managed in cardRegistry/index.ts
 */

export { cardRegistry as fullCardDatabase, cardRegistry as default } from './cardRegistry';
