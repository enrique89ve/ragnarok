/**
 * Effect Generator System
 * 
 * Provides utilities for generating effect handler boilerplate code.
 * This simplifies the process of adding new effect implementations.
 * 
 * Note: This is intended to be used in a Node.js environment (build scripts),
 * not directly in the browser.
 */

import { debug } from '../../config/debugConfig';

/**
 * Generate an effect handler template file for a specific effect
 * 
 * @param effectType - The type of effect (battlecry, deathrattle, spell)
 * @param effectName - The name of the effect (e.g., summon_minion, deal_damage)
 * @param outputDir - The directory where handlers are stored
 * @returns The generated code as a string
 */
export function generateEffectHandlerCode(
  effectType: 'battlecry' | 'deathrattle' | 'spell', 
  effectName: string
): string {
  // Convert snake_case to PascalCase for function name
  const functionName = effectName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  // Determine the effect interface type
  const effectInterface = 
    effectType === 'battlecry' ? 'BattlecryEffect' : 
    effectType === 'deathrattle' ? 'DeathrattleEffect' : 
    'SpellEffect';
  
  // Generate the file content
  return `/**
 * ${functionName} ${effectType.charAt(0).toUpperCase() + effectType.slice(1)} Handler
 * 
 * Implements the "${effectName}" ${effectType} effect.
 */
import { GameContext } from '../../../GameContext';
import { Card, ${effectInterface} } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a ${effectName} ${effectType} effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns Effect result with success/failure status
 */
export default function execute${functionName}(
  context: GameContext,
  effect: ${effectInterface},
  sourceCard: Card
): EffectResult {
  try {
    // TODO: Implement ${effectName} logic here
    debug.card(\`Executing ${effectType} ${effectName} from \${sourceCard.name}\`);
    
    return {
      success: true,
      // Add any additional result data as needed
    };
  } catch (error) {
    debug.error(\`Error executing ${effectType}:${effectName}:\`, error);
    return { 
      success: false, 
      error: \`Error executing ${effectType}:${effectName}: \${error instanceof Error ? error.message : String(error)}\`
    };
  }
}
`;
}

/**
 * Generate an index file for a collection of effect handlers
 * 
 * @param effectType - The type of effect (battlecry, deathrattle, spell)
 * @param handlerNames - Array of handler function names (in PascalCase)
 * @returns The generated index code as a string
 */
export function generateEffectIndexCode(
  effectType: 'battlecry' | 'deathrattle' | 'spell',
  handlerNames: string[]
): string {
  // Generate import statements
  const imports = handlerNames.map(name => 
    `import execute${name} from './${name.charAt(0).toLowerCase() + name.slice(1)}Handler';`
  ).join('\n');
  
  // Generate export object
  const exports = handlerNames.map(name => 
    `  execute${name},`
  ).join('\n');
  
  // Generate the file content
  return `/**
 * ${effectType.charAt(0).toUpperCase() + effectType.slice(1)} Effect Handlers Index
 * 
 * This file exports all ${effectType} handlers for registration with the EffectRegistry.
 */
${imports}

export {
${exports}
};
`;
}

/**
 * Parse an effect name from a handler file name
 * 
 * @param handlerFileName - The file name (e.g., "dealDamageHandler.ts")
 * @returns The effect name in snake_case (e.g., "deal_damage")
 */
export function parseEffectNameFromFileName(handlerFileName: string): string {
  // Remove "Handler.ts" suffix
  const baseName = handlerFileName.replace(/Handler\.ts$/, '');
  
  // Convert camelCase to snake_case
  return baseName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

/**
 * Implementation when used in a Node.js environment
 * These functions will write files to the filesystem
 */
export const fsImplementation = {
  /**
   * Create a handler file for an effect
   * 
   * @param effectType - The type of effect (battlecry, deathrattle, spell)
   * @param effectName - The name of the effect (e.g., summon_minion, deal_damage)
   * @param baseDir - Base directory for effect handlers
   */
  async createEffectHandlerFile(
    effectType: 'battlecry' | 'deathrattle' | 'spell',
    effectName: string,
    baseDir: string
  ): Promise<void> {
    // Dynamic import to avoid including fs in browser builds
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Convert snake_case to camelCase for file name
    const fileName = effectName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) + 'Handler.ts';
    
    // Construct the directory and file paths
    const dirPath = path.join(baseDir, 'handlers', effectType);
    const filePath = path.join(dirPath, fileName);
    
    // Create directory if it doesn't exist
    await fs.mkdir(dirPath, { recursive: true });
    
    // Generate and write the handler code
    const code = generateEffectHandlerCode(effectType, effectName);
    await fs.writeFile(filePath, code, 'utf8');
    
    debug.log(`Created ${effectType} handler: ${filePath}`);
  },
  
  /**
   * Update or create the index file for a collection of handlers
   * 
   * @param effectType - The type of effect (battlecry, deathrattle, spell)
   * @param baseDir - Base directory for effect handlers
   */
  async updateEffectIndexFile(
    effectType: 'battlecry' | 'deathrattle' | 'spell',
    baseDir: string
  ): Promise<void> {
    // Dynamic import to avoid including fs in browser builds
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Construct the directory and index file path
    const dirPath = path.join(baseDir, 'handlers', effectType);
    const indexPath = path.join(dirPath, 'index.ts');
    
    // Get all handler files in the directory
    const files = await fs.readdir(dirPath);
    const handlerFiles = files.filter(file => file.endsWith('Handler.ts') && file !== 'index.ts');
    
    // Extract handler names in PascalCase
    const handlerNames = handlerFiles.map(file => {
      // Remove "Handler.ts" suffix
      const baseName = file.replace(/Handler\.ts$/, '');
      
      // Convert camelCase to PascalCase
      return baseName.charAt(0).toUpperCase() + baseName.slice(1);
    });
    
    // Generate and write the index code
    const code = generateEffectIndexCode(effectType, handlerNames);
    await fs.writeFile(indexPath, code, 'utf8');
    
    debug.log(`Updated ${effectType} index: ${indexPath} with ${handlerNames.length} handlers`);
  }
};