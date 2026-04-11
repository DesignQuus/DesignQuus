import { useMemo } from 'react'
import * as THREE from 'three'

// Drei의 <Grid>는 fragment shader 방식으로 fwidth() 안티앨리어싱이 적용되어
// 직교 카메라에서 선이 흐릿하게 보임.
// THREE.GridHelper 기반 lineSegments를 사용하면 실제 라인 지오메트리로
// 정확히 1px 선명한 선이 렌더링됨.

function SharpGrid({ size, divisions, color, yOffset }) {
  const geo = useMemo(() => {
    // GridHelper 생성 후 geometry만 추출 (material은 새로 지정)
    const helper = new THREE.GridHelper(size, divisions)
    return helper.geometry
  }, [size, divisions])

  return (
    <lineSegments geometry={geo} position={[0, yOffset, 0]}>
      {/* vertexColors: false → material color만 사용, vertex color 무시 */}
      <lineBasicMaterial color={color} vertexColors={false} />
    </lineSegments>
  )
}

export default function FloorGrid() {
  return (
    <>
      {/* Shadow-receiving floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <shadowMaterial opacity={0.25} />
      </mesh>

      {/* 가는선 그리드: 2unit 간격, 200 divisions */}
      <SharpGrid
        size={400}
        divisions={200}
        color="#3d5670"
        yOffset={0.001}
      />

      {/* 굵은선 그리드: 20unit 간격, 20 divisions — 가는선 위에 렌더링 */}
      <SharpGrid
        size={400}
        divisions={20}
        color="#7aaecc"
        yOffset={0.002}
      />
    </>
  )
}
