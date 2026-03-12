'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import Text from './text'

// Models served locally from /public/models
const MODELS_URL = '/models'

type Status = 'loading-models' | 'loading-camera' | 'ready' | 'detecting' | 'error'

interface CameraViewProps {
  /** When true, the component will attempt to detect and return a face descriptor */
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

  // Step 1: Load models
  useEffect(() => {
    async function loadModels() {
      try {
        const faceapi = await import('face-api.js')
        // Ensure TensorFlow uses CPU backend if WebGL is unavailable
        const tf = (faceapi as any).tf ?? (await import('@tensorflow/tfjs-core').catch(() => null))
        if (tf) {
          try { await tf.setBackend('webgl') } catch { await tf.setBackend('cpu') }
        }
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        ])
        faceApiRef.current = faceapi
        setStatus('loading-camera')
      } catch (err) {
        console.error('Erro ao carregar modelos:', err)
        setStatus('error')
        onError?.(`Erro ao carregar modelos de reconhecimento facial.`)
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
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
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

  // Step 3: Detection loop when capturing=true
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
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor()

        if (result && !capturedRef.current) {
          capturedRef.current = true
          onDescriptor(Array.from(result.descriptor as Float32Array))
          if (intervalRef.current) clearInterval(intervalRef.current)
          setStatus('ready')
        }
      } catch {
        // silently ignore per-frame errors
      }
    }

    intervalRef.current = setInterval(detect, 800)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setStatus('ready')
    }
  }, [capturing, status, onDescriptor])

  // Reset when capturing flips back to true
  useEffect(() => {
    if (capturing) capturedRef.current = false
  }, [capturing])

  const statusMessages: Record<Status, string> = {
    'loading-models': 'Carregando reconhecimento facial...',
    'loading-camera': 'Iniciando câmera...',
    ready: 'Câmera pronta',
    detecting: label || 'Posicione seu rosto na câmera...',
    error: 'Erro ao acessar a câmera',
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

      {/* Loading overlay */}
      {(status === 'loading-models' || status === 'loading-camera') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark/85">
          <Loader2 className="w-8 h-8 text-red-base animate-spin mb-3" />
          <Text variant="body-sm" className="text-white text-center px-4">
            {statusMessages[status]}
          </Text>
        </div>
      )}

      {/* Detecting indicator */}
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

      {/* Error overlay */}
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
