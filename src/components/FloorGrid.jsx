import { Grid } from '@react-three/drei'

export default function FloorGrid() {
  return (
    <>
      {/* Shadow-receiving floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <shadowMaterial opacity={0.25} />
      </mesh>

      {/* Grid */}
      <Grid
        position={[0, 0.001, 0]}
        args={[400, 400]}
        cellSize={2}
        cellThickness={0.6}
        cellColor="#4a5e72"
        sectionSize={20}
        sectionThickness={1.2}
        sectionColor="#6b8299"
        fadeDistance={200}
        fadeStrength={1.2}
        followCamera={false}
        infiniteGrid={false}
      />
    </>
  )
}
