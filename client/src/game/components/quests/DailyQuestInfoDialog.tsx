import { useEffect, useId, useRef, type ReactNode } from 'react';
import { CheckCircle2, Clock, Coins, RotateCcw, Swords, X } from 'lucide-react';

interface DailyQuestInfoDialogProps {
	onClose: () => void;
}

export default function DailyQuestInfoDialog({ onClose }: DailyQuestInfoDialogProps) {
	const titleId = useId();
	const descId = useId();
	const closeButtonRef = useRef<HTMLButtonElement | null>(null);

	useEffect(() => {
		closeButtonRef.current?.focus();
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [onClose]);

	return (
		<div
			className="fixed inset-0 z-[220] flex items-center justify-center bg-obsidian-950/80 px-4 backdrop-blur-sm"
			role="presentation"
			onMouseDown={onClose}
		>
			<section
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descId}
				className="w-full max-w-md rounded-lg border border-gold-300/25 bg-obsidian-900 shadow-2xl shadow-black/50"
				onMouseDown={(event) => event.stopPropagation()}
			>
				<header className="flex items-start justify-between gap-4 border-b border-obsidian-700 px-5 py-4">
					<div>
						<p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold-300">
							Daily quests
						</p>
						<h3 id={titleId} className="mt-1 font-display text-lg uppercase tracking-[0.08em] text-ink-0">
							How they work
						</h3>
					</div>
					<button
						ref={closeButtonRef}
						type="button"
						onClick={onClose}
						aria-label="Close daily quest info"
						className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-obsidian-700 bg-obsidian-950/70 text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
					>
						<X size={15} strokeWidth={2.2} aria-hidden />
					</button>
				</header>

				<div id={descId} className="space-y-4 px-5 py-5 text-sm leading-6 text-ink-200">
					<p>
						Complete daily quests by playing matches and matching the objective in each row.
						Progress updates from your combat actions.
					</p>

					<div className="grid gap-3">
						<InfoRow
							icon={<Swords size={14} strokeWidth={2.2} aria-hidden />}
							title="What counts"
							body="Your wins, cards played, minions, spells, weapons, mythic cards, hero power uses, enemy minion kills, and damage dealt by your side."
						/>
							<InfoRow
								icon={<CheckCircle2 size={14} strokeWidth={2.2} aria-hidden />}
								title="Claim timing"
								body="Completed quests become Pending. In Hive mode, use Claim to open Keychain; the chain confirms the RUNE after the signed custom_json lands."
							/>
						<InfoRow
							icon={<Coins size={14} strokeWidth={2.2} aria-hidden />}
							title="RUNE limits"
							body="Each confirmed slot grants 2 RUNE. Daily quests can credit up to 20 RUNE per account each season."
						/>
						<InfoRow
							icon={<Clock size={14} strokeWidth={2.2} aria-hidden />}
							title="When they reset"
							body="New quests arrive at midnight UTC. A completed but unclaimed slot expires with the day — claims belong to the Hive UTC day of inclusion."
						/>
						<InfoRow
							icon={<RotateCcw size={14} strokeWidth={2.2} aria-hidden />}
							title="Recast limit"
							body="You can replace one unfinished quest per UTC day. Completed quests cannot be recast."
						/>
					</div>
				</div>
			</section>
		</div>
	);
}

function InfoRow({ icon, title, body }: {
	icon: ReactNode;
	title: string;
	body: string;
}) {
	return (
		<div className="grid grid-cols-[28px_1fr] gap-3 rounded-md border border-obsidian-700 bg-obsidian-950/50 p-3">
			<div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md border border-gold-300/20 text-gold-300">
				{icon}
			</div>
			<div>
				<div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-100">
					{title}
				</div>
				<p className="mt-1 text-[12px] leading-5 text-ink-300">
					{body}
				</p>
			</div>
		</div>
	);
}
