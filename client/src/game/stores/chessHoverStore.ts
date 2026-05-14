import { create } from 'zustand';

/*
  Tiny store for chess-board hover state. Decoupled from gameStore so the
  high-traffic hover events don't trigger re-renders in unrelated slices.
  Consumed by ChessPiece (writes) and ChessPhase's PieceInfoPanel (reads).
*/

interface ChessHoverState {
	hoveredPieceId: string | null;
	setHoveredPiece: (id: string | null) => void;
}

export const useChessHoverStore = create<ChessHoverState>((set) => ({
	hoveredPieceId: null,
	setHoveredPiece: (id) => set({ hoveredPieceId: id }),
}));
