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
        args={[80, 80]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#b0b8c4"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#6e7d90"
        fadeDistance={60}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />
    </>
  )
}
