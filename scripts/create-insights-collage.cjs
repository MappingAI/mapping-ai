/**
 * Creates a hero image for insights page
 * Usage: node scripts/create-insights-collage.cjs
 */

const { createCanvas, loadImage } = require('canvas')
const fs = require('fs')
const path = require('path')

const IMAGES_DIR = path.join(__dirname, '../deployment/images')
const OUTPUT_PATH = path.join(IMAGES_DIR, 'insights-overview.png')

const CHART_FILES = [
  'insights-agi-defs.png',
  'insights-outliers-2d-bottom.png',
  'insights-horseshoe.png',
  'insights-funding-sankey.png',
]

async function createHeroImage() {
  const images = await Promise.all(
    CHART_FILES.map(async (file) => {
      const imgPath = path.join(IMAGES_DIR, file)
      if (!fs.existsSync(imgPath)) return null
      return loadImage(imgPath)
    })
  )
  const validImages = images.filter(Boolean)

  // Tight canvas - crop whitespace from left and right edges
  const cropLeft = 130   // pixels to crop from left
  const cropRight = 130  // pixels to crop from right
  const fullW = 1000
  const W = fullW - cropLeft - cropRight  // actual canvas width
  const H = 630
  const cellW = fullW / 2
  const cellH = H / 2

  // Render at 2x for sharper text
  const scale = 2
  const canvas = createCanvas(W * scale, H * scale)
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  // Background - tan/cream like insights page
  ctx.fillStyle = '#f8f7f5'
  ctx.fillRect(0, 0, W, H)

  // Draw 2x2 chart grid - overlap columns to close gap
  const overlap = 100  // pixels to shift columns toward center
  if (validImages.length >= 4) {
    for (let i = 0; i < 4; i++) {
      const img = validImages[i]
      const col = i % 2
      const row = Math.floor(i / 2)

      // Shift: left col moves right, right col moves left
      const xShift = col === 0 ? overlap : -overlap
      const x = col * cellW + xShift - cropLeft  // offset by crop amount
      const y = row * cellH

      // Scale to fit (not crop)
      const imgAspect = img.width / img.height
      const cellAspect = cellW / cellH
      let dw, dh, dx, dy
      if (imgAspect > cellAspect) {
        dw = cellW
        dh = dw / imgAspect
        dx = x
        dy = y + (cellH - dh) / 2
      } else {
        dh = cellH
        dw = dh * imgAspect
        dx = x + (cellW - dw) / 2
        dy = y
      }
      ctx.drawImage(img, dx, dy, dw, dh)
    }
  }

  // Semi-transparent overlay on bottom right for text
  ctx.fillStyle = 'rgba(248, 247, 245, 0.88)'
  ctx.beginPath()
  ctx.roundRect(W - 290, H - 95, 275, 80, 8)
  ctx.fill()

  // "Research Insights" - italic serif like EB Garamond
  ctx.fillStyle = '#1a1a1a'
  ctx.font = "italic 28px Georgia, 'Times New Roman', serif"
  ctx.fillText('Research Insights', W - 270, H - 52)

  // URL - monospace like DM Mono
  ctx.fillStyle = '#555'
  ctx.font = "14px 'Courier New', monospace"
  ctx.fillText('mapping-ai.org/insights', W - 270, H - 28)

  // Save
  const buffer = canvas.toBuffer('image/png')
  fs.writeFileSync(OUTPUT_PATH, buffer)
  console.log(`Hero image saved to: ${OUTPUT_PATH}`)
  console.log(`Dimensions: ${W}x${H}`)
}

createHeroImage().catch(console.error)
