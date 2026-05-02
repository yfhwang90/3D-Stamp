import type { MutableRefObject } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, RoundedBox, useCursor } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { StampMark } from '../types/stamp'

function FrozenImprint({ mark }: { mark: StampMark }) {
  const textureMap = useMemo(() => {
    const texture = new THREE.TextureLoader().load(mark.imprintTextureUrl)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.anisotropy = 8
    texture.needsUpdate = true
    return texture
  }, [mark.imprintTextureUrl])

  const ink = useMemo(
    () => new THREE.Color(mark.inkColor).lerp(new THREE.Color('#0f0c0a'), 0.34),
    [mark.inkColor],
  )

  useEffect(() => {
    return () => {
      textureMap.dispose()
    }
  }, [textureMap])

  return (
    <group position={[mark.x, mark.y, 0.032]} rotation={[0, 0, mark.rotation]}>
      <mesh>
        <planeGeometry args={[0.46 * mark.scale, 0.46 * mark.scale]} />
        <meshStandardMaterial
          map={textureMap}
          transparent
          opacity={mark.opacity}
          color={ink}
          blending={THREE.MultiplyBlending}
          roughness={0.95}
          metalness={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function WebGLCaptureBridge({
  captureRef,
  postcardRef,
  stampRef,
}: {
  captureRef: MutableRefObject<(() => string | null) | null>
  postcardRef: MutableRefObject<THREE.Mesh | null>
  stampRef: MutableRefObject<THREE.Group | null>
}) {
  const { gl, scene, camera, invalidate } = useThree()

  useEffect(() => {
    captureRef.current = () => {
      const stamp = stampRef.current
      const previousStampVisibility = stamp?.visible ?? true
      const postcard = postcardRef.current
      const canvas = gl.domElement
      if (!postcard) {
        return canvas.toDataURL('image/png')
      }

      const previousBackground = scene.background
      const previousFog = scene.fog
      const previousAutoClear = gl.autoClear
      const previousClearAlpha = gl.getClearAlpha()
      const previousClearColor = gl.getClearColor(new THREE.Color()).clone()
      const previousPixelRatio = gl.getPixelRatio()
      const previousSize = gl.getSize(new THREE.Vector2())
      const previousViewport = gl.getViewport(new THREE.Vector4())
      const previousScissor = gl.getScissor(new THREE.Vector4())
      const previousScissorTest = gl.getScissorTest()
      const straightCamera = new THREE.OrthographicCamera(
        -(CARD_WIDTH * EXPORT_ORTHO_PADDING) / 2,
        (CARD_WIDTH * EXPORT_ORTHO_PADDING) / 2,
        (CARD_HEIGHT * EXPORT_ORTHO_PADDING) / 2,
        -(CARD_HEIGHT * EXPORT_ORTHO_PADDING) / 2,
        0.1,
        40,
      )

      try {
        if (stamp) {
          stamp.visible = false
        }

        postcard.updateWorldMatrix(true, false)
        const postcardCenter = new THREE.Vector3()
        postcard.getWorldPosition(postcardCenter)
        const postcardWorldQuaternion = new THREE.Quaternion()
        postcard.getWorldQuaternion(postcardWorldQuaternion)

        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(postcardWorldQuaternion).normalize()
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(postcardWorldQuaternion).normalize()
        straightCamera.position.copy(postcardCenter).addScaledVector(normal, 6)
        straightCamera.up.copy(up)
        straightCamera.lookAt(postcardCenter)
        straightCamera.updateProjectionMatrix()
        straightCamera.updateMatrixWorld()

        scene.background = null
        scene.fog = null
        gl.autoClear = true
        gl.setClearColor(0x000000, 0)
        const postcardAspect = CARD_WIDTH / CARD_HEIGHT
        const exportWidth = EXPORT_WIDTH_PX
        const exportHeight = Math.round(exportWidth / postcardAspect)
        gl.setPixelRatio(1)
        gl.setSize(exportWidth, exportHeight, false)
        gl.setViewport(0, 0, exportWidth, exportHeight)
        gl.setScissor(0, 0, exportWidth, exportHeight)
        gl.setScissorTest(true)
        invalidate()
        gl.clear(true, true, true)
        gl.render(scene, straightCamera)
        return gl.domElement.toDataURL('image/png')
      } finally {
        if (stamp) {
          stamp.visible = previousStampVisibility
        }
        scene.background = previousBackground
        scene.fog = previousFog
        gl.autoClear = previousAutoClear
        gl.setClearColor(previousClearColor, previousClearAlpha)
        gl.setPixelRatio(previousPixelRatio)
        gl.setSize(previousSize.x, previousSize.y, false)
        gl.setViewport(previousViewport)
        gl.setScissor(previousScissor)
        gl.setScissorTest(previousScissorTest)
        gl.render(scene, camera)
      }
    }
    return () => {
      captureRef.current = null
    }
  }, [gl, scene, camera, captureRef, postcardRef, stampRef, invalidate])

  return null
}

type Stage3DProps = {
  postcardColor: string
  inkColor: string
  message: string
  messageColor: string
  stampBodyColor: string
  stampGripColor: string
  stampScale: number
  stampFaceTexture: string
  imprintTexture: string
  marks: StampMark[]
  onStamp: (x: number, y: number) => void | Promise<void>
  captureRef: MutableRefObject<(() => string | null) | null>
}

type SceneContentProps = Stage3DProps & {
  postcardAnchor: [number, number, number]
  orbitTarget: [number, number, number]
}

const CARD_WIDTH = 3.8
const CARD_HEIGHT = 2.5
const MESSAGE_TEXTURE_WIDTH = 1536
const MESSAGE_TEXTURE_HEIGHT = 270
const MESSAGE_PLANE_X = 0
const MESSAGE_PLANE_Y = -0.72
const MESSAGE_PLANE_WIDTH = CARD_WIDTH * 0.84
const MESSAGE_PLANE_HEIGHT = 0.56
const MESSAGE_TEXT_FONT_PX = 32
const MESSAGE_TEXT_LEFT_PX = 20
const MESSAGE_TEXT_RIGHT_PADDING_PX = 6
const MESSAGE_TEXT_TOP_PX = 16
const MESSAGE_TEXT_LINE_HEIGHT_PX = 62
const MESSAGE_GUIDE_OFFSET_PX = 36
const EXPORT_ORTHO_PADDING = 1.08
const EXPORT_WIDTH_PX = 1800

/** Past this hold duration (or earlier if pointer moves enough), pointer-up will not stamp — only reposition. */
const STAMP_HOLD_MS = 200
/** Movement while pressed past this distance enters move mode immediately (before the hold timer). */
const STAMP_MOVE_BREAK_PX = 12

function SceneContent({
  postcardColor,
  inkColor,
  message,
  messageColor,
  stampBodyColor,
  stampGripColor,
  stampScale,
  stampFaceTexture,
  imprintTexture,
  marks,
  onStamp,
  captureRef,
  postcardAnchor,
  orbitTarget,
}: SceneContentProps) {
  const stampRef = useRef<THREE.Group>(null)
  const postcardRef = useRef<THREE.Mesh>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const stampHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stampDragStateRef = useRef<{
    active: boolean
    isMovingStamp: boolean
    clickEligible: boolean
    pointerId: number | null
    startX: number
    startY: number
  }>({
    active: false,
    isMovingStamp: false,
    clickEligible: false,
    pointerId: null,
    startX: 0,
    startY: 0,
  })
  const [stampTarget, setStampTarget] = useState({ x: 0, y: 0 })
  const [isPressing, setIsPressing] = useState(false)
  const [isStampHovered, setIsStampHovered] = useState(false)
  const [isPostcardHovered, setIsPostcardHovered] = useState(false)
  const [isMovingStamp, setIsMovingStamp] = useState(false)
  const [isStampClickEligible, setIsStampClickEligible] = useState(false)
  const [isStampInteractionActive, setIsStampInteractionActive] = useState(false)
  useCursor(isMovingStamp, 'grabbing', 'grab')
  useCursor(!isMovingStamp && (isStampHovered || isPostcardHovered), 'pointer', 'grab')

  useEffect(() => {
    return () => {
      if (stampHoldTimerRef.current != null) {
        clearTimeout(stampHoldTimerRef.current)
      }
    }
  }, [])

  const cardMaterial = useMemo(
    () => {
      const baseColor = new THREE.Color(postcardColor)
      const emissiveColor = baseColor.clone().lerp(new THREE.Color('#fff7ea'), 0.45)
      return new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.86,
        metalness: 0.03,
        emissive: emissiveColor,
        emissiveIntensity: 0.08,
      })
    },
    [postcardColor],
  )

  const stampBodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: stampBodyColor,
        roughness: 0.5,
        metalness: 0.2,
      }),
    [stampBodyColor],
  )

  const stampGripMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: stampGripColor,
        roughness: 0.35,
        metalness: 0.15,
      }),
    [stampGripColor],
  )

  const stampFaceTextureMap = useMemo(() => {
    const texture = new THREE.TextureLoader().load(stampFaceTexture)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.anisotropy = 8
    texture.needsUpdate = true
    return texture
  }, [stampFaceTexture])

  const imprintTextureMap = useMemo(() => {
    const texture = new THREE.TextureLoader().load(imprintTexture)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.anisotropy = 8
    texture.needsUpdate = true
    return texture
  }, [imprintTexture])

  const imprintInkColor = useMemo(
    () => new THREE.Color(inkColor).lerp(new THREE.Color('#0f0c0a'), 0.34),
    [inkColor],
  )

  const wrappedMessageLines = useMemo(() => {
    const normalizedMessage = message.replace(/\r\n/g, '\n')
    if (!normalizedMessage.trim()) {
      return []
    }

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) {
      return normalizedMessage.split('\n').slice(0, 4)
    }

    context.font = `${MESSAGE_TEXT_FONT_PX}px Georgia, Times New Roman, serif`
    const maxWidth = MESSAGE_TEXTURE_WIDTH - MESSAGE_TEXT_LEFT_PX - MESSAGE_TEXT_RIGHT_PADDING_PX
    const lines: string[] = []

    const rawLines = normalizedMessage.split('\n')
    for (const rawLine of rawLines) {
      if (lines.length >= 4) {
        break
      }

      const trimmedLine = rawLine.trim()
      if (!trimmedLine) {
        lines.push('')
        continue
      }

      const words = trimmedLine.split(/\s+/)
      let current = ''

      for (const word of words) {
        const next = current ? `${current} ${word}` : word
        if (context.measureText(next).width > maxWidth && current) {
          lines.push(current)
          current = word
        } else {
          current = next
        }
        if (lines.length >= 4) {
          break
        }
      }

      if (current && lines.length < 4) {
        lines.push(current)
      }
    }

    return lines
  }, [message])

  const postcardMessageTexture = useMemo(() => {
    if (wrappedMessageLines.length === 0) {
      return null
    }

    const canvas = document.createElement('canvas')
    canvas.width = MESSAGE_TEXTURE_WIDTH
    canvas.height = MESSAGE_TEXTURE_HEIGHT
    const context = canvas.getContext('2d')
    if (!context) {
      return null
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = `${messageColor}A0`
    context.font = `${MESSAGE_TEXT_FONT_PX}px Georgia, Times New Roman, serif`
    context.textBaseline = 'top'
    wrappedMessageLines.forEach((line, index) => {
      context.fillText(line, MESSAGE_TEXT_LEFT_PX, MESSAGE_TEXT_TOP_PX + index * MESSAGE_TEXT_LINE_HEIGHT_PX)
    })

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }, [wrappedMessageLines, messageColor])

  const messageGuideLineColor = useMemo(
    () => new THREE.Color(messageColor).lerp(new THREE.Color('#bda793'), 0.42).getStyle(),
    [messageColor],
  )

  const messageGuideLineOffsets = useMemo(() => {
    const lineCount = Math.max(1, wrappedMessageLines.length)
    const pxToWorld = MESSAGE_PLANE_HEIGHT / MESSAGE_TEXTURE_HEIGHT
    const messageTopY = MESSAGE_PLANE_Y + MESSAGE_PLANE_HEIGHT / 2
    return Array.from({ length: lineCount }, (_, index) => {
      const guideYPixels =
        MESSAGE_TEXT_TOP_PX + index * MESSAGE_TEXT_LINE_HEIGHT_PX + MESSAGE_GUIDE_OFFSET_PX
      return messageTopY - guideYPixels * pxToWorld
    })
  }, [wrappedMessageLines.length])

  const postcardGrainTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext('2d')
    if (!context) {
      return null
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < 18000; i += 1) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const alpha = 0.02 + Math.random() * 0.06
      context.fillStyle = `rgba(86, 64, 48, ${alpha})`
      context.fillRect(x, y, 1, 1)
    }

    context.globalAlpha = 0.14
    context.strokeStyle = 'rgba(127, 98, 77, 0.3)'
    for (let i = 0; i < 26; i += 1) {
      const y = (i / 25) * canvas.height
      context.beginPath()
      context.moveTo(0, y + (Math.random() - 0.5) * 6)
      context.quadraticCurveTo(
        canvas.width * 0.5,
        y + (Math.random() - 0.5) * 12,
        canvas.width,
        y + (Math.random() - 0.5) * 6,
      )
      context.stroke()
    }
    context.globalAlpha = 1

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.6, 1.2)
    texture.needsUpdate = true
    return texture
  }, [])

  useEffect(() => {
    return () => {
      stampFaceTextureMap.dispose()
    }
  }, [stampFaceTextureMap])

  useEffect(() => {
    return () => {
      imprintTextureMap.dispose()
    }
  }, [imprintTextureMap])

  useEffect(() => {
    return () => {
      postcardMessageTexture?.dispose()
    }
  }, [postcardMessageTexture])

  useEffect(() => {
    return () => {
      postcardGrainTexture?.dispose()
    }
  }, [postcardGrainTexture])

  useFrame((_state, delta) => {
    if (!stampRef.current) {
      return
    }

    const baseZ = 0.48
    const pressedZ = 0.22
    const targetZ = isPressing ? pressedZ : baseZ

    if (isMovingStamp) {
      // During drag, snap to projected pointer location for precise placement.
      stampRef.current.position.x = stampTarget.x
      stampRef.current.position.y = stampTarget.y
    } else {
      stampRef.current.position.x = THREE.MathUtils.lerp(
        stampRef.current.position.x,
        stampTarget.x,
        8 * delta,
      )
      stampRef.current.position.y = THREE.MathUtils.lerp(
        stampRef.current.position.y,
        stampTarget.y,
        8 * delta,
      )
    }
    stampRef.current.position.z = THREE.MathUtils.lerp(
      stampRef.current.position.z,
      targetZ,
      10 * delta,
    )
    const targetScale = stampScale * (isMovingStamp ? 1.06 : isStampHovered ? 1.035 : 1)
    const currentScale = stampRef.current.scale.x
    const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, 10 * delta)
    stampRef.current.scale.setScalar(nextScale)
  })

  const startPress = () => {
    setIsPressing(true)
    window.setTimeout(() => setIsPressing(false), 140)
  }

  const playStampSound = () => {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) {
      return
    }
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass()
    }
    const context = audioContextRef.current
    const now = context.currentTime

    const oscillator = context.createOscillator()
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(155, now)
    oscillator.frequency.exponentialRampToValueAtTime(72, now + 0.08)

    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.135)

    const bandPass = context.createBiquadFilter()
    bandPass.type = 'lowpass'
    bandPass.frequency.setValueAtTime(950, now)

    oscillator.connect(bandPass)
    bandPass.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.14)
  }

  const placeStampAt = (x: number, y: number) => {
    const edgeMargin = THREE.MathUtils.clamp(0.24 * stampScale, 0.17, 0.45)
    const clampedX = THREE.MathUtils.clamp(x, -CARD_WIDTH / 2 + edgeMargin, CARD_WIDTH / 2 - edgeMargin)
    const clampedY = THREE.MathUtils.clamp(y, -CARD_HEIGHT / 2 + edgeMargin, CARD_HEIGHT / 2 - edgeMargin)
    setStampTarget({ x: clampedX, y: clampedY })
    startPress()
    onStamp(clampedX, clampedY)
    playStampSound()
  }

  const moveStampTo = (x: number, y: number) => {
    const edgeMargin = THREE.MathUtils.clamp(0.24 * stampScale, 0.17, 0.45)
    const clampedX = THREE.MathUtils.clamp(x, -CARD_WIDTH / 2 + edgeMargin, CARD_WIDTH / 2 - edgeMargin)
    const clampedY = THREE.MathUtils.clamp(y, -CARD_HEIGHT / 2 + edgeMargin, CARD_HEIGHT / 2 - edgeMargin)
    setStampTarget({ x: clampedX, y: clampedY })
  }

  const getPostcardLocalPointerPoint = (event: ThreeEvent<PointerEvent>) => {
    if (!postcardRef.current) {
      return null
    }

    const worldNormal = new THREE.Vector3(0, 0, 1)
    const worldQuaternion = new THREE.Quaternion()
    postcardRef.current.getWorldQuaternion(worldQuaternion)
    worldNormal.applyQuaternion(worldQuaternion).normalize()

    const worldOrigin = new THREE.Vector3()
    postcardRef.current.getWorldPosition(worldOrigin)

    const postcardPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(worldNormal, worldOrigin)
    const hitPoint = new THREE.Vector3()
    const didHit = event.ray.intersectPlane(postcardPlane, hitPoint)
    if (!didHit) {
      return null
    }

    return postcardRef.current.worldToLocal(hitPoint.clone())
  }

  const clearStampHoldTimer = () => {
    if (stampHoldTimerRef.current != null) {
      clearTimeout(stampHoldTimerRef.current)
      stampHoldTimerRef.current = null
    }
  }

  const enterStampMoveMode = () => {
    const dragState = stampDragStateRef.current
    if (dragState.isMovingStamp) {
      return
    }
    clearStampHoldTimer()
    dragState.isMovingStamp = true
    dragState.clickEligible = false
    setIsMovingStamp(true)
    setIsStampClickEligible(false)
  }

  const handleStampPointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    clearStampHoldTimer()

    const dragState = stampDragStateRef.current
    dragState.active = true
    dragState.isMovingStamp = false
    dragState.clickEligible = true
    dragState.pointerId = event.pointerId
    dragState.startX = event.clientX
    dragState.startY = event.clientY

    setIsStampInteractionActive(true)
    setIsMovingStamp(false)
    setIsStampClickEligible(true)

    const pointerId = event.pointerId
    stampHoldTimerRef.current = setTimeout(() => {
      const s = stampDragStateRef.current
      if (s.active && s.pointerId === pointerId) {
        enterStampMoveMode()
      }
    }, STAMP_HOLD_MS)

    const targetElement = event.target as Element | null
    targetElement?.setPointerCapture?.(event.pointerId)
  }

  const handleStampPointerMove = (event: ThreeEvent<PointerEvent>) => {
    const dragState = stampDragStateRef.current
    if (!dragState.active || dragState.pointerId !== event.pointerId) {
      return
    }
    event.stopPropagation()

    const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY)
    if (!dragState.isMovingStamp && distance > STAMP_MOVE_BREAK_PX) {
      enterStampMoveMode()
    }

    if (!dragState.isMovingStamp) {
      return
    }

    const localPoint = getPostcardLocalPointerPoint(event)
    if (!localPoint) {
      return
    }
    moveStampTo(localPoint.x, localPoint.y)
  }

  const resetStampDrag = () => {
    clearStampHoldTimer()
    stampDragStateRef.current.active = false
    stampDragStateRef.current.isMovingStamp = false
    stampDragStateRef.current.clickEligible = false
    stampDragStateRef.current.pointerId = null
    setIsMovingStamp(false)
    setIsStampClickEligible(false)
    setIsStampInteractionActive(false)
  }

  const handleStampPointerUp = (event: ThreeEvent<PointerEvent>) => {
    const dragState = stampDragStateRef.current
    if (!dragState.active || dragState.pointerId !== event.pointerId) {
      return
    }
    event.stopPropagation()
    const targetElement = event.target as Element | null
    targetElement?.releasePointerCapture?.(event.pointerId)

    clearStampHoldTimer()

    if (dragState.isMovingStamp) {
      resetStampDrag()
      return
    }

    if (dragState.clickEligible) {
      if (!stampRef.current || !postcardRef.current) {
        placeStampAt(stampTarget.x, stampTarget.y)
      } else {
        const stampWorldPoint = new THREE.Vector3()
        stampRef.current.getWorldPosition(stampWorldPoint)
        const localPoint = postcardRef.current.worldToLocal(stampWorldPoint.clone())
        placeStampAt(localPoint.x, localPoint.y)
      }
    }
    resetStampDrag()
  }

  const handleStampPointerCancel = (event: ThreeEvent<PointerEvent>) => {
    if (stampDragStateRef.current.pointerId !== event.pointerId) {
      return
    }
    event.stopPropagation()
    const targetElement = event.target as Element | null
    targetElement?.releasePointerCapture?.(event.pointerId)
    resetStampDrag()
  }

  const handleStampPointerLeave = (event: ThreeEvent<PointerEvent>) => {
    if (!stampDragStateRef.current.active || stampDragStateRef.current.isMovingStamp) {
      return
    }
    handleStampPointerCancel(event)
  }

  return (
    <>
      <color attach="background" args={['#efe4d5']} />
      <fog attach="fog" args={['#efe4d5', 7.4, 13.5]} />

      <ambientLight intensity={0.84} />
      <hemisphereLight intensity={0.4} color="#fff4e5" groundColor="#cab7a1" />
      <directionalLight
        castShadow
        intensity={1.22}
        position={[2.3, 3.6, 3.6]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-normalBias={0.03}
        shadow-bias={-0.0004}
      />
      <spotLight
        intensity={0.42}
        penumbra={0.9}
        angle={0.92}
        position={[-2.8, 4.6, 1.4]}
        color="#ffd9bb"
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.7, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#e7dbc9" roughness={1} />
      </mesh>

      <group position={postcardAnchor}>
        <group rotation={[0, 0, 0]}>
        <mesh
          ref={postcardRef}
          receiveShadow
          onPointerOver={() => setIsPostcardHovered(true)}
          onPointerOut={() => setIsPostcardHovered(false)}
        >
          <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
          <primitive object={cardMaterial} attach="material" />
        </mesh>

        {messageGuideLineOffsets.map((lineY, index) => (
          <mesh key={`msg-line-${index}`} position={[0, lineY, 0.018]}>
            <planeGeometry args={[CARD_WIDTH * 0.84, 0.013]} />
            <meshBasicMaterial
              color={messageGuideLineColor}
              transparent
              opacity={0.58}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          </mesh>
        ))}

        {postcardGrainTexture ? (
          <mesh position={[0, 0, 0.011]}>
            <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
            <meshBasicMaterial
              map={postcardGrainTexture}
              transparent
              opacity={0.12}
              blending={THREE.MultiplyBlending}
              depthWrite={false}
            />
          </mesh>
        ) : null}

        {isPostcardHovered ? (
          <mesh position={[0, 0, 0.012]}>
            <planeGeometry args={[CARD_WIDTH * 0.99, CARD_HEIGHT * 0.99]} />
            <meshBasicMaterial color="#fff7e8" transparent opacity={0.07} />
          </mesh>
        ) : null}

        {isStampHovered || isMovingStamp || isStampInteractionActive ? (
          <mesh position={[stampTarget.x, stampTarget.y, 0.029]}>
            <planeGeometry args={[0.46 * stampScale, 0.46 * stampScale]} />
            <meshStandardMaterial
              map={imprintTextureMap}
              transparent
              opacity={
                isMovingStamp ? 0.24 : isStampInteractionActive && isStampClickEligible ? 0.18 : 0.17
              }
              color={imprintInkColor}
              blending={THREE.MultiplyBlending}
              roughness={0.95}
              metalness={0}
              depthWrite={false}
            />
          </mesh>
        ) : null}

        {marks.map((mark) => (
          <FrozenImprint key={mark.id} mark={mark} />
        ))}

        <group
          ref={stampRef}
          position={[0, 0, 0.48]}
          onPointerDown={handleStampPointerDown}
          onPointerMove={handleStampPointerMove}
          onPointerUp={handleStampPointerUp}
          onPointerCancel={handleStampPointerCancel}
          onPointerLeave={handleStampPointerLeave}
          onPointerOver={(event) => {
            event.stopPropagation()
            setIsStampHovered(true)
          }}
          onPointerOut={(event) => {
            event.stopPropagation()
            setIsStampHovered(false)
          }}
        >
          <RoundedBox castShadow args={[0.42, 0.42, 0.16]} radius={0.03} smoothness={6}>
            <primitive object={stampBodyMaterial} attach="material" />
          </RoundedBox>
          <mesh castShadow receiveShadow position={[0, 0, 0.082]}>
            <planeGeometry args={[0.33, 0.33]} />
            <meshStandardMaterial
              map={stampFaceTextureMap}
              roughness={0.72}
              metalness={0.04}
              color="#efe3d0"
            />
          </mesh>
          <mesh position={[0, 0, 0.0815]}>
            <ringGeometry args={[0.165, 0.19, 42]} />
            <meshStandardMaterial
              color="#6f463b"
              roughness={0.7}
              metalness={0.15}
              emissive={isStampHovered ? '#4c2d23' : '#000000'}
              emissiveIntensity={isStampHovered ? 0.12 : 0}
            />
          </mesh>
          <mesh castShadow position={[0, 0, 0.17]}>
            <cylinderGeometry args={[0.08, 0.11, 0.22, 24]} />
            <primitive object={stampGripMaterial} attach="material" />
          </mesh>
          <mesh castShadow position={[0, 0, 0.3]}>
            <sphereGeometry args={[0.12, 24, 24]} />
            <primitive object={stampGripMaterial} attach="material" />
          </mesh>
        </group>

        {postcardMessageTexture ? (
          <mesh position={[MESSAGE_PLANE_X, MESSAGE_PLANE_Y, 0.02]} rotation={[0, 0, 0]}>
            <planeGeometry args={[MESSAGE_PLANE_WIDTH, MESSAGE_PLANE_HEIGHT]} />
            <meshBasicMaterial
              map={postcardMessageTexture}
              transparent
              opacity={0.95}
              depthWrite={false}
            />
          </mesh>
        ) : null}
        </group>
      </group>

      <OrbitControls
        makeDefault
        target={orbitTarget}
        enablePan={false}
        enableZoom={false}
        enabled={!isStampInteractionActive}
        minPolarAngle={0.2}
        maxPolarAngle={1.45}
        minAzimuthAngle={-1.35}
        maxAzimuthAngle={1.35}
      />

      <WebGLCaptureBridge captureRef={captureRef} postcardRef={postcardRef} stampRef={stampRef} />
    </>
  )
}

export function Stage3D(props: Stage3DProps) {
  const [viewportWidth, setViewportWidth] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return 1280
    }
    return window.innerWidth
  })

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const isDesktopWide = viewportWidth >= 1280
  const isShortDesktop = typeof window !== 'undefined' && window.innerHeight < 860
  const postcardAnchor: [number, number, number] = isDesktopWide ? [0, 0.06, 0.08] : [0, 0.05, 0.08]
  const orbitTarget: [number, number, number] = postcardAnchor
  const cameraPosition: [number, number, number] = isDesktopWide
    ? isShortDesktop
      ? [0, 1.78, 5.05]
      : [0, 1.74, 4.8]
    : [0, 1.72, 4.45]
  const cameraFov = isDesktopWide ? (isShortDesktop ? 38 : 36) : 34

  return (
    <div className="h-[48vh] min-h-[300px] w-full overflow-hidden rounded-[24px] border border-[#dccdb9] bg-[#ece1d2] shadow-paper transition-[box-shadow] hover:shadow-[0_24px_44px_rgba(84,59,41,0.22)] lg:h-full lg:min-h-0">
      <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: cameraPosition, fov: cameraFov }}
      >
        <SceneContent {...props} postcardAnchor={postcardAnchor} orbitTarget={orbitTarget} />
      </Canvas>
    </div>
  )
}
