'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import Text from './text'

const MODELS_URL = '/models'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const w = typeof window !== 'undefined' ? (window as any) : {}

interface CameraViewProps {
  capturing: boolean
  onDescriptor: (descriptor: number[]) => void
  onError?: (error: string) => void
  label?: string
}

export default function CameraView({ capturing, onDescriptor, onError, label }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [modelsReady, setModelsReady] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const capturedRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceApiRef = useRef<any>(null)

  // Camera and models load IN PARALLEL
  useEffect(() => {
    // Start camera immediately
    let stream: MediaStream
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setCameraReady(true)
        }
      } catch {
        setError('Não foi possível acessar a câmera. Verifique as permissões.')
        onError?.('Não foi possível acessar a câmera. Verifique as permissões.')
      }
    }

    // Load models simultaneously
    async function loadModels() {
      try {
        const faceapi = await import('face-api.js')
        if (!w.__faceApiModelsLoaded) {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
          ])
          w.__faceApiModelsLoaded = true
        }
        faceApiRef.current = faceapi
        setModelsReady(true)
      } catch (err) {
        console.error('Erro ao carregar modelos:', err)
        setError('Erro ao carregar modelos de reconhecimento facial.')
        onError?.('Erro ao carregar modelos de reconhecimento facial.')
      }
    }

    startCamera()
    loadModels()

    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detection loop — only runs when both camera and models are ready
  useEffect(() => {
    const faceapi = faceApiRef.current
    if (!faceapi || !modelsReady || !cameraReady || !capturing) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setDetecting(false)
      capturedRef.current = false
      return
    }

    capturedRef.current = false
    setDetecting(true)

    async function detect() {
      if (!faceapi || !videoRef.current || capturedRef.current) return
      if (videoRef.current.readyState < 2) return
      try {
        const result = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor()

        if (result && !capturedRef.current) {
          capturedRef.current = true
          if (intervalRef.current) clearInterval(intervalRef.current)
          setDetecting(false)
          onDescriptor(Array.from(result.descriptor as Float32Array))
        }
      } catch {
        // ignore per-frame errors
      }
    }

    intervalRef.current = setInterval(detect, 500)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [capturing, modelsReady, cameraReady, onDescriptor])

  if (error) {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-dark aspect-video w-full flex flex-col items-center justify-center gap-3">
        <Camera className="w-10 h-10 text-red-base" />
        <Text variant="body-sm" className="text-red-light text-center px-6">{error}</Text>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-dark aspect-video w-full">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Loading overlay — só aparece enquanto câmera OU modelos ainda carregam */}
      {(!cameraReady || !modelsReady) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark/85">
          <Loader2 className="w-8 h-8 text-red-base animate-spin mb-3" />
          <Text variant="body-sm" className="text-white text-center px-4">
            {!cameraReady ? 'Iniciando câmera...' : 'Carregando reconhecimento facial...'}
          </Text>
        </div>
      )}

      {/* Detecting indicator */}
      {cameraReady && modelsReady && detecting && (
        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-dark/70 to-transparent p-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-base animate-pulse" />
            <Text variant="body-sm" className="text-white">
              {label || 'Posicione seu rosto na câmera...'}
            </Text>
          </div>
        </div>
      )}
    </div>
  )
}
