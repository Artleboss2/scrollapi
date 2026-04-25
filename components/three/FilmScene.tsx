"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

function FilmStrip({ scrollProgress }: { scrollProgress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const frameCount = 24;

  const frames = useMemo(() => {
    return Array.from({ length: frameCount }, (_, i) => ({
      id: i,
      color: new THREE.Color().setHSL(0.07 + i * 0.005, 0.2, 0.12 + i * 0.01),
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.15 + scrollProgress * 0.4;
    groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.08;
    groupRef.current.position.y = Math.sin(t * 0.4) * 0.1;
  });

  return (
    <group ref={groupRef}>
      {frames.map((frame, i) => {
        const x = (i - frameCount / 2) * 1.25;
        const wave = Math.sin(i * 0.4 + Date.now() * 0.0005) * 0.3;
        return (
          <group key={frame.id} position={[x, wave, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1.1, 0.8, 0.04]} />
              <meshStandardMaterial
                color={frame.color}
                roughness={0.3}
                metalness={0.6}
              />
            </mesh>
            <mesh position={[0, 0, 0.021]}>
              <boxGeometry args={[0.85, 0.55, 0.001]} />
              <meshStandardMaterial
                color={new THREE.Color(0.05, 0.04, 0.04)}
                roughness={0.9}
                metalness={0.0}
              />
            </mesh>
            <mesh position={[-0.42, 0.32, 0.021]}>
              <circleGeometry args={[0.06, 16]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[0.42, 0.32, 0.021]}>
              <circleGeometry args={[0.06, 16]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[-0.42, -0.32, 0.021]}>
              <circleGeometry args={[0.06, 16]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[0.42, -0.32, 0.021]}>
              <circleGeometry args={[0.06, 16]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
          </group>
        );
      })}

      <mesh position={[0, -0.52, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[frameCount * 1.25 + 0.2, 0.12, 0.035]} />
        <meshStandardMaterial color="#111113" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[frameCount * 1.25 + 0.2, 0.12, 0.035]} />
        <meshStandardMaterial color="#111113" roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  );
}

function AnimatedFilmReel({ scrollProgress }: { scrollProgress: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.z = t * 0.5 + scrollProgress * Math.PI * 2;
  });

  const spokes = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2,
    }));
  }, []);

  return (
    <group position={[8, 1.5, -2]}>
      <mesh ref={meshRef} castShadow>
        <torusGeometry args={[1.4, 0.08, 16, 80]} />
        <meshStandardMaterial color="#222226" roughness={0.2} metalness={0.9} />
      </mesh>
      <mesh castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.18, 32]} />
        <meshStandardMaterial color="#C8A96E" roughness={0.3} metalness={0.8} />
      </mesh>
      {spokes.map((spoke, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(spoke.angle) * 0.7,
            Math.sin(spoke.angle) * 0.7,
            0,
          ]}
          rotation={[0, 0, spoke.angle]}
        >
          <boxGeometry args={[1.2, 0.06, 0.06]} />
          <meshStandardMaterial color="#1a1a1e" roughness={0.4} metalness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function CameraRig({ scrollProgress }: { scrollProgress: number }) {
  const { camera } = useThree();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    camera.position.x = Math.sin(t * 0.15) * 2;
    camera.position.y = Math.cos(t * 0.1) * 0.5 + scrollProgress * -2;
    camera.position.z = 14 - scrollProgress * 4;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function FilmScene({
  scrollProgress = 0,
}: {
  scrollProgress?: number;
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0, 14], fov: 55 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        color="#F2EFE8"
      />
      <pointLight position={[-8, 4, 4]} intensity={1.5} color="#C8A96E" />
      <pointLight position={[8, -4, 2]} intensity={0.8} color="#3a3a6e" />
      <spotLight
        position={[0, 12, 0]}
        intensity={1.2}
        angle={0.6}
        penumbra={0.8}
        castShadow
        color="#F2EFE8"
      />
      <FilmStrip scrollProgress={scrollProgress} />
      <AnimatedFilmReel scrollProgress={scrollProgress} />
      <CameraRig scrollProgress={scrollProgress} />
    </Canvas>
  );
}
