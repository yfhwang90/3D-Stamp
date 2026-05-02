const OUTPUT_SIZE = 640

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load uploaded image'))
    image.src = src
  })
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read uploaded file'))
    reader.readAsDataURL(file)
  })
}

export async function createStampFaceTexture(file: File): Promise<string> {
  const src = await readFileAsDataUrl(file)
  const image = await loadImage(src)

  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not create canvas context')
  }

  context.fillStyle = '#eadfce'
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

  const innerPadding = 42
  const drawSize = OUTPUT_SIZE - innerPadding * 2
  const srcRatio = image.width / image.height
  let srcWidth = image.width
  let srcHeight = image.height
  let srcX = 0
  let srcY = 0

  // Crop to fill a square stamp area while keeping the focal center.
  if (srcRatio > 1) {
    srcWidth = image.height
    srcX = (image.width - srcWidth) / 2
  } else if (srcRatio < 1) {
    srcHeight = image.width
    srcY = (image.height - srcHeight) / 2
  }

  context.save()
  drawRoundedRect(context, innerPadding, innerPadding, drawSize, drawSize, 28)
  context.clip()
  context.drawImage(image, srcX, srcY, srcWidth, srcHeight, innerPadding, innerPadding, drawSize, drawSize)
  context.restore()

  context.globalAlpha = 0.18
  context.fillStyle = '#f4e9db'
  context.fillRect(innerPadding, innerPadding, drawSize, drawSize)
  context.globalAlpha = 1

  context.strokeStyle = '#7a4b3d'
  context.lineWidth = 10
  drawRoundedRect(context, innerPadding, innerPadding, drawSize, drawSize, 28)
  context.stroke()

  context.strokeStyle = '#b68975'
  context.lineWidth = 3
  drawRoundedRect(context, innerPadding + 18, innerPadding + 18, drawSize - 36, drawSize - 36, 20)
  context.stroke()

  return canvas.toDataURL('image/png')
}

export function createDefaultStampFaceTexture(): string {
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const context = canvas.getContext('2d')
  if (!context) {
    return ''
  }

  context.fillStyle = '#eadfce'
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

  drawRoundedRect(context, 42, 42, OUTPUT_SIZE - 84, OUTPUT_SIZE - 84, 28)
  context.strokeStyle = '#7a4b3d'
  context.lineWidth = 10
  context.stroke()

  context.fillStyle = '#7a4b3d'
  context.font = 'bold 88px Georgia'
  context.textAlign = 'center'
  context.fillText('STAMP', OUTPUT_SIZE / 2, OUTPUT_SIZE / 2 - 10)

  context.fillStyle = '#9d7565'
  context.font = '36px Georgia'
  context.fillText('Postcard Studio', OUTPUT_SIZE / 2, OUTPUT_SIZE / 2 + 48)

  return canvas.toDataURL('image/png')
}
