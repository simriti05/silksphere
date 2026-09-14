import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import { Play, Pause, Square, Info, AlertTriangle, Sliders, RefreshCw, Clock } from 'lucide-react'
import { db } from '../../firebase'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default function Simulation() {
  const { sensor, batches, replayState, setReplayState, addToast } = useApp()
  const [historyDocs, setHistoryDocs] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [replayIdx, setReplayIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(1000) // ms per step

  // What-if state
  const activeBatch = batches.find(b => b.status === "active") || batches[0]
  const [sandboxInputs, setSandboxInputs] = useState({
    temp: 25.5,
    humidity: 78,
    co2: 950,
    aiScore: activeBatch?.aiScore || 100
  })
  const [sandboxResult, setSandboxResult] = useState(null)
  const [loadingSandbox, setLoadingSandbox] = useState(false)
  const playIntervalRef = useRef(null)

  // 1. Fetch History from Firestore for Replay
  const loadHistoryData = async () => {
    setLoadingHistory(true)
    let list = []
    try {
      const q = query(collection(db, 'sensor_history'), orderBy('timestamp', 'desc'), limit(50))
      const querySnapshot = await getDocs(q)
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        list.push({
          temperature: data.temperature || data.temp || 25.0,
          humidity: data.humidity || 78.0,
          co2: data.co2 || 900,
          nodeStatus: data.nodeStatus || 'Online',
          zones: data.zones || null,
          timestamp: data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000).toLocaleTimeString() : 'Recent'
        })
      })
      if (list.length > 0) {
        list.reverse()
      }
    } catch (err) {
      console.warn("Failed to load firestore history (falling back to mock history):", err.message)
    }

    if (list.length === 0) {
      for (let i = 0; i < 30; i++) {
        const baseT = +(24 + Math.sin(i / 3) * 2).toFixed(1)
        const baseH = +(75 + Math.cos(i / 4) * 5).toFixed(1)
        const baseC = Math.floor(850 + Math.sin(i / 2) * 100)
        list.push({
          temperature: baseT,
          humidity: baseH,
          co2: baseC,
          nodeStatus: 'Online',
          timestamp: `T - ${i * 5}m`,
          zones: {
            'Zone A': { temperature: baseT, humidity: baseH, co2: baseC },
            'Zone B': { temperature: +(baseT + 0.4).toFixed(1), humidity: baseH - 2, co2: baseC + 40 },
            'Zone C': { temperature: +(baseT - 0.5).toFixed(1), humidity: baseH + 1.5, co2: baseC - 20 },
            'Zone D': { temperature: +(baseT + 0.1).toFixed(1), humidity: baseH - 0.8, co2: baseC + 10 }
          }
        })
      }
    }

    setHistoryDocs(list)
    setReplayIdx(0)
    setLoadingHistory(false)
  }

  useEffect(() => {
    loadHistoryData()
  }, [])

  // Replay ticks
  const startReplay = () => {
    if (historyDocs.length === 0) return
    setIsPlaying(true)
    setReplayState(prev => ({ ...prev, isReplaying: true }))
  }

  const pauseReplay = () => {
    setIsPlaying(false)
  }

  const stopReplay = () => {
    setIsPlaying(false)
    setReplayIdx(0)
    setReplayState({ isReplaying: false, replayedSensor: null })
  }

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setReplayIdx((prevIdx) => {
          const nextIdx = prevIdx + 1
          if (nextIdx >= historyDocs.length) {
            setIsPlaying(false)
            addToast("Replay completed", "success")
            return prevIdx
          }
          return nextIdx
        })
      }, playSpeed)
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
  }, [isPlaying, historyDocs, playSpeed])

  // Sync index to global context replayedSensor
  useEffect(() => {
    if (replayState.isReplaying && historyDocs[replayIdx]) {
      setReplayState(prev => ({
        ...prev,
        replayedSensor: historyDocs[replayIdx]
      }))
    }
  }, [replayIdx, replayState.isReplaying, historyDocs, setReplayState])

  // 2. What-If Sandbox API triggers
  const runSandboxPrediction = useCallback(async () => {
    if (!activeBatch) return
    setLoadingSandbox(true)
    try {
      // Mock historical array containing the sandbox hypothetical values
      const mockHistory = Array.from({ length: 6 }, () => ({
        temp: parseFloat(sandboxInputs.temp),
        humidity: parseFloat(sandboxInputs.humidity),
        co2: parseInt(sandboxInputs.co2),
        timestamp: Date.now() / 1000
      }))

      const res = await fetch(`${BACKEND_URL}/predict-batch-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_stage: activeBatch.instarStage || 'Instar 3',
          days_in_stage: activeBatch.daysInStage || 1.2,
          sensor_history: mockHistory,
          ai_health_score: parseFloat(sandboxInputs.aiScore)
        })
      })

      if (res.ok) {
        const data = await res.json()
        setSandboxResult(data)
      } else {
        throw new Error("API error")
      }
    } catch (err) {
      // Fallback local calculations
      const targetTemp = 26.0, targetHum = 77.0, maxCo2 = 1100
      const tDiff = Math.abs(sandboxInputs.temp - targetTemp)
      const hDiff = Math.abs(sandboxInputs.humidity - targetHum)
      const cDrift = Math.max(0, sandboxInputs.co2 - maxCo2)

      const tempScore = Math.max(0, 100 - (tDiff * 15))
      const humScore = Math.max(0, 100 - (hDiff * 5))
      const co2Score = Math.max(0, 100 - (cDrift * 0.1))

      const envCompliance = (tempScore + humScore + co2Score) / 3
      const overall = (envCompliance * 0.4) + (sandboxInputs.aiScore * 0.6)
      const grade = overall >= 85 ? 'A' : overall >= 70 ? 'B' : overall >= 50 ? 'C' : 'D'

      setSandboxResult({
        predicted_stage_24h: activeBatch.instarStage || 'Instar 3',
        predicted_progress_24h: envCompliance > 50 ? 68.0 : 35.0,
        predicted_stage_48h: envCompliance > 50 ? 'Instar 4' : 'Instar 3',
        predicted_progress_48h: envCompliance > 50 ? 12.0 : 45.0,
        expected_cocoon_grade: grade,
        env_compliance_score: Math.round(envCompliance)
      })
    } finally {
      setLoadingSandbox(false)
    }
  }, [sandboxInputs, activeBatch])

  useEffect(() => {
    const debouncer = setTimeout(() => {
      runSandboxPrediction()
    }, 400)
    return () => clearTimeout(debouncer)
  }, [sandboxInputs, runSandboxPrediction])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a' }}>What-If Sandbox & Replay Mode</div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Replay historical parameters or run hypothetical biological stress simulations</div>
      </div>

      {replayState.isReplaying && (
        <div className="alert-banner info" style={{ background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Clock size={16} />
          <span><strong>REPLAY ACTIVE:</strong> The entire dashboard, visual twin, and environment cards are displaying replayed historical state. Click Stop to return to live monitoring.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Column 1: What-If Sandbox */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={18} style={{ color: 'var(--green)' }} />
            <div>
              <div className="section-title">What-If Biological Sandbox</div>
              <div style={{ fontSize: 11, color: '#888' }}>Simulate stress factors to test developmental and cocoon quality impact</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
            {/* Temp Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                <span>Temperature (°C)</span>
                <span style={{ color: sandboxInputs.temp > 29 || sandboxInputs.temp < 21 ? 'var(--red)' : 'var(--green)' }}>{sandboxInputs.temp}°C</span>
              </div>
              <input
                type="range"
                min="16"
                max="34"
                step="0.1"
                value={sandboxInputs.temp}
                onChange={e => setSandboxInputs(p => ({ ...p, temp: parseFloat(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--green)' }}
              />
            </div>

            {/* Humidity Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                <span>Humidity (%)</span>
                <span style={{ color: sandboxInputs.humidity > 88 || sandboxInputs.humidity < 60 ? 'var(--red)' : 'var(--green)' }}>{sandboxInputs.humidity}%</span>
              </div>
              <input
                type="range"
                min="45"
                max="95"
                step="1"
                value={sandboxInputs.humidity}
                onChange={e => setSandboxInputs(p => ({ ...p, humidity: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--green)' }}
              />
            </div>

            {/* CO2 Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                <span>CO₂ Level (ppm)</span>
                <span style={{ color: sandboxInputs.co2 > 1200 ? 'var(--red)' : 'var(--green)' }}>{sandboxInputs.co2} ppm</span>
              </div>
              <input
                type="range"
                min="400"
                max="2000"
                step="50"
                value={sandboxInputs.co2}
                onChange={e => setSandboxInputs(p => ({ ...p, co2: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--green)' }}
              />
            </div>

            {/* AI Scan Health Score Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                <span>AI Health Score (%)</span>
                <span style={{ color: sandboxInputs.aiScore < 75 ? 'var(--red)' : 'var(--green)' }}>{sandboxInputs.aiScore}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                step="1"
                value={sandboxInputs.aiScore}
                onChange={e => setSandboxInputs(p => ({ ...p, aiScore: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--green)' }}
              />
            </div>
          </div>

          {/* Sandbox Prediction Outputs */}
          {sandboxResult && (
            <div style={{
              background: 'var(--bg3)',
              borderRadius: 10,
              padding: 16,
              border: '1px solid var(--border)',
              marginTop: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#666' }}>Simulation Forecast</span>
                {loadingSandbox && <RefreshCw size={12} className="spin" />}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#888' }}>Expected Quality</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    Grade <span className={`badge badge-${sandboxResult.expected_cocoon_grade}`}>{sandboxResult.expected_cocoon_grade}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                    Env Compliance: <strong>{sandboxResult.env_compliance_score}%</strong>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#888' }}>Development Rate</div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: sandboxResult.env_compliance_score >= 80 ? 'var(--green)' : sandboxResult.env_compliance_score >= 50 ? 'var(--gold)' : 'var(--red)',
                    marginTop: 6
                  }}>
                    {sandboxResult.env_compliance_score >= 80 ? "✓ Nominal Progress" :
                     sandboxResult.env_compliance_score >= 50 ? "⚠ Development Delay" :
                     "✗ Critical Risk / Stalled"}
                  </div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                    Next molt: 24h &rarr; <strong>{sandboxResult.predicted_stage_24h}</strong>
                  </div>
                </div>
              </div>

              {sandboxResult.env_compliance_score < 60 && (
                <div style={{
                  fontSize: 11,
                  background: 'rgba(239,83,80,0.08)',
                  border: '1px solid rgba(239,83,80,0.2)',
                  color: 'var(--red)',
                  borderRadius: 6,
                  padding: '8px 10px',
                  display: 'flex',
                  gap: 6
                }}>
                  <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Drastic environmental stressors simulated. Cocoon quality will degrade and mortality rates will spike if conditions are sustained in real life.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Column 2: Replay Mode */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Play size={18} style={{ color: 'var(--green)' }} />
              <div>
                <div className="section-title">Telemetry Replay Player</div>
                <div style={{ fontSize: 11, color: '#888' }}>Step through historical sensor recordings from Firestore</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={loadHistoryData} disabled={loadingHistory}>
              <RefreshCw size={12} className={loadingHistory ? "spin" : ""} />
            </button>
          </div>

          {loadingHistory ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 10 }}>
              <div style={{ width: 28, height: 28, border: '2px solid rgba(76,175,80,0.2)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ fontSize: 12, color: '#888' }}>Retrieving Firestore history...</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Playback Progress */}
              <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#666', fontWeight: 600 }}>Playback Progress:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {replayIdx + 1} / {historyDocs.length}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max={Math.max(0, historyDocs.length - 1)}
                  value={replayIdx}
                  onChange={e => {
                    setReplayIdx(parseInt(e.target.value))
                    if (!replayState.isReplaying) {
                      setReplayState(prev => ({ ...prev, isReplaying: true }))
                    }
                  }}
                  style={{ width: '100%', accentColor: 'var(--green)' }}
                />

                {historyDocs[replayIdx] && (
                  <div style={{ fontSize: 11.5, color: '#555', display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <span>Step Timestamp: <strong>{historyDocs[replayIdx].timestamp}</strong></span>
                    <span style={{ color: 'var(--green)' }}>Temp: {historyDocs[replayIdx].temperature}°C</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
                <button
                  className="btn btn-ghost"
                  style={{ borderRadius: '50%', width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={stopReplay}
                  title="Stop Replay"
                >
                  <Square size={14} fill="#888" stroke="none" />
                </button>

                {isPlaying ? (
                  <button
                    className="btn btn-primary"
                    style={{ borderRadius: '50%', width: 44, height: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={pauseReplay}
                    title="Pause"
                  >
                    <Pause size={18} fill="white" stroke="none" />
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ borderRadius: '50%', width: 44, height: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={startReplay}
                    disabled={historyDocs.length === 0}
                    title="Play"
                  >
                    <Play size={18} fill="white" stroke="none" style={{ marginLeft: 3 }} />
                  </button>
                )}
              </div>

              {/* Speed Controller */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11.5, color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Playback speed:</span>
                  <strong>{playSpeed === 2000 ? '0.5x' : playSpeed === 1000 ? '1.0x' : playSpeed === 400 ? '2.5x' : '5.0x'}</strong>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { label: '0.5x', speed: 2000 },
                    { label: '1.0x', speed: 1000 },
                    { label: '2.5x', speed: 400 },
                    { label: '5.0x', speed: 200 }
                  ].map(s => (
                    <button
                      key={s.label}
                      className={`btn btn-sm ${playSpeed === s.speed ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ flex: 1, fontSize: 11, padding: '4px 0' }}
                      onClick={() => setPlaySpeed(s.speed)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulation Note */}
              <div style={{
                background: 'rgba(76,175,80,0.06)',
                border: '1px solid rgba(76,175,80,0.2)',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                gap: 8,
                fontSize: 11.5,
                color: 'var(--text2)',
                lineHeight: 1.5
              }}>
                <Info size={14} style={{ flexShrink: 0, color: 'var(--green)', marginTop: 2 }} />
                <span>
                  Replay maps historical Firestore telemetry back to the UI. Navigate to the main <strong>Dashboard</strong> or <strong>Environment</strong> tabs while replay is active to see gauges, twin trays, and charts animate the historical events!
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
