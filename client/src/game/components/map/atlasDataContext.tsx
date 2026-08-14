import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { AtlasDataAdapter } from './adapter';
import { createAtlasServices } from './atlasServices';
import type { AtlasServices } from './atlasServices';

interface AtlasDataContextValue {
	data: AtlasDataAdapter;
	services: AtlasServices;
}

const AtlasDataContext = createContext<AtlasDataContextValue | null>(null);

interface AtlasDataProviderProps {
	data: AtlasDataAdapter;
	children: ReactNode;
}

export function AtlasDataProvider({ data, children }: AtlasDataProviderProps) {
	const services = useMemo(() => createAtlasServices(data), [data]);
	const value = useMemo(() => ({ data, services }), [data, services]);

	return <AtlasDataContext.Provider value={value}>{children}</AtlasDataContext.Provider>;
}

export function useAtlasData(): AtlasDataContextValue {
	const value = useContext(AtlasDataContext);
	if (!value) throw new Error('useAtlasData must be used within AtlasDataProvider');
	return value;
}
