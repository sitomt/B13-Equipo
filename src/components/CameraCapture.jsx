import { useEffect, useRef, useState } from 'react'
import { Camera, X, Refresh, Check } from './icons'
import { haptic } from '../lib/haptics'

// Cámara in-app a pantalla completa: vista en vivo → disparo → confirmar (Usar) o Repetir.
// Usa getUserMedia (cámara frontal). Si el navegador no lo permite (p.ej. http en LAN),
// cae a la cámara nativa del móvil con un <input capture="user">.
export default function CameraCapture({ open, onClose, onCapture }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const nativeRef = useRef(null)
  const [shot, setShot] = useState(null) // { file, url }
  const [error, setError] = useState(false)

  function stop() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  useEffect(() => {
    if (!open) return
    setShot(null); setError(false)
    let active = true
    const md = navigator.mediaDevices
    if (!md?.getUserMedia) { setError(true); return }
    md.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((s) => {
        if (!active) { s.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = s
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}) }
      })
      .catch(() => setError(true))
    return () => { active = false; stop() }
  }, [open])

  function shoot() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    haptic('tap')
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d').drawImage(v, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' })
      setShot({ file, url: URL.createObjectURL(blob) })
    }, 'image/jpeg', 0.9)
  }

  function retake() {
    if (shot?.url) URL.revokeObjectURL(shot.url)
    setShot(null)
  }

  function use() {
    if (!shot) return
    haptic('success')
    stop()
    onCapture(shot.file)
    if (shot.url) URL.revokeObjectURL(shot.url)
    setShot(null)
  }

  function close() { stop(); if (shot?.url) URL.revokeObjectURL(shot.url); setShot(null); onClose() }

  function onNative(e) {
    const file = e.target.files?.[0]
    if (file) { onCapture(file); onClose() }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <button onClick={close} aria-label="Cerrar cámara"
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white active:scale-90"
        style={{ marginTop: 'env(safe-area-inset-top)' }}>
        <X size={20} />
      </button>

      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center text-white">
          <Camera size={40} className="text-white/60" />
          <p className="text-white/80">No se pudo abrir la cámara del navegador.</p>
          <button onClick={() => nativeRef.current?.click()}
            className="rounded-2xl bg-bronze px-6 py-3 font-extrabold text-white active:scale-95">
            Usar la cámara del móvil
          </button>
          <input ref={nativeRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onNative} />
          <button onClick={close} className="text-sm font-semibold text-white/55">Cancelar</button>
        </div>
      ) : (
        <>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            {shot ? (
              <img src={shot.url} alt="Tu selfie" className="h-full w-full object-cover" />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted
                className="h-full w-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            )}
          </div>

          <div className="flex items-center justify-center gap-10 bg-black px-6 pb-10 pt-6" style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}>
            {shot ? (
              <>
                <button onClick={retake} className="flex flex-col items-center gap-1 text-white/80 active:scale-95">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15"><Refresh size={24} /></span>
                  <span className="text-xs font-semibold">Repetir</span>
                </button>
                <button onClick={use} className="flex flex-col items-center gap-1 text-white active:scale-95">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sage"><Check size={30} /></span>
                  <span className="text-xs font-bold">Usar foto</span>
                </button>
              </>
            ) : (
              <button onClick={shoot} aria-label="Hacer foto"
                className="h-20 w-20 rounded-full border-4 border-white/40 bg-white active:scale-90" />
            )}
          </div>
        </>
      )}
    </div>
  )
}
