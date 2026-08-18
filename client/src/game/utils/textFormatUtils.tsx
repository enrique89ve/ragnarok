import React from 'react';

function sanitizeHtml(html: string): string {
	return html.replace(/<(?!\/?span\b)[^>]*>/gi, '');
}

// Keywords that should be highlighted
const KEYWORDS = [
  'Battlecry',
  'Deathrattle',
  'Taunt',
  'Divine Shield',
  'Rush',
  'Charge', 
  'Lifesteal',
  'Poisonous',
  'Foresee',
  'Adapt',
  'Windfury',
  'Stealth',
  'Inspire',
  'Silence',
  'Frenzy',
  'Reborn',
  'Spellburst',
  'Outcast',
  'Tradeable',
  'Colossal',
  'Dormant',
  'Combo',
  'Overload',
  'Choose One',
  'Corruption',
  'Corrupt',
  'Overkill',
  'Echo',
  'Runic Bond',
  'Immune',
  'Rune',
  'Counter',
  'Start of Game',
  'Freeze'
];

// Keywords that typically have no description after them (standalone keywords)
const STANDALONE_KEYWORDS = [
  'Taunt',
  'Rush',
  'Charge',
  'Divine Shield',
  'Lifesteal',
  'Poisonous',
  'Windfury',
  'Stealth',
  'Reborn',
  'Echo',
  'Tradeable',
  'Immune',
  'Runic Bond',
  'Colossal',
  'Counter',
  'Freeze'
];

// Keyword colors for specific keywords
const KEYWORD_COLORS: Record<string, string> = {
  'Battlecry': '#fada5e', // Golden yellow
  'Deathrattle': '#7851a9', // Purple
  'Frenzy': '#b22222', // Firebrick red
  'Foresee': '#4169e1', // Royal blue
  'Overload': '#1e90ff', // Dodger blue
  'Spellburst': '#9932cc', // Dark orchid
  'Outcast': '#2e8b57', // Sea green
  'Corrupt': '#483d8b', // Dark slate blue
  'Overkill': '#a0522d', // Sienna
  'Combo': '#6a5acd', // Slate blue
  'Inspire': '#cd853f', // Peru
  'Choose One': '#3cb371', // Medium sea green
  'Start of Game': '#708090', // Slate gray
  'Rune': '#ff4500', // Orangered
};

/**
 * Format card text with keyword formatting and optimized space usage
 * Ensures keywords and their descriptions stay on the same line, with proper 
 * styling based on rarity
 * 
 * @param text The card text to format
 * @returns Formatted JSX content with styled keywords
 */
/**
 * Enhanced formatCardText function with additional debug mode option
 * Use this to format card text with proper keyword styling
 * while eliminating any invisible boxes that might clip text effects
 * 
 * @param text The card text to format
 * @param rarity Optional card rarity to apply proper text coloring based on rarity
 * @param options Optional configuration for text formatting
 * @returns Formatted JSX content with styled keywords
 */
export const formatCardText = (
  text: string, 
  rarity: string = 'common',
  options: { 
    diagnosticMode?: boolean, 
    showContainers?: boolean,
    colorizeBoxes?: boolean
  } = {}
): React.JSX.Element => {
  if (!text) return <></>;
  
  // Clean text and remove any unintended line breaks and duplications
  // First, detect and fix patterns that look like duplications (identical/similar phrases repeated)
  let cleanText = text;
  
  // Pattern 1: Remove duplicate "Give your minions X" phrases common in tooltips
  cleanText = cleanText.replace(/Give your minions\s+(.+?)\s+Give your minions\s+/i, 'Give your minions $1 ');
  
  // Pattern 2: Remove duplicate "Summon a X/X" phrases
  cleanText = cleanText.replace(/Summon a\s+(\d+\/\d+)(?:\s+\w+)?\s+Summon a\s+\1/i, 'Summon a $1');
  
  // Pattern 3: Remove duplicated Battlecry, Deathrattle prefix duplications
  for (const keyword of ['Battlecry', 'Deathrattle', 'Overkill', 'Combo', 'Frenzy', 'Outcast', 'Spellburst']) {
    const duplicatePattern = new RegExp(`${keyword}:\\s+(.+)\\s+${keyword}:`, 'i');
    cleanText = cleanText.replace(duplicatePattern, `${keyword}: $1`);
  }
  
  // Pattern 4: Fix "Treant." format from the end of text
  cleanText = cleanText.replace(/\s+Treant\.$/, ' Treant');
  
  // Now continue with standard cleaning
  cleanText = cleanText.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
  
  // Process the text
  let processedText = cleanText;
  const allKeywordMatches: { keyword: string, index: number, isStandalone: boolean }[] = [];
  
  // Apply diagnostic styling if requested
  const { diagnosticMode = false } = options;
  
  // Determine text color based on card rarity
  // Use Norse-inspired metal colors for each rarity
  let textColor = '#333'; // Default text color
  let textShadow = '0 1px 0 rgba(255,255,255,0.5), 0 -1px 1px rgba(0,0,0,0.3)';
  
  // Apply rarity-based text coloring
  switch(rarity.toLowerCase()) {
    case 'common':
      textColor = '#a97142'; // Bronze
      textShadow = '0 1px 0 rgba(255,230,200,0.5), 0 -1px 1px rgba(50,30,0,0.4)';
      break;
    case 'rare':
      textColor = '#aaaacc'; // Silver
      textShadow = '0 1px 0 rgba(255,255,255,0.6), 0 -1px 1px rgba(30,30,50,0.4)';
      break;
    case 'epic':
      textColor = '#bb99cc'; // Purple/platinum
      textShadow = '0 1px 0 rgba(230,220,255,0.6), 0 -1px 1px rgba(40,0,80,0.5)';
      break;
    case 'mythic':
      textColor = '#e6cc80'; // Gold
      textShadow = '0 1px 0 rgba(255,255,200,0.7), 0 -1px 1px rgba(80,60,0,0.5)';
      break;
    default:
      // Default to bronze for unknown rarities
      textColor = '#a97142';
  }
  
  // In diagnostic mode, display container information
  if (diagnosticMode) {
    // Replace the text with diagnostic information
    processedText = `[${rarity.toUpperCase()} COLOR] ${processedText}`;
  }
  
  // 1. Find standalone keywords (Taunt, Rush, etc.)
  for (const keyword of STANDALONE_KEYWORDS) {
    const keywordPattern = new RegExp(`\\b(${keyword})\\b(?!:)`, 'gi');
    let match;
    
    while ((match = keywordPattern.exec(processedText)) !== null) {
      allKeywordMatches.push({
        keyword: match[1],
        index: match.index,
        isStandalone: true
      });
    }
  }
  
  // 2. Find keywords with descriptions (Battlecry:, etc.)
  for (const keyword of KEYWORDS) {
    if (STANDALONE_KEYWORDS.includes(keyword)) continue; // Skip standalone keywords we already processed
    
    const keywordPattern = new RegExp(`\\b(${keyword})(:|\\.)(\\s+)`, 'gi');
    let match;
    
    while ((match = keywordPattern.exec(processedText)) !== null) {
      allKeywordMatches.push({
        keyword: match[1],
        index: match.index,
        isStandalone: false
      });
    }
  }
  
  // Sort matches by their position in the text (from right to left to preserve indices)
  allKeywordMatches.sort((a, b) => b.index - a.index);
  
  // Process each match, formatting keywords and keeping content on the same line
  for (const { keyword, index, isStandalone } of allKeywordMatches) {
    const baseColor = KEYWORD_COLORS[keyword] || '#fada5e'; // Default to gold if no specific color
    
    if (isStandalone) {
      // Format standalone keywords (like Taunt, Rush)
      const keywordPattern = new RegExp(`\\b(${keyword})\\b`, 'i');
      const match = processedText.substring(index).match(keywordPattern);
      
      if (match) {
        // Create HTML for standalone keyword - completely borderless with no visible container
        // Use rarity-specific colors - stripped down to just the essential text styling
        let keywordColor;
        switch (keyword) {
          // For consistency, we apply the proper metal colors based on rarity to all keywords
          case 'Taunt':
          case 'Rush':
          case 'Charge':
          case 'Divine Shield':
          case 'Lifesteal': 
          case 'Poisonous':
          case 'Windfury':
          case 'Stealth':
          case 'Reborn':
          case 'Echo':
          case 'Tradeable':
          case 'Immune':
          case 'Runic Bond':
          case 'Colossal':
          case 'Counter':
          case 'Freeze':
            // We'll default to the base keyword color, which will match rarity color
            keywordColor = baseColor;
            break;
          default:
            // For unique keywords, use the base color from the color map
            keywordColor = baseColor;
        }

        const keywordHtml = `<span class="keyword-standalone" 
          style="display:inline; font-weight:800; color:${keywordColor}; 
          text-shadow:0 1px 0 rgba(255,255,255,0.5), 0 -1px 1px rgba(0,0,0,0.3);
          padding:0; margin:0; background:transparent; border:none; outline:none; box-shadow:none;">${match[1]}</span>`;
        
        // Replace the keyword
        processedText = 
          processedText.substring(0, index) + 
          keywordHtml + 
          processedText.substring(index + match[0].length);
      }
    } else {
      // Format keywords with descriptions (like Battlecry:)
      const fullPattern = new RegExp(`\\b(${keyword})(:|\\.)(\\s+)`, 'i');
      const match = processedText.substring(index).match(fullPattern);
      
      if (match) {
        // Determine where this keyword's description ends (next keyword or end of text)
        let descriptionEnd = processedText.length;
        for (const otherMatch of allKeywordMatches) {
          if (otherMatch.index > index && otherMatch.index < descriptionEnd) {
            descriptionEnd = otherMatch.index;
          }
        }
        
        // Extract the description text
        const keywordLength = match[0].length;
        const description = processedText.substring(index + keywordLength, descriptionEnd);
        
        // Create HTML for keyword with description - completely borderless with no visible container
        const keywordHtml = `<span class="keyword-line" 
          style="display:inline; white-space:nowrap; margin-right:0; background:transparent; border:none; outline:none; box-shadow:none;">
          <span class="keyword-highlight" 
            style="display:inline; font-weight:800; color:${baseColor}; 
            text-shadow:0 1px 0 rgba(255,255,255,0.5), 0 -1px 1px rgba(0,0,0,0.3);
            padding:0; margin:0; background:transparent; border:none; outline:none; box-shadow:none;">${match[1]}${match[2]}</span>${match[3]}</span>`;
        
        // Replace the text
        processedText = 
          processedText.substring(0, index) + 
          keywordHtml + 
          description + 
          processedText.substring(descriptionEnd);
      }
    }
  }
  
  // Format numbers and special values in the text
  processedText = processedText.replace(/(\b\d+\s+damage\b|\(\d+\)|\b\d+\s+cards?\b|\b\d+\s+health\b|\b\d+\/\d+\b)/g, 
    (match) => {
      if (/\b(\d+)\s+damage\b/.test(match)) {
        const [_, number] = match.match(/\b(\d+)\s+damage\b/) || [];
        return `<span class="damage-value" style="font-weight:700; color:#cc0000; font-size:inherit;">${number}</span> damage`;
      } else if (/\((\d+)\)/.test(match)) {
        const [_, number] = match.match(/\((\d+)\)/) || [];
        return `(<span class="number-value" style="font-weight:700; color:#992200; font-size:inherit;">${number}</span>)`;
      } else if (/\b(\d+)\s+(cards?|health)\b/.test(match)) {
        const [_, number, type] = match.match(/\b(\d+)\s+(cards?|health)\b/) || [];
        return `<span class="number-value" style="font-weight:700; color:#992200; font-size:inherit;">${number}</span> ${type}`;
      } else if (/\b(\d+)\/(\d+)\b/.test(match)) {
        const [_, attack, health] = match.match(/\b(\d+)\/(\d+)\b/) || [];
        return `<span class="number-value" style="font-weight:700; color:#992200; font-size:inherit;">${attack}</span>/<span class="damage-value" style="font-weight:700; color:#cc0000; font-size:inherit;">${health}</span>`;
      }
      return match;
    }
  );
  
  // Return the final formatted text as a single component
  return (
    <span 
      className="card-description-content"
      style={{
        display: 'block', 
        width: '100%',
        lineHeight: '1.4',
        color: textColor, // Apply the rarity-specific color to all standard text
        textShadow: textShadow, // Apply rarity-specific text shadow
        /* Ensure absolutely no borders or backgrounds on the container */
        background: 'transparent',
        border: 'none',
        outline: 'none',
        boxShadow: 'none',
        /* No padding or margins either */
        padding: '0',
        margin: '0' 
      }}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(processedText) }}
    />
  );
};

/**
 * Formats a card name with enhanced styling
 * 
 * @param name The card name
 * @returns Formatted JSX element
 */
export const formatCardName = (name: string): React.JSX.Element => {
  return <span className="card-name">{name}</span>;
};

/**
 * Formats a stat value (attack/health) with enhanced styling
 * 
 * @param value The stat value to format
 * @param type Type of stat ('attack' or 'health')
 * @returns Formatted JSX element
 */
export const formatStatValue = (value: number, type: 'attack' | 'health'): React.JSX.Element => {
  return (
    <span className={`card-stats ${type}-value`}>
      {value}
    </span>
  );
};

/**
 * Formats a mana cost value with enhanced styling
 * 
 * @param value The mana cost value to format
 * @returns Formatted JSX element
 */
export const formatManaCost = (value: number): React.JSX.Element => {
  return (
    <span className="card-stats mana-value">
      {value}
    </span>
  );
};

/**
 * Get text styling based on card rarity
 * This function returns a style object with appropriate colors and text effects
 * for each rarity level (mythic, epic, rare, common)
 * 
 * @param rarity The card rarity
 * @returns Style object for the specified rarity
 */
export const getRarityTextStyle = (rarity: string = 'common') => {
  // Base style for all rarities
  const baseStyle = {
    fontWeight: 700 as const,
    textAlign: 'center' as const,
    fontSize: '1rem',
    lineHeight: 1.2,
  };

  // Rarity-specific styling with enhanced carved metal effect
  switch (rarity.toLowerCase()) {
    case 'mythic':
      return {
        ...baseStyle,
        color: '#f8df7e', // Rich gold for mythic cards
        // Enhanced carved effect with stronger highlight and deeper shadow
        textShadow: `
          0 1px 2px rgba(255, 255, 255, 0.7),
          0 -1px 2px rgba(0, 0, 0, 0.8),
          0 0 6px rgba(255, 215, 0, 0.7),
          0 0 1px rgba(255, 215, 0, 0.4)
        `,
        // Stronger outline for better visibility against dark backgrounds
        WebkitTextStroke: '0.75px rgba(0,0,0,0.5)',
        // Additional styles specific to mythic cards
        fontWeight: 800 as const,
        letterSpacing: '0.03em',
        // Light glow around the text
        filter: 'drop-shadow(0 0 2px rgba(255, 215, 0, 0.5))'
      };
    
    case 'epic':
      return {
        ...baseStyle,
        color: '#c8a2eb', // Shiny platinum-purple color for epic cards
        // Enhanced shadow effect for epic cards
        textShadow: `
          0 1px 2px rgba(255, 255, 255, 0.6),
          0 -1px 2px rgba(0, 0, 0, 0.7),
          0 0 5px rgba(163, 53, 238, 0.5),
          0 0 2px rgba(163, 53, 238, 0.3)
        `,
        WebkitTextStroke: '0.6px rgba(0,0,0,0.4)',
        // Additional styles specific to epic cards
        letterSpacing: '0.02em',
        // Subtle glow effect
        filter: 'drop-shadow(0 0 2px rgba(163, 53, 238, 0.4))'
      };
    
    case 'rare':
      return {
        ...baseStyle,
        color: '#b0c4de', // Silver-blue color for rare cards
        // Enhanced shadow effect for rare cards
        textShadow: `
          0 1px 1px rgba(255, 255, 255, 0.6),
          0 -1px 2px rgba(0, 0, 0, 0.7),
          0 0 4px rgba(176, 196, 222, 0.4),
          0 0 1px rgba(176, 196, 222, 0.3)
        `,
        WebkitTextStroke: '0.5px rgba(0,0,0,0.4)',
        // Subtle letter spacing for better readability
        letterSpacing: '0.01em',
        // Light silver glow effect
        filter: 'drop-shadow(0 0 1px rgba(176, 196, 222, 0.3))'
      };
    
    case 'common':
    default:
      return {
        ...baseStyle,
        color: '#cd853f', // Bronze color for common cards
        // Enhanced bronze carved effect
        textShadow: `
          0 1px 1px rgba(255, 255, 255, 0.5),
          0 -1px 1px rgba(0, 0, 0, 0.7),
          0 0 3px rgba(205, 133, 63, 0.3),
          0 0 1px rgba(205, 133, 63, 0.2)
        `,
        WebkitTextStroke: '0.4px rgba(0,0,0,0.4)',
        // Add subtle bronze glow
        filter: 'drop-shadow(0 0 1px rgba(205, 133, 63, 0.2))',
        letterSpacing: '0.01em',
      };
  }
};
