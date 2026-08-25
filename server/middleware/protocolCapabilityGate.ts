import type { NextFunction, Request, Response } from 'express';
import { checkRuntimeCapability } from '../../shared/protocol-core/phaseGate';
import { getRagnarokServerRuntimeConfig } from '../services/runtimeConfig';
import type { ProtocolCapability } from '../../shared/protocolPhase';

export function requireProtocolCapability(capability: ProtocolCapability) {
	return (_req: Request, res: Response, next: NextFunction): void => {
		const runtime = getRagnarokServerRuntimeConfig();
		const decision = checkRuntimeCapability(runtime, capability);
		if (decision.status === 'rejected') {
			res.status(409).json({ code: decision.code, capability: decision.capability, phaseId: decision.phaseId });
			return;
		}
		next();
	};
}
