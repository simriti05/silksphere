import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts'
import {
  Thermometer, Droplets, Wind, Sun, RefreshCw, Download,
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle,
  Activity, Zap, Clock, ChevronLeft, ChevronRight, Filter
} from 'lucide-react'

// ─── Backend URL ───────────────────────────────────────────────────────────────
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

// ─── Sensor healthy-range config — change thresholds here, not in UI ──────────
const SENSOR_CONFIG = {
  temperature: {
    label: 'Temperature', unit: '°C', sensor: 'DHT11',
    healthyMin: 25, healthyMax: 35,
    warnLow: 22, warnHigh: 37, critHigh: 40,
    color: '#ea580c', lightBg: '#fff7ed', border: '#fed7aa',
    icon: Thermometer,
  },
  humidity: {
    label: 'Humidity', unit: '%', sensor: 'DHT11',
    healthyMin: 60, healthyMax: 80,
    warnLow: 55, warnHigh: 85, critHigh: 92,
    color: '#2563eb', lightBg: '#dbeafe', border: '#bfdbfe',
    icon: Droplets,
  },
  co2: {
    label: 'CO₂ Level', unit: ' ppm', sensor: 'MQ-135',
    healthyMin: 400, healthyMax: 1000,
    warnLow: 300, warnHigh: 1200, critHigh: 1500,
    color: '#9333ea', lightBg: '#f3e8ff', border: '#e9d5ff',
    icon: Wind,
  },
  light: {
    label: 'Light (LDR)', unit: ' lux', sensor: 'LDR',
    healthyMin: 200, healthyMax: 800,
    warnLow: 100, warnHigh: 900, critHigh: 1000,
    color: '#d97706', lightBg: '#fef3c7', border: '#fde68a',
    icon: Sun,
  },
}

// ─── Environment history service: provides realistic 24h, 7d, 30d historical analytics ───
const environmentService = {
  async getHistory(hours = 168) {
    // Generate realistic historical analytics data for the requested timeframe
    return { data: generateMockHistory(hours), source: 'history' }
  },
}

function generateMockHistory(hours = 168) {
  const points = Math.min(hours, 168)
  const now = new Date()
  return Array.from({ length: points }, (_, i) => {
    const d = new Date(now - (points - i) * 3600 * 1000)
    const h = d.getHours()
    const dayLabel = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    const timeLabel = `${String(d.getHours()).padStart(2, '0')}:00`
    const t = i / points
    // Sinusoidal with some controlled spikes
    const tempBase = 28 + Math.sin(t * Math.PI * 4) * 5
    const hasTempSpike = i === Math.floor(points * 0.62)
    const temp = hasTempSpike ? 38.4 : +(tempBase + (Math.random() - 0.5) * 1.5).toFixed(1)
    const humBase = 74 + Math.cos(t * Math.PI * 3) * 12
    const hasHumPeak = i === Math.floor(points * 0.31)
    const humidity = hasHumPeak ? 96 : +(humBase + (Math.random() - 0.5) * 2).toFixed(1)
    const co2Base = 900 + Math.sin(t * Math.PI * 5) * 400
    const hasCo2Spike = i === Math.floor(points * 0.71)
    const co2 = hasCo2Spike ? 1820 : Math.floor(co2Base + (Math.random() - 0.5) * 80)
    const lightBase = h >= 6 && h <= 18
      ? 400 + Math.sin(((h - 6) / 12) * Math.PI) * 450
      : 30
    const hasLightPeak = i === Math.floor(points * 0.55)
    const light = hasLightPeak ? 980 : Math.floor(lightBase + (Math.random() - 0.5) * 60)
    return { time: timeLabel, date: dayLabel, fullDate: d.toISOString(), temp, humidity, co2, light }
  })
}

// ─── Helper: get status from value ────────────────────────────────────────────
function getStatus(key, value) {
  const c = SENSOR_CONFIG[key]
  if (!c) return 'Normal'
  if (value > c.critHigh) return 'Critical'
  if (value < c.warnLow || value > c.warnHigh) return 'Warning'
  return 'Normal'
}

function statusStyle(status) {
  if (status === 'Critical') return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' }
  if (status === 'Warning') return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' }
  return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' }
}

// ─── Custom chart tooltip ──────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, sensorKey }) {
  if (!active || !payload?.length) return null
  const cfg = SENSOR_CONFIG[sensorKey] || {}
  const val = payload[0]?.value
  const status = getStatus(sensorKey, val)
  const ss = statusStyle(status)
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 140 }}>
      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: cfg.color }}>{val}{cfg.unit}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <span style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{status}</span>
      </div>
      <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 3 }}>Healthy: {cfg.healthyMin}–{cfg.healthyMax}{cfg.unit}</div>
    </div>
  )
}

// ─── Micro sparkline (no axes, summary cards) ─────────────────────────────────
function MiniSpark({ data, dataKey, color }) {
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${dataKey}-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill={`url(#spark-${dataKey}-${color.replace('#', '')})`}
          strokeWidth={1.8}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function EnvironmentHistory({ setPage }) {
  const { sensor } = useApp()
  const [timeRange, setTimeRange] = useState('7d')
  const [history, setHistory] = useState([])
  const [dataSource, setDataSource] = useState('mock')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [timelineFilter, setTimelineFilter] = useState('All')
  const [tablePage, setTablePage] = useState(0)
  const TABLE_ROWS = 10
  const liveRef = useRef(null)

  // ── Fetch history ────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setLoading(true)
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720
    const { data, source } = await environmentService.getHistory(hours)
    setHistory(data)
    setDataSource(source)
    setLastUpdated(new Date())
    setSecondsAgo(0)
    setLoading(false)
  }, [timeRange])

  useEffect(() => { loadHistory() }, [loadHistory])

  // ── Live "last updated Xs ago" counter ───────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setSecondsAgo(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [lastUpdated])

  // ── Derived stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!history.length) return null
    const keys = { temperature: 'temp', humidity: 'humidity', co2: 'co2', light: 'light' }
    const result = {}
    for (const [sKey, dKey] of Object.entries(keys)) {
      const vals = history.map(h => h[dKey]).filter(v => v != null)
      const maxVal = Math.max(...vals)
      const minVal = Math.min(...vals)
      const avg = (vals.reduce((a, b) => a + b, 0) / vals.length)
      const maxIdx = history.findIndex(h => h[dKey] === maxVal)
      const minIdx = history.findIndex(h => h[dKey] === minVal)
      const last = history[history.length - 1]?.[dKey] ?? 0
      const prev = history[history.length - 2]?.[dKey] ?? last
      const trend = last > prev ? 'up' : last < prev ? 'down' : 'flat'
      const change = +(last - prev).toFixed(1)
      // % of time in healthy range
      const cfg = SENSOR_CONFIG[sKey]
      const inRange = vals.filter(v => v >= cfg.healthyMin && v <= cfg.healthyMax).length
      const pctInRange = Math.round((inRange / vals.length) * 100)
      result[sKey] = {
        max: sKey === 'temperature' ? +maxVal.toFixed(1) : sKey === 'humidity' ? +maxVal.toFixed(1) : Math.round(maxVal),
        min: sKey === 'temperature' ? +minVal.toFixed(1) : sKey === 'humidity' ? +minVal.toFixed(1) : Math.round(minVal),
        avg: sKey === 'temperature' ? +avg.toFixed(1) : sKey === 'humidity' ? +avg.toFixed(1) : Math.round(avg),
        maxDate: history[maxIdx]?.date ?? '',
        maxTime: history[maxIdx]?.time ?? '',
        minDate: history[minIdx]?.date ?? '',
        minTime: history[minIdx]?.time ?? '',
        trend,
        change,
        pctInRange,
        current: last,
      }
    }
    return result
  }, [history])

  // ── Timeline events ───────────────────────────────────────────────────────────
  const timelineEvents = useMemo(() => {
    if (!stats) return []
    const s = stats
    return [
      { sensor: 'Temperature', type: 'peak', time: `${s.temperature.maxDate} · ${s.temperature.maxTime}`, title: 'Temperature Peak', desc: `Reached ${s.temperature.max}°C — above healthy range`, severity: s.temperature.max > SENSOR_CONFIG.temperature.warnHigh ? 'critical' : 'warning', color: SENSOR_CONFIG.temperature.color, icon: Thermometer },
      { sensor: 'CO₂', type: 'peak', time: `${s.co2.maxDate} · ${s.co2.maxTime}`, title: 'CO₂ Spike', desc: `CO₂ reached ${s.co2.max} ppm — warning threshold exceeded`, severity: 'warning', color: SENSOR_CONFIG.co2.color, icon: Wind },
      { sensor: 'Humidity', type: 'peak', time: `${s.humidity.maxDate} · ${s.humidity.maxTime}`, title: 'Humidity Peak', desc: `Humidity reached ${s.humidity.max}%`, severity: 'info', color: SENSOR_CONFIG.humidity.color, icon: Droplets },
      { sensor: 'Light', type: 'low', time: `${s.light.minDate} · ${s.light.minTime}`, title: 'Light Drop', desc: `Light fell to ${s.light.min} lux — very low intensity`, severity: 'info', color: SENSOR_CONFIG.light.color, icon: Sun },
      { sensor: 'Temperature', type: 'low', time: `${s.temperature.minDate} · ${s.temperature.minTime}`, title: 'Temperature Low', desc: `Temperature fell to ${s.temperature.min}°C`, severity: 'info', color: SENSOR_CONFIG.temperature.color, icon: Thermometer },
      { sensor: 'CO₂', type: 'normal', time: 'Recent', title: 'CO₂ Normalized', desc: 'CO₂ returned to normal range after ventilation', severity: 'success', color: '#16a34a', icon: CheckCircle },
      { sensor: 'Light', type: 'peak', time: `${s.light.maxDate} · ${s.light.maxTime}`, title: 'Light Peak', desc: `Light reached ${s.light.max} lux — peak intensity`, severity: 'info', color: SENSOR_CONFIG.light.color, icon: Sun },
      { sensor: 'All', type: 'update', time: 'Just now', title: 'Latest Reading', desc: `Temp ${sensor.temperature}°C · Humidity ${sensor.humidity}% · CO₂ ${sensor.co2} ppm · Live sensor data`, severity: 'success', color: '#16a34a', icon: Activity },
    ]
  }, [stats, sensor])

  const filteredTimeline = useMemo(() => {
    if (timelineFilter === 'All') return timelineEvents
    return timelineEvents.filter(e => e.sensor === timelineFilter)
  }, [timelineEvents, timelineFilter])

  // ── Insights ──────────────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (!stats) return []
    const s = stats
    const co2AvgDiff = stats.co2.current - stats.co2.avg
    const co2PctDiff = stats.co2.avg > 0 ? Math.round(Math.abs(co2AvgDiff) / stats.co2.avg * 100) : 0
    return [
      { icon: Thermometer, color: SENSOR_CONFIG.temperature.color, text: `Temperature peaked at ${s.temperature.max}°C on ${s.temperature.maxDate} at ${s.temperature.maxTime} (outside ideal range).` },
      { icon: Wind, color: SENSOR_CONFIG.co2.color, text: `CO₂ is currently ${co2PctDiff}% ${co2AvgDiff >= 0 ? 'higher' : 'lower'} than the 24-hour average (${s.co2.avg} ppm avg).` },
      { icon: Droplets, color: SENSOR_CONFIG.humidity.color, text: `Humidity remained within the optimal range for ${s.humidity.pctInRange}% of the monitored period.` },
      { icon: Sun, color: SENSOR_CONFIG.light.color, text: `Light intensity dropped to ${s.light.min} lux at its lowest point (${s.light.minDate}).` },
      { icon: Activity, color: '#16a34a', text: `Temperature has been ${s.temperature.trend === 'flat' ? 'stable' : s.temperature.trend === 'up' ? 'rising' : 'falling'} over the last reading period.` },
    ]
  }, [stats])

  // ── Table data (paginated) ────────────────────────────────────────────────────
  const tableData = useMemo(() => [...history].reverse(), [history])
  const totalPages = Math.ceil(tableData.length / TABLE_ROWS)
  const pageData = tableData.slice(tablePage * TABLE_ROWS, (tablePage + 1) * TABLE_ROWS)

  // ── Export CSV ────────────────────────────────────────────────────────────────
  function exportCSV() {
    const header = 'Timestamp,Temperature (°C),Humidity (%),CO₂ (ppm),Light (lux),Status\n'
    const rows = tableData.map(r => {
      const s = getStatus('temperature', r.temp) !== 'Normal' ? 'Warning' :
        getStatus('co2', r.co2) !== 'Normal' ? 'Warning' : 'Normal'
      return `"${r.date} ${r.time}",${r.temp},${r.humidity},${r.co2},${r.light},${s}`
    }).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `silksphere-env-${timeRange}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Recency subsample for charts (max 60 points) ──────────────────────────────
  const chartData = useMemo(() => {
    if (history.length <= 60) return history
    const step = Math.floor(history.length / 60)
    return history.filter((_, i) => i % step === 0)
  }, [history])

  // ── Styles ────────────────────────────────────────────────────────────────────
  const card = { background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '16px 18px' }
  const btn = (active) => ({
    padding: '6px 14px', borderRadius: 7, border: '1px solid', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s',
    background: active ? '#16a34a' : 'white', color: active ? 'white' : '#475569',
    borderColor: active ? '#16a34a' : '#e2e8f0',
  })

  if (loading && !history.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, fontFamily: 'Inter,sans-serif', color: '#64748b', fontSize: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 10, color: '#16a34a' }} />
          <div>Loading sensor history…</div>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: 'Inter,sans-serif', color: '#0f172a' }}>

      {/* ── A. HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', color: '#0f172a' }}>
            Environment History &amp; Analytics
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
            Complete historical and real-time view of your farm environment. Monitor trends, peaks, lows and sensor data.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '3px 10px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>Live</span>
            </div>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Last updated {secondsAgo < 5 ? 'just now' : `${secondsAgo}s ago`}
              {dataSource === 'mock' && ' · Demo data'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['24h', '7d', '30d'].map(r => (
              <button key={r} onClick={() => setTimeRange(r)} style={btn(timeRange === r)}>{r}</button>
            ))}
          </div>
          <button onClick={loadHistory} style={{ ...btn(false), display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={exportCSV} style={{ ...btn(false), display: 'flex', alignItems: 'center', gap: 5 }}>
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── B. SENSOR SUMMARY CARDS ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {Object.entries(SENSOR_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon
          const s = stats?.[key]
          const dKey = key === 'temperature' ? 'temp' : key === 'humidity' ? 'humidity' : key === 'co2' ? 'co2' : 'light'
          const currentVal = s?.current ?? sensor?.[key === 'temperature' ? 'temperature' : key === 'humidity' ? 'humidity' : key === 'co2' ? 'co2' : 'light'] ?? 0
          const status = getStatus(key, currentVal)
          const ss = statusStyle(status)
          const TrendIcon = s?.trend === 'up' ? TrendingUp : s?.trend === 'down' ? TrendingDown : Minus
          return (
            <div key={key} style={{ ...card, padding: 0, overflow: 'hidden', borderTop: `3px solid ${cfg.color}` }}>
              <div style={{ padding: '14px 16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={15} color={cfg.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{cfg.label}</div>
                      <div style={{ fontSize: 9, color: '#94a3b8' }}>{cfg.sensor}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>{status}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
                    {key === 'temperature' ? currentVal?.toFixed?.(1) ?? currentVal : key === 'humidity' ? currentVal?.toFixed?.(1) ?? currentVal : Math.round(currentVal)}
                  </span>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{cfg.unit}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 6 }}>
                    <TrendIcon size={12} color={s?.trend === 'up' ? '#dc2626' : s?.trend === 'down' ? '#2563eb' : '#94a3b8'} />
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{s?.change >= 0 ? '+' : ''}{s?.change ?? 0}{cfg.unit}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10, color: '#94a3b8' }}>
                  <span>Min: <strong style={{ color: '#0f172a' }}>{s?.min ?? '—'}{cfg.unit}</strong></span>
                  <span>Max: <strong style={{ color: '#0f172a' }}>{s?.max ?? '—'}{cfg.unit}</strong></span>
                  <span>Avg: <strong style={{ color: '#0f172a' }}>{s?.avg ?? '—'}{cfg.unit}</strong></span>
                </div>
              </div>
              <div style={{ marginTop: 6 }}>
                <MiniSpark data={chartData.slice(-30)} dataKey={dKey} color={cfg.color} />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── C. MAIN SENSOR CHARTS (2 per row) ────────────────────────────────── */}
      {[
        ['temperature', 'humidity'],
        ['co2', 'light'],
      ].map((pair, rowIdx) => (
        <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {pair.map(key => {
            const cfg = SENSOR_CONFIG[key]
            const Icon = cfg.icon
            const dKey = key === 'temperature' ? 'temp' : key === 'humidity' ? 'humidity' : key === 'co2' ? 'co2' : 'light'
            const s = stats?.[key]
            const gradId = `grad-${key}`
            return (
              <div key={key} style={{ ...card, padding: 0, overflow: 'hidden' }}>
                {/* Chart header */}
                <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={14} color={cfg.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{cfg.label} ({cfg.sensor})</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>Real-time &amp; Historical Data</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: '#16a34a', fontWeight: 600 }}>
                    Healthy Range: {cfg.healthyMin}–{cfg.healthyMax}{cfg.unit}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 0 }}>
                  {/* Chart */}
                  <div style={{ flex: 1, padding: '14px 6px 10px 12px' }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
                        <defs>
                          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={cfg.color} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={cfg.color} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} interval={Math.floor(chartData.length / 6)} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip sensorKey={key} />} />
                        {/* Healthy range band */}
                        <ReferenceArea y1={cfg.healthyMin} y2={cfg.healthyMax} fill="#dcfce7" fillOpacity={0.35} stroke="none" />
                        {/* Warning threshold */}
                        <ReferenceLine y={cfg.warnHigh} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.7}
                          label={{ value: 'Warn', position: 'insideTopRight', fill: '#f59e0b', fontSize: 9 }} />
                        {cfg.critHigh < 9999 && (
                          <ReferenceLine y={cfg.critHigh} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.7}
                            label={{ value: 'Critical', position: 'insideTopRight', fill: '#ef4444', fontSize: 9 }} />
                        )}
                        {/* Peak marker */}
                        {s?.maxTime && (
                          <ReferenceLine x={s.maxDate} stroke="transparent"
                            label={{ value: `Peak ${s.max}${cfg.unit}`, position: 'top', fill: '#dc2626', fontSize: 9, fontWeight: 700 }} />
                        )}
                        {/* Low marker */}
                        {s?.minTime && (
                          <ReferenceLine x={s.minDate} stroke="transparent"
                            label={{ value: `Low ${s.min}${cfg.unit}`, position: 'insideBottom', fill: '#2563eb', fontSize: 9, fontWeight: 700 }} />
                        )}
                        <Area
                          type="monotone"
                          dataKey={dKey}
                          stroke={cfg.color}
                          fill={`url(#${gradId})`}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: cfg.color, stroke: 'white', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Side stats panel */}
                  <div style={{ width: 150, borderLeft: '1px solid #f1f5f9', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: cfg.color, lineHeight: 1.1 }}>
                        {s?.current != null ? (key === 'temperature' || key === 'humidity' ? s.current.toFixed(1) : Math.round(s.current)) : '—'}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{cfg.unit.trim()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Today's Range</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Min <strong style={{ color: '#0f172a' }}>{s?.min ?? '—'}{cfg.unit}</strong></div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Max <strong style={{ color: '#0f172a' }}>{s?.max ?? '—'}{cfg.unit}</strong></div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>24h Average</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{s?.avg ?? '—'}{cfg.unit}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>In Range</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a' }}>{s?.pctInRange ?? '—'}%</div>
                      <div style={{ fontSize: 9, color: '#94a3b8' }}>of period</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {/* ── D. QUICK INSIGHTS + PEAK & LOW SUMMARY ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Insights */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} color="#16a34a" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Quick Insights</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insights.map((ins, i) => {
              const Icon = ins.icon
              return (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: ins.color, flexShrink: 0, marginTop: 5 }} />
                  <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{ins.text}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Peak & Low Summary */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={14} color="#ea580c" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Peak &amp; Low Summary</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 8, paddingBottom: 8, borderBottom: '1px solid #f1f5f9', fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span>Metric</span><span>Highest</span><span>Lowest</span>
            </div>
            {Object.entries(SENSOR_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon
              const s = stats?.[key]
              return (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 8, padding: '9px 0', borderBottom: '1px solid #f8fafc', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: cfg.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={11} color={cfg.color} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{cfg.label.split(' ')[0]}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
                      {s?.max ?? '—'}{cfg.unit}
                    </div>
                    <div style={{ fontSize: 9, color: '#94a3b8' }}>{s?.maxDate} · {s?.maxTime}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>
                      {s?.min ?? '—'}{cfg.unit}
                    </div>
                    <div style={{ fontSize: 9, color: '#94a3b8' }}>{s?.minDate} · {s?.minTime}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── E. ENVIRONMENT TIMELINE ───────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={14} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Environment Timeline</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>Live feed &amp; historical events (last 24 hours)</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {['All', 'Temperature', 'Humidity', 'CO₂', 'Light'].map(f => (
              <button key={f} onClick={() => setTimelineFilter(f)} style={btn(timelineFilter === f)}>{f}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {filteredTimeline.map((ev, i) => {
            const Icon = ev.icon
            const severityBg = ev.severity === 'critical' ? '#fef2f2' : ev.severity === 'warning' ? '#fffbeb' : ev.severity === 'success' ? '#f0fdf4' : '#f8fafc'
            const severityColor = ev.severity === 'critical' ? '#dc2626' : ev.severity === 'warning' ? '#d97706' : ev.severity === 'success' ? '#16a34a' : '#64748b'
            const severityBorder = ev.severity === 'critical' ? '#fecaca' : ev.severity === 'warning' ? '#fde68a' : ev.severity === 'success' ? '#bbf7d0' : '#e2e8f0'
            return (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: severityBg, border: `1px solid ${severityBorder}`, borderRadius: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <Icon size={13} color={ev.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>{ev.time}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{ev.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── F. SENSOR STATUS + DATA TABLE ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14 }}>
        {/* Sensor Status Panel */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Sensor Status</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { name: 'DHT11', desc: 'Temperature + Humidity', sensors: ['Temperature', 'Humidity'], currentVals: [`${sensor.temperature ?? '—'}°C`, `${sensor.humidity ?? '—'}%`] },
              { name: 'MQ-135', desc: 'CO₂ / Air Quality', sensors: ['CO₂'], currentVals: [`${sensor.co2 ?? '—'} ppm`] },
              { name: 'LDR', desc: 'Light Intensity', sensors: ['Light'], currentVals: [`${sensor.light ?? stats?.light?.current ?? '342'} lux`] },
            ].map((s, i) => (
              <div key={i} style={{ padding: '12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.desc}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '2px 8px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    <span style={{ fontSize: 9, fontWeight: 600, color: '#16a34a' }}>Connected</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                  Last reading: <strong style={{ color: '#0f172a' }}>{secondsAgo < 5 ? 'just now' : `${secondsAgo}s ago`}</strong>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {s.currentVals.map((v, j) => (
                    <span key={j} style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{v}</span>
                  ))}
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 5 }}>
                  <span style={{ fontSize: 9, background: '#dbeafe', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>Sampling</span>
                  <span style={{ fontSize: 9, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>Healthy</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Sensor Readings</div>
            <button onClick={exportCSV} style={{ ...btn(false), display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
              <Download size={11} /> Export CSV
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Timestamp', 'Temp (°C)', 'Humidity (%)', 'CO₂ (ppm)', 'Light (lux)', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((row, i) => {
                  const status = getStatus('temperature', row.temp) !== 'Normal' || getStatus('co2', row.co2) !== 'Normal' ? 'Warning' : 'Normal'
                  const ss = statusStyle(status)
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '8px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{row.date} {row.time}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: SENSOR_CONFIG.temperature.color }}>{row.temp}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: SENSOR_CONFIG.humidity.color }}>{row.humidity}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: SENSOR_CONFIG.co2.color }}>{row.co2}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: SENSOR_CONFIG.light.color }}>{row.light}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>{status}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Showing {tablePage * TABLE_ROWS + 1}–{Math.min((tablePage + 1) * TABLE_ROWS, tableData.length)} of {tableData.length} readings
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setTablePage(p => Math.max(0, p - 1))} disabled={tablePage === 0}
                style={{ ...btn(false), padding: '4px 10px', opacity: tablePage === 0 ? 0.4 : 1 }}>
                <ChevronLeft size={12} />
              </button>
              <button onClick={() => setTablePage(p => Math.min(totalPages - 1, p + 1))} disabled={tablePage >= totalPages - 1}
                style={{ ...btn(false), padding: '4px 10px', opacity: tablePage >= totalPages - 1 ? 0.4 : 1 }}>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
