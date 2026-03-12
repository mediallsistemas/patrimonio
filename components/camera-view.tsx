'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import Text from './text'

const MODELS_URL = '/models'

// Cache models on window so they load only once per browser session
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const w = typeof window !== 'undefined' ? (window as any) : {}

type Status = 'loading-models' | 'loading-camera' | 'ready' | 'detecting' | 'error'

interface CameraViewProps {
  capturing: boolean
  onDescriptor: (descriptor: number[]) => void
  onError?: (error: string) => void
  label?: string
}

export default function CameraView({ capturing, onDescriptor, onError, label }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>('loading-models')
  const capturedRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceApiRef = useRef<any>(null)

  // Step 1: Load models (cached on window after first load)
  useEffect(() => {
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
        setStatus('loading-camera')
      } catch (err) {
        console.error('Erro ao carregar modelos:', err)
        setStatus('error')
        onError?.('Erro ao carregar modelos de reconhecimento facial.')
      }
    }
    loadModels()
  }, [onError])

  // Step 2: Start camera
  useEffect(() => {
    if (status !== 'loading-camera') return

    let stream: MediaStream

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setStatus('ready')
        }
      } catch {
        setStatus('error')
        onError?.('Não foi possível acessar a câmera. Verifique as permissões.')
      }
    }

    startCamera()

    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [status, onError])

  // Step 3: Detection loop
  useEffect(() => {
    const faceapi = faceApiRef.current
    if (!faceapi || status !== 'ready' || !capturing) return

    capturedRef.current = false
    setStatus('detecting')

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
          onDescriptor(Array.from(result.descriptor as Float32Array))
          setStatus('ready')
        }
      } catch {
        // ignore per-frame errors
      }
    }

    intervalRef.current = setInterval(detect, 500)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setStatus('ready')
    }
  }, [capturing, status, onDescriptor])

  useEffect(() => {
    if (capturing) capturedRef.current = false
  }, [capturing])

  const statusMessages: Record<Status, string> = {
    'loading-models': 'Carregando reconhecimento facial...',
    'loading-camera': 'Iniciando câmera...',
    ready: 'Câmera pronta',
    detecting: label || 'Posicione seu rosto na câmera...',
    error: 'Erro',
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

      {(status === 'loading-models' || status === 'loading-camera') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark/85">
          <Loader2 className="w-8 h-8 text-red-base animate-spin mb-3" />
          <Text variant="body-sm" className="text-white text-center px-4">
            {statusMessages[status]}
          </Text>
        </div>
      )}

      {status === 'detecting' && (
        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-dark/70 to-transparent p-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-base animate-pulse" />
            <Text variant="body-sm" className="text-white">
              {statusMessages.detecting}
            </Text>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark/85 gap-3">
          <Camera className="w-10 h-10 text-red-base" />
          <Text variant="body-sm" className="text-red-light text-center px-6">
            {statusMessages.error}
          </Text>
        </div>
      )}
    </div>
  )
}
