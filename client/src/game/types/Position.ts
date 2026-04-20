/**
 * Position Type Definition
 * 
 * Used throughout the application for tracking the position of cards and other game elements
 * on the screen. Positions are used for animations, drag tracking, and collision detection.
 * 
 * This is a shared type to ensure consistency across all position-based operations.
 */
export interface Position {
  x: number;
  y: number;
  insertionIndex?: number;
}