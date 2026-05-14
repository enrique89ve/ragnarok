import React from 'react';

/*
  EmberField — reusable two-layer Norse atmosphere particle backdrop.

  Layer 1 (golden embers, drift up):
    Small bright dots that rise across the surface. Uses the `ember-drift-up`
    keyframe defined globally in norse-atmosphere.css.

  Layer 2 (red sparks, drift diagonal):
    Larger smoldering sparks moving up-right. Uses `ember-drift-diagonal`.

  Both layers render as absolutely-positioned divs filling the parent. The
  parent must be `position: relative | absolute | fixed`. Pointer events
  disabled so the field never intercepts clicks.

  Use this inside any transitional overlay (Mulligan, Round Result, Mission
  Intro) to keep visual language consistent with the arena's torch ambience.
*/

const GOLDEN_BG =
	'radial-gradient(4px 4px at 5% 85%, rgba(255,220,60,0.9), transparent),' +
	'radial-gradient(5px 5px at 12% 75%, rgba(255,200,50,0.85), transparent),' +
	'radial-gradient(3px 3px at 18% 90%, rgba(255,180,40,0.8), transparent),' +
	'radial-gradient(6px 6px at 30% 82%, rgba(255,210,60,0.75), transparent),' +
	'radial-gradient(4px 4px at 42% 88%, rgba(255,190,50,0.8), transparent),' +
	'radial-gradient(5px 5px at 55% 78%, rgba(255,200,40,0.75), transparent),' +
	'radial-gradient(3px 3px at 65% 92%, rgba(255,220,60,0.8), transparent),' +
	'radial-gradient(5px 5px at 75% 70%, rgba(255,180,30,0.75), transparent),' +
	'radial-gradient(4px 4px at 88% 85%, rgba(255,200,50,0.8), transparent),' +
	'radial-gradient(6px 6px at 95% 75%, rgba(255,210,40,0.85), transparent)';

const SPARK_BG =
	'radial-gradient(6px 6px at 6% 88%, rgba(220,80,20,0.7), transparent),' +
	'radial-gradient(8px 8px at 15% 72%, rgba(200,60,15,0.65), transparent),' +
	'radial-gradient(7px 7px at 28% 95%, rgba(240,100,30,0.7), transparent),' +
	'radial-gradient(6px 6px at 40% 80%, rgba(210,90,25,0.6), transparent),' +
	'radial-gradient(8px 8px at 55% 92%, rgba(230,80,20,0.65), transparent),' +
	'radial-gradient(7px 7px at 68% 76%, rgba(200,70,20,0.6), transparent),' +
	'radial-gradient(6px 6px at 82% 90%, rgba(240,110,30,0.7), transparent),' +
	'radial-gradient(8px 8px at 93% 82%, rgba(220,90,25,0.75), transparent)';

const PARTICLE_BASE: React.CSSProperties = {
	backgroundSize: '100% 100%',
	backgroundRepeat: 'no-repeat',
	willChange: 'transform',
};

export const EmberField: React.FC = () => (
	<>
		<div
			aria-hidden="true"
			className="absolute inset-0 pointer-events-none z-0 motion-reduce:animate-none motion-reduce:opacity-30"
			style={{
				...PARTICLE_BASE,
				backgroundImage: GOLDEN_BG,
				animation: 'ember-drift-up 16s linear infinite',
			}}
		/>
		<div
			aria-hidden="true"
			className="absolute inset-0 pointer-events-none z-0 motion-reduce:animate-none motion-reduce:opacity-30"
			style={{
				...PARTICLE_BASE,
				backgroundImage: SPARK_BG,
				animation: 'ember-drift-diagonal 24s linear infinite',
			}}
		/>
	</>
);

export default EmberField;
