import React from 'react';

interface TreasureChestProps {
	state: 'closed' | 'open';
	size?: number;
	className?: string;
	style?: React.CSSProperties;
}

const CHEST_DEFS = (
	<defs>
		{/* Wood grain pattern */}
		<pattern id="tc-woodgrain" x="0" y="0" width="60" height="8" patternUnits="userSpaceOnUse">
			<rect width="60" height="8" fill="#4a2810" />
			<line x1="0" y1="1.5" x2="60" y2="1.5" stroke="#3a1e0a" strokeWidth="0.6" opacity="0.7" />
			<line x1="0" y1="4" x2="60" y2="3.8" stroke="#3a1e0a" strokeWidth="0.4" opacity="0.5" />
			<line x1="0" y1="6.5" x2="60" y2="6.7" stroke="#3a1e0a" strokeWidth="0.5" opacity="0.6" />
			<line x1="5" y1="0" x2="7" y2="8" stroke="#3a1e0a" strokeWidth="0.3" opacity="0.3" />
			<line x1="25" y1="0" x2="23" y2="8" stroke="#3a1e0a" strokeWidth="0.3" opacity="0.25" />
			<line x1="42" y1="0" x2="44" y2="8" stroke="#3a1e0a" strokeWidth="0.3" opacity="0.2" />
		</pattern>

		{/* Dark wood for lid */}
		<pattern id="tc-woodgrain-dark" x="0" y="0" width="60" height="8" patternUnits="userSpaceOnUse">
			<rect width="60" height="8" fill="#3d2210" />
			<line x1="0" y1="1.5" x2="60" y2="1.5" stroke="#2e1808" strokeWidth="0.6" opacity="0.7" />
			<line x1="0" y1="4" x2="60" y2="3.8" stroke="#2e1808" strokeWidth="0.4" opacity="0.5" />
			<line x1="0" y1="6.5" x2="60" y2="6.7" stroke="#2e1808" strokeWidth="0.5" opacity="0.6" />
		</pattern>

		{/* Gold metal gradient (horizontal band) */}
		<linearGradient id="tc-gold-h" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stopColor="#FFD700" />
			<stop offset="15%" stopColor="#FFF2A0" />
			<stop offset="35%" stopColor="#DAA520" />
			<stop offset="50%" stopColor="#FFD700" />
			<stop offset="65%" stopColor="#B8860B" />
			<stop offset="85%" stopColor="#DAA520" />
			<stop offset="100%" stopColor="#8B6914" />
		</linearGradient>

		{/* Gold metal gradient (vertical band) */}
		<linearGradient id="tc-gold-v" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0%" stopColor="#8B6914" />
			<stop offset="20%" stopColor="#DAA520" />
			<stop offset="40%" stopColor="#FFE55C" />
			<stop offset="50%" stopColor="#FFF8DC" />
			<stop offset="60%" stopColor="#FFE55C" />
			<stop offset="80%" stopColor="#DAA520" />
			<stop offset="100%" stopColor="#8B6914" />
		</linearGradient>

		{/* Iron band gradient */}
		<linearGradient id="tc-iron" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stopColor="#707070" />
			<stop offset="20%" stopColor="#A0A0A0" />
			<stop offset="35%" stopColor="#C8C8C8" />
			<stop offset="50%" stopColor="#909090" />
			<stop offset="70%" stopColor="#686868" />
			<stop offset="100%" stopColor="#505050" />
		</linearGradient>

		{/* Body depth gradient (darkens bottom) */}
		<linearGradient id="tc-body-shade" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stopColor="transparent" />
			<stop offset="70%" stopColor="rgba(0,0,0,0.15)" />
			<stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
		</linearGradient>

		{/* Lid curvature highlight */}
		<linearGradient id="tc-lid-highlight" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
			<stop offset="40%" stopColor="rgba(255,255,255,0.05)" />
			<stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
		</linearGradient>

		{/* Rune glow radial */}
		<radialGradient id="tc-rune-glow" cx="0.5" cy="0.5" r="0.5">
			<stop offset="0%" stopColor="#FFD700" stopOpacity="0.6" />
			<stop offset="60%" stopColor="#DAA520" stopOpacity="0.2" />
			<stop offset="100%" stopColor="#8B6914" stopOpacity="0" />
		</radialGradient>

		{/* Open chest interior glow */}
		<radialGradient id="tc-interior-glow" cx="0.5" cy="0.3" r="0.7">
			<stop offset="0%" stopColor="#FFF8DC" stopOpacity="1" />
			<stop offset="25%" stopColor="#FFD700" stopOpacity="0.9" />
			<stop offset="50%" stopColor="#DAA520" stopOpacity="0.6" />
			<stop offset="80%" stopColor="#8B6914" stopOpacity="0.3" />
			<stop offset="100%" stopColor="#4a2810" stopOpacity="0" />
		</radialGradient>

		{/* Golden light rays */}
		<radialGradient id="tc-light-rays" cx="0.5" cy="0.5" r="0.6">
			<stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
			<stop offset="40%" stopColor="#FFD700" stopOpacity="0.3" />
			<stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
		</radialGradient>

		{/* Gold specular for rivets */}
		<radialGradient id="tc-rivet" cx="0.35" cy="0.3" r="0.5">
			<stop offset="0%" stopColor="#FFF8DC" />
			<stop offset="40%" stopColor="#FFD700" />
			<stop offset="100%" stopColor="#8B6914" />
		</radialGradient>

		{/* Iron rivet */}
		<radialGradient id="tc-iron-rivet" cx="0.35" cy="0.3" r="0.5">
			<stop offset="0%" stopColor="#D0D0D0" />
			<stop offset="40%" stopColor="#909090" />
			<stop offset="100%" stopColor="#505050" />
		</radialGradient>

		{/* Noise texture for wood grain micro-detail */}
		<filter id="tc-wood-noise" x="0" y="0" width="100%" height="100%">
			<feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" seed="2" result="noise" />
			<feColorMatrix type="saturate" values="0" in="noise" result="gray" />
			<feBlend in="SourceGraphic" in2="gray" mode="multiply" />
		</filter>

		{/* Subtle inner shadow for depth */}
		<filter id="tc-inner-shadow" x="-5%" y="-5%" width="110%" height="110%">
			<feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
			<feOffset dx="0" dy="2" result="offset" />
			<feFlood floodColor="#000" floodOpacity="0.5" result="color" />
			<feComposite in="color" in2="offset" operator="in" result="shadow" />
			<feComposite in="SourceGraphic" in2="shadow" operator="over" />
		</filter>

		{/* Drop shadow for the whole chest */}
		<filter id="tc-drop-shadow" x="-15%" y="-10%" width="130%" height="140%">
			<feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.6" />
		</filter>

		{/* Glow filter for open state light */}
		<filter id="tc-glow" x="-50%" y="-50%" width="200%" height="200%">
			<feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
			<feColorMatrix type="matrix" in="blur" result="gold"
				values="1 0.8 0 0 0.2  0 0.7 0 0 0.1  0 0 0.2 0 0  0 0 0 1 0" />
			<feMerge>
				<feMergeNode in="gold" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>

		{/* Clip paths */}
		<clipPath id="tc-body-clip">
			<rect x="30" y="135" width="240" height="110" rx="6" />
		</clipPath>
		<clipPath id="tc-lid-clip-closed">
			<path d="M30 135 Q30 85 150 75 Q270 85 270 135 Z" />
		</clipPath>
	</defs>
);

function Rivets({ y, count, xStart, xEnd }: { y: number; count: number; xStart: number; xEnd: number }) {
	const spacing = (xEnd - xStart) / (count - 1);
	return (
		<>
			{Array.from({ length: count }).map((_, i) => {
				const cx = xStart + i * spacing;
				return (
					<g key={i}>
						<circle cx={cx} cy={y} r="3.5" fill="url(#tc-iron-rivet)" />
						<circle cx={cx} cy={y} r="1.5" fill="url(#tc-rivet)" opacity="0.6" />
						<circle cx={cx} cy={y - 1} r="1" fill="#FFF8DC" opacity="0.4" />
					</g>
				);
			})}
		</>
	);
}

function RuneSymbol({ x, y, scale }: { x: number; y: number; scale: number }) {
	return (
		<g transform={`translate(${x}, ${y}) scale(${scale})`}>
			{/* Rune glow backdrop */}
			<circle cx="0" cy="0" r="20" fill="url(#tc-rune-glow)" />
			{/* Algiz rune (protection, ᛉ) — classic Norse */}
			<g fill="none" stroke="#DAA520" strokeWidth="2.5" strokeLinecap="round">
				{/* Vertical stave */}
				<line x1="0" y1="-14" x2="0" y2="14" />
				{/* Upper branches */}
				<line x1="0" y1="-6" x2="-9" y2="-14" />
				<line x1="0" y1="-6" x2="9" y2="-14" />
				{/* Small cross marks (bind-rune detail) */}
				<line x1="-4" y1="4" x2="4" y2="4" />
				<line x1="-3" y1="9" x2="3" y2="9" />
			</g>
			{/* Specular highlight */}
			<g fill="none" stroke="#FFF8DC" strokeWidth="1" strokeLinecap="round" opacity="0.5">
				<line x1="0" y1="-14" x2="0" y2="-2" />
				<line x1="0" y1="-6" x2="-6" y2="-12" />
				<line x1="0" y1="-6" x2="6" y2="-12" />
			</g>
		</g>
	);
}

function IronBand({ y, height }: { y: number; height: number }) {
	return (
		<g>
			<rect x="30" y={y} width="240" height={height} fill="url(#tc-iron)" rx="1" />
			{/* Top edge highlight */}
			<line x1="30" y1={y + 0.5} x2="270" y2={y + 0.5} stroke="#C8C8C8" strokeWidth="0.8" opacity="0.6" />
			{/* Bottom edge shadow */}
			<line x1="30" y1={y + height - 0.5} x2="270" y2={y + height - 0.5} stroke="#303030" strokeWidth="0.8" opacity="0.5" />
		</g>
	);
}

function GoldTrim({ y, height }: { y: number; height: number }) {
	return (
		<g>
			<rect x="30" y={y} width="240" height={height} fill="url(#tc-gold-h)" rx="1" />
			{/* Bright specular line */}
			<line x1="32" y1={y + height * 0.25} x2="268" y2={y + height * 0.25} stroke="#FFF8DC" strokeWidth="0.8" opacity="0.5" />
		</g>
	);
}

function NorseKnotwork({ y }: { y: number }) {
	return (
		<g opacity="0.35" fill="none" stroke="#DAA520" strokeWidth="1.2">
			{/* Simple interlocking knot repeat across the band */}
			{[60, 110, 160, 210].map((x) => (
				<g key={x}>
					<path d={`M${x - 12} ${y} Q${x - 6} ${y - 6} ${x} ${y} Q${x + 6} ${y + 6} ${x + 12} ${y}`} />
					<path d={`M${x - 12} ${y} Q${x - 6} ${y + 6} ${x} ${y} Q${x + 6} ${y - 6} ${x + 12} ${y}`} />
				</g>
			))}
		</g>
	);
}

function CornerBracket({ x, y, flipX, flipY }: { x: number; y: number; flipX?: boolean; flipY?: boolean }) {
	const sx = flipX ? -1 : 1;
	const sy = flipY ? -1 : 1;
	return (
		<g transform={`translate(${x}, ${y}) scale(${sx}, ${sy})`}>
			<path
				d="M0 0 L22 0 L22 5 L5 5 L5 22 L0 22 Z"
				fill="url(#tc-gold-h)"
			/>
			{/* Specular edge */}
			<line x1="1" y1="1" x2="21" y2="1" stroke="#FFF8DC" strokeWidth="0.8" opacity="0.4" />
			<line x1="1" y1="1" x2="1" y2="21" stroke="#FFF8DC" strokeWidth="0.8" opacity="0.4" />
			{/* Corner rivet */}
			<circle cx="4" cy="4" r="2.5" fill="url(#tc-rivet)" />
			<circle cx="4" cy="3" r="1" fill="#FFF8DC" opacity="0.5" />
		</g>
	);
}

function ChestBody() {
	return (
		<g>
			{/* Main body shape */}
			<rect x="30" y="135" width="240" height="110" rx="6" fill="url(#tc-woodgrain)" />
			{/* Wood noise overlay */}
			<rect x="30" y="135" width="240" height="110" rx="6" fill="url(#tc-woodgrain)" filter="url(#tc-wood-noise)" opacity="0.3" />
			{/* Depth shading */}
			<rect x="30" y="135" width="240" height="110" rx="6" fill="url(#tc-body-shade)" />

			{/* Iron bands */}
			<IronBand y={140} height={8} />
			<IronBand y={175} height={6} />
			<IronBand y={225} height={8} />

			{/* Gold trim at lip */}
			<GoldTrim y={135} height={5} />

			{/* Knotwork on middle iron band */}
			<NorseKnotwork y={178} />

			{/* Rivets on top and bottom bands */}
			<Rivets y={144} count={8} xStart={45} xEnd={255} />
			<Rivets y={229} count={8} xStart={45} xEnd={255} />

			{/* Vertical iron straps */}
			<rect x="70" y="135" width="6" height="110" fill="url(#tc-iron)" opacity="0.7" />
			<rect x="224" y="135" width="6" height="110" fill="url(#tc-iron)" opacity="0.7" />

			{/* Corner brackets */}
			<CornerBracket x={30} y={135} />
			<CornerBracket x={270} y={135} flipX />
			<CornerBracket x={30} y={245} flipY />
			<CornerBracket x={270} y={245} flipX flipY />

			{/* Front panel — Rune */}
			<RuneSymbol x={150} y={195} scale={1.2} />

			{/* Keyhole beneath rune */}
			<g>
				<circle cx="150" cy="218" r="5" fill="#1a1a1a" />
				<rect x="148" y="218" width="4" height="10" rx="1" fill="#1a1a1a" />
				{/* Keyhole gold ring */}
				<circle cx="150" cy="218" r="6.5" fill="none" stroke="url(#tc-gold-h)" strokeWidth="2" />
				<circle cx="149" cy="216.5" r="1.5" fill="#333" opacity="0.6" />
			</g>

			{/* Bottom edge shadow */}
			<rect x="30" y="240" width="240" height="5" rx="2" fill="rgba(0,0,0,0.4)" />
		</g>
	);
}

function LidClosed() {
	return (
		<g>
			{/* Lid dome shape */}
			<path
				d="M30 135 Q30 85 150 75 Q270 85 270 135 Z"
				fill="url(#tc-woodgrain-dark)"
			/>
			{/* Wood noise on lid */}
			<path
				d="M30 135 Q30 85 150 75 Q270 85 270 135 Z"
				fill="url(#tc-woodgrain-dark)"
				filter="url(#tc-wood-noise)"
				opacity="0.25"
			/>
			{/* Curvature highlight */}
			<path
				d="M30 135 Q30 85 150 75 Q270 85 270 135 Z"
				fill="url(#tc-lid-highlight)"
			/>

			{/* Lid iron band (arched) */}
			<path
				d="M30 125 Q30 80 150 72 Q270 80 270 125"
				fill="none"
				stroke="url(#tc-iron)"
				strokeWidth="7"
			/>
			{/* Iron band highlights */}
			<path
				d="M30 122 Q30 78 150 70 Q270 78 270 122"
				fill="none"
				stroke="#B0B0B0"
				strokeWidth="0.8"
				opacity="0.4"
			/>

			{/* Gold trim on lid lip */}
			<path
				d="M30 135 Q30 130 150 127 Q270 130 270 135"
				fill="none"
				stroke="url(#tc-gold-h)"
				strokeWidth="4"
			/>
			{/* Lid lip specular */}
			<path
				d="M35 133 Q35 129 150 126 Q265 129 265 133"
				fill="none"
				stroke="#FFF8DC"
				strokeWidth="0.8"
				opacity="0.35"
			/>

			{/* Center gold medallion on lid */}
			<g>
				<circle cx="150" cy="100" r="16" fill="url(#tc-gold-v)" />
				<circle cx="150" cy="100" r="14" fill="url(#tc-gold-h)" />
				<circle cx="150" cy="100" r="11" fill="#4a2810" />
				{/* Valknut symbol (3 interlocking triangles) */}
				<g fill="none" stroke="#DAA520" strokeWidth="1.5" strokeLinejoin="round">
					<polygon points="150,89 143,103 157,103" />
					<polygon points="150,111 143,97 157,97" />
					<polygon points="142,95 158,95 150,107" opacity="0.7" />
				</g>
				{/* Medallion specular */}
				<circle cx="148" cy="97" r="4" fill="#FFF8DC" opacity="0.15" />
			</g>

			{/* Lid rivets along the arched band */}
			{[55, 85, 115, 185, 215, 245].map((x) => {
				const t = (x - 30) / 240;
				const yPos = 125 - Math.sin(t * Math.PI) * 48;
				return (
					<g key={x}>
						<circle cx={x} cy={yPos} r="3" fill="url(#tc-iron-rivet)" />
						<circle cx={x} cy={yPos - 1} r="1" fill="#E0E0E0" opacity="0.5" />
					</g>
				);
			})}

			{/* Hinge plates on back (barely visible, adds realism) */}
			<rect x="85" y="131" width="16" height="8" rx="2" fill="url(#tc-iron)" opacity="0.5" />
			<rect x="199" y="131" width="16" height="8" rx="2" fill="url(#tc-iron)" opacity="0.5" />
		</g>
	);
}

function LidOpen() {
	return (
		<g>
			{/* Lid tilted back — perspective transform */}
			<g transform="translate(150, 135) scale(1, 0.3) translate(-150, -135)">
				<path
					d="M30 135 Q30 85 150 75 Q270 85 270 135 Z"
					fill="url(#tc-woodgrain-dark)"
				/>
				<path
					d="M30 135 Q30 85 150 75 Q270 85 270 135 Z"
					fill="url(#tc-lid-highlight)"
				/>
				{/* Iron band */}
				<path
					d="M30 125 Q30 80 150 72 Q270 80 270 125"
					fill="none"
					stroke="url(#tc-iron)"
					strokeWidth="7"
				/>
				{/* Gold medallion (small, foreshortened) */}
				<circle cx="150" cy="100" r="14" fill="url(#tc-gold-h)" />
				<circle cx="150" cy="100" r="11" fill="#4a2810" />
				<g fill="none" stroke="#DAA520" strokeWidth="1.5" strokeLinejoin="round">
					<polygon points="150,89 143,103 157,103" />
					<polygon points="150,111 143,97 157,97" />
				</g>
			</g>

			{/* Lid back panel — the inside surface visible when open */}
			<rect x="35" y="75" width="230" height="58" rx="4" fill="#2a1508" />
			<rect x="35" y="75" width="230" height="58" rx="4" fill="rgba(255,215,0,0.08)" />
			{/* Lid gold trim at edge */}
			<rect x="35" y="130" width="230" height="3" fill="url(#tc-gold-h)" />
		</g>
	);
}

function OpenGlow() {
	return (
		<g>
			{/* Large ambient glow behind chest */}
			<ellipse cx="150" cy="120" rx="160" ry="100" fill="url(#tc-light-rays)" opacity="0.4">
				<animate attributeName="opacity" values="0.3;0.5;0.3" dur="2s" repeatCount="indefinite" />
			</ellipse>

			{/* Interior glow emanating from the box */}
			<ellipse cx="150" cy="135" rx="100" ry="40" fill="url(#tc-interior-glow)" opacity="0.9">
				<animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
			</ellipse>

			{/* Light rays shooting upward */}
			{[
				{ x: 150, angle: 0, h: 90, w: 18, delay: 0 },
				{ x: 120, angle: -15, h: 70, w: 12, delay: 0.3 },
				{ x: 180, angle: 15, h: 70, w: 12, delay: 0.6 },
				{ x: 95, angle: -25, h: 50, w: 8, delay: 0.2 },
				{ x: 205, angle: 25, h: 50, w: 8, delay: 0.4 },
				{ x: 135, angle: -8, h: 60, w: 10, delay: 0.5 },
				{ x: 165, angle: 8, h: 60, w: 10, delay: 0.1 },
			].map((ray, i) => (
				<g key={i} transform={`rotate(${ray.angle}, ${ray.x}, 135)`}>
					<rect
						x={ray.x - ray.w / 2}
						y={135 - ray.h}
						width={ray.w}
						height={ray.h}
						rx={ray.w / 2}
						fill="url(#tc-interior-glow)"
						opacity="0.5"
					>
						<animate
							attributeName="opacity"
							values="0.3;0.6;0.3"
							dur="2s"
							begin={`${ray.delay}s`}
							repeatCount="indefinite"
						/>
						<animate
							attributeName="height"
							values={`${ray.h * 0.85};${ray.h};${ray.h * 0.85}`}
							dur="2s"
							begin={`${ray.delay}s`}
							repeatCount="indefinite"
						/>
					</rect>
				</g>
			))}

			{/* Sparkle particles */}
			{[
				{ cx: 110, cy: 90, r: 2.5, delay: 0 },
				{ cx: 190, cy: 85, r: 2, delay: 0.5 },
				{ cx: 140, cy: 60, r: 1.8, delay: 1 },
				{ cx: 170, cy: 70, r: 2.2, delay: 0.3 },
				{ cx: 125, cy: 75, r: 1.5, delay: 0.8 },
				{ cx: 180, cy: 55, r: 1.5, delay: 1.2 },
				{ cx: 150, cy: 45, r: 2, delay: 0.6 },
				{ cx: 100, cy: 70, r: 1.2, delay: 0.9 },
				{ cx: 200, cy: 65, r: 1.3, delay: 0.2 },
			].map((spark, i) => (
				<g key={i}>
					{/* 4-point star sparkle */}
					<circle
						cx={spark.cx}
						cy={spark.cy}
						r={spark.r}
						fill="#FFF8DC"
					>
						<animate
							attributeName="opacity"
							values="0;1;0"
							dur="1.5s"
							begin={`${spark.delay}s`}
							repeatCount="indefinite"
						/>
						<animate
							attributeName="r"
							values={`${spark.r * 0.5};${spark.r};${spark.r * 0.5}`}
							dur="1.5s"
							begin={`${spark.delay}s`}
							repeatCount="indefinite"
						/>
					</circle>
					{/* Cross highlight for star sparkle */}
					<line
						x1={spark.cx - spark.r * 2}
						y1={spark.cy}
						x2={spark.cx + spark.r * 2}
						y2={spark.cy}
						stroke="#FFF8DC"
						strokeWidth="0.5"
					>
						<animate
							attributeName="opacity"
							values="0;0.8;0"
							dur="1.5s"
							begin={`${spark.delay}s`}
							repeatCount="indefinite"
						/>
					</line>
					<line
						x1={spark.cx}
						y1={spark.cy - spark.r * 2}
						x2={spark.cx}
						y2={spark.cy + spark.r * 2}
						stroke="#FFF8DC"
						strokeWidth="0.5"
					>
						<animate
							attributeName="opacity"
							values="0;0.8;0"
							dur="1.5s"
							begin={`${spark.delay}s`}
							repeatCount="indefinite"
						/>
					</line>
				</g>
			))}

			{/* Golden mist/fog at the opening */}
			<ellipse cx="150" cy="138" rx="90" ry="12" fill="#FFD700" opacity="0.15">
				<animate attributeName="ry" values="10;14;10" dur="3s" repeatCount="indefinite" />
				<animate attributeName="opacity" values="0.1;0.2;0.1" dur="3s" repeatCount="indefinite" />
			</ellipse>
		</g>
	);
}

const TreasureChestSVG: React.FC<TreasureChestProps> = ({
	state,
	size = 280,
	className,
	style,
}) => {
	const isOpen = state === 'open';
	const viewBox = isOpen ? "0 20 300 250" : "0 60 300 200";

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox={viewBox}
			width={size}
			height={size * (isOpen ? 250 / 300 : 200 / 300)}
			className={className}
			style={style}
		>
			{CHEST_DEFS}

			{/* Background glow for open state */}
			{isOpen && <OpenGlow />}

			{/* Drop shadow group */}
			<g filter="url(#tc-drop-shadow)">
				{/* Chest body (always visible) */}
				<ChestBody />

				{/* Lid state */}
				{isOpen ? <LidOpen /> : <LidClosed />}
			</g>

			{/* Rune glow animation on closed chest */}
			{!isOpen && (
				<circle cx="150" cy="195" r="22" fill="url(#tc-rune-glow)" opacity="0.6">
					<animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
					<animate attributeName="r" values="20;25;20" dur="3s" repeatCount="indefinite" />
				</circle>
			)}
		</svg>
	);
};

export default TreasureChestSVG;
