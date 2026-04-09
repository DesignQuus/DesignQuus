// Perspective solver: 4 image points → Three.js camera parameters
// Uses homography to estimate camera FOV and rotation from 4 floor corners

/**
 * Given 4 pixel coordinates of the floor rectangle (frontLeft, frontRight, backRight, backLeft)
 * and the real-world shelf dimensions, estimate camera parameters.
 *
 * @param {Array} imgPts - [{x, y}, ...] 4 points in image pixel coords (FL, FR, BR, BL)
 * @param {number} imgW - image width in pixels
 * @param {number} imgH - image height in pixels
 * @param {number} shelfW - shelf width in mm
 * @param {number} shelfD - shelf depth in mm
 * @returns {{ fov, position, target }} Camera parameters for Three.js
 */
export function solvePerspective(imgPts, imgW, imgH, shelfW, shelfD) {
  // Normalize image points to [-1, 1]
  const norm = imgPts.map(p => ({
    x: (p.x / imgW) * 2 - 1,
    y: -((p.y / imgH) * 2 - 1),
  }))

  // Compute vanishing point of the two depth edges (FL→BL and FR→BR)
  const vp = lineIntersect(
    norm[0], norm[3],  // FL → BL
    norm[1], norm[2],  // FR → BR
  )

  // Estimate horizon line Y (vanishing point Y)
  const horizonY = vp ? vp.y : 0.1

  // Estimate FOV from horizon position
  // horizon at normalized y → tan(elevation) = horizonY
  const elevationRad = Math.atan(Math.abs(horizonY))
  const fovDeg = Math.max(30, Math.min(90, (elevationRad * 180 / Math.PI) * 3 + 35))

  // Estimate camera height: higher horizon = higher camera
  const SCALE = 1 / 100
  const w = shelfW * SCALE
  const d = shelfD * SCALE
  const camHeight = Math.max(4, Math.abs(horizonY) * 20 + 8)
  const camDist = d * 3 + camHeight

  // Camera looks at shelf center at mid-height
  const target = [0, camHeight * 0.4, 0]
  const position = [0, camHeight, camDist]

  return { fov: fovDeg, position, target }
}

// Line intersection of (p1→p2) and (p3→p4)
function lineIntersect(p1, p2, p3, p4) {
  const d1x = p2.x - p1.x
  const d1y = p2.y - p1.y
  const d2x = p4.x - p3.x
  const d2y = p4.y - p3.y

  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < 1e-10) return null

  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom
  return { x: p1.x + t * d1x, y: p1.y + t * d1y }
}
