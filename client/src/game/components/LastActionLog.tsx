import React, { useEffect, useState } from 'react';
import { useActivityLogStore } from '../stores/activityLogStore';

export const LastActionLog: React.FC = () => {
  const pokerEvents = useActivityLogStore(state => state.pokerEvents);
  const [visibleAction, setVisibleAction] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  
  useEffect(() => {
    if (pokerEvents.length > 0) {
      const lastEvent = pokerEvents[0];
      setVisibleAction(lastEvent.summary);
      setKey(k => k + 1);
      
      const timer = setTimeout(() => {
        setVisibleAction(null);
      }, 2500);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [pokerEvents]);
  
  if (!visibleAction) return null;
  
  return (
    <div key={key} className="last-action-log">
      {visibleAction}
    </div>
  );
};
