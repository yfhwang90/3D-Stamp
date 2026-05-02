import { motion } from 'framer-motion'
import type { ChangeEvent } from 'react'

export type StylePreset = {
  id: string
  label: string
  postcardColor: string
  inkColor: string
}

type ControlPanelProps = {
  inkColor: string
  postcardColor: string
  message: string
  stampScale: number
  stampImageName: string | null
  presets: StylePreset[]
  activePresetId: string | null
  onInkColorChange: (value: string) => void
  onPostcardColorChange: (value: string) => void
  onMessageChange: (value: string) => void
  onStampScaleChange: (value: number) => void
  onUploadImage: (file: File) => void
  onApplyPreset: (presetId: string) => void
  onClear: () => void
  onUndo: () => void
  canUndo: boolean
  onDownload: () => void
  isDownloading: boolean
}

export function ControlPanel({
  inkColor,
  postcardColor,
  message,
  stampScale,
  stampImageName,
  presets,
  activePresetId,
  onInkColorChange,
  onPostcardColorChange,
  onMessageChange,
  onStampScaleChange,
  onUploadImage,
  onApplyPreset,
  onClear,
  onUndo,
  canUndo,
  onDownload,
  isDownloading,
}: ControlPanelProps) {
  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    onUploadImage(file)
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto rounded-[24px] border border-[#dbcab4] bg-[#f5ecdf]/90 p-4 shadow-panel backdrop-blur-sm md:p-5"
    >
      <div className="space-y-1">
        <h1 className="font-display text-3xl tracking-tight text-[#4d2f2a] md:text-[2rem]">
          Postcard Stamp Studio
        </h1>
        <p className="font-body text-sm text-[#765949]">
          A tactile little space for vintage postcard play.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="font-display text-sm uppercase tracking-[0.14em] text-[#7b5f50]">
          Upload Artwork
        </span>
        <div className="rounded-2xl border border-dashed border-[#c2ac95] bg-[#fdf8f0] px-4 py-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="block w-full text-sm text-[#8a6d5d] file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#e9d6c0] file:px-3 file:py-2 file:font-semibold file:text-[#5e4336] hover:file:bg-[#ddc3a6]"
          />
          <p className="mt-2 text-xs text-[#8a6d5d]">
            {stampImageName ? `Loaded: ${stampImageName}` : 'No upload yet. Using default stamp face.'}
          </p>
        </div>
      </label>

      <div className="space-y-2">
        <span className="font-display text-sm uppercase tracking-[0.14em] text-[#7b5f50]">
          Style Moods
        </span>
        <div className="grid grid-cols-1 gap-2">
          {presets.map((preset) => {
            const isActive = preset.id === activePresetId
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset(preset.id)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                  isActive
                    ? 'border-[#8f5d4f] bg-[#e9d8c2] shadow-sm'
                    : 'border-[#d5bea6] bg-[#f9f1e5] hover:bg-[#f1e4d3]'
                }`}
              >
                <span className="font-display text-sm text-[#5e4336]">{preset.label}</span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-[#ffffff99]"
                    style={{ backgroundColor: preset.postcardColor }}
                  />
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-[#ffffff99]"
                    style={{ backgroundColor: preset.inkColor }}
                  />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="font-display text-sm uppercase tracking-[0.14em] text-[#7b5f50]">
            Ink Color
          </span>
          <input
            type="color"
            value={inkColor}
            onChange={(event) => onInkColorChange(event.target.value)}
            className="h-11 w-full cursor-pointer rounded-xl border border-[#ccb49c] bg-[#f7efe4] p-1"
          />
        </label>
        <label className="space-y-2">
          <span className="font-display text-sm uppercase tracking-[0.14em] text-[#7b5f50]">
            Card Color
          </span>
          <input
            type="color"
            value={postcardColor}
            onChange={(event) => onPostcardColorChange(event.target.value)}
            className="h-11 w-full cursor-pointer rounded-xl border border-[#ccb49c] bg-[#f7efe4] p-1"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="font-display text-sm uppercase tracking-[0.14em] text-[#7b5f50]">
          Stamp Size
        </span>
        <div className="rounded-2xl border border-[#d5bea6] bg-[#f9f1e5] px-3 py-3">
          <input
            type="range"
            min={0.7}
            max={1.45}
            step={0.01}
            value={stampScale}
            onChange={(event) => onStampScaleChange(Number(event.target.value))}
            className="w-full accent-[#8f5d4f]"
          />
          <div className="mt-1 text-right font-display text-xs text-[#7b5f50]">
            {Math.round(stampScale * 100)}%
          </div>
        </div>
      </label>

      <label className="block space-y-2">
        <span className="font-display text-sm uppercase tracking-[0.14em] text-[#7b5f50]">
          Postcard Message
        </span>
        <textarea
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          rows={5}
          placeholder="Wish you were here..."
          className="w-full resize-none rounded-2xl border border-[#d1bca6] bg-[#fffaf2] p-3 font-body text-sm text-[#4d2f2a] shadow-inner outline-none transition focus:border-[#b98769] focus:ring-2 focus:ring-[#e9d4be]"
        />
      </label>

      <div className="mt-auto flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded-xl border border-[#b89a82] bg-[#f3e6d6] px-3 py-2 text-sm font-semibold text-[#5d4235] transition hover:bg-[#e8d4c0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Undo
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onClear}
            className="rounded-xl border border-[#c9af98] bg-[#efe1cf] px-3 py-2 text-sm font-semibold text-[#5d4235] transition hover:bg-[#e6d4bf]"
          >
            Clear
          </motion.button>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={onDownload}
          disabled={isDownloading}
          className="w-full rounded-xl border border-[#8f5d4f] bg-[#9e6452] px-4 py-2 text-sm font-semibold text-[#fdf2e9] transition hover:bg-[#8f5d4f] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isDownloading ? 'Preparing...' : 'Download PNG'}
        </motion.button>
      </div>
    </motion.aside>
  )
}
