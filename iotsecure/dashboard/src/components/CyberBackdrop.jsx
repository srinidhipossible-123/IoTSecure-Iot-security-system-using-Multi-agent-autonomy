import { memo, Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Stars } from '@react-three/drei';
import * as THREE from 'three';

function RotatingLattice() {
  const group = useRef(null);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.11;
    group.current.rotation.x += delta * 0.04;
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[2.4, 1]} />
        <meshBasicMaterial
          color="#22d3ee"
          wireframe
          transparent
          opacity={0.14}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[1.05, 0.35, 0.2]}>
        <torusGeometry args={[4.4, 0.018, 10, 160]} />
        <meshBasicMaterial
          color="#818cf8"
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[0.15, 2.2, 0.45]}>
        <torusGeometry args={[5.9, 0.012, 8, 120]} />
        <meshBasicMaterial
          color="#06b6d4"
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0.6, 0]}>
        <torusGeometry args={[7.8, 0.01, 6, 220]} />
        <meshBasicMaterial
          color="#c084fc"
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function SubtleBloomPlane() {
  const meshRef = useRef(null);
  useFrame(({ clock }) => {
    if (!meshRef.current?.material) return;
    const t = clock.getElapsedTime();
    meshRef.current.material.opacity = 0.12 + Math.sin(t * 0.4) * 0.04;
  });
  return (
    <mesh ref={meshRef} position={[0, -5, -8]} rotation={[-Math.PI / 3.4, 0, 0]}>
      <planeGeometry args={[48, 32, 1, 1]} />
      <meshBasicMaterial color="#0891b2" transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <fog attach="fog" args={['#030712', 14, 38]} />
      <Stars radius={72} depth={48} count={2600} factor={3} saturation={0} fade speed={0.35} />
      <ambientLight intensity={0.06} />
      <pointLight position={[10, 6, 8]} intensity={8} color="#67e8f9" distance={42} decay={2} />
      <pointLight position={[-14, -4, 4]} intensity={6} color="#a78bfa" distance={40} decay={2} />
      <Float speed={1.35} rotationIntensity={0.25} floatIntensity={0.5}>
        <RotatingLattice />
      </Float>
      <Sparkles
        count={280}
        scale={[28, 16, 10]}
        size={2.8}
        speed={0.18}
        opacity={0.5}
        color="#67e8f9"
        position={[0, 0.8, -1]}
      />
      <Sparkles
        count={120}
        scale={[22, 12, 8]}
        size={4}
        speed={0.12}
        opacity={0.25}
        color="#c084fc"
        position={[-6, -1, 1]}
      />
      <SubtleBloomPlane />
    </>
  );
}

/**
 * Fixed full-screen 3D field — cinematic depth without stealing pointer events.
 * Respects prefers-reduced-motion (no WebGL layer).
 */
const CyberBackdrop = memo(function CyberBackdrop() {
  const [off, setOff] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setOff(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  if (off) return null;

  return (
    <div className="cyber-backdrop-shell" aria-hidden>
      <Canvas
        className="absolute inset-0 h-full w-full"
        camera={{ position: [0, 1.8, 16], fov: 42 }}
        dpr={[1, 2]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          stencil: false,
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <div className="cyber-backdrop-overlay" />
    </div>
  );
});

export default CyberBackdrop;
