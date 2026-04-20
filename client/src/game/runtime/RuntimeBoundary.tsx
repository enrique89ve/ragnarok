import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import LoadingScreen from '@/game/components/ui/LoadingScreen';
import { ensureBridgeRuntime, isBridgeRuntimeReady } from '@/game/runtime/bridgeRuntime';
import { ensureCardDataRuntime, isCardDataRuntimeReady } from '@/game/runtime/cardDataRuntime';
import { acquireGameplayRuntime, isGameplayRuntimeReady } from '@/game/runtime/gameplayRuntime';

type RuntimeMode = 'bridge' | 'card-data' | 'gameplay';

function RuntimeBoundary({ mode }: { mode: RuntimeMode }) {
  const [ready, setReady] = useState(() => {
    if (mode === 'bridge') return isBridgeRuntimeReady();
    if (mode === 'card-data') return isCardDataRuntimeReady();
    return isGameplayRuntimeReady();
  });

  useEffect(() => {
    let cancelled = false;
    let release: (() => void) | null = null;

    const initialize = async () => {
      if (mode === 'bridge') {
        await ensureBridgeRuntime();
      } else if (mode === 'card-data') {
        await ensureBridgeRuntime();
        await ensureCardDataRuntime();
      } else {
        release = await acquireGameplayRuntime();
      }

      if (!cancelled) {
        setReady(true);
      } else {
        release?.();
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      release?.();
    };
  }, [mode]);

  if (!ready) {
    return <LoadingScreen />;
  }

  return <Outlet />;
}

export function BridgeRuntimeBoundary() {
  return <RuntimeBoundary mode="bridge" />;
}

export function CardDataRuntimeBoundary() {
  return <RuntimeBoundary mode="card-data" />;
}

export function GameplayRuntimeBoundary() {
  return <RuntimeBoundary mode="gameplay" />;
}
