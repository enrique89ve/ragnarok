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
): JSX.Element => {
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
 * Generate CSS styles for keyword highlighting and card text formatting
 * This can be injected into your stylesheet
 */
/**
 * A comprehensive diagnostic utility class for debugging layout issues
 * Apply this class to any container to visualize its boundary and structure
 * To use: Add className="debug-colorized" to any component you want to diagnose
 */
export const DebugColorizer = ({ children }: { children: React.ReactNode }) => {
  return <div className="debug-colorized">{children}</div>;
};

export const cardTextStyles = `
  /* DIAGNOSTIC TOOL: Special debug class that can be temporarily added to visualize container bounds */
  .debug-colorized {
    background-color: rgba(255, 0, 0, 0.1) !important;
    border: 1px dashed red !important;
    box-shadow: inset 0 0 5px rgba(255, 0, 0, 0.2) !important;
  }
  
  /* DIAGNOSTIC TOOL: Apply different colors to nested elements for easier identification */
  .debug-colorized > * {
    background-color: rgba(0, 255, 0, 0.1) !important;
    border: 1px dashed green !important;
    margin: 2px !important;
  }
  
  .debug-colorized > * > * {
    background-color: rgba(0, 0, 255, 0.1) !important;
    border: 1px dashed blue !important;
    margin: 2px !important;
  }
  
  .debug-colorized > * > * > * {
    background-color: rgba(255, 255, 0, 0.1) !important;
    border: 1px dashed yellow !important;
    margin: 2px !important;
  }
  
  .debug-colorized > * > * > * > * {
    background-color: rgba(255, 0, 255, 0.1) !important;
    border: 1px dashed magenta !important;
    margin: 2px !important;
  }
  /* Keyword Container - fully transparent with no borders */
  .card-text-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    text-align: center;
    /* Ensure complete transparency */
    background: transparent;
    border: none;
    outline: none;
    box-shadow: none;
    overflow: visible;
  }
  
  /* Standalone Keywords Row - fully transparent */
  .standalone-keywords {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 5px;
    /* CRITICAL: Remove all box properties and force overflow visibility */
    margin: 0;
    padding: 0;
    background: transparent;
    border: none;
    outline: none;
    box-shadow: none;
    overflow: visible !important; /* Force visibility of all shadows and glows */
  }
  
  /* Individual Standalone Keyword - no visible container */
  .standalone-keyword {
    display: inline-block;
    font-weight: 800;
    /* Color set dynamically based on card rarity */
    text-shadow: 
      0 1px 0 rgba(255,255,255,0.5), 
      0 -1px 1px rgba(0,0,0,0.25);
    /* Reduce padding to minimize box appearance */
    padding: 0;
    margin: 0 4px;
    font-size: 0.9em;
    letter-spacing: 0.03em;
    white-space: nowrap;
    /* CRITICAL FIX: Ensure no background or borders and make shadows visible */
    background: transparent;
    border: none;
    outline: none;
    box-shadow: none;
    overflow: visible !important; /* Force visibility of shadows/glows */
  }
  
  /* Description Text - fully transparent with no borders or backgrounds */
  .description-text {
    line-height: 1.25;
    width: 100%;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #222;
    text-shadow: 
      0 1px 0 rgba(255,255,255,0.5),
      0 -1px 1px rgba(0,0,0,0.25);
    letter-spacing: 0.01em;
    /* CRITICAL FIX: Remove all possible container-like properties to eliminate invisible boxes */
    margin: 0;
    padding: 0;
    background: transparent !important; /* Force transparency */
    border: none !important; /* Force no border */
    outline: none !important; /* Force no outline */
    box-shadow: none !important; /* Force no box shadow */
    border-radius: 0 !important; /* Force no border radius */
    /* Critical fix for text clipping: Make shadows fully visible */
    overflow: visible !important; /* Force shadows to be visible */
  }
  
  /* Number value highlighting */
  .number-value {
    font-weight: 700;
    color: #992200;
    text-shadow: 
      0 1px 0 rgba(255,255,255,0.5), 
      0 -1px 1px rgba(0,0,0,0.25),
      0 1px 3px rgba(0,0,0,0.1);
    letter-spacing: 0.03em;
  }
  
  /* Damage value highlighting */
  .damage-value {
    font-weight: 700;
    color: #cc0000;
    text-shadow: 
      0 1px 0 rgba(255,255,255,0.5), 
      0 -1px 1px rgba(0,0,0,0.25),
      0 1px 3px rgba(0,0,0,0.1);
    letter-spacing: 0.03em;
  }
  
  /* Keyword highlighting */
  .keyword-highlight {
    display: inline-block;
    font-weight: 800;
    /* Color will be set dynamically based on card rarity */
    letter-spacing: 0.02em;
    text-shadow: 
      0 1px 0 rgba(255,255,255,0.5), 
      0 -1px 1px rgba(0,0,0,0.25);
    padding: 0;
    margin: 0 1px 0 0;
    white-space: nowrap; /* Prevent keyword from breaking to a new line */
    /* CRITICAL FIX: Ensure shadows/glows are visible */
    overflow: visible !important;
    background: transparent;
    border: none;
    outline: none;
    box-shadow: none;
  }
  
  /* Description after a keyword - fully transparent */
  .keyword-description {
    font-weight: normal;
    padding: 0;
    margin: 0;
    display: inline;
    white-space: normal; /* Allow the description to wrap normally */
    /* CRITICAL FIX: Make sure there's no background/borders and shadows are visible */
    background: transparent;
    border: none;
    outline: none;
    box-shadow: none;
    overflow: visible !important; /* Force visibility of shadows/glows */
  }
  
  /* Container for keeping keyword and first part of description together - fully transparent */
  .keyword-with-description {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: baseline;
    margin: 0;
    padding: 0;
    /* CRITICAL FIX: Ensure complete transparency and visible shadows */
    background: transparent;
    border: none;
    outline: none;
    box-shadow: none;
    overflow: visible !important; /* Force shadows to be visible */
  }
  
  /* Card description overall styling - completely transparent with no borders/containers */
  .card-description {
    color: #222;
    padding: 0 !important; /* Remove padding that creates space */
    font-size: 0.85rem;
    line-height: 1.4;
    text-shadow: 
      0 1px 0 rgba(255,255,255,0.5),
      0 -1px 1px rgba(0,0,0,0.25),
      0 1px 3px rgba(0,0,0,0.1);
    letter-spacing: 0.01em;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    height: 100%;
    /* CRITICAL FIX: Ensure no borders/backgrounds and allow shadows to extend */
    background: transparent !important; /* Force transparency */
    border: none !important; /* Force no border */
    outline: none !important; /* Force no outline */
    box-shadow: none !important; /* Force no box shadow */
    border-radius: 0 !important; /* Force no border radius */
    margin: 0 !important; /* Force no margin */
    overflow: visible !important; /* Force visibility of all shadows/glows */
    
    /* ADVANCED FIX: Reset any potential properties causing invisible rectangles */
    clip-path: none !important;
    -webkit-clip-path: none !important;
    mask: none !important;
    -webkit-mask: none !important;
    filter: none !important; /* Don't use filter here as it could affect text shadows */
    
    /* DIAGNOSTIC TOOL: Uncomment the line below to visualize all containers by adding the debug-colorized class */
    /* background-color: rgba(255, 0, 0, 0.1) !important; */
  }
  
  /* Card name styling */
  .card-name {
    font-weight: 700;
    font-size: 1.1rem;
    color: #111;
    text-shadow: 
      0 1px 0 rgba(255,255,255,0.6),
      0 -1px 1px rgba(0,0,0,0.3),
      0 1px 3px rgba(0,0,0,0.15);
    letter-spacing: 0.5px;
  }
  
  /* Stats styling */
  .card-stats {
    font-size: 1.5rem;
    font-weight: 800;
    text-shadow: 
      0 0 5px rgba(0,0,0,0.8), 
      0 0 10px rgba(0,0,0,0.5),
      0 1px 0 rgba(255,255,255,0.3);
    transition: color 0.2s ease, text-shadow 0.2s ease;
    letter-spacing: 0.5px;
  }

  /* Attack value specific styling */
  .attack-value {
    color: #bb3300;
    text-shadow: 
      0 0 5px rgba(187, 51, 0, 0.6), 
      0 0 10px rgba(187, 51, 0, 0.4),
      0 1px 0 rgba(255,255,255,0.3);
  }
  
  /* Health value specific styling */
  .health-value {
    color: #cc0000;
    text-shadow: 
      0 0 5px rgba(204, 0, 0, 0.6), 
      0 0 10px rgba(204, 0, 0, 0.4),
      0 1px 0 rgba(255,255,255,0.3);
  }
  
  /* Mana cost specific styling */
  .mana-value {
    color: #0077cc;
    text-shadow: 
      0 0 5px rgba(0, 119, 204, 0.6), 
      0 0 10px rgba(0, 119, 204, 0.4),
      0 1px 0 rgba(255,255,255,0.3);
  }
  
  /* Keyword icon enhancements */
  .ability-icon {
    filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));
    transition: transform 0.2s ease, filter 0.2s ease;
  }
  
  .card:hover .ability-icon {
    transform: scale(1.1);
    filter: drop-shadow(0 3px 5px rgba(0,0,0,0.6)) brightness(1.2);
  }
`;

/**
 * Formats a card name with enhanced styling
 * 
 * @param name The card name
 * @returns Formatted JSX element
 */
export const formatCardName = (name: string): JSX.Element => {
  return <span className="card-name">{name}</span>;
};

/**
 * Formats a stat value (attack/health) with enhanced styling
 * 
 * @param value The stat value to format
 * @param type Type of stat ('attack' or 'health')
 * @returns Formatted JSX element
 */
export const formatStatValue = (value: number, type: 'attack' | 'health'): JSX.Element => {
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
export const formatManaCost = (value: number): JSX.Element => {
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
