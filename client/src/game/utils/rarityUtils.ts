export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return 'text-gray-300';
    case 'rare': return 'text-blue-400';
    case 'epic': return 'text-purple-400';

    case 'mythic': return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500';
    default: return 'text-gray-300';
  }
}

export function getRarityBorder(rarity: string): string {
  switch (rarity) {
    case 'common': return 'border-gray-500';
    case 'rare': return 'border-blue-500';
    case 'epic': return 'border-purple-500';

    case 'mythic': return 'border-pink-500';
    default: return 'border-gray-500';
  }
}

export function getRarityGlow(rarity: string): string {
  switch (rarity) {
    case 'common': return 'shadow-[0_0_30px_rgba(255,255,255,0.5)]';
    case 'rare': return 'shadow-[0_0_40px_rgba(59,130,246,0.8)]';
    case 'epic': return 'shadow-[0_0_50px_rgba(147,51,234,0.9)]';

    case 'mythic': return 'shadow-[0_0_80px_rgba(236,72,153,1),0_0_120px_rgba(139,92,246,0.8)]';
    default: return 'shadow-lg';
  }
}

export function getRarityBackground(rarity: string): string {
  switch (rarity) {
    case 'common': return 'bg-gradient-to-br from-gray-700 to-gray-800';
    case 'rare': return 'bg-gradient-to-br from-blue-800 to-blue-900';
    case 'epic': return 'bg-gradient-to-br from-purple-800 to-purple-900';

    case 'mythic': return 'bg-gradient-to-br from-pink-800 via-purple-800 to-cyan-800';
    default: return 'bg-gray-800';
  }
}

export function getRarityBgColor(rarity: string): string {
  switch (rarity) {
    case 'common': return 'bg-gray-600/30';
    case 'rare': return 'bg-blue-600/30';
    case 'epic': return 'bg-purple-600/30';

    case 'mythic': return 'bg-gradient-to-r from-pink-600/30 via-purple-600/30 to-cyan-600/30';
    default: return 'bg-gray-600/30';
  }
}

export function getTypeIcon(type: string): string {
  switch (type) {
    case 'minion': return '⚔️';
    case 'spell': return '✨';
    case 'weapon': return '🗡️';
    case 'hero': return '👑';
    default: return '📜';
  }
}
