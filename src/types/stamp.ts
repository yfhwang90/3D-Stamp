export type StampMark = {
  id: string
  x: number
  y: number
  rotation: number
  scale: number
  opacity: number
  /** Ink imprint texture captured at stamp time (not shared with live tool). */
  imprintTextureUrl: string
  /** Ink color at stamp time. */
  inkColor: string
}
