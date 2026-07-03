import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function FloatingShape({ geometry, position, color, scale = 1, speed = 1, rotationSpeed = 1 }) {
  const meshRef = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.x = time * 0.1 * rotationSpeed;
      meshRef.current.rotation.y = time * 0.15 * rotationSpeed;
      meshRef.current.position.y = position[1] + Math.sin(time * 0.8 * speed + position[0]) * 0.3;
      meshRef.current.position.x = position[0] + Math.cos(time * 0.4 * speed + position[1]) * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      {geometry}
      <meshPhysicalMaterial
        color={color}
        roughness={0.1}
        metalness={0.1}
        clearcoat={1.0}
        clearcoatRoughness={0.1}
        transmission={0.6}
        opacity={0.65}
        transparent
        ior={1.2}
        thickness={1.5}
      />
    </mesh>
  );
}

export default function AnimatedBackground() {
  return (
    <div className="animated-bg-container">
      <div className="animated-bg" />
      <div className="canvas-container">
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1.5} />
          <pointLight position={[-5, -5, -5]} intensity={0.5} />
          
          {/* Shape 1: Torus (Top Left) */}
          <FloatingShape
            geometry={<torusGeometry args={[1.2, 0.4, 16, 64]} />}
            position={[-4.5, 2.5, 0]}
            color="#3498db"
            scale={0.7}
            speed={0.8}
            rotationSpeed={1}
          />
          
          {/* Shape 2: Dodecahedron (Bottom Right) */}
          <FloatingShape
            geometry={<dodecahedronGeometry args={[1.2]} />}
            position={[4.5, -2, 0]}
            color="#9b59b6"
            scale={0.8}
            speed={0.9}
            rotationSpeed={1.2}
          />
          
          {/* Shape 3: Octahedron (Bottom Left) */}
          <FloatingShape
            geometry={<octahedronGeometry args={[1.0]} />}
            position={[-4, -2.5, -1]}
            color="#2ecc71"
            scale={0.75}
            speed={1.1}
            rotationSpeed={0.8}
          />

          {/* Shape 4: Sphere (Top Right) */}
          <FloatingShape
            geometry={<sphereGeometry args={[1.0, 32, 32]} />}
            position={[4, 2.2, -1]}
            color="#f1c40f"
            scale={0.6}
            speed={0.7}
            rotationSpeed={0.6}
          />
        </Canvas>
      </div>
      <style>{`
        .animated-bg-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: -1;
          pointer-events: none;
          overflow: hidden;
        }

        .animated-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(-45deg, #09090b, #18181b, #111827, #030712);
          background-size: 400% 400%;
          animation: gradientBG 20s ease infinite;
        }

        body:not(.dark-mode) .animated-bg {
          background: linear-gradient(-45deg, #f0f9ff, #fdf4ff, #fae8ff, #f0fdf4);
          background-size: 400% 400%;
        }

        @keyframes gradientBG {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .canvas-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.75;
        }
      `}</style>
    </div>
  );
}
