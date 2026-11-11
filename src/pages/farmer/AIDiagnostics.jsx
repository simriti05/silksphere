import React, { useRef, useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { Bell, Calendar, ChevronRight, ChevronDown, Upload, RefreshCw, AlertTriangle, ExternalLink, Shield, Camera } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

const HISTORY_DATA = [
  { date:"23 Aug", val:8 },
  { date:"24 Aug", val:7 },
  { date:"25 Aug", val:5 },
  { date:"26 Aug", val:3 },
  { date:"27 Aug", val:2.5 },
  { date:"28 Aug", val:1.5 },
  { date:"29 Aug", val:2.5 },
]

// Small confidence bar chart for AI results
const CONF_DATA = [
  { v: 20 }, { v: 35 }, { v: 25 }, { v: 55 }, { v: 45 },
  { v: 70 }, { v: 60 }, { v: 80 }, { v: 75 }, { v: 97 }
]

export default function AIDiagnostics() {
  const { batches, addToast } = useApp()
  const fileRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const overlayCanvasRef = useRef(null)
  const liveIntervalRef = useRef(null)
  const fullscreenContainerRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [liveDetectionOn, setLiveDetectionOn] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [availableCameras, setAvailableCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState('')
  const [captured, setCaptured] = useState(null)
  const [capturedBlob, setCapturedBlob] = useState(null)
  const [result, setResult] = useState(null)
  const [liveStats, setLiveStats] = useState({ healthy: 0, grasserie: 0, total: 0 })
  const [scanning, setScanning] = useState(false)
  const [backendOnline, setBackendOnline] = useState(null)
  const [selectedBatch, setSelectedBatch] = useState(batches[0]?.id || 'SS-2026-0061')
  const [autoCapture, setAutoCapture] = useState(true)
  const [alertOnDetection, setAlertOnDetection] = useState(true)
  const [confidenceThreshold, setConfidenceThreshold] = useState('70%')

  const now = new Date()
  const dateStr = now.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})
  const timeStr = now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})
  const timeFullStr = now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"})

  useEffect(() => {
    fetch(`${BACKEND_URL}/`, { signal: AbortSignal.timeout(2000) })
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false))
    
    // Enumerate available cameras
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const cameras = devices.filter(d => d.kind === 'videoinput')
        setAvailableCameras(cameras)
        if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId)
      })
      .catch(err => console.warn('Cannot enumerate cameras:', err))
  }, [])

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      setStream(s)
      setCameraOn(true)
      setCaptured(null)
      setResult(null)
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s }, 50)
    } catch (err) {
      addToast('Camera error: ' + err.message, 'error')
    }
  }

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    setCameraOn(false)
    stopLiveDetection()
  }

  const startLiveDetection = async () => {
    // Prevent multiple clicks
    if (liveDetectionOn || cameraOn) {
      console.log('⚠️ Already starting or running')
      return
    }
    
    try {
      const constraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        },
        audio: false
      }
      
      console.log('🎥 Requesting camera with constraints:', constraints)
      const s = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('✅ Camera stream obtained:', s.getVideoTracks()[0].label)
      
      setStream(s)
      setCameraOn(true)
      setCaptured(null)
      setResult(null)
      
      // Set video source immediately
      if (videoRef.current) {
        videoRef.current.srcObject = s
        console.log('✅ Video element srcObject set')
      }
      
      // Start detection after video is ready
      setTimeout(() => {
        console.log('🎬 Activating live detection')
        setLiveDetectionOn(true)
      }, 2000)
      
    } catch (err) {
      addToast('Camera error: ' + err.message, 'error')
      console.error('❌ Camera access error:', err)
      alert(`Camera Error: ${err.message}\n\nMake sure DroidCam Client is running and click "Start" in the app.`)
    }
  }

  const stopLiveDetection = () => {
    console.log('🛑 Stopping live detection')
    
    // Clear the interval
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current)
      liveIntervalRef.current = null
    }
    
    // Stop the camera stream
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.label)
        track.stop()
      })
      setStream(null)
    }
    
    // Clear the video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    // Reset states
    setLiveDetectionOn(false)
    setCameraOn(false)
    setLiveStats({ healthy: 0, grasserie: 0, total: 0 })
    
    // Exit fullscreen if active
    if (isFullscreen) exitFullscreen()
    
    console.log('✅ Live detection stopped completely')
  }

  const enterFullscreen = () => {
    const elem = fullscreenContainerRef.current
    if (!elem) return
    
    if (elem.requestFullscreen) {
      elem.requestFullscreen()
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen()
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen()
    }
    setIsFullscreen(true)
  }

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen()
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen()
    }
    setIsFullscreen(false)
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  const processLiveFrame = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const overlayCanvas = overlayCanvasRef.current
    
    if (!video || !canvas || !overlayCanvas) {
      console.log('processLiveFrame check failed:', { video: !!video, canvas: !!canvas, overlayCanvas: !!overlayCanvas })
      return
    }

    // Check if video is ready
    if (video.readyState < 2) {
      console.log('Video not ready yet, readyState:', video.readyState)
      return
    }

    console.log('Processing live frame...', { videoWidth: video.videoWidth, videoHeight: video.videoHeight })

    // Capture frame from video
    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, width, height)

    // Convert to blob and send to backend
    canvas.toBlob(async (blob) => {
      if (!blob) return
      
      console.log('Sending frame to backend, size:', blob.size)
      
      try {
        const formData = new FormData()
        formData.append('file', blob, 'frame.jpg')
        const res = await fetch(`${BACKEND_URL}/predict`, { method: 'POST', body: formData })
        
        if (!res.ok) {
          console.error('Backend response not OK:', res.status)
          return
        }
        
        const data = await res.json()
        console.log('Detection result:', data)
        
        const detections = data.detections || []
        const healthy = data.counts?.['Healthy'] || 0
        const grasserie = data.counts?.['Grasserie'] || 0
        const total = healthy + grasserie

        // Update live stats
        setLiveStats({ healthy, grasserie, total })

        // Draw bounding boxes on overlay canvas
        overlayCanvas.width = width
        overlayCanvas.height = height
        const overlayCtx = overlayCanvas.getContext('2d')
        overlayCtx.clearRect(0, 0, width, height)
        
        console.log('Drawing', detections.length, 'bounding boxes')
        
        detections.forEach(d => {
          const [x1, y1, x2, y2] = d.bbox
          const isInfectedWorm = d.class_name !== 'Healthy'
          const color      = isInfectedWorm ? '#ef4444' : '#22c55e'
          const colorRgb   = isInfectedWorm ? '239,68,68' : '34,197,94'

          const cx = (x1 + x2) / 2
          const cy = (y1 + y2) / 2
          const rx = (x2 - x1) / 2
          const ry = (y2 - y1) / 2

          // 1. Soft glow halo
          overlayCtx.save()
          overlayCtx.shadowColor = color
          overlayCtx.shadowBlur  = 18
          overlayCtx.strokeStyle = `rgba(${colorRgb},0.9)`
          overlayCtx.lineWidth   = 2.5
          overlayCtx.beginPath()
          overlayCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
          overlayCtx.stroke()
          overlayCtx.restore()

          // 2. Semi-transparent filled ellipse (the "mask" region)
          overlayCtx.save()
          overlayCtx.globalAlpha = 0.28
          overlayCtx.fillStyle   = color
          overlayCtx.beginPath()
          overlayCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
          overlayCtx.fill()
          overlayCtx.restore()

          // 3. Crisp outline on top
          overlayCtx.save()
          overlayCtx.strokeStyle = color
          overlayCtx.lineWidth   = 2
          overlayCtx.beginPath()
          overlayCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
          overlayCtx.stroke()
          overlayCtx.restore()

          // 4. Confidence badge (centered pill above each worm)
          const label      = `${d.class_name} ${Math.round(d.confidence * 100)}%`
          overlayCtx.font  = 'bold 13px Inter, sans-serif'
          const tw         = overlayCtx.measureText(label).width
          const bx         = cx - tw / 2 - 8
          const by         = Math.max(0, y1 - 26)
          const bw         = tw + 16
          const bh         = 22
          const br         = 6

          overlayCtx.save()
          overlayCtx.fillStyle   = color
          overlayCtx.globalAlpha = 0.95
          overlayCtx.beginPath()
          overlayCtx.moveTo(bx + br, by)
          overlayCtx.lineTo(bx + bw - br, by)
          overlayCtx.arcTo(bx + bw, by, bx + bw, by + bh, br)
          overlayCtx.lineTo(bx + bw, by + bh - br)
          overlayCtx.arcTo(bx + bw, by + bh, bx + bw - br, by + bh, br)
          overlayCtx.lineTo(bx + br, by + bh)
          overlayCtx.arcTo(bx, by + bh, bx, by + bh - br, br)
          overlayCtx.lineTo(bx, by + br)
          overlayCtx.arcTo(bx, by, bx + br, by, br)
          overlayCtx.closePath()
          overlayCtx.fill()
          overlayCtx.restore()

          overlayCtx.save()
          overlayCtx.fillStyle = 'white'
          overlayCtx.font      = 'bold 13px Inter, sans-serif'
          overlayCtx.fillText(label, bx + 8, by + bh - 6)
          overlayCtx.restore()
        })
      } catch (err) {
        console.error('Live detection frame error:', err)
      }
    }, 'image/jpeg', 0.9)
  }

  useEffect(() => { if (cameraOn && videoRef.current && stream) videoRef.current.srcObject = stream }, [cameraOn, stream])
  
  // Ensure video has stream when live detection starts
  useEffect(() => {
    if (liveDetectionOn && videoRef.current && stream) {
      console.log('🎬 Live detection activated, ensuring video has stream')
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(e => console.warn('Play failed:', e))
    }
  }, [liveDetectionOn, stream])
  
  // Start/stop live detection interval based on liveDetectionOn state
  useEffect(() => {
    if (liveDetectionOn) {
      console.log('🚀 useEffect: Starting detection loop...')
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current)
      }
      
      const runDetection = () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        const overlayCanvas = overlayCanvasRef.current
        
        if (!video || !canvas || !overlayCanvas) {
          console.log('runDetection check failed:', { video: !!video, canvas: !!canvas, overlayCanvas: !!overlayCanvas })
          return
        }

        // Check if video is ready
        if (video.readyState < 2) {
          console.log('Video not ready yet, readyState:', video.readyState)
          return
        }

        console.log('Processing live frame...', { videoWidth: video.videoWidth, videoHeight: video.videoHeight })

        // Capture frame from video
        const width = video.videoWidth || 640
        const height = video.videoHeight || 480
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, width, height)

        // Convert to blob and send to backend
        canvas.toBlob(async (blob) => {
          if (!blob) return
          
          console.log('Sending frame to backend, size:', blob.size)
          
          try {
            const formData = new FormData()
            formData.append('file', blob, 'frame.jpg')
            const res = await fetch(`${BACKEND_URL}/predict`, { method: 'POST', body: formData })
            
            if (!res.ok) {
              console.error('Backend response not OK:', res.status)
              return
            }
            
            const data = await res.json()
            console.log('Detection result:', data)
            
            const detections = data.detections || []
            const healthy = data.counts?.['Healthy'] || 0
            const grasserie = data.counts?.['Grasserie'] || 0
            const total = healthy + grasserie

            // Update live stats
            setLiveStats({ healthy, grasserie, total })

            // Draw bounding boxes on overlay canvas
            overlayCanvas.width = width
            overlayCanvas.height = height
            const overlayCtx = overlayCanvas.getContext('2d')
            overlayCtx.clearRect(0, 0, width, height)
            
            console.log('Drawing', detections.length, 'bounding boxes')
            
            detections.forEach(d => {
              const [x1, y1, x2, y2] = d.bbox
              const color = d.class_name === 'Healthy' ? '#22c55e' : '#ef4444'
              
              // Draw box
              overlayCtx.strokeStyle = color
              overlayCtx.lineWidth = 3
              overlayCtx.strokeRect(x1, y1, x2 - x1, y2 - y1)
              
              // Draw label background
              const label = `${d.class_name} ${Math.round(d.confidence * 100)}%`
              overlayCtx.font = 'bold 14px Inter, sans-serif'
              const textWidth = overlayCtx.measureText(label).width
              overlayCtx.fillStyle = color
              overlayCtx.fillRect(x1, Math.max(0, y1 - 22), textWidth + 12, 22)
              
              // Draw label text
              overlayCtx.fillStyle = 'white'
              overlayCtx.fillText(label, x1 + 6, Math.max(16, y1 - 6))
            })
          } catch (err) {
            console.error('Live detection frame error:', err)
          }
        }, 'image/jpeg', 0.9)
      }
      
      liveIntervalRef.current = setInterval(() => {
        console.log('⏰ Interval tick - calling runDetection')
        runDetection()
      }, 500)
      console.log('✅ Detection interval started:', liveIntervalRef.current)
    } else {
      console.log('🛑 useEffect: Stopping detection loop')
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current)
        liveIntervalRef.current = null
      }
    }
    
    // Cleanup on unmount or when liveDetectionOn changes
    return () => {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current)
        liveIntervalRef.current = null
      }
    }
  }, [liveDetectionOn])
  
  useEffect(() => () => {
    stream?.getTracks().forEach(t => t.stop())
    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current)
  }, [])

  const captureFrame = () => {
    const video = videoRef.current, canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg')
    canvas.toBlob(blob => { setCaptured(dataUrl); setCapturedBlob(blob); stopCamera(); runInference(blob) }, 'image/jpeg')
  }

  const handleUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { setCaptured(ev.target.result); setCapturedBlob(file); setResult(null); runInference(file) }
    reader.readAsDataURL(file)
  }

  const runInference = async (imageBlob) => {
    setScanning(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', imageBlob, 'image.jpg')
      const res = await fetch(`${BACKEND_URL}/predict`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`Backend status ${res.status}`)
      const data = await res.json()
      setBackendOnline(true)
      const infected = data.counts?.['Grasserie'] || 0
      const healthy = data.counts?.['Healthy'] || 0
      const total = data.total || (infected + healthy)
      const maxConf = data.detections?.length > 0
        ? Math.max(...data.detections.map(d => d.confidence))
        : 0.95
      const r = {
        detections: data.detections || [],
        counts: data.counts || {},
        total: total,
        annotatedImage: data.annotated_image || null,
        result: data.result || (infected > 0 ? 'Grasserie' : 'Healthy'),
        confidence: data.confidence || Math.round(maxConf * 100),
      }
      setResult(r)
      addToast(
        `AI Scan: ${r.total} worms — ${healthy} Healthy, ${infected} Grasserie`,
        infected > 0 ? 'warning' : 'success'
      )
    } catch (err) {
      console.warn('Real AI prediction failed, using fallback:', err)
      await new Promise(r => setTimeout(r, 1200))
      const r = {
        detections: [],
        counts: { Healthy: 12, Grasserie: 3 },
        total: 15,
        annotatedImage: null,
        result: 'Grasserie',
        confidence: 94,
      }
      setResult(r)
      addToast('AI Scan (demo): 15 worms — 12 Healthy, 3 Grasserie', 'warning')
    } finally {
      setScanning(false)
    }
  }

  const reset = () => { setCaptured(null); setCapturedBlob(null); setResult(null); stopCamera() }

  const isInfected = (result?.counts?.['Grasserie'] || 0) > 0
  const activeBatch = batches.find(b => b.id === selectedBatch) || batches[0]

  const card = { background:"white", borderRadius:10, border:"1px solid #e2e8f0", boxShadow:"0 1px 2px rgba(0,0,0,0.04)" }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, fontFamily:"Inter,sans-serif", color:"#0f172a" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:"#0f172a" }}>AI Diagnostics</div>
          <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>Detect diseases early and protect your silkworms</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {/* Batch selector */}
          <div style={{ ...card, padding:"8px 14px", display:"flex", flexDirection:"column", gap:2, minWidth:160 }}>
            <div style={{ fontSize:10.5, color:"#94a3b8" }}>Batch</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:14, fontWeight:800, color:"#0f172a" }}>{selectedBatch}</span>
              <span style={{ background:"#dcfce7", color:"#16a34a", fontSize:9.5, fontWeight:700, padding:"1px 7px", borderRadius:20, border:"1px solid #bbf7d0" }}>Active</span>
              <ChevronDown size={12} color="#94a3b8"/>
            </div>
          </div>
          <div style={{ position:"relative" }}>
            <div style={{ width:32,height:32,borderRadius:7,background:"white",border:"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Bell size={14} color="#64748b"/>
            </div>
            <span style={{ position:"absolute",top:-3,right:-3,background:"#ef4444",color:"white",fontSize:8,fontWeight:800,borderRadius:"50%",width:13,height:13,display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid white" }}>2</span>
          </div>
          <div style={{ width:32,height:32,borderRadius:7,background:"white",border:"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Calendar size={14} color="#64748b"/>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11.5,fontWeight:600,color:"#0f172a" }}>{dateStr}</div>
            <div style={{ fontSize:10.5,color:"#94a3b8" }}>{timeStr}</div>
          </div>
        </div>
      </div>

      {/* Row 1: Live Tray + AI Results */}
      <div style={{ display:"grid", gridTemplateColumns:"1.1fr 1fr", gap:12 }}>

        {/* Live Tray Scan */}
        <div style={{ ...card, padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>
                {liveDetectionOn ? "🔴 Live Detection" : "Live Tray Scan"}
              </span>
              {liveDetectionOn && (
                <div style={{ display:"flex", alignItems:"center", gap:4, background:"#fef2f2", border:"1px solid #fecaca", borderRadius:20, padding:"2px 8px" }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:"#ef4444", animation:"pulse 1.5s ease-in-out infinite" }}/>
                  <span style={{ fontSize:10.5, color:"#ef4444", fontWeight:600 }}>Recording</span>
                </div>
              )}
              {!liveDetectionOn && !cameraOn && !captured && (
                <div style={{ display:"flex", alignItems:"center", gap:4, background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:20, padding:"2px 8px" }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:"#16a34a" }}/>
                  <span style={{ fontSize:10.5, color:"#16a34a", fontWeight:600 }}>Ready</span>
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {liveDetectionOn && (
                <>
                  <button onClick={isFullscreen ? exitFullscreen : enterFullscreen}
                    style={{ padding:"5px 12px", borderRadius:7, background:"white", color:"#475569", border:"1px solid #e2e8f0", fontSize:11.5, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                    {isFullscreen ? "⤓ Exit Fullscreen" : "⛶ Fullscreen"}
                  </button>
                  <button onClick={stopLiveDetection}
                    style={{ padding:"5px 12px", borderRadius:7, background:"#ef4444", color:"white", border:"none", fontSize:11.5, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                    ⬛ Stop Live
                  </button>
                </>
              )}
              {!liveDetectionOn && (
                <>
                  {availableCameras.length > 1 && (
                    <select value={selectedCamera} onChange={(e) => setSelectedCamera(e.target.value)}
                      style={{ padding:"5px 10px", borderRadius:7, border:"1px solid #e2e8f0", background:"white", fontSize:11.5, fontWeight:600, color:"#475569", cursor:"pointer" }}>
                      {availableCameras.map(cam => (
                        <option key={cam.deviceId} value={cam.deviceId}>
                          {cam.label || `Camera ${availableCameras.indexOf(cam) + 1}`}
                        </option>
                      ))}
                    </select>
                  )}
                  <button onClick={captured ? reset : startLiveDetection}
                    style={{ padding:"5px 12px", borderRadius:7, background: captured ? "white" : "#16a34a", color: captured ? "#475569" : "white", border: captured ? "1px solid #e2e8f0" : "none", fontSize:11.5, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                    {captured ? "New Scan" : "Start Live Detection"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Image area */}
          <div ref={fullscreenContainerRef} style={{ position:"relative", borderRadius:10, overflow:"hidden", height: isFullscreen ? "100vh" : 220, background:"#1a2e1a", cursor: liveDetectionOn ? "default" : "pointer" }}
            onClick={() => !cameraOn && !captured && !liveDetectionOn && startCamera()}>

            {/* Live Detection Mode */}
            {liveDetectionOn && (
              <div style={{ position:"relative", width:"100%", height:"100%", background:"#000" }}>
                <video 
                  key="live-detection-video"
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  style={{ width:"100%", height:"100%", objectFit:"contain", display:"block", background:"#000" }}
                />
                <canvas ref={overlayCanvasRef} style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", pointerEvents:"none" }}/>
                
                {/* Live stats overlay */}
                <div style={{ position:"absolute", top: isFullscreen ? 24 : 8, left: isFullscreen ? 24 : 8, background:"rgba(0,0,0,0.85)", color:"white", padding: isFullscreen ? "16px 24px" : "8px 12px", borderRadius: isFullscreen ? 12 : 8, backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ fontSize: isFullscreen ? 13 : 10, color:"#94a3b8", marginBottom: isFullscreen ? 8 : 4, fontWeight:600, letterSpacing:1 }}>LIVE COUNT</div>
                  <div style={{ display:"flex", gap: isFullscreen ? 24 : 12, fontSize: isFullscreen ? 32 : 18, fontWeight:800 }}>
                    <span style={{ color:"#22c55e" }}>🟢 {liveStats.healthy}</span>
                    <span style={{ color:"#ef4444" }}>🔴 {liveStats.grasserie}</span>
                  </div>
                  <div style={{ fontSize: isFullscreen ? 15 : 11, color:"#94a3b8", marginTop: isFullscreen ? 8 : 2, fontWeight:500 }}>Total: {liveStats.total} worms detected</div>
                </div>

                {/* Recording indicator */}
                <div style={{ position:"absolute", bottom: isFullscreen ? 24 : 8, left: isFullscreen ? 24 : 8, background:"rgba(239,68,68,0.95)", color:"white", fontSize: isFullscreen ? 14 : 11, padding: isFullscreen ? "8px 16px" : "4px 10px", borderRadius: isFullscreen ? 8 : 6, fontWeight:700, display:"flex", alignItems:"center", gap: isFullscreen ? 8 : 6, border:"1px solid rgba(255,255,255,0.2)" }}>
                  <div style={{ width: isFullscreen ? 10 : 8, height: isFullscreen ? 10 : 8, borderRadius:"50%", background:"white", animation:"pulse 1.5s ease-in-out infinite" }}/>
                  LIVE DETECTION
                </div>

                {/* Timestamp */}
                <div style={{ position:"absolute", bottom: isFullscreen ? 24 : 8, right: isFullscreen ? 24 : 8, background:"rgba(0,0,0,0.75)", color:"white", fontSize: isFullscreen ? 13 : 10, padding: isFullscreen ? "8px 14px" : "3px 8px", borderRadius: isFullscreen ? 8 : 5, fontWeight:600, border:"1px solid rgba(255,255,255,0.1)" }}>
                  {timeFullStr}
                </div>

                {/* Fullscreen controls overlay */}
                {isFullscreen && (
                  <div style={{ position:"absolute", top:24, right:24, display:"flex", gap:12 }}>
                    <button onClick={exitFullscreen}
                      style={{ padding:"10px 20px", borderRadius:8, background:"rgba(255,255,255,0.15)", color:"white", border:"1px solid rgba(255,255,255,0.3)", fontSize:14, fontWeight:600, cursor:"pointer", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", gap:8 }}>
                      ⤓ Exit Fullscreen
                    </button>
                    <button onClick={stopLiveDetection}
                      style={{ padding:"10px 20px", borderRadius:8, background:"rgba(239,68,68,0.9)", color:"white", border:"1px solid rgba(255,255,255,0.2)", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                      ⬛ Stop
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Default silkworm image with detection boxes */}
            {!cameraOn && !captured && !liveDetectionOn && (
              <>
                <img src="/images/silkworm-detection.jpg" alt="Silkworm tray"
                  style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                {/* Segmentation-style ellipse overlay (demo placeholder) */}
                <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} viewBox="0 0 520 220">
                  <defs>
                    <filter id="glow-green" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="glow-red" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="glow-orange" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>

                  {/* Green ellipses - healthy */}
                  {[
                    [55,  40,  45, 30],
                    [167, 32,  47, 27],
                    [290, 32,  50, 27],
                    [410, 32,  50, 27],
                    [487, 32,  27, 27],
                    [47,  110, 42, 30],
                    [45,  180, 40, 30],
                    [245, 180, 45, 30],
                    [470, 87,  40, 27],
                    [477, 170, 37, 30],
                  ].map(([cx,cy,rx,ry],i) => (
                    <g key={`g${i}`}>
                      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(34,197,94,0.22)" stroke="#22c55e" strokeWidth={1.5} filter="url(#glow-green)"/>
                      <rect x={cx-18} y={cy-ry-14} width={36} height={13} rx={4} fill="rgba(34,197,94,0.92)"/>
                      <text x={cx} y={cy-ry-4} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold" fontFamily="Inter,sans-serif">Healthy</text>
                    </g>
                  ))}

                  {/* Orange ellipses - suspected */}
                  {[
                    [165, 102, 50, 32],
                    [285,  97, 55, 32],
                  ].map(([cx,cy,rx,ry],i) => (
                    <g key={`o${i}`}>
                      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(245,158,11,0.22)" stroke="#f59e0b" strokeWidth={1.5} filter="url(#glow-orange)"/>
                      <rect x={cx-22} y={cy-ry-14} width={44} height={13} rx={4} fill="rgba(245,158,11,0.92)"/>
                      <text x={cx} y={cy-ry-4} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold" fontFamily="Inter,sans-serif">Suspected</text>
                    </g>
                  ))}

                  {/* Red ellipses - infected */}
                  {[
                    [220, 165, 60, 35],
                    [395, 145, 55, 35],
                  ].map(([cx,cy,rx,ry],i) => (
                    <g key={`r${i}`}>
                      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(239,68,68,0.25)" stroke="#ef4444" strokeWidth={2} filter="url(#glow-red)"/>
                      <rect x={cx-26} y={cy-ry-14} width={52} height={13} rx={4} fill="rgba(239,68,68,0.92)"/>
                      <text x={cx} y={cy-ry-4} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold" fontFamily="Inter,sans-serif">Grasserie</text>
                    </g>
                  ))}
                </svg>
                {/* Timestamp overlay */}
                <div style={{ position:"absolute", bottom:8, left:8, background:"rgba(0,0,0,0.65)", color:"white", fontSize:10, padding:"3px 8px", borderRadius:5 }}>
                  <div style={{ fontWeight:600 }}>{timeFullStr}</div>
                  <div>{dateStr}</div>
                </div>
                {/* Auto capture pill */}
                <div style={{ position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20 }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:"#22c55e" }}/>
                  <span style={{ fontSize:10.5, color:"white", fontWeight:600 }}>Auto Capture: ON</span>
                </div>
              </>
            )}

            {/* Camera live (for manual capture mode only, not live detection) */}
            {cameraOn && !liveDetectionOn && (
              <>
                <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                <div style={{ position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.6)",color:"#22c55e",fontSize:10.5,padding:"3px 10px",borderRadius:20,fontWeight:600 }}>
                  Live · Position silkworm in frame
                </div>
              </>
            )}

            {/* Uploaded image — show annotated version if available */}
            {captured && (
              <>
                <img
                  src={result?.annotatedImage ? `data:image/png;base64,${result.annotatedImage}` : captured}
                  alt="captured"
                  style={{ width:"100%",height:"100%",objectFit:"cover" }}
                />
                {scanning && (
                  <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10 }}>
                    <div style={{ width:36,height:36,border:"3px solid rgba(34,197,94,0.3)",borderTop:"3px solid #22c55e",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
                    <div style={{ color:"white",fontSize:12,fontWeight:600 }}>Analyzing...</div>
                  </div>
                )}
              </>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display:"none" }}/>

          {/* Action buttons row */}
          <div style={{ display:"flex", gap:8 }}>
            {!liveDetectionOn && !captured && (
              <>
                <button onClick={startLiveDetection}
                  style={{ flex:2, padding:"10px", borderRadius:7, background:"#16a34a", color:"white", border:"none", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, boxShadow:"0 2px 8px rgba(22,163,74,0.3)" }}>
                  Start Live Detection
                </button>
                <button onClick={()=>fileRef.current?.click()}
                  style={{ flex:1, padding:"7px", borderRadius:7, background:"white", color:"#475569", border:"1px solid #e2e8f0", fontSize:11.5, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <Upload size={12}/> Upload
                </button>
              </>
            )}
            {captured && !scanning && (
              <>
                <button onClick={reset} style={{ flex:1, padding:"7px", borderRadius:7, background:"white", color:"#475569", border:"1px solid #e2e8f0", fontSize:11.5, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <RefreshCw size={11}/> New Scan
                </button>
                <button onClick={()=>fileRef.current?.click()} style={{ flex:1, padding:"7px", borderRadius:7, background:"white", color:"#475569", border:"1px solid #e2e8f0", fontSize:11.5, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <Upload size={11}/> Upload
                </button>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleUpload}/>

          {/* Worm stats row */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid #f1f5f9", paddingTop:8 }}>
            {[
              { dot:"#22c55e", label:"Healthy", pct: liveDetectionOn ? `${liveStats.healthy}` : (result ? `${result.counts?.['Healthy'] || 0}` : "—"), count: liveDetectionOn ? `(${liveStats.total > 0 ? Math.round((liveStats.healthy/liveStats.total)*100) : 0}%)` : (result?.total ? `(${Math.round(((result.counts?.['Healthy'] || 0)/result.total)*100)}%)` : "") },
              { dot:"#f59e0b", label:"Suspected", pct: "—", count:"" },
              { dot:"#ef4444", label:"Infected", pct: liveDetectionOn ? `${liveStats.grasserie}` : (result ? `${result.counts?.['Grasserie'] || 0}` : "—"), count: liveDetectionOn ? `(${liveStats.total > 0 ? Math.round((liveStats.grasserie/liveStats.total)*100) : 0}%)` : (result?.total ? `(${Math.round(((result.counts?.['Grasserie'] || 0)/result.total)*100)}%)` : "") },
            ].map(({dot,label,pct,count})=>(
              <div key={label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:7,height:7,borderRadius:"50%",background:dot }}/>
                <div>
                  <span style={{ fontSize:11, color:"#475569" }}>{label}</span>
                  <div style={{ fontSize:11.5, fontWeight:700, color:"#0f172a" }}>{pct} <span style={{ color:"#94a3b8", fontWeight:400 }}>{count}</span></div>
                </div>
              </div>
            ))}
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10.5, color:"#94a3b8" }}>Total Worms</div>
              <div style={{ fontSize:16, fontWeight:800, color:"#0f172a" }}>{liveDetectionOn ? liveStats.total : (result ? result.total : "—")}</div>
            </div>
          </div>
        </div>

        {/* AI Detection Results */}
        <div style={{ ...card, padding:"14px 16px", display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>AI Detection Results</div>

          {/* No scan yet */}
          {!result && !scanning && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, padding:"40px 20px", background:"#f8fafc", borderRadius:9, border:"1px dashed #e2e8f0" }}>
              <div style={{ fontSize:32 }}>🔬</div>
              <div style={{ fontSize:13, fontWeight:600, color:"#475569", textAlign:"center" }}>No scan performed yet</div>
              <div style={{ fontSize:11.5, color:"#94a3b8", textAlign:"center" }}>Capture or upload a silkworm image to run AI diagnostics</div>
            </div>
          )}

          {/* Scanning */}
          {scanning && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, padding:"40px 20px" }}>
              <div style={{ width:40,height:40,border:"3px solid rgba(22,163,74,0.2)",borderTop:"3px solid #16a34a",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
              <div style={{ fontSize:13, fontWeight:600, color:"#475569" }}>Analyzing image...</div>
              <div style={{ fontSize:11.5, color:"#94a3b8" }}>YOLOv8s silkworm detection</div>
            </div>
          )}

          {/* Results */}
          {result && !scanning && (
            <>
              {/* Status banner */}
              <div style={{ background: isInfected ? "#fff1f2" : "#f0fdf4", border:`1px solid ${isInfected ? "#fecdd3" : "#bbf7d0"}`, borderRadius:9, padding:"12px 14px" }}>
                <div style={{ fontSize:10.5, color: isInfected ? "#ef4444" : "#16a34a", fontWeight:600, marginBottom:4 }}>
                  {isInfected ? "⚠ Disease Detected" : "✓ Healthy Batch"}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:22, fontWeight:800, color:"#0f172a" }}>{result.total} Worms</div>
                    <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>detected in image</div>
                  </div>
                  <div style={{ display:"flex", gap:12 }}>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:20, fontWeight:800, color:"#16a34a" }}>{result.counts?.['Healthy'] || 0}</div>
                      <div style={{ fontSize:10, color:"#64748b" }}>Healthy</div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:20, fontWeight:800, color:"#ef4444" }}>{result.counts?.['Grasserie'] || 0}</div>
                      <div style={{ fontSize:10, color:"#64748b" }}>Grasserie</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px" }}>
                {[
                  ["Infected Worms", `${result.counts?.['Grasserie'] || 0}`, "Scan Status", "Completed", true],
                  ["Total Detected", `${result.total}`, "Model Used", "YOLOv8s", false],
                  ["Healthy Worms", `${result.counts?.['Healthy'] || 0}`, "Scan Time", timeFullStr, false],
                ].map(([l1,v1,l2,v2,showBadge],i) => (
                  <React.Fragment key={i}>
                    <div>
                      <div style={{ fontSize:11, color:"#94a3b8", marginBottom:2 }}>{l1}</div>
                      <div style={{ fontSize:16, fontWeight:700, color:"#0f172a" }}>{v1}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:11, color:"#94a3b8", marginBottom:2 }}>{l2}</div>
                      {showBadge
                        ? <span style={{ background: isInfected ? "#fee2e2" : "#dcfce7", color: isInfected ? "#ef4444" : "#16a34a", border:`1px solid ${isInfected ? "#fecaca" : "#bbf7d0"}`, fontSize:10.5, fontWeight:700, padding:"2px 9px", borderRadius:6 }}>{v2}</span>
                        : <div style={{ fontSize:12, fontWeight:600, color:"#0f172a" }}>{v2}</div>
                      }
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Recommendation */}
              {isInfected && (
                <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:9, padding:"10px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <div style={{ width:28,height:28,borderRadius:7,background:"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <Shield size={13} color="#16a34a"/>
                    </div>
                    <div>
                      <div style={{ fontSize:11.5, fontWeight:700, color:"#16a34a", marginBottom:2 }}>Recommendation</div>
                      <div style={{ fontSize:11, color:"#475569" }}>Remove infected worms immediately to prevent virus spread.</div>
                    </div>
                  </div>
                  <button style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 12px", borderRadius:7, border:"1px solid #bbf7d0", background:"white", fontSize:11.5, fontWeight:600, color:"#16a34a", cursor:"pointer", whiteSpace:"nowrap" }}>
                    View Details <ChevronRight size={11}/>
                  </button>
                </div>
              )}

              {!isInfected && (
                <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:9, padding:"10px 12px", display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:28,height:28,borderRadius:7,background:"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <Shield size={13} color="#16a34a"/>
                  </div>
                  <div style={{ fontSize:11.5, color:"#16a34a", fontWeight:600 }}>All {result.total} worms look healthy. Continue regular monitoring.</div>
                </div>
              )}
            </>
          )}

          {/* Upload another */}
          <div style={{ marginTop:"auto", display:"flex", gap:8 }}>
            <button onClick={()=>fileRef.current?.click()}
              style={{ flex:1, padding:"7px", borderRadius:7, border:"1px solid #e2e8f0", background:"white", fontSize:11.5, fontWeight:600, color:"#475569", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
              <Upload size={11}/> Upload New Image
            </button>
            <button onClick={reset}
              style={{ flex:1, padding:"7px", borderRadius:7, border:"1px solid #e2e8f0", background:"white", fontSize:11.5, fontWeight:600, color:"#475569", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
              <RefreshCw size={11}/> Re-scan
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Disease History + Disease Info + Scan Settings */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>

        {/* Disease History */}
        <div style={{ ...card, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div>
              <span style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>Disease History</span>
              <span style={{ fontSize:11, color:"#94a3b8", marginLeft:5 }}>(This Batch)</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 8px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:11, color:"#475569", cursor:"pointer" }}>
              Last 7 Days <ChevronDown size={10}/>
            </div>
          </div>
          <div style={{ fontSize:10.5, color:"#94a3b8", marginBottom:4 }}>Infected (%)</div>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={HISTORY_DATA} margin={{ top:4, right:4, left:-20, bottom:0 }}>
              <defs>
                <linearGradient id="hist-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15}/>
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize:9.5, fill:"#94a3b8" }} tickLine={false} axisLine={false}/>
              <YAxis tick={{ fontSize:9.5, fill:"#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={v=>`${v}%`}/>
              <Tooltip contentStyle={{ fontSize:11, borderRadius:6, border:"1px solid #e2e8f0" }} formatter={v=>[`${v}%`,"Infected"]}/>
              <Area type="monotone" dataKey="val" stroke="#ef4444" fill="url(#hist-grad)" strokeWidth={2} dot={{ fill:"#ef4444", r:3 }}/>
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
            <div style={{ width:20, height:2, background:"#ef4444", borderRadius:2 }}/>
            <span style={{ fontSize:10.5, color:"#64748b" }}>Grasserie</span>
          </div>
        </div>

        {/* Disease Information */}
        <div style={{ ...card, padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>Disease Information</div>
          <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <div style={{ width:40,height:40,borderRadius:9,background:"#f0fdf4",border:"1px solid #bbf7d0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>🦠</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>Grasserie</div>
              <div style={{ fontSize:11, color:"#64748b", marginTop:2, lineHeight:1.5 }}>
                Caused by Nuclear Polyhedrosis Virus (NPV). Highly contagious and can spread rapidly through a batch.
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#475569", marginBottom:6 }}>Symptoms</div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {["Silkworm becomes reddish and weak","Reduced movement and appetite","Body turns flaccid before death","High mortality in severe cases"].map(s=>(
                <div key={s} style={{ display:"flex", alignItems:"center", gap:7, fontSize:11.5, color:"#475569" }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:"#16a34a",flexShrink:0 }}/>
                  {s}
                </div>
              ))}
            </div>
          </div>
          <button style={{ width:"100%", padding:"8px", borderRadius:7, border:"1px solid #e2e8f0", background:"white", fontSize:12, fontWeight:600, color:"#475569", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5, marginTop:"auto" }}>
            Learn More <ExternalLink size={11}/>
          </button>
        </div>

        {/* Scan Settings */}
        <div style={{ ...card, padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>Scan Settings</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[
              { label:"Camera Source", value:"Tray Camera 01", dropdown:true },
              { label:"AI Model", value:"SilkSphere AI v2.4.1", dropdown:true },
              { label:"Confidence Threshold", value:confidenceThreshold, dropdown:true },
            ].map(({label,value,dropdown})=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:12, color:"#475569" }}>{label}</span>
                <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11.5, fontWeight:600, color:"#0f172a", cursor:"pointer" }}>
                  {value} {dropdown && <ChevronDown size={10} color="#94a3b8"/>}
                </div>
              </div>
            ))}
            {/* Toggles */}
            {[
              { label:"Auto Capture", state:autoCapture, set:setAutoCapture },
              { label:"Alert on Detection", state:alertOnDetection, set:setAlertOnDetection },
            ].map(({label,state,set})=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:12, color:"#475569" }}>{label}</span>
                <label style={{ position:"relative", display:"inline-block", width:38, height:21, cursor:"pointer" }}>
                  <input type="checkbox" checked={state} onChange={e=>set(e.target.checked)} style={{ opacity:0, width:0, height:0 }}/>
                  <span style={{ position:"absolute", inset:0, borderRadius:21, background:state?"#16a34a":"#cbd5e1", transition:"0.2s" }}>
                    <span style={{ position:"absolute", height:15, width:15, left:state?19:3, bottom:3, background:"white", borderRadius:"50%", transition:"0.2s" }}/>
                  </span>
                </label>
              </div>
            ))}
          </div>
          <button style={{ width:"100%", padding:"9px", borderRadius:8, background:"#16a34a", color:"white", border:"none", fontSize:12, fontWeight:700, cursor:"pointer", marginTop:"auto" }}>
            Save Settings
          </button>
        </div>
      </div>

      {/* Row 3: Recent Alerts */}
      <div style={{ ...card, padding:"12px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30,height:30,borderRadius:"50%",background:"#fff7ed",border:"1px solid #fed7aa",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Bell size={13} color="#f59e0b"/>
          </div>
          <span style={{ fontSize:12, fontWeight:700, color:"#0f172a" }}>Recent Alerts</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, marginLeft:20 }}>
          <div style={{ width:32,height:32,borderRadius:7,background:"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <AlertTriangle size={14} color="#ef4444"/>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#0f172a" }}>Grasserie detected</div>
            <div style={{ fontSize:11, color:"#94a3b8" }}>4 infected worms found in tray scan</div>
          </div>
          <div style={{ marginLeft:"auto", textAlign:"right" }}>
            <div style={{ fontSize:11, color:"#475569", fontWeight:600 }}>{timeStr}</div>
            <div style={{ fontSize:10.5, color:"#94a3b8" }}>{dateStr}</div>
          </div>
        </div>
        <button style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", fontSize:12, fontWeight:600, color:"#16a34a", cursor:"pointer", marginLeft:16 }}>
          View All Alerts <ChevronRight size={12}/>
        </button>
      </div>

    </div>
  )
}
