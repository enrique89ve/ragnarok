// Despite its name, this official Pixi module removes runtime eval by
// installing static shader/uniform/particle sync functions for strict CSP.
import 'pixi.js/unsafe-eval';

export { Application, Container, Graphics, WebGLRenderer } from 'pixi.js';
export type { Ticker } from 'pixi.js';
