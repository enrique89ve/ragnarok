/**
 * Helper utilities to access the card database
 * This file helps break circular dependencies and provides a clean interface
 * for accessing card data throughout the application
 */
import { CardData } from '../types';
import { fullCardDatabase } from './cardDatabase';

/**
 * Returns the current card database
 * This function creates a layer of indirection that helps avoid circular dependencies
 */
export function getCardDatabase(): CardData[] {
  return fullCardDatabase;
}