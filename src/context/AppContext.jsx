import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../firebase'
import { doc, setDoc, addDoc, collection, serverTimestamp, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore'

const APP_VERSION = '1.0.0'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

const DEMO_USERS = [
  { id: 'demo-farmer', name: 'Demo Farmer', email: 'farmer@silk.com', password: 'demo123', role: 'farmer', phone: '9876543210', state: 'Karnataka', farmName: 'Green Silk Farm' },
  { id: 'demo-buyer', name: 'Demo Buyer', email: 'buyer@silk.com', password: 'demo123', role: 'buyer', phone: '9876543211', companyName: 'Silk Industries Ltd' },
]

const MOCK_BATCHES = [
  { id: 'SS-2026-0042', farmName: 'Green Silk Farm', instarStage: 'Instar 3', envScore: 88, aiScore: 100, grade: 'A', status: 'listed', price: 3200, quantity: 45, farmer: 'Demo Farmer', farmerId: 'demo-farmer', vitality: [82,85,88,87,90,92,100] },
  { id: 'SS-2026-0043', farmName: 'Green Silk Farm', instarStage: 'Instar 4', envScore: 82, aiScore: 95, grade: 'A', status: 'listed', price: 3000, quantity: 38, farmer: 'Demo Farmer', farmerId: 'demo-farmer', vitality: [78,80,82,83,85,90,95] },
  { id: 'SS-2026-0061', farmName: 'Green Silk Farm', instarStage: 'Instar 3', envScore: 79, aiScore: 100, grade: 'B', status: 'active', price: 2600, quantity: 52, farmer: 'Demo Farmer', farmerId: 'demo-farmer', vitality: [70,72,75,77,79,80,100] },
  { id: 'SS-2026-0057', farmName: 'Green Silk Farm', instarStage: 'Instar 2', envScore: 87, aiScore: 90, grade: 'A', status: 'listed', price: 3100, quantity: 41, farmer: 'Demo Farmer', farmerId: 'demo-farmer', vitality: [80,82,84,85,87,88,90] },
  { id: 'SS-2026-0056', farmName: 'Green Silk Farm', instarStage: 'Instar 3', envScore: 65, aiScore: 70, grade: 'C', status: 'active', price: 1800, quantity: 30, farmer: 'Demo Farmer', farmerId: 'demo-farmer', vitality: [60,62,63,65,65,68,70] },
]

const MOCK_ORDERS = [
  { id: 'ORD-001', batchId: 'SS-2026-0042', farmer: 'Demo Farmer', quantity: 20, amount: 64000, status: 'confirmed', date: '2026-03-15', buyerId: 'demo-buyer' },
  { id: 'ORD-002', batchId: 'SS-2026-0057', farmer: 'Demo Farmer', quantity: 15, amount: 46500, status: 'pending', date: '2026-03-18', buyerId: 'demo-buyer' },
]

const MOCK_TRANSACTIONS = [
  { id: 'TXN-001', description: 'Order Payment - ORD-001', method: 'Google Pay', date: '2026-03-15', amount: 64000, type: 'credit', status: 'completed' },
  { id: 'TXN-002', description: 'Withdrawal to Bank', method: 'Bank Transfer', date: '2026-03-12', amount: -15000, type: 'debit', status: 'completed' },
  { id: 'TXN-003', description: 'Order Payment - ORD-002', method: 'UPI', date: '2026-03-18', amount: 46500, type: 'credit', status: 'pending' },
  { id: 'TXN-004', description: 'Added Funds', method: 'Debit Card', date: '2026-03-10', amount: 5000, type: 'credit', status: 'completed' },
  { id: 'TXN-005', description: 'Withdrawal to UPI', method: 'PhonePe UPI', date: '2026-03-08', amount: -2000, type: 'debit', status: 'completed' },
]

const MOCK_ALERTS = [
  { id: 'ALT-001', type: 'warning', message: 'CO₂ level exceeded threshold (1180 ppm)', time: '2 min ago', read: false },
  { id: 'ALT-002', type: 'info', message: 'AI Scan completed for SS-2026-0042 — Healthy', time: '15 min ago', read: false },
]

const LIFECYCLE_STAGES = [
  { id: 0, name: 'Egg', emoji: '🥚', dayRange: 'Day 1–10', description: 'Silkworm eggs incubating at controlled temperature', completed: true, active: false,
    metrics: { temp: '24°C', humidity: '80%', co2: '850 ppm', mortality: '2%' },
    events: [
      { time: 'Mar 1, 2026 08:00', type: 'info', text: 'Egg batch received and placed in incubation chamber' },
      { time: 'Mar 3, 2026 10:30', type: 'success', text: 'Temperature stabilized at 24°C' },
      { time: 'Mar 6, 2026 14:00', type: 'info', text: 'Humidity adjusted to 80%' },
      { time: 'Mar 9, 2026 09:00', text: 'First signs of hatching observed', type: 'success' },
      { time: 'Mar 10, 2026 11:00', type: 'success', text: 'Hatching complete — 98% success rate' },
    ]
  },
  { id: 1, name: 'Instar 1', emoji: '🐛', dayRange: 'Day 11–13', description: 'First instar larvae, extremely delicate', completed: true, active: false,
    metrics: { temp: '25°C', humidity: '82%', co2: '870 ppm', mortality: '1%' },
    events: [
      { time: 'Mar 11, 2026 07:00', type: 'info', text: 'Instar 1 stage commenced' },
      { time: 'Mar 11, 2026 12:00', type: 'success', text: 'First feeding completed — mulberry leaves' },
      { time: 'Mar 12, 2026 08:00', type: 'info', text: 'AI scan: all larvae healthy' },
      { time: 'Mar 13, 2026 16:00', type: 'success', text: 'First molt completed successfully' },
    ]
  },
  { id: 2, name: 'Instar 2', emoji: '🐛', dayRange: 'Day 14–16', description: 'Second instar, increased feeding activity', completed: true, active: false,
    metrics: { temp: '25°C', humidity: '80%', co2: '900 ppm', mortality: '0.5%' },
    events: [
      { time: 'Mar 14, 2026 07:00', type: 'info', text: 'Instar 2 stage commenced' },
      { time: 'Mar 14, 2026 14:00', type: 'success', text: 'Feeding rate increased by 40%' },
      { time: 'Mar 15, 2026 10:00', type: 'warning', text: 'Humidity dipped to 75% — corrected' },
      { time: 'Mar 16, 2026 15:00', type: 'success', text: 'Second molt completed' },
    ]
  },
  { id: 3, name: 'Instar 3', emoji: '🐛', dayRange: 'Day 17–19', description: 'Third instar, rapid growth phase', completed: false, active: true,
    metrics: { temp: '26°C', humidity: '78%', co2: '950 ppm', mortality: '0.3%' },
    events: [
      { time: 'Mar 17, 2026 07:00', type: 'info', text: 'Instar 3 stage commenced' },
      { time: 'Mar 17, 2026 13:00', type: 'success', text: 'Growth rate nominal — 2.3mm/day' },
      { time: 'Mar 18, 2026 09:00', type: 'info', text: 'AI scan: Healthy — 100% confidence' },
      { time: 'Mar 19, 2026 11:00', type: 'warning', text: 'CO₂ spike detected — ventilation adjusted' },
    ]
  },
  { id: 4, name: 'Instar 4', emoji: '🐛', dayRange: 'Day 20–23', description: 'Fourth instar, maximum feeding', completed: false, active: false,
    metrics: { temp: '26°C', humidity: '76%', co2: '980 ppm', mortality: '0.2%' },
    events: []
  },
  { id: 5, name: 'Instar 5', emoji: '🐛', dayRange: 'Day 24–28', description: 'Fifth instar, pre-spinning preparation', completed: false, active: false,
    metrics: { temp: '27°C', humidity: '74%', co2: '1000 ppm', mortality: '0.1%' },
    events: []
  },
  { id: 6, name: 'Spinning', emoji: '🌀', dayRange: 'Day 29–32', description: 'Larvae spinning silk cocoons', completed: false, active: false,
    metrics: { temp: '27°C', humidity: '70%', co2: '1050 ppm', mortality: '0%' },
    events: []
  },
  { id: 7, name: 'Cocoon', emoji: '🫘', dayRange: 'Day 33–35', description: 'Cocoon formation complete, ready for harvest', completed: false, active: false,
    metrics: { temp: '25°C', humidity: '68%', co2: '900 ppm', mortality: '0%' },
    events: []
  },
]

function generateSensor() {
  return {
    temperature: +(24 + Math.random() * 4).toFixed(1),
    humidity: +(70 + Math.random() * 15).toFixed(1),
    co2: Math.floor(800 + Math.random() * 400),
    nodeStatus: 'Online',
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [liveSensor, setLiveSensor] = useState({
    temperature: null,
    humidity: null,
    co2: null,
    nodeStatus: 'Connecting...',
    isReal: false
  })
  const sensor = liveSensor

  const [batches, setBatches] = useState(MOCK_BATCHES)
  const [orders, setOrders] = useState(MOCK_ORDERS)
  const [alerts, setAlerts] = useState(MOCK_ALERTS)
  const [cart, setCart] = useState([])
  const [wallet, setWallet] = useState({ balance: 24500, transactions: MOCK_TRANSACTIONS })
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])

  const removeToast = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), [])

  const [lifecycleStages] = useState(LIFECYCLE_STAGES)
  const [predictions, setPredictions] = useState(null)
  const [controlStatus, setControlStatus] = useState({ fanState: false, manualOverride: false })

  // =========================================================================
  // REAL SENSOR DATA FROM ESP32 VIA BACKEND API
  // Fetches actual sensor readings from your Arduino ESP32
  // =========================================================================
  const fetchRealSensorData = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/sensor-data/latest`)
      if (res.ok) {
        const data = await res.json()

        // If backend explicitly marked as real hardware or has valid readings:
        if (data.nodeStatus && data.nodeStatus.includes('Offline')) {
          setLiveSensor(prev => ({
            ...prev,
            nodeStatus: 'Offline - Waiting for Arduino',
            isReal: false
          }))
          return
        }

        // Update state with actual sensor data
        setLiveSensor({
          temperature: data.temperature ?? null,
          humidity: data.humidity ?? null,
          co2: data.co2 ?? null,
          light: data.light ?? null,
          nodeStatus: data.nodeStatus || 'Online',
          timestamp: Date.now(),
          zones: data.zones || null,
          isReal: true
        })

        // Also update Firestore for other components if data is real
        if (data.temperature != null) {
          try {
            await setDoc(doc(db, 'sensor_data', 'latest'), {
              temperature: data.temperature,
              humidity: data.humidity,
              co2: data.co2,
              light: data.light,
              nodeStatus: data.nodeStatus,
              timestamp: Date.now(),
              zones: data.zones
            })
          } catch (firebaseErr) {
            console.warn("Firebase write skipped:", firebaseErr.message)
          }
        }
      } else {
        setLiveSensor(prev => ({
          ...prev,
          nodeStatus: 'Offline - Backend unreachable',
          isReal: false
        }))
      }
    } catch (err) {
      // Backend not running - set status to offline instead of generating fake numbers
      setLiveSensor(prev => ({
        ...prev,
        nodeStatus: 'Offline - Backend not running',
        isReal: false
      }))
    }
  }, [])

  // Fetch real sensor data from ESP32 via backend every 5s
  useEffect(() => {
    const t = setInterval(() => {
      fetchRealSensorData()
    }, 5000)
    fetchRealSensorData()  // Initial fetch
    return () => clearInterval(t)
  }, [fetchRealSensorData])

  // Subscribe to live sensor data from Firestore
  // Only apply Firestore update if it's fresh (within last 10s) AND no recent ESP32 fetch
  // This prevents Firestore from overwriting live ESP32 data with stale values
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'sensor_data', 'latest'), (docSnap) => {
      if (docSnap.exists()) {
        const fsData = docSnap.data()
        const fsTimestamp = fsData.timestamp || 0
        const ageMs = Date.now() - fsTimestamp
        // Only use Firestore data if it's recent (< 10s old), meaning it came from a real ESP32 push
        if (ageMs < 10000) {
          setLiveSensor(fsData)
        }
      }
    }, (err) => {
      console.warn("Firestore sensor_data/latest listener failed:", err.message)
    })
    return () => unsub()
  }, [])

  // Subscribe to device commands from Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'device_commands', 'status'), (docSnap) => {
      if (docSnap.exists()) {
        setControlStatus(docSnap.data())
      }
    }, (err) => {
      console.warn("device_commands/status listener failed:", err.message)
    })
    return () => unsub()
  }, [])

  // Manual Override/Control function
  const setManualControl = useCallback(async (manualOverride, fanState) => {
    const payload = {
      manualOverride,
      fanState,
      timestamp: Date.now()
    }
    // Update local state directly so UI responds immediately
    setControlStatus(payload)

    try {
      // Send to backend motor-control endpoint
      const response = await fetch('http://localhost:5000/motor-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manual_override: manualOverride,
          motor_enabled: fanState
        })
      })
      
      if (response.ok) {
        console.log('✓ Motor control sent to backend:', { manual_override: manualOverride, motor_enabled: fanState })
      } else {
        console.error('✗ Motor control failed:', response.status)
      }
      
      // Also update Firestore
      await setDoc(doc(db, 'device_commands', 'status'), payload)
      await addDoc(collection(db, 'device_commands'), {
        command: fanState ? 'FAN_ON' : 'FAN_OFF',
        type: manualOverride ? 'manual' : 'auto',
        timestamp: serverTimestamp()
      })
    } catch (err) {
      console.warn("Error setting manual control:", err.message)
    }
  }, [])

  // Closed-loop Automated Rules
  useEffect(() => {
    if (controlStatus.manualOverride) return

    // Stage-based thresholds from SilkSphere spec
    // Instar I-III: tempMax 30°C, Instar IV-V & Cocoon: tempMax 28°C
    const activeBatch = batches.find(b => b.status === 'active') || batches[0]
    const stage = activeBatch?.instarStage || 'Instar 3'
    const isEarlyStage = ['Egg','Instar 1','Instar 2','Instar 3'].includes(stage)
    const tempThreshold = isEarlyStage ? 30.0 : 28.0
    const co2Threshold = 1500

    const needsFan = sensor.temperature > tempThreshold || sensor.co2 > co2Threshold
    if (controlStatus.fanState !== needsFan) {
      const runAutoControl = async () => {
        const payload = {
          manualOverride: false,
          fanState: needsFan,
          timestamp: Date.now()
        }
        // Update local state directly
        setControlStatus(payload)

        try {
          await setDoc(doc(db, 'device_commands', 'status'), payload)
          await addDoc(collection(db, 'device_commands'), {
            command: needsFan ? 'FAN_ON' : 'FAN_OFF',
            type: 'auto',
            timestamp: serverTimestamp()
          })
          addToast(`Closed-loop: Fan automatically turned ${needsFan ? 'ON' : 'OFF'} (Temp: ${sensor.temperature}°C, CO₂: ${sensor.co2} ppm)`, needsFan ? 'warning' : 'success')
        } catch (err) {
          console.warn("Auto control Firestore write error:", err.message)
        }
      }
      runAutoControl()
    }
  }, [sensor.temperature, sensor.co2, controlStatus.manualOverride, controlStatus.fanState, addToast])

  const updatePredictions = useCallback(async (activeBatch) => {
    if (!activeBatch) return
    try {
      const q = query(collection(db, 'sensor_history'), orderBy('timestamp', 'desc'), limit(24))
      const querySnapshot = await getDocs(q)
      const history = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        history.push({
          temp: data.temperature ?? 25.0,
          humidity: data.humidity ?? 78.0,
          co2: data.co2 ?? 900.0,
          timestamp: data.timestamp?.seconds ?? Date.now() / 1000
        })
      })

      if (history.length === 0) {
        history.push({
          temp: sensor.temperature ?? 25.0,
          humidity: sensor.humidity ?? 78.0,
          co2: sensor.co2 ?? 900.0,
          timestamp: Date.now() / 1000
        })
      }

      const res = await fetch(`${BACKEND_URL}/predict-batch-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_stage: activeBatch.instarStage || 'Instar 3',
          days_in_stage: activeBatch.daysInStage || 1.2,
          sensor_history: history.reverse(),
          ai_health_score: activeBatch.aiScore || 100.0
        })
      })
      if (res.ok) {
        const data = await res.json()
        setPredictions(data)
      } else {
        throw new Error(`HTTP error ${res.status}`)
      }
    } catch (err) {
      console.warn("Prediction API failed, using fallback:", err.message)
      const envScore = activeBatch.envScore || 85
      const aiScore = activeBatch.aiScore || 100
      const overall = (envScore * 0.4) + (aiScore * 0.6)
      const grade = overall >= 85 ? 'A' : overall >= 70 ? 'B' : overall >= 50 ? 'C' : 'D'
      setPredictions({
        predicted_stage_24h: activeBatch.instarStage || 'Instar 3',
        predicted_progress_24h: 75.0,
        predicted_stage_48h: activeBatch.instarStage === 'Cocoon' ? 'Cocoon' : 'Instar 4',
        predicted_progress_48h: 15.0,
        expected_cocoon_grade: grade,
        env_compliance_score: envScore
      })
    }
  }, [sensor])

  // Version check + session restore
  useEffect(() => {
    const storedVersion = localStorage.getItem('ss_version')
    if (storedVersion !== APP_VERSION) {
      localStorage.removeItem('ss_session')
      localStorage.setItem('ss_version', APP_VERSION)
    }
    const session = localStorage.getItem('ss_session')
    if (session) {
      try { setUser(JSON.parse(session)) } catch {}
    }
    const existing = JSON.parse(localStorage.getItem('ss_users') || '[]')
    const emails = existing.map(u => u.email)
    const toAdd = DEMO_USERS.filter(u => !emails.includes(u.email))
    if (toAdd.length) localStorage.setItem('ss_users', JSON.stringify([...existing, ...toAdd]))
  }, [])

  // Refresh predictions periodically or when active batch changes
  useEffect(() => {
    const activeBatch = batches.find(b => b.status === "active") || batches[0]
    if (activeBatch) {
      updatePredictions(activeBatch)
    }
  }, [batches, updatePredictions])

  // Periodic predictions poll
  useEffect(() => {
    const activeBatch = batches.find(b => b.status === "active") || batches[0]
    if (!activeBatch) return
    const t = setInterval(() => {
      updatePredictions(activeBatch)
    }, 15000)
    return () => clearInterval(t)
  }, [batches, updatePredictions])



  const login = useCallback((email, password) => {
    const users = JSON.parse(localStorage.getItem('ss_users') || '[]')
    const found = users.find(u => u.email === email && u.password === password)
    if (!found) return 'Invalid email or password'
    const { password: _, ...safe } = found
    setUser(safe)
    localStorage.setItem('ss_session', JSON.stringify(safe))
    return null
  }, [])

  const register = useCallback((name, email, password, role, extra) => {
    const users = JSON.parse(localStorage.getItem('ss_users') || '[]')
    if (users.find(u => u.email === email)) return 'Email already registered'
    const newUser = { id: `user-${Date.now()}`, name, email, password, role, ...extra }
    localStorage.setItem('ss_users', JSON.stringify([...users, newUser]))
    const { password: _, ...safe } = newUser
    setUser(safe)
    localStorage.setItem('ss_session', JSON.stringify(safe))
    return null
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('ss_session')
  }, [])

  const refreshSensor = useCallback(() => setLiveSensor(generateSensor()), [])

  const addBatch = useCallback((batch) => {
    const id = `SS-2026-${String(Math.floor(1000 + Math.random() * 9000))}`
    const newBatch = { ...batch, id, status: 'active', grade: null, aiScore: Math.floor(80 + Math.random() * 20), envScore: Math.floor(75 + Math.random() * 20), vitality: Array.from({length:7}, () => Math.floor(70+Math.random()*30)), farmer: user?.name || 'Farmer', farmerId: user?.id }
    setBatches(p => [newBatch, ...p])
    return id
  }, [user])

  const gradeBatch = useCallback((batchId, grade) => {
    setBatches(p => p.map(b => b.id === batchId ? { ...b, grade, status: 'listed' } : b))
  }, [])

  const addToCart = useCallback((batch) => {
    setCart(p => p.find(b => b.id === batch.id) ? p : [...p, batch])
  }, [])

  const removeFromCart = useCallback((id) => setCart(p => p.filter(b => b.id !== id)), [])

  const placeOrder = useCallback((batchIds) => {
    const newOrders = batchIds.map(batchId => {
      const batch = batches.find(b => b.id === batchId)
      return {
        id: `ORD-${String(Date.now()).slice(-4)}`,
        batchId,
        farmer: batch?.farmer || 'Farmer',
        quantity: batch?.quantity || 10,
        amount: (batch?.price || 2000) * (batch?.quantity || 10),
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        buyerId: user?.id,
      }
    })
    setOrders(p => [...newOrders, ...p])
    setCart([])
  }, [batches, user])

  const addMoney = useCallback((amount, method) => {
    const txn = { id: `TXN-${Date.now()}`, description: 'Added Funds', method, date: new Date().toISOString().split('T')[0], amount: +amount, type: 'credit', status: 'completed' }
    setWallet(p => ({ balance: p.balance + +amount, transactions: [txn, ...p.transactions] }))
  }, [])

  const withdrawMoney = useCallback((amount, method, account) => {
    if (+amount > wallet.balance) return 'Insufficient balance'
    if (+amount < 100) return 'Minimum withdrawal is ₹100'
    const txn = { id: `TXN-${Date.now()}`, description: `Withdrawal to ${account}`, method, date: new Date().toISOString().split('T')[0], amount: -+amount, type: 'debit', status: 'completed' }
    setWallet(p => ({ balance: p.balance - +amount, transactions: [txn, ...p.transactions] }))
    return null
  }, [wallet.balance])

  const markAlertsRead = useCallback(() => setAlerts(p => p.map(a => ({ ...a, read: true }))), [])

  return (
    <AppContext.Provider value={{
      user, login, register, logout,
      sensor, refreshSensor,
      batches, addBatch, gradeBatch,
      orders, setOrders,
      alerts, setAlerts, markAlertsRead,
      cart, addToCart, removeFromCart, placeOrder,
      wallet, addMoney, withdrawMoney,
      toasts, addToast, removeToast,
      lifecycleStages,
      predictions, updatePredictions,
      controlStatus, setManualControl,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
