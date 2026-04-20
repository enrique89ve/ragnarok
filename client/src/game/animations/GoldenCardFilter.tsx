import React from 'react';
import { createPortal } from 'react-dom';

const GoldenCardFilter: React.FC = () => {
	const svg = (
		<svg width="0" height="0" style={{ position: 'absolute' }}>
			<defs>
				<filter id="golden-displacement" x="-10%" y="-10%" width="120%" height="120%">
					<feTurbulence
						type="fractalNoise"
						baseFrequency="0.015 0.02"
						numOctaves={3}
						seed={0}
						result="noise"
					>
						<animate
							attributeName="seed"
							from="0"
							to="100"
							dur="10s"
							repeatCount="indefinite"
						/>
					</feTurbulence>
					<feDisplacementMap
						in="SourceGraphic"
						in2="noise"
						scale={4}
						xChannelSelector="R"
						yChannelSelector="G"
					/>
				</filter>
				<filter id="epic-displacement" x="-10%" y="-10%" width="120%" height="120%">
					<feTurbulence
						type="fractalNoise"
						baseFrequency="0.02 0.015"
						numOctaves={2}
						seed={50}
						result="noise"
					>
						<animate
							attributeName="seed"
							from="50"
							to="150"
							dur="12s"
							repeatCount="indefinite"
						/>
					</feTurbulence>
					<feDisplacementMap
						in="SourceGraphic"
						in2="noise"
						scale={3}
						xChannelSelector="R"
						yChannelSelector="G"
					/>
				</filter>
			</defs>
		</svg>
	);

	return createPortal(svg, document.body);
};

export default GoldenCardFilter;
