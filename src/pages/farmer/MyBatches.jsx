import React, { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { Plus, X, Award, Bell, Calendar, ChevronRight, ChevronLeft, Search, SlidersHorizontal, FileText } from 'lucide-react'
import BatchTraceability from './BatchTraceability'

const INSTAR_STAGES = ['Egg','Instar 1','Instar 2','Instar 3','Instar 4','Instar 5','Spinning','Cocoon']

// Semi-circle AI health gauge
function AiGauge({ percent }) {
  const size = 64, stroke = 6, r = (size - stroke) / 2
  const circ = Math.PI * r  // half circle
  const offset = circ - (Math.min(percent,100) / 100) * circ
  const color = percent >= 90 ? "#16a34a" : percent >= 70 ? "#f59e0b" : "#ef4444"
  const label = percent >= 90 ? "Excellent" : percent >= 70 ? "Good" : "Fair"
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
      <svg width={size} height={size/2 + 6} viewBox={`0 0 ${size} ${size/2 + 6}`}>
        <path d={`M ${stroke/2} ${r} A ${r} ${r} 0 0 1 ${size - stroke/2} ${r}`}
          fill="none" stroke="#e2e8f0" strokeWidth={stroke} strokeLinecap="round"/>
        <path d={`M ${stroke/2} ${r} A ${r} ${r} 0 0 1 ${size - stroke/2} ${r}`}
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}/>
        <text x="50%" y={r + 4} textAnchor="middle" fontSize={13} fontWeight={700} fill="#0f172a">{percent}%</text>
      </svg>
      <span style={{ fontSize:10.5, color, fontWeight:600, marginTop:-2 }}>{label}</span>
    </div>
  )
}

// Countdown timer
function Countdown({ target }) {
  const [rem, setRem] = useState(target)
  useEffect(() => {
    const t = setInterval(() => setRem(p => p <= 0 ? target : p - 1), 1000)
    return () => clearInterval(t)
  }, [target])
  const h = Math.floor(rem/3600), m = Math.floor((rem%3600)/60), s = rem%60
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")
}

// Env score progress bar
function EnvBar({ score }) {
  const color = score >= 80 ? "#16a34a" : score >= 65 ? "#f59e0b" : "#ef4444"
  const label = score >= 80 ? "Good" : score >= 65 ? "Fair" : "Poor"
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{score}%</span>
        <span style={{ fontSize:11, color, fontWeight:600 }}>{label}</span>
      </div>
      <div style={{ width:"100%", height:5, background:"#e2e8f0", borderRadius:99, overflow:"hidden" }}>
        <div style={{ width:`${score}%`, height:"100%", background:color, borderRadius:99 }}/>
      </div>
    </div>
  )
}

function GradeModal({ batch, onClose }) {
  const { gradeBatch, addToast } = useApp()
  const [grade, setGrade] = useState('')
  const grades = [
    { id:'A', label:'Grade A', sub:'Premium', color:'#ca8a04', bg:'#fef9c3', border:'#fde68a' },
    { id:'B', label:'Grade B', sub:'Standard', color:'#2563eb', bg:'#dbeafe', border:'#93c5fd' },
    { id:'C', label:'Grade C', sub:'Economy', color:'#ea580c', bg:'#ffedd5', border:'#fdba74' },
  ]
  const confirm = () => {
    if (!grade) return
    gradeBatch(batch.id, grade)
    addToast(`Batch ${batch.id} graded ${grade} and listed`, 'success')
    onClose()
  }
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Grade &amp; List Batch</div>
          <button className="modal-close" onClick={onClose}><X size={14}/></button>
        </div>
        <div className="modal-body">
          <div style={{ display:'flex', gap:12, marginBottom:16 }}>
            <div style={{ flex:1, background:'#f8fafc', borderRadius:8, padding:12, textAlign:'center' }}>
              <div style={{ fontSize:11, color:'#94a3b8', marginBottom:3 }}>Env Score</div>
              <div style={{ fontSize:20, fontWeight:800, color:'#16a34a' }}>{batch.envScore}%</div>
            </div>
            <div style={{ flex:1, background:'#f8fafc', borderRadius:8, padding:12, textAlign:'center' }}>
              <div style={{ fontSize:11, color:'#94a3b8', marginBottom:3 }}>AI Health</div>
              <div style={{ fontSize:20, fontWeight:800, color:'#f59e0b' }}>{batch.aiScore}%</div>
            </div>
          </div>
          <div style={{ fontSize:12, color:'#64748b', marginBottom:10 }}>Select Grade</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {grades.map(g => (
              <div key={g.id} onClick={() => setGrade(g.id)} style={{ display:'flex', alignItems:'center', gap:12, padding:12, borderRadius:8, background:grade===g.id?g.bg:'#f8fafc', border:`1px solid ${grade===g.id?g.border:'#e2e8f0'}`, cursor:'pointer', transition:'all 0.15s' }}>
                <div style={{ width:32, height:32, borderRadius:7, background:g.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:g.color }}>{g.id}</div>
                <div>
                  <div style={{ fontWeight:700, color:g.color, fontSize:13 }}>{g.label}</div>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>{g.sub}</div>
                </div>
                {grade===g.id && <span style={{ marginLeft:'auto', color:g.color, fontWeight:700 }}>✓</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!grade} onClick={confirm}><Award size={13}/> Confirm &amp; List</button>
        </div>
      </div>
    </div>
  )
}

function NewBatchModal({ onClose }) {
  const { addBatch, addToast } = useApp()
  const [form, setForm] = useState({ farmName:'', instarStage:'Instar 1', quantity:'', notes:'' })
  const set = (k,v) => setForm(p => ({...p,[k]:v}))
  const submit = (e) => {
    e.preventDefault()
    if (!form.farmName || !form.quantity) return
    const id = addBatch(form)
    addToast(`Batch ${id} created`, 'success')
    onClose()
  }
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">New Batch</div>
          <button className="modal-close" onClick={onClose}><X size={14}/></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Farm Name</label><input className="form-input" value={form.farmName} onChange={e=>set('farmName',e.target.value)} placeholder="e.g. Green Silk Farm" required/></div>
            <div className="form-group"><label className="form-label">Instar Stage</label>
              <select className="form-select" value={form.instarStage} onChange={e=>set('instarStage',e.target.value)}>
                {INSTAR_STAGES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Quantity (kg)</label><input className="form-input" type="number" value={form.quantity} onChange={e=>set('quantity',e.target.value)} placeholder="e.g. 40" required/></div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Optional..." rows={2} style={{resize:'vertical'}}/></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary"><Plus size={13}/> Create</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const NEXT_ACTIONS = ["Feeding","Cleaning","AI Scan","Harvest","Spinning","Monitoring"]
const ACTION_TIMES = [7200, 12000, 4500, 176400, 86400, 3600]

export default function MyBatches({ setPage }) {
  const { batches } = useApp()
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [gradeTarget, setGradeTarget] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [instarFilter, setInstarFilter] = useState('All')
  const [page, setPageNum] = useState(1)
  const PER_PAGE = 6

  if (selectedBatch) {
    return (
      <BatchTraceability
        batch={selectedBatch}
        onBack={() => setSelectedBatch(null)}
        onViewEnvHistory={() => {
          if (setPage) setPage('env-history')
        }}
      />
    )
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})
  const timeStr = now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})

  const total = batches.length
  const active = batches.filter(b=>b.status==='active').length
  const completed = batches.filter(b=>b.status==='listed').length
  const totalQty = batches.reduce((s,b)=>s+(b.quantity||0),0)

  const filtered = batches.filter(b => {
    const matchSearch = !search || b.id.toLowerCase().includes(search.toLowerCase()) || (b.instarStage||'').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter==='All' || b.status===statusFilter.toLowerCase()
    const matchInstar = instarFilter==='All' || b.instarStage===instarFilter
    return matchSearch && matchStatus && matchInstar
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  const card = { background:"white", borderRadius:10, border:"1px solid #e2e8f0", boxShadow:"0 1px 2px rgba(0,0,0,0.04)" }

  const statusColor = (s) => s==='active' ? {bg:"#dcfce7",color:"#16a34a",border:"#bbf7d0"} : s==='listed' ? {bg:"#dbeafe",color:"#2563eb",border:"#93c5fd"} : {bg:"#fee2e2",color:"#ef4444",border:"#fca5a5"}
  const leftBorder = (s) => s==='active' ? "#16a34a" : s==='listed' ? "#2563eb" : "#ef4444"

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, fontFamily:"Inter,sans-serif", color:"#0f172a" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:"#0f172a" }}>My Batches</div>
          <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>View and manage all your sericulture batches</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ position:"relative" }}>
            <div style={{ width:32,height:32,borderRadius:7,background:"white",border:"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
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
          <button onClick={()=>setShowNew(true)}
            style={{ display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:8,background:"#16a34a",color:"white",border:"none",fontSize:12,fontWeight:600,cursor:"pointer" }}>
            <Plus size={13}/> New Batch
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[
          { label:"Total Batches", value:total, sub:"All time", iconBg:"#dcfce7" },
          { label:"Active Batches", value:active, sub:"Running", iconBg:"#dbeafe" },
          { label:"Completed", value:completed, sub:"Finished", iconBg:"#f3e8ff" },
          { label:"Total Quantity", value:`${totalQty} kg`, sub:"Across all batches", iconBg:"#fff7ed" },
        ].map(({label,value,sub,iconBg})=>(
          <div key={label} style={{ ...card, padding:"12px 16px" }}>
            <div style={{ fontSize:11,color:"#64748b",marginBottom:2 }}>{label}</div>
            <div style={{ fontSize:22,fontWeight:800,color:"#0f172a",lineHeight:1 }}>{value}</div>
            <div style={{ fontSize:10.5,color:"#94a3b8",marginTop:1 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ flex:1, position:"relative" }}>
          <Search size={13} color="#94a3b8" style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)" }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by batch ID, instar, or status..."
            style={{ width:"100%",padding:"8px 10px 8px 30px",borderRadius:8,border:"1px solid #e2e8f0",background:"white",fontSize:12,color:"#0f172a",outline:"none",fontFamily:"inherit" }}/>
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          style={{ padding:"8px 28px 8px 10px",borderRadius:8,border:"1px solid #e2e8f0",background:"white",fontSize:12,color:"#475569",outline:"none",fontFamily:"inherit",cursor:"pointer",appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 8px center" }}>
          {['All','Active','Listed','Stopped'].map(s=><option key={s}>Status: {s}</option>)}
        </select>
        <select value={instarFilter} onChange={e=>setInstarFilter(e.target.value)}
          style={{ padding:"8px 28px 8px 10px",borderRadius:8,border:"1px solid #e2e8f0",background:"white",fontSize:12,color:"#475569",outline:"none",fontFamily:"inherit",cursor:"pointer",appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 8px center" }}>
          {['All',...INSTAR_STAGES].map(s=><option key={s}>Instar: {s}</option>)}
        </select>
        <select style={{ padding:"8px 28px 8px 10px",borderRadius:8,border:"1px solid #e2e8f0",background:"white",fontSize:12,color:"#475569",outline:"none",fontFamily:"inherit",cursor:"pointer",appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 8px center" }}>
          <option>Sort: Newest First</option>
          <option>Sort: Oldest First</option>
          <option>Sort: AI Health</option>
        </select>
        <div style={{ width:34,height:34,borderRadius:8,border:"1px solid #e2e8f0",background:"white",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
          <SlidersHorizontal size={14} color="#64748b"/>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...card, overflow:"hidden" }}>
        {/* Table header */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.2fr 0.8fr 1.3fr 0.8fr 0.3fr", padding:"10px 16px", background:"#f8fafc", borderBottom:"1px solid #e2e8f0" }}>
          {["BATCH DETAILS","AI HEALTH","ENVIRONMENT SCORE","COCOON GRADE","NEXT ACTION / YIELD","STATUS",""].map(h=>(
            <div key={h} style={{ fontSize:10.5, fontWeight:700, color:"#94a3b8", letterSpacing:"0.04em" }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {paged.map((b, idx) => {
          const sc = statusColor(b.status)
          const actionLabel = NEXT_ACTIONS[idx % NEXT_ACTIONS.length]
          const actionTime = ACTION_TIMES[idx % ACTION_TIMES.length]
          const isStopped = b.status === 'stopped' || (!b.status)
          const isCompleted = b.status === 'listed'

          return (
            <div key={b.id}
            onClick={() => setSelectedBatch(b)}
            style={{
              display:"grid", gridTemplateColumns:"2fr 1fr 1.2fr 0.8fr 1.3fr 0.8fr 0.3fr",
              padding:"14px 16px", borderBottom:"1px solid #f1f5f9", alignItems:"center",
              borderLeft:`3px solid ${leftBorder(b.status)}`,
              transition:"background 0.15s", cursor:"pointer",
            }}
            onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
            onMouseLeave={e=>e.currentTarget.style.background="white"}>

              {/* Batch Details */}
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"#0f172a", fontFamily:"monospace" }}>{b.id}</span>
                  <span style={{ background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`, fontSize:9.5, fontWeight:700, padding:"1px 7px", borderRadius:20 }}>
                    {b.status==='listed'?'Completed':b.status==='stopped'?'Stopped':'Active'}
                  </span>
                </div>
                <div style={{ fontSize:11, color:"#94a3b8" }}>Started on {b.farmName||"18 Aug 2026"}</div>
                <div style={{ fontSize:11, color:"#64748b", marginTop:1 }}>
                  {b.instarStage}&nbsp;•&nbsp;{b.quantity} kg
                </div>
              </div>

              {/* AI Health gauge */}
              <div>
                <AiGauge percent={isStopped ? 0 : b.aiScore}/>
                {isStopped && <div style={{ fontSize:10.5, color:"#94a3b8", textAlign:"center", marginTop:2 }}>Not available</div>}
              </div>

              {/* Env Score */}
              <div style={{ paddingRight:16 }}>
                {isStopped
                  ? <span style={{ fontSize:11, color:"#94a3b8" }}>Not available</span>
                  : <EnvBar score={b.envScore}/>
                }
              </div>

              {/* Cocoon Grade */}
              <div>
                {isStopped ? (
                  <span style={{ fontSize:11, color:"#94a3b8" }}>Not available</span>
                ) : (
                  <div>
                    <div style={{ fontSize:22, fontWeight:800, color:"#0f172a", lineHeight:1 }}>{b.grade||"B"}</div>
                    <div style={{ fontSize:10.5, color:"#94a3b8" }}>{isCompleted?"Final":"Current"}</div>
                  </div>
                )}
              </div>

              {/* Next Action */}
              <div>
                {isStopped ? (
                  <div>
                    <div style={{ fontSize:10.5, color:"#94a3b8" }}>Reason</div>
                    <div style={{ fontSize:11.5, fontWeight:600, color:"#475569" }}>Manual Stop</div>
                  </div>
                ) : isCompleted ? (
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{b.quantity} kg</div>
                    <button style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", padding:0, fontSize:11.5, color:"#16a34a", fontWeight:600, cursor:"pointer", marginTop:2 }}>
                      <FileText size={11}/> View Report
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#16a34a" }}>{actionLabel}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
                      <span style={{ fontSize:11.5, fontWeight:600, color:"#475569", fontFamily:"monospace" }}>
                        <Countdown target={actionTime}/>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status badge */}
              <div>
                <span style={{ background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`, fontSize:10.5, fontWeight:700, padding:"3px 10px", borderRadius:6, display:"inline-block" }}>
                  {b.status==='listed'?'Completed':b.status==='stopped'?'Stopped':'Active'}
                </span>
                {b.status==='active' && (
                  <button onClick={()=>setGradeTarget(b)}
                    style={{ display:"block", marginTop:4, background:"none", border:"none", padding:0, fontSize:10.5, color:"#16a34a", fontWeight:600, cursor:"pointer" }}>
                    Grade ›
                  </button>
                )}
              </div>

              {/* Arrow */}
              <div style={{ display:"flex", justifyContent:"center" }}>
                <ChevronRight size={14} color="#94a3b8"/>
              </div>

            </div>
          )
        })}
      </div>

      {/* Pagination */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:11.5, color:"#94a3b8" }}>
          Showing {Math.min((page-1)*PER_PAGE+1, filtered.length)} to {Math.min(page*PER_PAGE, filtered.length)} of {filtered.length} batches
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
            style={{ width:30,height:30,borderRadius:7,border:"1px solid #e2e8f0",background:"white",display:"flex",alignItems:"center",justifyContent:"center",cursor:page===1?"not-allowed":"pointer",opacity:page===1?0.4:1 }}>
            <ChevronLeft size={13} color="#475569"/>
          </button>
          {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
            <button key={n} onClick={()=>setPage(n)}
              style={{ width:30,height:30,borderRadius:7,border:`1px solid ${n===page?"#16a34a":"#e2e8f0"}`,background:n===page?"#16a34a":"white",color:n===page?"white":"#475569",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
              {n}
            </button>
          ))}
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages||totalPages===0}
            style={{ width:30,height:30,borderRadius:7,border:"1px solid #e2e8f0",background:"white",display:"flex",alignItems:"center",justifyContent:"center",cursor:page===totalPages?"not-allowed":"pointer",opacity:page===totalPages||totalPages===0?0.4:1 }}>
            <ChevronRight size={13} color="#475569"/>
          </button>
        </div>
      </div>

      {gradeTarget && <GradeModal batch={gradeTarget} onClose={()=>setGradeTarget(null)}/>}
      {showNew && <NewBatchModal onClose={()=>setShowNew(false)}/>}
    </div>
  )
}
