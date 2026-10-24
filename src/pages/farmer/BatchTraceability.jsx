import React from 'react'
import {
  ArrowLeft, CheckCircle, ShieldCheck, MapPin, Calendar, Clock,
  Sparkles, Award, TrendingUp, HeartHandshake, Eye, QrCode,
  FileText, ExternalLink, Leaf, Thermometer, Droplets, Wind, Sun,
  User, Check, ChevronRight
} from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

export default function BatchTraceability({ batch, onBack, onViewEnvHistory }) {
  // Graceful defaults if batch is not supplied
  const b = batch || {
    id: 'SS-2026-0187',
    farmer: 'Himanshu Chib',
    origin: 'Jammu, Jammu & Kashmir, India',
    startDate: '18 Aug 2026',
    harvestDate: '18 Sep 2026',
    quantity: 52,
    grade: 'A',
    status: 'Harvested',
    envScore: 79,
    aiScore: 100,
    instarStage: 'Cocoon Harvest',
  }

  const farmerName = b.farmer || 'Himanshu Chib'
  const origin = b.origin || 'Jammu, Jammu & Kashmir, India'
  const qty = b.quantity || 52
  const grade = b.grade || 'A'
  const envScore = b.envScore || 79
  const aiScore = b.aiScore || 100
  const startDate = b.startDate || '18 Aug 2026'
  const harvestDate = b.harvestDate || '18 Sep 2026'

  // Dynamic story generation based on actual batch attributes
  const narrative = `This batch began on ${startDate} at a dedicated sericulture farm in ${origin.split(',')[0] || 'Jammu'}, where ${farmerName} carefully raised the silkworms with continuous monitoring. Throughout the growth stages, temperature, humidity, and air conditions were tracked, while AI health monitoring helped identify potential risks early. The result was ${qty} kg of high-quality cocoon with an excellent health score (${aiScore}%) and an environmental compliance record of ${envScore}%.`

  const card = {
    background: '#ffffff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    padding: '20px',
  }

  // Micro sparkline data
  const miniSpark = [
    { v: 24 }, { v: 25 }, { v: 26 }, { v: 25.5 }, { v: 27 }, { v: 26.8 }, { v: 26.2 }, { v: 26.8 }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: 'Inter, sans-serif', color: '#0f172a' }}>

      {/* Top Breadcrumb & Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <ArrowLeft size={13} /> Back to My Batches
          </button>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>/</span>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Batch Details</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>/</span>
          <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{b.id}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 20, padding: '4px 12px'
          }}>
            <ShieldCheck size={14} color="#16a34a" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>Verified by SilkSphere</span>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Traceability data recorded throughout lifecycle</div>
        </div>
      </div>

      {/* ── 1. PAGE HEADER — BATCH IDENTITY ── */}
      <div style={{
        ...card,
        padding: '24px 28px',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #fefce8 100%)',
        border: '1px solid #bbf7d0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ flex: '1 1 450px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                background: '#16a34a', color: 'white',
                fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 6, textTransform: 'uppercase'
              }}>
                {b.status === 'listed' ? 'Completed & Listed' : 'Harvested'}
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>From Egg to Cocoon</span>
            </div>

            <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>
              BATCH #{b.id}
            </div>

            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>👨‍🌾 <strong>{farmerName}</strong></span>
              <span>•</span>
              <span>📍 {origin}</span>
              <span>•</span>
              <span>📅 {startDate} – {harvestDate}</span>
            </div>

            <div style={{ display: 'flex', gap: 24, marginTop: 18, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total Production</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{qty} kg</div>
              </div>
              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 20 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Assigned Grade</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#ca8a04', marginTop: 2 }}>Grade {grade}</div>
              </div>
              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 20 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Current Status</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>✓ Ready for Marketplace</div>
              </div>
              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 20 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Verification</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>Verified Source</div>
              </div>
            </div>
          </div>

          {/* Lifecycle Visual Badges */}
          <div style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            minWidth: 260
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Nature's Process, Our Commitment</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {[
                { label: 'Egg' },
                { label: 'Larva' },
                { label: 'Cocoon' },
                { label: 'Harvest' }
              ].map((step, idx) => (
                <React.Fragment key={step.label}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', background: '#f8fafc',
                      border: '2px solid #16a34a', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#16a34a'
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', marginTop: 4 }}>{step.label}</div>
                  </div>
                  {idx < 3 && <span style={{ color: '#16a34a', fontSize: 14, fontWeight: 800 }}>→</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2 & 3. STORY + FARMER PROFILE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr', gap: 14 }}>

        {/* 2. Emotional Story Card */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={16} color="#16a34a" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>The Journey Behind This Cocoon</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Every cocoon has a journey crafted by patient care</div>
              </div>
            </div>

            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#334155', fontStyle: 'normal' }}>
              "{narrative}"
            </p>
          </div>

          <div style={{
            marginTop: 18, paddingTop: 12, borderTop: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 600, fontStyle: 'italic' }}>
              Real care. Real people. Real silk.
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Batch Origin Verified</span>
          </div>
        </div>

        {/* 3. Farmer Profile Card */}
        <div style={{ ...card }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={16} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>The Farmer Behind This Batch</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Dedication and traditional craft meets precision monitoring</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Real photo from user */}
            <div style={{ position: 'relative' }}>
              <img
                src="/images/himanshu.jpg"
                alt={farmerName}
                style={{
                  width: 90, height: 96, borderRadius: 12, objectFit: 'cover',
                  border: '2px solid #bbf7d0', boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                }}
              />
              <span style={{
                position: 'absolute', bottom: -6, right: -6, background: '#16a34a', color: 'white',
                borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, border: '2px solid white'
              }}>✓</span>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{farmerName}</span>
                <span style={{ fontSize: 10, background: '#dcfce7', color: '#16a34a', fontWeight: 700, padding: '2px 8px', borderRadius: 12, border: '1px solid #bbf7d0' }}>
                  Verified Farmer
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} color="#94a3b8" /> {origin}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, fontSize: 11 }}>
                <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 6 }}>
                  <span style={{ color: '#94a3b8' }}>Experience: </span>
                  <strong style={{ color: '#0f172a' }}>5+ Years</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 6 }}>
                  <span style={{ color: '#94a3b8' }}>Batches Produced: </span>
                  <strong style={{ color: '#0f172a' }}>12 Batches</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 6 }}>
                  <span style={{ color: '#94a3b8' }}>Total Yield: </span>
                  <strong style={{ color: '#0f172a' }}>620 kg</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 6 }}>
                  <span style={{ color: '#94a3b8' }}>Compliance: </span>
                  <strong style={{ color: '#16a34a' }}>98.4%</strong>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 14, background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
            fontSize: 11.5, color: '#475569', fontStyle: 'italic', borderLeft: '3px solid #16a34a'
          }}>
            "Growing silk requires patience. Every stage of this batch was monitored from the beginning to harvest."
          </div>
        </div>
      </div>

      {/* ── 4 & 5. ORIGIN + BATCH TRUST SCORE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 14 }}>

        {/* 4. Farm Origin */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={16} color="#d97706" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Farm Origin &amp; Traceability</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Sourced directly from certified sericulture farm</div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, border: '1px solid #e2e8f0', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Location</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>Jammu, Jammu &amp; Kashmir</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>North Sub-Himalayan Sericulture Belt, India</div>
              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 6 }}>
                ✓ Raised and harvested at the source farm
              </div>
            </div>
          </div>

          {/* Traceability Flow: Farm -> Batch -> Cocoon -> Buyer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px'
          }}>
            {[
              { label: 'Farm', icon: '🏡' },
              { label: 'Batch', icon: '📦' },
              { label: 'Cocoon', icon: '🫘' },
              { label: 'Buyer', icon: '🤝' }
            ].map((node, i) => (
              <React.Fragment key={node.label}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18 }}>{node.icon}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{node.label}</div>
                </div>
                {i < 3 && <span style={{ color: '#94a3b8', fontSize: 12 }}>→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 5. Batch Trust Score */}
        <div style={{ ...card }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={16} color="#16a34a" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Batch Trust &amp; Quality Overview</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Objective metrics collected over the lifecycle</div>
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: 20 }}>
              100% Traceable
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Environment Score</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#16a34a', marginTop: 4 }}>{envScore}%</div>
              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>Good Compliance</div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>AI Health Score</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#16a34a', marginTop: 4 }}>{aiScore}%</div>
              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>Excellent Vitality</div>
            </div>

            <div style={{ background: '#fef9c3', borderRadius: 10, padding: '14px', textAlign: 'center', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: 11, color: '#854d0e', fontWeight: 600 }}>Cocoon Grade</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#ca8a04', marginTop: 4 }}>Grade {grade}</div>
              <div style={{ fontSize: 11, color: '#854d0e', fontWeight: 600, marginTop: 2 }}>Premium Silk Quality</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10.5, color: '#94a3b8' }}>Total Production</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{qty} kg</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10.5, color: '#94a3b8' }}>Traceability</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>100% Complete</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10.5, color: '#94a3b8' }}>Lifecycle Status</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#2563eb' }}>Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. ENVIRONMENT HISTORY SUMMARY ── */}
      <div style={{ ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Leaf size={16} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>How the Silkworms Were Raised</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Environmental conditions recorded during incubation and rearing</div>
            </div>
          </div>

          {onViewEnvHistory && (
            <button
              onClick={onViewEnvHistory}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, background: 'none',
                border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px',
                fontSize: 11.5, color: '#16a34a', fontWeight: 600, cursor: 'pointer'
              }}
            >
              View Full Environment History →
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { icon: Thermometer, color: '#ea580c', bg: '#fff7ed', label: 'Temperature', avg: '26.8°C', sub: 'Optimal: 22–26°C', compliance: '94% within healthy range' },
            { icon: Droplets, color: '#2563eb', bg: '#dbeafe', label: 'Humidity', avg: '74.6%', sub: 'Optimal: 70–85%', compliance: '91% within healthy range' },
            { icon: Wind, color: '#9333ea', bg: '#f3e8ff', label: 'CO₂ Level', avg: '1166 ppm', sub: 'Optimal: 800–1500 ppm', compliance: 'Continuous ventilation' },
            { icon: Sun, color: '#d97706', bg: '#fef3c7', label: 'Light (LDR)', avg: '342 lux', sub: 'Optimal: 200–800 lux', compliance: 'Maintained daylight cycle' }
          ].map(env => {
            const Icon = env.icon
            return (
              <div key={env.label} style={{ background: '#f8fafc', borderRadius: 10, padding: 14, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: env.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} color={env.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{env.label}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{env.sub}</div>
                  </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{env.avg}</div>
                <div style={{ fontSize: 10.5, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
                  ✓ {env.compliance}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 7 & 8. COMPLETE SILKWORM LIFECYCLE JOURNEY ── */}
      <div style={{ ...card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={16} color="#16a34a" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Complete Silkworm Lifecycle Journey</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Recorded progression across all instar and metamorphosis stages</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 10 }}>
          {[
            { num: '01', name: 'Egg', date: '18 Aug', duration: '3 days', env: '88%', health: '100%', icon: '🥚', done: true },
            { num: '02', name: 'Instar 1', date: '21 Aug', duration: '3 days', env: '85%', health: '98%', icon: '🐛', done: true },
            { num: '03', name: 'Instar 2', date: '25 Aug', duration: '3 days', env: '82%', health: '97%', icon: '🐛', done: true },
            { num: '04', name: 'Instar 3', date: '30 Aug', duration: '5 days', env: '79%', health: '96%', icon: '🐛', done: true },
            { num: '05', name: 'Instar 4', date: '04 Sep', duration: '5 days', env: '78%', health: '99%', icon: '🐛', done: true },
            { num: '06', name: 'Instar 5', date: '08 Sep', duration: '4 days', env: '81%', health: '99%', icon: '🐛', done: true },
            { num: '07', name: 'Cocoon', date: '12 Sep', duration: '5 days', env: '88%', health: '100%', icon: '🫘', done: true },
            { num: '08', name: 'Harvest', date: '18 Sep', duration: 'Completed', env: '90%', health: '100%', icon: '✨', done: true }
          ].map((stage, idx) => (
            <React.Fragment key={stage.name}>
              <div style={{
                background: '#ffffff',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '12px 14px',
                minWidth: 105,
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#16a34a' }}>{stage.num}</div>
                <div style={{ fontSize: 22, margin: '4px 0' }}>{stage.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{stage.name}</div>
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>{stage.date}</div>
                <div style={{ fontSize: 9.5, color: '#94a3b8' }}>{stage.duration}</div>
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #f1f5f9', fontSize: 9.5, color: '#16a34a', fontWeight: 600 }}>
                  Env: {stage.env}
                </div>
              </div>
              {idx < 7 && (
                <div style={{ width: 18, height: 2, background: '#16a34a', flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── 9, 10 & 11. YIELD STORY & TRACEABILITY TIMELINE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr', gap: 14 }}>

        {/* 9 & 10. Yield Story & Cocoon History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Yield */}
          <div style={{ ...card }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
              From Care to Harvest
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>
              Healthy silkworms. Better yields. Sustainable silk.
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 14
            }}>
              {[
                { label: 'Starting Batch', icon: '🥚' },
                { label: 'Growth', icon: '🌱' },
                { label: 'Healthy Dev.', icon: '🐛' },
                { label: 'Cocoon Formation', icon: '🫘' },
                { label: 'Harvest', icon: '📦' }
              ].map((step, i) => (
                <React.Fragment key={step.label}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16 }}>{step.icon}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', marginTop: 2 }}>{step.label}</div>
                  </div>
                  {i < 4 && <span style={{ color: '#94a3b8', fontSize: 11 }}>→</span>}
                </React.Fragment>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11 }}>
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8 }}>
                <div style={{ color: '#94a3b8' }}>Expected Yield</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>52–60 kg</div>
              </div>
              <div style={{ background: '#dcfce7', padding: '8px 10px', borderRadius: 8 }}>
                <div style={{ color: '#166534' }}>Actual Yield</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>{qty} kg</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8 }}>
                <div style={{ color: '#94a3b8' }}>Yield Difference</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginTop: 3 }}>Within range</div>
              </div>
              <div style={{ background: '#fef9c3', padding: '8px 10px', borderRadius: 8 }}>
                <div style={{ color: '#854d0e' }}>Quality Grade</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#ca8a04', marginTop: 2 }}>Grade {grade}</div>
              </div>
            </div>
          </div>

          {/* Trust Points (12) */}
          <div style={{ ...card }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
              Why Buyers Can Trust This Batch
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                '✓ Verified farm origin',
                '✓ Complete lifecycle record',
                '✓ Environmental conditions monitored',
                '✓ AI-assisted health monitoring',
                '✓ Harvest quantity recorded',
                '✓ Cocoon quality assessed',
                '✓ Traceable batch history',
                '✓ Direct connection to source farmer'
              ].map(pt => (
                <div key={pt} style={{ fontSize: 11.5, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 11. Traceability Timeline */}
        <div style={{ ...card }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Traceability Timeline</div>
            <span style={{ fontSize: 10.5, color: '#94a3b8' }}>Chronological Milestones</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { date: '18 Aug 2026', time: '10:24', title: 'Batch Created', desc: 'Origin farm registered in Jammu' },
              { date: '20 Aug 2026', time: '09:12', title: 'Lifecycle Started', desc: 'Incubation & sensor monitoring initialized' },
              { date: '25 Aug 2026', time: '14:32', title: 'Health Monitoring', desc: 'AI diagnostics verified zero disease anomalies' },
              { date: '30 Aug 2026', time: '19:10', title: 'Environment Recorded', desc: 'Optimal humidity & temperature compliance maintained' },
              { date: '05 Sep 2026', time: '11:45', title: 'Growth Stage Completed', desc: 'Silkworms advanced into Instar 4 successfully' },
              { date: '12 Sep 2026', time: '13:20', title: 'Cocoon Formation', desc: 'Healthy spinning detected and completed' },
              { date: '18 Sep 2026', time: '09:15', title: 'Harvest Recorded', desc: `${qty} kg harvested with high vitality record` },
              { date: '19 Sep 2026', time: '11:00', title: 'Quality Assessment', desc: `Assigned Grade ${grade} based on compliance model` },
              { date: '20 Sep 2026', time: '10:00', title: 'Marketplace Listing', desc: 'Batch verified and listed for buyers' }
            ].map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 70, textAlign: 'right' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{ev.date.slice(0, 6)}</div>
                  <div style={{ fontSize: 9.5, color: '#94a3b8' }}>{ev.time}</div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', marginTop: 4, flexShrink: 0 }} />
                <div style={{ flex: 1, borderBottom: '1px solid #f8fafc', paddingBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{ev.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 13 & 14. CERTIFICATE & FARMER'S NOTE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr', gap: 14 }}>

        {/* 13. Certificate Card */}
        <div style={{
          ...card,
          border: '2px dashed #bbf7d0',
          background: '#fcfdfd',
          position: 'relative',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: '#16a34a', fontWeight: 800 }}>
                SILKSPHERE OFFICIAL VERIFICATION
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
                BATCH CERTIFICATE
              </div>
            </div>
            <div style={{
              width: 50, height: 50, borderRadius: 8, background: '#f1f5f9',
              border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <QrCode size={30} color="#0f172a" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16, fontSize: 11.5 }}>
            <div><span style={{ color: '#94a3b8' }}>Batch ID:</span> <strong>{b.id}</strong></div>
            <div><span style={{ color: '#94a3b8' }}>Farmer:</span> <strong>{farmerName}</strong></div>
            <div><span style={{ color: '#94a3b8' }}>Origin:</span> <strong>{origin}</strong></div>
            <div><span style={{ color: '#94a3b8' }}>Cocoon Yield:</span> <strong>{qty} kg</strong></div>
            <div><span style={{ color: '#94a3b8' }}>Certified Grade:</span> <strong style={{ color: '#ca8a04' }}>Grade {grade}</strong></div>
            <div><span style={{ color: '#94a3b8' }}>Compliance:</span> <strong style={{ color: '#16a34a' }}>{envScore}%</strong></div>
          </div>

          <div style={{
            marginTop: 18, paddingTop: 12, borderTop: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, color: '#94a3b8'
          }}>
            <span>Issued by SilkSphere Sericulture Quality Network</span>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Digitally Verified</span>
          </div>
        </div>

        {/* 14. Farmer's Note */}
        <div style={{
          ...card,
          background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)',
          border: '1px solid #fde68a',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#854d0e', marginBottom: 8 }}>
              A Note From the Farmer
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: '#451a03', fontStyle: 'italic' }}>
              "Every batch takes patience. We watched the conditions every day and cared for the silkworms through every stage. It gives me happiness to know that our hard work reaches people who value quality and sustainability."
            </p>
          </div>
          <div style={{ textAlign: 'right', marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>— {farmerName}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Sericulturist, Jammu</div>
          </div>
        </div>
      </div>

      {/* ── 16. FINAL "FROM FARM TO YOU" ── */}
      <div style={{
        ...card,
        background: '#f8fafc',
        textAlign: 'center',
        padding: '24px 20px'
      }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>From the Farm to You</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Every step of this batch is transparently connected.</div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 16, flexWrap: 'wrap', marginTop: 18
        }}>
          {[
            { label: 'Farm', icon: '🏡' },
            { label: 'Silkworm', icon: '🐛' },
            { label: 'Monitoring', icon: '📡' },
            { label: 'Cocoon', icon: '🫘' },
            { label: 'Quality Check', icon: '🔍' },
            { label: 'Marketplace', icon: '🏪' },
            { label: 'Buyer', icon: '🤝' }
          ].map((item, idx) => (
            <React.Fragment key={item.label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{item.label}</span>
              </div>
              {idx < 6 && <span style={{ color: '#cbd5e1' }}>→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

    </div>
  )
}
