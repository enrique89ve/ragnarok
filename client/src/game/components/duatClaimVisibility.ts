export interface DuatPopupEntry {
	claimed: boolean;
}

export interface DuatPopupVisibilityInput {
	username: string | null | undefined;
	eligibilityLoaded: boolean;
	currentUserEntry: DuatPopupEntry | null;
	dismissed: boolean;
	claimPromptOpen: boolean;
	pendingClaimTrxId: string | null;
	starterClaimed: boolean;
}

export interface DuatPopupVisibility {
	visible: boolean;
	statusVisible: boolean;
}

export function getDuatPopupVisibility({
	username,
	eligibilityLoaded,
	currentUserEntry,
	dismissed,
	claimPromptOpen,
	pendingClaimTrxId,
	starterClaimed,
}: DuatPopupVisibilityInput): DuatPopupVisibility {
	const canShowPrompt = Boolean(username)
		&& eligibilityLoaded
		&& Boolean(currentUserEntry)
		&& !dismissed
		&& claimPromptOpen
		&& starterClaimed;

	const claimPending = Boolean(pendingClaimTrxId && !currentUserEntry?.claimed);
	const claimConfirmed = Boolean(currentUserEntry?.claimed && pendingClaimTrxId);

	return {
		visible: canShowPrompt && !currentUserEntry?.claimed && !claimPending,
		statusVisible: canShowPrompt && (claimPending || claimConfirmed),
	};
}
