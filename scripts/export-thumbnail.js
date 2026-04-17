import puppeteer from 'puppeteer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function exportThumbnail() {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  // Set viewport to exact thumbnail dimensions
  await page.setViewport({
    width: 1200,
    height: 630,
    deviceScaleFactor: 2, // 2x for retina quality
  })

  // Load the HTML file
  const htmlPath = path.join(__dirname, '../assets/images/thumbnail.html')
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' })

  // Wait for fonts to load
  await page.evaluateHandle('document.fonts.ready')

  // Screenshot the .thumbnail element
  const element = await page.$('.thumbnail')
  await element.screenshot({
    path: path.join(__dirname, '../assets/images/thumbnail.png'),
    type: 'png',
  })

  console.log('Exported to assets/images/thumbnail.png (2400x1260 @2x retina)')

  await browser.close()
}

exportThumbnail().catch(console.error)
