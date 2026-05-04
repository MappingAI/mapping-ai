/**
 * Creates an OG-sized (1200x630) hero image for insights page
 * Usage: node scripts/create-insights-og.cjs
 */

const { createCanvas, loadImage } = require('canvas')
const fs = require('fs')
const path = require('path')

const IMAGES_DIR = path.join(__dirname, '../deployment/images')
const OUTPUT_PATH = path.join(__dirname, '../public/images/og-image-insights.png')

const CHART_FILES = [
  'insights-agi-defs.png',
  'insights-outliers-2d-bottom.png',
  'insights-horseshoe.png',
  'insights-funding-sankey.png',
]

async function createOgImage() {
  const images = await Promise.all(
    CHART_FILES.map(async (file) => {
      const imgPath = path.join(IMAGES_DIR, file)
      if (!fs.existsSync(imgPath)) return null
      return loadImage(imgPath)
    })
  )
  const validImages = images.filter(Boolean)

  // OG image standard size: 1200x630, render at 2x for sharpness
  const scale = 2
  const W = 1200
  const H = 630

  const canvas = createCanvas(W * scale, H * scale)
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  // Background - tan/cream like insights page
  ctx.fillStyle = '#f8f7f5'
  ctx.fillRect(0, 0, W, H)

  // Use same layout as insights-overview.png but with less outer cropping
  // to fit the wider 1200x630 aspect ratio
  const fullW = 1000
  const cropLeft = 0    // no crop - we want it wider
  const cropRight = 0
  const contentW = fullW - cropLeft - cropRight  // 1000
  const cellW = fullW / 2  // 500
  const cellH = H / 2      // 315

  // Center the content horizontally in the wider canvas
  const offsetX = (W - contentW) / 2  // center the 1000px content in 1200px

  // Overlap columns to close gap (same as original)
  const overlap = 100

  if (validImages.length >= 4) {
    for (let i = 0; i < 4; i++) {
      const img = validImages[i]
      const col = i % 2
      const row = Math.floor(i / 2)

      // Same positioning logic as original
      const xShift = col === 0 ? overlap : -overlap
      const x = col * cellW + xShift - cropLeft + offsetX
      const y = row * cellH

      // Scale to fit (not crop vertically)
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

  // Semi-transparent overlay - shifted left to overlap bottom-right chart
  ctx.fillStyle = 'rgba(248, 247, 245, 0.9)'
  ctx.beginPath()
  ctx.roundRect(W - 420, H - 100, 295, 85, 8)
  ctx.fill()

  // "Research Insights" - italic serif
  ctx.fillStyle = '#1a1a1a'
  ctx.font = "italic 30px Georgia, 'Times New Roman', serif"
  ctx.fillText('Research Insights', W - 400, H - 55)

  // URL - monospace
  ctx.fillStyle = '#555'
  ctx.font = "15px 'Courier New', monospace"
  ctx.fillText('mapping-ai.org/insights', W - 400, H - 28)

  // Save
  const buffer = canvas.toBuffer('image/png')
  fs.writeFileSync(OUTPUT_PATH, buffer)
  console.log(`OG image saved to: ${OUTPUT_PATH}`)
  console.log(`Dimensions: ${W * scale}x${H * scale} (${W}x${H} @2x)`)
}

createOgImage().catch(console.error)
