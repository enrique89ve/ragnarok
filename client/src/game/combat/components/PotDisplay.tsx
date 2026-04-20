import React from 'react';

interface RiskDisplayProps {
  risk: number;
  hidden?: boolean;
  playerCommitted?: number;
  opponentCommitted?: number;
}

export function RiskDisplay({ risk, hidden = false, playerCommitted = 0, opponentCommitted = 0 }: RiskDisplayProps) {
  if (hidden) return null;

  const showBreakdown = playerCommitted > 0 || opponentCommitted > 0;

  return (
    <div className="risk-display">
      <span className="risk-label">RISK</span>
      <span className="risk-value">{risk}</span>
      {showBreakdown && (
        <span className="risk-breakdown">
          <span className="risk-you">{playerCommitted}</span>
          <span className="risk-sep">/</span>
          <span className="risk-them">{opponentCommitted}</span>
        </span>
      )}
    </div>
  );
}

