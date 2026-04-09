import { useRef, useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import AnglePost from './parts/AnglePost.jsx'
import ShelfBoard from './parts/ShelfBoard.jsx'
import LevelFoot from './parts/LevelFoot.jsx'
import Caster from './parts/Caster.jsx'
import DimensionLabel from './DimensionLabel.jsx'
import useShelfStore from '../store/useShelfStore.js'

const PITCH_MM = 27.5

export default function ShelfModel() {
  const {
    width, height, depth,
    shelfCount, shelfPositions,
    feetType, renderMode,
    selectedShelfIdx, setSelectedShelfIdx,
    setShelfPosition,
    mode,
  } = useShelfStore()

  // Corner post positions [x, z] in mm (centered on origin)
  const halfW = width / 2
  const halfD = depth / 2
  const POST_OFFSET = 20 // 20mm inset from edge
  const corners = [
    [-halfW + POST_OFFSET, -halfD + POST_OFFSET],
    [ halfW - POST_OFFSET, -halfD + POST_OFFSET],
    [-halfW + POST_OFFSET,  halfD - POST_OFFSET],
    [ halfW - POST_OFFSET,  halfD - POST_OFFSET],
  ]

  // Board Y positions (mm from floor)
  const BOARD_THICK = 25
  const bottomY = 100  // bottom board at 100mm (above feet)
  const topY = height - BOARD_THICK

  // Middle shelf Y positions from pitch index
  const middleYs = shelfPositions.map(idx => bottomY + BOARD_THICK + idx * PITCH_MM)

  // Sorted Y positions for dimension labels
  const allYs = [bottomY, ...middleYs, topY].sort((a, b) => a - b)

  // Feet corner positions
  const footCorners = [
    [-halfW + POST_OFFSET, -halfD + POST_OFFSET],
    [ halfW - POST_OFFSET, -halfD + POST_OFFSET],
    [-halfW + POST_OFFSET,  halfD - POST_OFFSET],
    [ halfW - POST_OFFSET,  halfD - POST_OFFSET],
  ]

  return (
    <group>
      {/* Angle posts */}
      {corners.map((pos, i) => (
        <AnglePost
          key={i}
          heightMm={height}
          positionMm={pos}
          renderMode={renderMode}
        />
      ))}

      {/* Bottom board */}
      <ShelfBoard
        widthMm={width}
        depthMm={depth}
        yMm={bottomY}
        type="bottom"
        renderMode={renderMode}
      />

      {/* Top board */}
      <ShelfBoard
        widthMm={width}
        depthMm={depth}
        yMm={topY}
        type="top"
        renderMode={renderMode}
      />

      {/* Middle shelf boards */}
      {middleYs.map((yMm, i) => (
        <ShelfBoard
          key={i}
          widthMm={width}
          depthMm={depth}
          yMm={yMm}
          type="middle"
          selected={selectedShelfIdx === i}
          renderMode={renderMode}
          onClick={() => setSelectedShelfIdx(selectedShelfIdx === i ? -1 : i)}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'auto' }}
        />
      ))}

      {/* Feet */}
      {footCorners.map((pos, i) => (
        feetType === 'level'
          ? <LevelFoot key={i} positionMm={pos} renderMode={renderMode} />
          : <Caster key={i} positionMm={pos} renderMode={renderMode} />
      ))}

      {/* Dimension labels */}
      {allYs.map((y, i) => {
        if (i === 0) return null
        return (
          <DimensionLabel
            key={i}
            yBottomMm={allYs[i - 1]}
            yTopMm={y}
            widthMm={width}
            depthMm={depth}
          />
        )
      })}

      {/* Mode-specific extras */}
      {mode === 'dressroom' && (
        <DressroomExtras widthMm={width} depthMm={depth} heightMm={height} renderMode={renderMode} />
      )}
    </group>
  )
}

function DressroomExtras({ widthMm, depthMm, heightMm, renderMode }) {
  const { hangerHeight } = useShelfStore()
  const SCALE = 1 / 100
  const w = (widthMm - 80) * SCALE
  const y = hangerHeight * SCALE
  return (
    <mesh position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.015, 0.015, w, 16]} />
      <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
    </mesh>
  )
}
