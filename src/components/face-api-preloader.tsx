'use client'

import { useEffect } from 'react'

const MODELS_URL = '/models'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const w = typeof window !== 'undefined' ? (window as any) : {}

export default function FaceApiPreloader() {
  useEffect(() => {
    if (w.__faceApiModelsLoaded) return
    import('face-api.js').then((faceapi) => {
      if (w.__faceApiModelsLoaded) return
      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
      ]).then(() => {
        w.__faceApiModelsLoaded = true
      }).catch(() => { /* silencioso — CameraView tentará novamente */ })
    }).catch(() => {})
  }, [])

  return null
}
