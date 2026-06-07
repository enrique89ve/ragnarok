import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { ChessPiece, ElementType } from '../../types/ChessTypes';

interface PixiOverlayProps {
  pieces: ChessPiece[];
  boardSize: { width: number; height: number };
}

const ELEMENT_GLOW_COLORS: Record<ElementType, number> = {
  fire: 0xff5500,
  water: 0x00ccff,
  wind: 0x44ff88,
  earth: 0xdf9955,
  holy: 0xffcc00, 
  shadow: 0xcc44ff,
  neutral: 0xffffff
};

// --- SIMPLIFIED ROBUST FLAME SHADER ---
const vertexShader = `
  attribute vec2 aPosition;
  attribute vec2 aUv;
  varying vec2 vUv;
  uniform mat3 uProjectionMatrix;
  uniform mat3 uWorldTransformMatrix;

  void main() {
    vUv = aUv;
    gl_Position = vec4((uProjectionMatrix * uWorldTransformMatrix * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uIntensity;

  void main() {
    vec2 uv = vUv - 0.5;
    float d = length(uv);
    
    // Procedural wave for organic feeling (lighter than full noise)
    float wave = sin(d * 10.0 - uTime * 5.0) * 0.05;
    float aura = smoothstep(0.5, 0.1, d + wave);
    
    // Core glow
    float core = smoothstep(0.2, 0.0, d);
    
    vec3 finalColor = uColor * (aura * 1.5 + core * 0.5);
    gl_FragColor = vec4(finalColor * uIntensity, aura);
  }
`;

const ChessBoardPixiOverlay: React.FC<PixiOverlayProps> = ({ pieces, boardSize }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const meshesRef = useRef<Record<string, PIXI.Mesh<PIXI.Geometry, PIXI.Shader>>>({});

  useEffect(() => {
    if (!containerRef.current) return;

    const initPixi = async () => {
      const app = new PIXI.Application();
      await app.init({
        width: boardSize.width || 500,
        height: boardSize.height || 700,
        backgroundAlpha: 0,
        resolution: 1,
        antialias: true
      });

      appRef.current = app;
      if (containerRef.current) containerRef.current.appendChild(app.canvas);

      app.ticker.add((ticker) => {
        const time = app.ticker.lastTime * 0.001;

        pieces.forEach(piece => {
          if (piece.type !== 'king' && piece.type !== 'queen') return;

          const pieceId = piece.id;
          const isKing = piece.type === 'king';

          if (!meshesRef.current[pieceId]) {
            const geometry = new PIXI.Geometry({
              attributes: {
                aPosition: [-50, -50, 50, -50, 50, 50, -50, 50],
                aUv: [0, 0, 1, 0, 1, 1, 0, 1],
              },
              indexBuffer: [0, 1, 2, 0, 2, 3],
            });

            const colorHex = isKing ? 0x00f2ff : (ELEMENT_GLOW_COLORS[piece.element || 'neutral']);
            const r = (colorHex >> 16 & 0xff) / 255;
            const g = (colorHex >> 8 & 0xff) / 255;
            const b = (colorHex & 0xff) / 255;

            // USE PIXI 8 STANDARD UNIFORM GROUP AT TOP LEVEL
            const shader = PIXI.Shader.from({
              gl: { vertex: vertexShader, fragment: fragmentShader },
              resources: {
                // By naming the resource 'uTime' etc directly, Pixi 8 often maps them better in WebGL compatibility mode
                royalUniforms: new PIXI.UniformGroup({
                  uTime: { value: 0, type: 'f32' },
                  uColor: { value: [r, g, b], type: 'vec3<f32>' },
                  uIntensity: { value: isKing ? 1.8 : 1.3, type: 'f32' },
                })
              }
            });

            const mesh = new PIXI.Mesh<PIXI.Geometry, PIXI.Shader>({ geometry, shader });
            mesh.blendMode = 'add';
            app.stage.addChild(mesh);
            meshesRef.current[pieceId] = mesh;
          }

          const mesh = meshesRef.current[pieceId];
          const cellWidth = boardSize.width / 5;
          const cellHeight = boardSize.height / 7;

          mesh.x = (piece.position.col * cellWidth) + (cellWidth / 2);
          mesh.y = (piece.position.row * cellHeight) + (cellHeight / 2);
          mesh.scale.set(cellWidth / 80);

          const royalUniforms = mesh.shader?.resources?.royalUniforms;
          if (royalUniforms) {
            const uniforms = (royalUniforms as PIXI.UniformGroup).uniforms;
            if ('uTime' in uniforms) {
              uniforms.uTime = time;
            }
          }
        });

        // Cleanup
        const currentIds = new Set(pieces.map(p => p.id));
        Object.keys(meshesRef.current).forEach(id => {
          if (!currentIds.has(id)) {
            app.stage.removeChild(meshesRef.current[id]);
            delete meshesRef.current[id];
          }
        });
      });
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true, context: true });
        appRef.current = null;
      }
    };
  }, [pieces, boardSize]);

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none z-10" />;
};

export default ChessBoardPixiOverlay;
