import { Download } from 'lucide-react';
import type { MouseEvent } from 'react';
import {
	downloadCeremonyEvidence,
	recordCeremonyFeedbackEvent,
	type CeremonyKind,
} from '../protocol/ceremonyFeedback';

interface CeremonyEvidenceButtonProps {
	readonly ceremony: CeremonyKind;
	readonly account: string | null;
	readonly context?: Record<string, unknown>;
	readonly className?: string;
	readonly label?: string;
	readonly title?: string;
}

export function CeremonyEvidenceButton({
	ceremony,
	account,
	context,
	className = 'inline-flex items-center gap-1.5 rounded-md border border-obsidian-700 bg-obsidian-900/70 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300',
	label = 'Evidence',
	title = 'Download QA evidence',
}: CeremonyEvidenceButtonProps) {
	const handleDownload = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.stopPropagation();
		recordCeremonyFeedbackEvent(ceremony, 'evidence_downloaded', {
			account,
			...(context ?? {}),
		});
		downloadCeremonyEvidence({ ceremony, account, context });
	};

	return (
		<button
			type="button"
			onClick={handleDownload}
			className={className}
			title={title}
			aria-label={title}
		>
			<Download size={12} strokeWidth={2.2} aria-hidden="true" />
			{label}
		</button>
	);
}

export default CeremonyEvidenceButton;
