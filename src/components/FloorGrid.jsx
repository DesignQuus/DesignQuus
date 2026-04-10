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
        args={[100, 100]}
        cellSize={2}
        cellThickness={0.4}
        cellColor="#c0c8d0"
        sectionSize={20}
        sectionThickness={1}
        sectionColor="#7e8fa0"
        fadeDistance={80}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />
    </>
  )
}
