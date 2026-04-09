import { useRef } from 'react'
import { Grid } from '@react-three/drei'

export default function FloorGrid() {
  return (
    <>
      {/* Shadow-receiving floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial opacity={0.25} />
      </mesh>

      {/* Grid */}
      <Grid
        position={[0, 0.001, 0]}
        args={[40, 40]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={8}
        sectionThickness={1}
        sectionColor="#9ca3af"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />
    </>
  )
}
