import React, { useState, useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import AuthRouter from './pages/auth/AuthRouter'
import AppShell from './components/layout/AppShell'
import ToastContainer from './components/ui/ToastContainer'

function IntroVideo({ onDone }) {
  const PHRASES = [
    "Protecting silkworm farms with AI...",
    "Real-time IoT monitoring for sericulture...",
    "Smart disease detection, smarter farming...",
    "Empowering silk farmers with technology...",
  ]
  const [phraseIdx, setPhraseIdx] = React.useState(0)
  const [displayed, setDisplayed] = React.useState("")
  const [charIdx, setCharIdx] = React.useState(0)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    const current = PHRASES[phraseIdx]
    let timer
    if (!deleting && charIdx < current.length) {
      timer = setTimeout(() => { setDisplayed(current.slice(0, charIdx + 1)); setCharIdx(c => c + 1) }, 45)
    } else if (!deleting && charIdx === current.length) {
      timer = setTimeout(() => setDeleting(true), 1800)
    } else if (deleting && charIdx > 0) {
      timer = setTimeout(() => { setDisplayed(current.slice(0, charIdx - 1)); setCharIdx(c => c - 1) }, 22)
    } else if (deleting && charIdx === 0) {
      setDeleting(false)
      setPhraseIdx(p => (p + 1) % PHRASES.length)
    }
    return () => clearTimeout(timer)
  }, [charIdx, deleting, phraseIdx])

  const PARTICLES = React.useMemo(() => Array.from({ length: 100 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: 1.5 + Math.random() * 3.5,
    delay: `${Math.random() * 5}s`,
    duration: `${3 + Math.random() * 5}s`,
    opacity: 0.07 + Math.random() * 0.2,
  })), [])

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#000000",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      zIndex: 9999, gap: 22, overflow: "hidden"
    }}>
      {/* Faint grid pattern */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(74,222,128,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }}/>

      {/* Green radial glow behind video */}
      <div style={{
        position: "absolute",
        width: "60vw", height: "60vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(74,222,128,0.07) 0%, transparent 70%)",
        pointerEvents: "none"
      }}/>

      {/* Corner accent lines */}
      {[
        { top: 16, left: 16, borderTop: "1px solid rgba(74,222,128,0.4)", borderLeft: "1px solid rgba(74,222,128,0.4)" },
        { top: 16, right: 16, borderTop: "1px solid rgba(74,222,128,0.4)", borderRight: "1px solid rgba(74,222,128,0.4)" },
        { bottom: 16, left: 16, borderBottom: "1px solid rgba(74,222,128,0.4)", borderLeft: "1px solid rgba(74,222,128,0.4)" },
        { bottom: 16, right: 16, borderBottom: "1px solid rgba(74,222,128,0.4)", borderRight: "1px solid rgba(74,222,128,0.4)" },
      ].map((s, i) => (
        <div key={i} style={{ position: "absolute", width: 24, height: 24, pointerEvents: "none", ...s }}/>
      ))}
      {/* Floating particles */}
      {PARTICLES.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: p.left, top: p.top,
          width: p.size, height: p.size, borderRadius: "50%",
          background: "#4ade80", opacity: p.opacity,
          animation: `floatP ${p.duration} ease-in-out ${p.delay} infinite`,
          pointerEvents: "none"
        }}/>
      ))}

      <style>{`
        @keyframes floatP {
          0%,100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-18px) scale(1.3); opacity: 0.35; }
        }
        @keyframes dotP {
          0%,100% { opacity:0.2; transform:scale(1); }
          50% { opacity:1; transform:scale(1.5); }
        }
      `}</style>

      {/* Logo + typewriter */}
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
          <img src="/images/silksphere-logo.png" alt="logo" style={{ width: 42, height: 42, objectFit: "contain" }}/>
          <span style={{ fontSize: 26, fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}>
            Silk<span style={{ color: "#4ade80" }}>Sphere</span>
          </span>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", height: 20 }}>
          {displayed}
          <span style={{ borderRight: "2px solid #4ade80", marginLeft: 1 }}/>
        </div>
      </div>

      {/* Video box */}
      <div style={{
        position: "relative", width: "58vw", maxWidth: 740, minWidth: 300,
        borderRadius: 14, overflow: "hidden",
        border: "1px solid rgba(74,222,128,0.2)",
        boxShadow: "0 0 40px rgba(74,222,128,0.08), 0 20px 50px rgba(0,0,0,0.6)"
      }}>
        <video src="/video/intro.mp4" autoPlay muted playsInline
          onEnded={() => setTimeout(onDone, 2000)}
          style={{ width: "100%", display: "block" }}/>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 55,
          background: "linear-gradient(to bottom, transparent 0%, #000 60%)" }}/>
        <div style={{ position: "absolute", bottom: 50, right: 10,
          background: "#000", border: "1px solid rgba(74,222,128,0.3)",
          borderRadius: 8, padding: "5px 10px",
          display: "flex", alignItems: "center", gap: 6 }}>
          <img src="/images/silksphere-logo.png" alt="logo" style={{ width: 18, height: 18, objectFit: "contain" }}/>
          <span style={{ fontSize: 11, fontWeight: 700, color: "white" }}>
            Silk<span style={{ color: "#4ade80" }}>Sphere</span>
          </span>
        </div>
      </div>

      {/* Thin glowing bottom edge line */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(74,222,128,0.4), transparent)",
        pointerEvents: "none"
      }}/>

      {/* Dots + LOADING */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 14 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%", background: "#4ade80",
              animation: `dotP 1.2s ease-in-out ${i * 0.2}s infinite`, opacity: 0.3
            }}/>
          ))}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.25em", textTransform: "uppercase" }}>
          Loading
        </span>
      </div>
    </div>
  )
}

function Inner() {
  const { user } = useApp()
  const [showIntro, setShowIntro] = useState(true)

  const handleIntroDone = () => {
    setShowIntro(false)
  }

  if (showIntro) return <IntroVideo onDone={handleIntroDone} />

  return (
    <>
      {user ? <AppShell /> : <AuthRouter />}
      <ToastContainer />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Inner />
    </AppProvider>
  )
}
