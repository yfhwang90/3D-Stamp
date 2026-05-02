function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load stamp texture for imprint'))
    image.src = src
  })
}

export async function createInkImprintTexture(stampFaceDataUrl: string): Promise<string> {
  const sourceImage = await loadImage(stampFaceDataUrl)

  const size = 512
  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = size
  sourceCanvas.height = size
  const sourceContext = sourceCanvas.getContext('2d')
  if (!sourceContext) {
    throw new Error('Could not create source canvas context')
  }

  sourceContext.drawImage(sourceImage, 0, 0, size, size)
  const sourcePixels = sourceContext.getImageData(0, 0, size, size)
  const data = sourcePixels.data
  const center = size / 2
  const radius = size * 0.46

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const pixelIndex = i / 4
    const x = pixelIndex % size
    const y = Math.floor(pixelIndex / size)

    const dx = x - center
    const dy = y - center
    const distance = Math.sqrt(dx * dx + dy * dy)
    const radialFalloff = Math.max(0, 1 - Math.pow(distance / radius, 2.35))

    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    const inkPresence = Math.max(0, 1 - luminance)
    const grain = 0.94 + Math.random() * 0.14
    const edgeNoise = 0.97 + Math.random() * 0.08
    const boostedPresence = Math.min(1, inkPresence * 1.18 + 0.06)
    const alpha = Math.min(
      255,
      Math.floor(255 * boostedPresence * radialFalloff * grain * edgeNoise * 1.12),
    )

    data[i] = 255
    data[i + 1] = 255
    data[i + 2] = 255
    data[i + 3] = alpha
  }

  sourceContext.putImageData(sourcePixels, 0, 0)

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = size
  outputCanvas.height = size
  const outputContext = outputCanvas.getContext('2d')
  if (!outputContext) {
    throw new Error('Could not create output canvas context')
  }

  outputContext.clearRect(0, 0, size, size)
  outputContext.filter = 'blur(0.35px) contrast(1.32)'
  outputContext.globalAlpha = 1
  outputContext.drawImage(sourceCanvas, 0, 0)
  outputContext.filter = 'none'

  return outputCanvas.toDataURL('image/png')
}
