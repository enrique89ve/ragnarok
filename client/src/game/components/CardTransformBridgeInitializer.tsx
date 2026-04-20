/**
 * CardTransformBridgeInitializer.tsx
 * 
 * This component initializes the bridge between the legacy CardTransformationManager
 * and the new React Context-based approach. It ensures both systems stay in sync
 * during the migration process.
 * 
 * This component should be mounted at a high level in the application tree.
 */

import React, { useContext, useEffect, useRef } from 'react';
import { initializeCardTransformBridge } from '../utils/cards/CardTransformBridge';
import CardTransformContext from '../context/CardTransformContext';
import { debug } from '../config/debugConfig';

const CardTransformBridgeInitializer: React.FC = () => {
  // Get context state and dispatch function
  const { cardStates, dispatch } = useContext(CardTransformContext);
  
  // Initialize the bridge on component mount - only once regardless of state changes
  // Store references in refs to prevent re-initialization on state changes
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  
  // Initialize the bridge just once on mount
  useEffect(() => {
    debug.log('CardTransformBridgeInitializer: Initializing bridge between legacy and context systems');
    
    // Initialize the bridge with the context state and dispatch function
    // Use a function that grabs the latest dispatch from the ref
    const cleanup = initializeCardTransformBridge(
      () => cardStates,
      // Use a stable reference to dispatch function via a wrapper
      (action: any) => dispatchRef.current(action)
    );
    
    // Cleanup on unmount
    return cleanup;
    
    // Empty dependency array ensures this only runs once on mount
  }, []);
  
  // This is a utility component with no UI
  return null;
};

export default CardTransformBridgeInitializer;