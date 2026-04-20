# GameStack JS Development Guidelines

This document provides detailed guidance for developing 3D WebGL games using React Three Fiber within the Norse Mythology Card Game project.

## Initial Setup

### Scene Configuration
- Create a basic @react-three/fiber scene with just a camera, renderer, and lighting
- Begin with a flat plane for terrain
- Use simple directional lighting
- Example:
  ```tsx
  function GameScene() {
    return (
      <Canvas shadows>
        <ambientLight intensity={0.3} />
        <directionalLight 
          position={[10, 10, 10]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
        />
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -0.5, 0]} 
          receiveShadow
        >
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#5a8455" />
        </mesh>
        <Player />
        <Enemies />
      </Canvas>
    );
  }
  ```

## Physics and Collision

### Simplified Collision Detection
- Start with basic AABB (Axis-Aligned Bounding Box) collision
- Use simple box geometries for all collision objects
- Keep collision response minimal
- Example:
  ```tsx
  function checkCollision(box1, box2) {
    return (
      box1.position.x < box2.position.x + box2.size.x &&
      box1.position.x + box1.size.x > box2.position.x &&
      box1.position.z < box2.position.z + box2.size.z &&
      box1.position.z + box1.size.z > box2.position.z
    );
  }
  ```

### Minimal Physics
- Skip unnecessary physics like air resistance and input buffering
- Use a simplified movement system that only handles the basics
- Do not use any physics library like Cannon/Rapier unless explicitly mentioned
- Example:
  ```tsx
  function updatePosition(entity, deltaTime) {
    // Simple velocity-based movement
    entity.position.x += entity.velocity.x * deltaTime;
    entity.position.z += entity.velocity.z * deltaTime;
    
    // Simple gravity
    if (!entity.isGrounded) {
      entity.velocity.y -= 9.8 * deltaTime;
      entity.position.y += entity.velocity.y * deltaTime;
    }
    
    // Simple ground collision
    if (entity.position.y < 0) {
      entity.position.y = 0;
      entity.velocity.y = 0;
      entity.isGrounded = true;
    }
  }
  ```

## Character and Movement

### Character and Objects
- Represent the player and NPCs as colored boxes for initial development
- Implement basic movement for player and NPCs
- Example:
  ```tsx
  function Player() {
    return (
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[1, 2, 1]} />
        <meshStandardMaterial color="blue" />
      </mesh>
    );
  }
  
  function Enemy() {
    return (
      <mesh position={[5, 1, 5]} castShadow>
        <boxGeometry args={[1, 2, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
    );
  }
  ```

### Movement System
- Use DREI keyboard controls for movement
- Configure key mappings properly
- Implement with useKeyboardControls hook
- Ensure movement directions are correct (moving towards camera is incorrect)

#### Basic Setup
```tsx
// Define your controls as an enum
enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  jump = 'jump',
}

// In your main component
function Game() {
  // Define key mappings
  const keyMap = [
    { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
    { name: Controls.back, keys: ['ArrowDown', 'KeyS'] },
    { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
    { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
    { name: Controls.jump, keys: ['Space'] },
  ];
  
  return (
    <KeyboardControls map={keyMap}>
      <YourGameComponent />
    </KeyboardControls>
  );
}
```

#### Using Controls in Components

##### Method 1: Reactive (For UI or simple logic)
```tsx
function PlayerComponent() {
  // This will re-render when forward key is pressed
  const forwardPressed = useKeyboardControls<Controls>(state => state.forward);
  
  return (
    <div>
      {forwardPressed ? "Moving forward!" : "Standing still"}
    </div>
  );
}
```

##### Method 2: For Game Loop (No re-renders)
```tsx
function PlayerMovement() {
  const [subscribe, getState] = useKeyboardControls<Controls>();
  
  // Subscribe to changes
  useEffect(() => {
    // Clean up automatically when component unmounts
    return subscribe(
      state => state.forward,
      isPressed => console.log("Forward key:", isPressed)
    );
  }, []);
  
  // Use in game loop
  useFrame(() => {
    // Get current state without causing re-renders
    const controls = getState();
    
    if (controls.forward) moveForward();
    if (controls.jump) jump();
    // etc...
  });
  
  return null;
}
```

## Special Systems

### Bullet Physics
- For bullet detection, use a hit radius of 1 unit
- Ensure bullets have unique IDs with normalized direction vectors for consistent speed
- Make bullets visually prominent by sizing correctly in your render function
- Implement comprehensive debug logging for bullets and enemies
- Example:
  ```tsx
  function createBullet(position, direction) {
    return {
      id: generateUniqueId(),
      position: { ...position },
      direction: normalizVector(direction),
      speed: 20,
      radius: 1,
      damage: 10,
      lifetime: 3, // seconds
      isActive: true
    };
  }
  
  function updateBullets(bullets, deltaTime, enemies) {
    return bullets.map(bullet => {
      // Update position
      bullet.position.x += bullet.direction.x * bullet.speed * deltaTime;
      bullet.position.y += bullet.direction.y * bullet.speed * deltaTime;
      bullet.position.z += bullet.direction.z * bullet.speed * deltaTime;
      
      // Reduce lifetime
      bullet.lifetime -= deltaTime;
      
      // Check enemy collisions
      enemies.forEach(enemy => {
        if (distance(bullet.position, enemy.position) < bullet.radius + enemy.radius) {
          enemy.health -= bullet.damage;
          bullet.isActive = false;
          console.log(`Bullet ${bullet.id} hit enemy ${enemy.id}, remaining health: ${enemy.health}`);
        }
      });
      
      return { ...bullet, isActive: bullet.isActive && bullet.lifetime > 0 };
    }).filter(bullet => bullet.isActive);
  }
  
  // Bullet component
  function Bullet({ position, direction }) {
    return (
      <mesh position={[position.x, position.y, position.z]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="yellow" emissive="orange" emissiveIntensity={2} />
      </mesh>
    );
  }
  ```

## Textures and Assets

### Texture Guidelines
- Textures are available in the `client/public/textures` folder
- Use textures with the correct path format: `useTexture("/textures/asphalt.png")`
- Only use textures that actually exist in the specified directory
- If no suitable textures exist, it's acceptable to not use a texture
- Example:
  ```tsx
  function Ground() {
    const texture = useTexture("/textures/asphalt.png");
    
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial map={texture} />
      </mesh>
    );
  }
  ```

### Camera Implementation
- Start with a simple follow camera
- Ensure the camera position shows all necessary game components
- Example:
  ```tsx
  function FollowCamera({ target }) {
    const cameraRef = useRef();
    
    useFrame(() => {
      if (!cameraRef.current || !target.current) return;
      
      const targetPosition = target.current.position;
      const cameraPosition = cameraRef.current.position;
      
      // Smooth follow with offset
      cameraPosition.x += (targetPosition.x - cameraPosition.x + 5) * 0.1;
      cameraPosition.y += (targetPosition.y - cameraPosition.y + 10) * 0.1;
      cameraPosition.z += (targetPosition.z - cameraPosition.z + 10) * 0.1;
      
      cameraRef.current.lookAt(targetPosition);
    });
    
    return (
      <PerspectiveCamera ref={cameraRef} makeDefault position={[5, 10, 10]} fov={75} />
    );
  }
  ```

## Game Systems

### Game Loop
- Implement a simple update/render loop
- Focus on getting the basic functional game working
- Example:
  ```tsx
  function GameLoop() {
    const [gameState, setGameState] = useState(initialGameState);
    
    useFrame((state, deltaTime) => {
      // Limit delta time to prevent large jumps
      const dt = Math.min(deltaTime, 0.1);
      
      // Update game state
      const newState = {
        ...gameState,
        player: updatePlayer(gameState.player, dt),
        enemies: updateEnemies(gameState.enemies, dt),
        bullets: updateBullets(gameState.bullets, dt, gameState.enemies),
        score: updateScore(gameState.score, gameState.enemies)
      };
      
      // Check win/lose conditions
      if (checkGameOver(newState)) {
        endGame(newState);
      }
      
      setGameState(newState);
    });
    
    return null;
  }
  ```

### Sounds and Music
- Use provided sample sounds only
- Never generate base64 sounds
- Implement sound effects that enhance the gaming experience
- Example:
  ```tsx
  function useSounds() {
    const [sounds, setSounds] = useState({});
    
    useEffect(() => {
      const soundMap = {
        shoot: new Howl({ src: ['/sounds/shoot.mp3'] }),
        explosion: new Howl({ src: ['/sounds/explosion.mp3'] }),
        jump: new Howl({ src: ['/sounds/jump.mp3'] }),
        background: new Howl({ 
          src: ['/sounds/background.mp3'],
          loop: true,
          volume: 0.5
        })
      };
      
      setSounds(soundMap);
      soundMap.background.play();
      
      return () => {
        // Clean up sounds
        Object.values(soundMap).forEach(sound => sound.stop());
      };
    }, []);
    
    return sounds;
  }
  ```

## UI and Random Elements

### Background Components
- Never use `Math.random()` directly in JSX or render methods
- Pre-calculate random values outside of render
- Use React hooks like `useState`, `useEffect`, and `useMemo` to manage random values
- Example:
  ```tsx
  function Trees() {
    // Good practice: Calculate positions once with useMemo
    const treePositions = useMemo(() => {
      const positions = [];
      for (let i = 0; i < 50; i++) {
        positions.push({
          x: Math.random() * 100 - 50,
          z: Math.random() * 100 - 50,
          scale: 0.5 + Math.random() * 1.5
        });
      }
      return positions;
    }, []);
    
    return (
      <group>
        {treePositions.map((pos, index) => (
          <Tree key={index} position={[pos.x, 0, pos.z]} scale={pos.scale} />
        ))}
      </group>
    );
  }
  
  // Bad practice: Don't do this
  function BadTrees() {
    return (
      <group>
        {/* Using Math.random() directly in JSX will create new values every render */}
        {Array.from({ length: 50 }).map((_, index) => (
          <Tree 
            key={index} 
            position={[Math.random() * 100 - 50, 0, Math.random() * 100 - 50]} 
            scale={0.5 + Math.random() * 1.5} 
          />
        ))}
      </group>
    );
  }
  ```

### Text and Game UI
- For all UI components, use dark backgrounds with light text or light backgrounds with dark text
- Ensure UI is visible over game backgrounds
- Example:
  ```tsx
  function GameUI({ score, health }) {
    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        padding: '20px',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        color: 'white',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontWeight: 'bold',
        zIndex: 100
      }}>
        <div style={{ 
          background: 'rgba(0,0,0,0.7)', 
          padding: '10px 20px',
          borderRadius: '10px'
        }}>
          Score: {score}
        </div>
        <div style={{ 
          background: 'rgba(0,0,0,0.7)', 
          padding: '10px 20px',
          borderRadius: '10px'
        }}>
          Health: {health}
        </div>
      </div>
    );
  }
  ```

## Important Quality Checks

Always ensure your implementation meets these requirements:

1. Character movement is in the right direction (moving toward camera is incorrect)
2. Game UI is visible over game backgrounds
3. Objects interact with each other correctly (e.g., cars and objects should drive/move on terrain without sinking)
4. Game states work correctly; the game shouldn't crash on starting
5. Initial camera position shows all necessary components of the game
6. Keyboard controls are compatible with the game and functional
7. Before generating new 3D models, check existing ones first

## Debugging and Performance

### Debugging Tools
- Add comprehensive logging for key game systems
- Implement a debug overlay for development
- Example:
  ```tsx
  function DebugOverlay({ isEnabled, gameState }) {
    if (!isEnabled) return null;
    
    return (
      <div style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '300px',
        padding: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 1000
      }}>
        <h3>Debug Info</h3>
        <pre>
          {JSON.stringify({
            playerPos: gameState.player.position,
            enemyCount: gameState.enemies.length,
            bulletCount: gameState.bullets.length,
            fps: Math.round(1 / gameState.deltaTime),
            memory: performance.memory ? 
              `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB` : 
              'N/A'
          }, null, 2)}
        </pre>
      </div>
    );
  }
  ```

### Performance Monitoring
- Monitor FPS and frame time
- Log memory usage
- Implement performance optimizations for complex scenes
- Example:
  ```tsx
  function PerformanceMonitor() {
    const [perfStats, setPerfStats] = useState({
      fps: 0,
      frameTime: 0,
      frameCount: 0,
      lastTime: performance.now()
    });
    
    useFrame((state, deltaTime) => {
      const now = performance.now();
      const frameTime = now - perfStats.lastTime;
      const frameCount = perfStats.frameCount + 1;
      
      // Update stats every second
      if (now - perfStats.lastTime >= 1000) {
        setPerfStats({
          fps: Math.round(frameCount * 1000 / (now - perfStats.lastTime)),
          frameTime: frameTime / frameCount,
          frameCount: 0,
          lastTime: now
        });
      } else {
        setPerfStats({
          ...perfStats,
          frameCount
        });
      }
      
      // Log warning if FPS drops below threshold
      if (1 / deltaTime < 30) {
        console.warn(`Low FPS detected: ${Math.round(1 / deltaTime)}`);
      }
    });
    
    return null;
  }
  ```

## Additional Resources and Standards

These guidelines should be used in conjunction with the `.vscode/DEVELOPMENT_RULES_UPDATED.md` document, which provides more general development principles and performance standards for the entire project.