import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

interface PiecePixiEffectProps {
  color: string;
  type: string;
  element: string;
}

const PiecePixiEffect: React.FC<PiecePixiEffectProps> = ({ color, type }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const isKing = type === 'king';
    const rgb = hexToRgb(color);
    
    const initPixi = async () => {
      const app = new PIXI.Application();
      await app.init({
        width: 120,
        height: 120,
        backgroundAlpha: 0,
        resolution: 1,
        antialias: true,
      });

      appRef.current = app;
      if (containerRef.current) containerRef.current.appendChild(app.canvas);

      // --- CUSTOM FLAME SHADER (GLSL) ---
      const fragmentShader = `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uIntensity;

        // Custom noise function for organic flow
        float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
        vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
        vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
        vec2 fade(vec2 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

        float pnoise(vec2 P, vec2 rep) {
          vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
          vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
          Pi = mod(Pi, rep.xyxy);
          Pi = mod289(Pi);
          vec4 ix = Pi.xzxz;
          vec4 iy = Pi.yyww;
          vec4 fx = Pf.xzxz;
          vec4 fy = Pf.yyww;
          vec4 i = permute(permute(ix) + iy);
          vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0;
          vec4 gy = abs(gx) - 0.5;
          vec4 tx = floor(gx + 0.5);
          gx = gx - tx;
          vec2 g00 = vec2(gx.x,gy.x);
          vec2 g10 = vec2(gx.y,gy.y);
          vec2 g01 = vec2(gx.z,gy.z);
          vec2 g11 = vec2(gx.w,gy.w);
          vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g10, g10), dot(g01, g01), dot(g11, g11)));
          g00 *= norm.x; g10 *= norm.y; g01 *= norm.z; g11 *= norm.w;
          float n00 = dot(g00, fx.xy);
          float n10 = dot(g10, fx.zw);
          float n01 = dot(g01, fy.xy);
          float n11 = dot(g11, fy.zw);
          vec2 fade_xy = fade(Pf.xy);
          vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
          float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
          return 2.3 * n_xy;
        }

        void main() {
          vec2 uv = vUv - 0.5;
          float d = length(uv);
          
          // Flame Distortion
          float n = pnoise(uv * 4.0 + vec2(0.0, -uTime * 1.5), vec2(10.0));
          float aura = smoothstep(0.5, 0.1, d + n * 0.12);
          
          // Core glow
          float core = smoothstep(0.2, 0.0, d);
          
          vec3 finalColor = uColor * (aura * 1.5 + core * 0.5);
          gl_FragColor = vec4(finalColor * uIntensity, aura);
        }
      `;

      const geometry = new PIXI.Geometry({
        attributes: {
          aPosition: [-60, -60,  60, -60,  60, 60,  -60, 60],
          aUv: [0, 0,  1, 0,  1, 1,  0, 1],
        },
        indexBuffer: [0, 1, 2, 0, 2, 3],
      });

      const shader = PIXI.Shader.from({
        gl: {
          vertex: `
            attribute vec2 aPosition;
            attribute vec2 aUv;
            varying vec2 vUv;
            uniform mat3 uProjectionMatrix;
            uniform mat3 uWorldTransformMatrix;
            void main() {
              vUv = aUv;
              gl_Position = vec4((uProjectionMatrix * uWorldTransformMatrix * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
            }
          `,
          fragment: fragmentShader,
        },
        resources: {
          uTime: { value: 0 },
          uColor: { value: [rgb.r / 255, rgb.g / 255, rgb.b / 255] },
          uIntensity: { value: isKing ? 1.8 : 1.2 },
        },
      });

      const mesh = new PIXI.Mesh({ geometry, shader });
      mesh.x = 60;
      mesh.y = 60;
      mesh.blendMode = 'add';
      app.stage.addChild(mesh);

      app.ticker.add((ticker) => {
        shader.resources.uTime.value += ticker.deltaTime * 0.01;
      });
    };

    function hexToRgb(hex: string) {
      const h = hex.replace('#', '');
      return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
      };
    }

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true, context: true });
        appRef.current = null;
      }
    };
  }, [color, type]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 pointer-events-none flex items-center justify-center scale-150"
      style={{ mixBlendMode: 'screen', zIndex: 10 }}
    />
  );
};

export default PiecePixiEffect;
