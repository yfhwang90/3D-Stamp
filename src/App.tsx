import { useEffect, useRef, useState } from 'react'
import { ControlPanel } from './components/ControlPanel'
import type { StylePreset } from './components/ControlPanel'
import { Stage3D } from './components/Stage3D'
import type { StampMark } from './types/stamp'
import { createInkImprintTexture } from './utils/imprintTexture'
import {
  createDefaultStampFaceTexture,
  createStampFaceTexture,
} from './utils/stampFaceTexture'

const STYLE_PRESETS: Array<
  StylePreset & { stampBodyColor: string; stampGripColor: string; messageColor: string }
> = [
  {
    id: 'warm-sepia',
    label: 'Warm Sepia',
    postcardColor: '#f6e9d8',
    inkColor: '#7b3d30',
    stampBodyColor: '#7a4b3d',
    stampGripColor: '#c79c6e',
    messageColor: '#493126',
  },
  {
    id: 'faded-blue',
    label: 'Faded Blue',
    postcardColor: '#dde6eb',
    inkColor: '#526c7b',
    stampBodyColor: '#4f646f',
    stampGripColor: '#b7c5cd',
    messageColor: '#33434e',
  },
  {
    id: 'crimson-postcard',
    label: 'Crimson Postcard',
    postcardColor: '#f2dfd7',
    inkColor: '#8d3b3f',
    stampBodyColor: '#7a363c',
    stampGripColor: '#c49681',
    messageColor: '#512327',
  },
]

function App() {
  const [inkColor, setInkColor] = useState(STYLE_PRESETS[0].inkColor)
  const [postcardColor, setPostcardColor] = useState(STYLE_PRESETS[0].postcardColor)
  const [stampBodyColor, setStampBodyColor] = useState(STYLE_PRESETS[0].stampBodyColor)
  const [stampGripColor, setStampGripColor] = useState(STYLE_PRESETS[0].stampGripColor)
  const [messageColor, setMessageColor] = useState(STYLE_PRESETS[0].messageColor)
  const [activePresetId, setActivePresetId] = useState<string | null>(STYLE_PRESETS[0].id)
  const [stampScale, setStampScale] = useState(1)
  const [message, setMessage] = useState('Greetings from the studio!')
  const [marks, setMarks] = useState<StampMark[]>([])
  const [stampFaceTexture, setStampFaceTexture] = useState(() => createDefaultStampFaceTexture())
  const [stampImageName, setStampImageName] = useState<string | null>(null)
  const [imprintTexture, setImprintTexture] = useState(stampFaceTexture)
  const [isDownloading, setIsDownloading] = useState(false)
  const sceneCaptureRef = useRef<(() => string | null) | null>(null)

  const handleStamp = async (x: number, y: number) => {
    const faceSnapshot = stampFaceTexture
    const inkSnapshot = inkColor
    const scaleSnapshot = stampScale
    try {
      const imprintSnapshot = await createInkImprintTexture(faceSnapshot)
      setMarks((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          x,
          y,
          rotation: (Math.random() - 0.5) * 0.6,
          scale: (0.98 + Math.random() * 0.28) * scaleSnapshot,
          opacity: 0.66 + Math.random() * 0.14,
          imprintTextureUrl: imprintSnapshot,
          inkColor: inkSnapshot,
        },
      ])
    } catch (error) {
      console.error(error)
    }
  }

  const undoLastStamp = () => {
    setMarks((current) => (current.length === 0 ? current : current.slice(0, -1)))
  }

  const clearStudio = () => {
    setMarks([])
    setMessage('')
  }

  const handleUploadImage = async (file: File) => {
    try {
      const textureDataUrl = await createStampFaceTexture(file)
      setStampFaceTexture(textureDataUrl)
      setStampImageName(file.name)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    let cancelled = false

    const generateImprintTexture = async () => {
      try {
        const textureDataUrl = await createInkImprintTexture(stampFaceTexture)
        if (!cancelled) {
          setImprintTexture(textureDataUrl)
        }
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setImprintTexture(stampFaceTexture)
        }
      }
    }

    generateImprintTexture()
    return () => {
      cancelled = true
    }
  }, [stampFaceTexture])

  const handleDownload = () => {
    setIsDownloading(true)
    requestAnimationFrame(() => {
      try {
        const dataUrl = sceneCaptureRef.current?.()
        if (!dataUrl) {
          return
        }
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `postcard-stamp-${Date.now()}.png`
        link.click()
      } catch (error) {
        console.error(error)
      } finally {
        setIsDownloading(false)
      }
    })
  }

  const handleApplyPreset = (presetId: string) => {
    const preset = STYLE_PRESETS.find((item) => item.id === presetId)
    if (!preset) {
      return
    }
    setPostcardColor(preset.postcardColor)
    setInkColor(preset.inkColor)
    setStampBodyColor(preset.stampBodyColor)
    setStampGripColor(preset.stampGripColor)
    setMessageColor(preset.messageColor)
    setActivePresetId(preset.id)
  }

  const handlePostcardColorChange = (value: string) => {
    setPostcardColor(value)
    setActivePresetId(null)
  }

  const handleInkColorChange = (value: string) => {
    setInkColor(value)
    setActivePresetId(null)
  }

  return (
    <main className="app-shell overflow-x-hidden overflow-y-auto">
      <section className="app-layout mx-auto grid auto-rows-auto">
        <Stage3D
          postcardColor={postcardColor}
          inkColor={inkColor}
          message={message}
          messageColor={messageColor}
          stampBodyColor={stampBodyColor}
          stampGripColor={stampGripColor}
          stampScale={stampScale}
          stampFaceTexture={stampFaceTexture}
          imprintTexture={imprintTexture}
          marks={marks}
          onStamp={handleStamp}
          captureRef={sceneCaptureRef}
        />

        <ControlPanel
          className="panel-shell"
          inkColor={inkColor}
          postcardColor={postcardColor}
          message={message}
          stampScale={stampScale}
          stampImageName={stampImageName}
          presets={STYLE_PRESETS}
          activePresetId={activePresetId}
          onInkColorChange={handleInkColorChange}
          onPostcardColorChange={handlePostcardColorChange}
          onMessageChange={setMessage}
          onStampScaleChange={setStampScale}
          onUploadImage={handleUploadImage}
          onApplyPreset={handleApplyPreset}
          onClear={clearStudio}
          onUndo={undoLastStamp}
          canUndo={marks.length > 0}
          onDownload={handleDownload}
          isDownloading={isDownloading}
        />
      </section>
    </main>
  )
}

export default App
