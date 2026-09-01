/**
 * Bounded inbound queue used by the P2P wire listener.
 *
 * A reliable transport can still deliver faster than the asynchronous
 * signature/state handlers consume messages. Silently dropping one message
 * would create a permanent sequence gap, so overflow is reported to the
 * caller as an integrity boundary instead of being treated as backpressure.
 */
export const MAX_INBOUND_WIRE_QUEUE_SIZE = 100;

export type QueueEnqueueResult =
	| { readonly accepted: true; readonly overflowed: false }
	| { readonly accepted: false; readonly overflowed: true };

export function enqueueWireMessage<T>(
	queue: T[],
	message: T,
	maxSize: number = MAX_INBOUND_WIRE_QUEUE_SIZE,
): QueueEnqueueResult {
	if (!Number.isInteger(maxSize) || maxSize < 1) {
		throw new RangeError('Inbound wire queue maxSize must be a positive integer');
	}
	if (queue.length >= maxSize) {
		return { accepted: false, overflowed: true };
	}
	queue.push(message);
	return { accepted: true, overflowed: false };
}
