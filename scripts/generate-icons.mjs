import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const publicDir = resolve(rootDir, 'public')

// Read the SVG file
const svgPath = resolve(publicDir, 'favicon.svg')
const svgBuffer = readFileSync(svgPath)

// Icon sizes to generate
const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

async function generateIcons() {
  console.log('Generating PWA icons...')

  for (const { name, size } of sizes) {
    const outputPath = resolve(publicDir, name)
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath)
    console.log(`Created: ${name} (${size}x${size})`)
  }

  console.log('Done!')
}

generateIcons().catch(console.error)
