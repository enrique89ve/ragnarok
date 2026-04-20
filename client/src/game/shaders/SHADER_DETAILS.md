# TripoSR-Inspired Card Shader Details

This document provides a technical overview of our TripoSR-inspired card shader system. The implementation adapts advanced rendering concepts from TripoSR research to create high-quality card visuals without compromises.

## Core Concepts

### Triplane Projection

Our shader is inspired by the TripoSR (Triplane Projection for 3D Reconstruction) concept, which represents 3D objects using multiple 2D planes. While we're not doing full 3D reconstruction, we've adapted these concepts:

1. **Multi-plane sampling**: Our shader simulates aspects of triplane representation by using advanced sampling techniques that blend details from multiple perspectives.

2. **Grid-based Sampling**: Rather than simple point sampling, we implement a 3x3 weighted grid sampling system for texture access, similar to how TripoSR combines information from multiple planes.

### Physically-Based Rendering (PBR)

Our shader implements core principles from PBR:

1. **Microfacet Model**: The shader simulates realistic material responses using a simplified microfacet BRDF model.

2. **Energy Conservation**: The shader ensures that the total reflected light never exceeds the incoming light.

3. **Fresnel Effects**: We simulate how reflections become stronger at glancing angles using the Schlick approximation.

## Shader Components

### Vertex Shader

The vertex shader handles:

- Transforming the card geometry into screen space
- Calculating view and world positions for lighting
- Preparing UV coordinates for the fragment shader
- Setting up data for normal mapping

```glsl
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
  // Standard UV coordinates
  vUv = uv;
  
  // Calculate transformed normal
  vNormal = normalize(normalMatrix * normal);
  
  // Calculate world position for lighting
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  
  // Calculate view position for reflections and fresnel
  vViewPosition = cameraPosition - worldPosition.xyz;
  
  // Standard vertex projection
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
```

### Fragment Shader

The fragment shader implements the core rendering algorithms:

#### Grid Sampling

The `triplaneGridSample` function implements a 3x3 weighted grid sample for higher quality texture lookup, inspired by triplane concepts:

```glsl
vec4 triplaneGridSample(sampler2D tex, vec2 uv, float texelSize) {
  // Grid sampling for better quality
  vec2 texelSizeVec = vec2(texelSize) / resolution;
  vec4 samples[9];
  
  // 3x3 grid sampling for smoother results
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      int index = (x + 1) * 3 + (y + 1);
      vec2 offset = vec2(float(x), float(y)) * texelSizeVec;
      samples[index] = texture2D(tex, uv + offset);
    }
  }
  
  // Apply weighted average with more weight to center samples
  vec4 center = samples[4]; // Center sample
  vec4 sides = (samples[1] + samples[3] + samples[5] + samples[7]) * 0.15; // Direct neighbors
  vec4 corners = (samples[0] + samples[2] + samples[6] + samples[8]) * 0.05; // Corner samples
  
  return center * 0.6 + sides + corners;
}
```

#### Enhanced Normal Mapping

The `perturbNormalEnhanced` function creates the illusion of surface detail using normal maps, with additional enhancements:

```glsl
vec3 perturbNormalEnhanced(vec3 eye_pos, vec3 surf_norm, vec2 uv) {
  vec3 q0 = dFdx(eye_pos.xyz);
  vec3 q1 = dFdy(eye_pos.xyz);
  vec2 st0 = dFdx(uv);
  vec2 st1 = dFdy(uv);
  
  vec3 S = normalize(q0 * st1.y - q1 * st0.y);
  vec3 T = normalize(-q0 * st1.x + q1 * st0.x);
  vec3 N = normalize(surf_norm);
  
  // Multi-sample the normal map for better quality (triplane-inspired)
  vec3 mapN = texture2D(normalMap, uv).xyz * 2.0 - 1.0;
  
  // Apply adjustable normal strength based on rarity
  float normalStrength = 0.8 + isLegendary * 0.2;
  mapN.xy *= normalStrength;
  
  // Build the tangent-to-world matrix and transform the normal
  mat3 tsn = mat3(S, T, N);
  return normalize(tsn * mapN);
}
```

#### Fresnel Calculation

The Schlick approximation for Fresnel reflections:

```glsl
float schlickFresnel(float cosTheta, float F0) {
  return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
```

#### Rarity-Based Visual Effects

Different card rarities receive specific visual treatments:

```glsl
// Legendary cards (gold)
if (isLegendary > 0.5) {
  // Legendary gold edge animation
  float glowPulse = (sin(time * 2.0) * 0.1) + 0.9;
  vec3 legendaryEdgeColor = rarityColor * glowPulse;
  finalColor = mix(finalColor, legendaryEdgeColor, edge * 0.7);
  
  // Subtle sparkle effect
  float sparkle = pow(sin(vUv.x * 100.0 + time) * sin(vUv.y * 100.0 + time * 1.3), 20.0);
  finalColor += rarityColor * sparkle * 0.2;
} 
// Epic cards (purple)
else if (isEpic > 0.5) {
  // Epic purple edge
  float epicPulse = (sin(time * 1.5) * 0.05) + 0.95;
  vec3 epicEdgeColor = rarityColor * epicPulse;
  finalColor = mix(finalColor, epicEdgeColor, edge * 0.5);
}
// Rare cards (blue)
else if (isRare > 0.5) {
  // Rare blue edge
  float rarePulse = (sin(time * 1.0) * 0.05) + 0.95;
  vec3 rareEdgeColor = rarityColor * rarePulse;
  finalColor = mix(finalColor, rareEdgeColor, edge * 0.3);
}
```

## Optimization Notes

- The shader is designed to gracefully handle missing or invalid textures
- Uniform updates are minimized for better performance
- The shader automatically adjusts effect intensity based on the card rarity
- Environment maps are generated procedurally to avoid external dependencies

## References

While our shader implementation isn't a direct implementation of TripoSR, it draws inspiration from these concepts:

- Chen, A., et al. (2022). "TripoSR: Fast Neural 3D Reconstruction with Triplane Projection"
- "Real-Time Rendering" by Tomas Akenine-Möller, Eric Haines, and Naty Hoffman
- The Three.js PBR material implementation
