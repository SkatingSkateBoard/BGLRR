'use client'

import { useEffect, useState } from 'react'

const FONTS = [
  'Comic Sans MS', 'Papyrus', 'Impact', 'Courier New',
  'Brush Script MT', 'Curlz MT', 'Jokerman', 'Wingdings'
]

const COLORS = [
  '#00FF00', '#FF00FF', '#FFFF00', '#FF0000',
  '#00FFFF', '#FF69B4', '#39FF14', '#FF1493',
  '#00FF7F', '#FF4500', '#ADFF2F', '#FF6EC7'
]

const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function randomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)] }
function randomFont() { return FONTS[Math.floor(Math.random() * FONTS.length)] }
function glitchText(text: string, intensity = 0.1) {
  return text.split('').map(c => Math.random() < intensity ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] : c).join('')
}

export default function UnverifiedResidentPage() {
  const [time, setTime] = useState(0)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [shake, setShake] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTime(t => t + 1), 50)
    const shakeId = setInterval(() => setShake(Math.random() * 20 - 10), 100)
    document.body.style.overflow = 'hidden'
    document.body.style.background = '#000'
    return () => { clearInterval(id); clearInterval(shakeId); document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  const layers = Array.from({ length: 15 }, (_, i) => (
    <div key={i} className="chaos-layer" style={{
      position: 'fixed',
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      width: `${50 + Math.random() * 300}px`,
      height: `${50 + Math.random() * 300}px`,
      background: `radial-gradient(circle, ${randomColor()}44, transparent)`,
      border: `${Math.random() * 10}px solid ${randomColor()}`,
      borderRadius: `${Math.random() * 100}%`,
      transform: `rotate(${Math.random() * 360}deg) skew(${Math.random() * 30}deg)`,
      opacity: 0.3 + Math.random() * 0.4,
      animation: `float ${5 + Math.random() * 10}s ease-in-out infinite alternate`,
      pointerEvents: 'none',
      zIndex: Math.floor(Math.random() * 5),
      filter: 'blur(2px)'
    }} />
  ))

  const glitchTitle = glitchText('ACCOUNT UNVERIFIED', 0.15)
  const glitchSub = glitchText('YOUR ACCOUNT IS CURRENTLY UNVERIFIED BY THE SYSTEM', 0.08)
  const glitchSub2 = glitchText('PLEASE WAIT AND COME BACK LATER FOR AN OPERATOR TO VERIFY', 0.08)

  return (
    <>
      <style jsx global>{`
        @keyframes float { 0% { transform: translate(0,0) rotate(0deg); } 25% { transform: translate(30px,-20px) rotate(5deg); } 50% { transform: translate(-15px,30px) rotate(-3deg); } 75% { transform: translate(20px,15px) rotate(7deg); } 100% { transform: translate(0,0) rotate(0deg); } }
        @keyframes rainbow { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
        @keyframes pulse-glow { 0%, 100% { text-shadow: 0 0 5px currentColor, 0 0 10px currentColor, 0 0 20px currentColor; } 50% { text-shadow: 0 0 20px currentColor, 0 0 40px currentColor, 0 0 80px currentColor; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(100vw); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-30px); } }
        @keyframes melt { 0% { border-radius: 50%; } 50% { border-radius: 0%; } 100% { border-radius: 50%; } }
        .marquee { animation: slide 8s linear infinite; white-space: nowrap; font-size: 2rem; font-weight: 900; }
        .rainbow-text { animation: rainbow 3s linear infinite; background: linear-gradient(90deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); background-size: 400%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .glitch::before, .glitch::after { content: attr(data-text); position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
        .glitch::before { animation: glitch-1 0.5s infinite linear alternate-reverse; clip-path: polygon(0 0, 100% 0, 100% 35%, 0 35%); -webkit-clip-path: polygon(0 0, 100% 0, 100% 35%, 0 35%); }
        .glitch::after { animation: glitch-2 0.5s infinite linear alternate-reverse; clip-path: polygon(0 65%, 100% 65%, 100% 100%, 0 100%); -webkit-clip-path: polygon(0 65%, 100% 65%, 100% 100%, 0 100%); }
        @keyframes glitch-1 { 0% { transform: translate(0); } 20% { transform: translate(-5px, 5px); } 40% { transform: translate(5px, -5px); } 60% { transform: translate(-5px, -5px); } 80% { transform: translate(5px, 5px); } 100% { transform: translate(0); } }
        @keyframes glitch-2 { 0% { transform: translate(0); } 20% { transform: translate(5px, -5px); } 40% { transform: translate(-5px, 5px); } 60% { transform: translate(5px, 5px); } 80% { transform: translate(-5px, -5px); } 100% { transform: translate(0); } }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: -1,
        background: `conic-gradient(from ${time * 2}deg at ${mousePos.x}px ${mousePos.y}px, #000, #1a001a, #001a1a, #1a1a00, #000)`,
        animation: 'rainbow 20s linear infinite'
      }} />

      {layers}

      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '60px',
        background: 'linear-gradient(90deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f)',
        animation: 'rainbow 2s linear infinite',
        borderBottom: '5px dashed #fff',
        zIndex: 100
      }}>
    
      </div>

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: '60px',
        background: 'linear-gradient(270deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f)',
        animation: 'rainbow 2s linear infinite reverse',
        borderTop: '5px dashed #fff',
        zIndex: 100
      }}>
      
      </div>

      <main style={{
        position: 'relative', zIndex: 10, minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '100px 20px', transform: `translate(${shake}px, ${shake * 0.5}px)`
      }}>
        <div style={{
          position: 'relative', display: 'inline-block',
          animation: 'wiggle 0.3s ease-in-out infinite, pulse-glow 1s ease-in-out infinite'
        }}>
          <h1 className="glitch rainbow-text" data-text={glitchTitle} style={{
            fontSize: 'clamp(3rem, 15vw, 12rem)',
            fontWeight: 900,
            fontFamily: 'Impact, sans-serif',
            letterSpacing: '0.1em',
            lineHeight: 1,
            margin: 0,
            textTransform: 'uppercase',
            position: 'relative',
            mixBlendMode: 'difference'
          }}>
            {glitchTitle}
          </h1>
          <div style={{
            position: 'absolute', top: '-20px', left: '-20px', right: '-20px', bottom: '-20px',
            border: '4px solid #fff', borderRadius: '20px',
            animation: 'melt 2s ease-in-out infinite, rainbow 1s linear infinite'
          }} />
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center', maxWidth: '900px' }}>
          <p style={{
            fontSize: 'clamp(1.5rem, 5vw, 3rem)',
            fontFamily: randomFont(),
            color: randomColor(),
            textShadow: `0 0 10px ${randomColor()}, 0 0 20px ${randomColor()}`,
            margin: '10px 0',
            animation: 'blink 0.5s ease-in-out infinite alternate',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {glitchSub}
          </p>
          <p style={{
            fontSize: 'clamp(1rem, 3vw, 2rem)',
            fontFamily: randomFont(),
            color: randomColor(),
            textShadow: `0 0 10px ${randomColor()}, 0 0 20px ${randomColor()}`,
            margin: '10px 0',
            fontWeight: 700,
            fontStyle: 'italic'
          }}>
            {glitchSub2}
          </p>
        </div>

        <div style={{ marginTop: '60px', display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {['RETRY', 'CRY', 'SCREAM', 'GIVE UP', 'HACK THE PLANET', 'CALL MOM'].map((txt, i) => (
            <button key={i} style={{
              padding: '20px 40px',
              fontSize: '1.5rem',
              fontFamily: randomFont(),
              fontWeight: 900,
              color: '#000',
              background: `linear-gradient(45deg, ${randomColor()}, ${randomColor()})`,
              border: '4px solid #fff',
              borderRadius: `${Math.random() * 50}px`,
              cursor: 'pointer',
              transform: `rotate(${Math.random() * 20 - 10}deg)`,
              animation: `bounce ${0.5 + Math.random()}s ease-in-out infinite, rainbow 1s linear infinite`,
              boxShadow: `0 0 20px ${randomColor()}, inset 0 0 20px #fff`,
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }} onClick={() => alert(`ERROR 0x${Math.random().toString(16).slice(2,8).toUpperCase()}: ${txt} FAILED`)}>
              {txt}
            </button>
          ))}
        </div>

        <div style={{
          marginTop: '80px', fontSize: '0.8rem', fontFamily: 'Courier New',
          color: '#888', textAlign: 'center', lineHeight: 2, maxWidth: '600px'
        }}>
          <pre style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
{`SYSTEM LOG [${new Date().toISOString()}]:
  > INITIALIZING VERIFICATION PROTOCOL...
  > SCANNING BIOMETRIC DATABASE...
  > ERROR: NO MATCH FOUND
  > ERROR: FINGERPRINTS CORRUPTED
  > ERROR: RETINA SCAN RETURNED "▓▓▓▓▓"
  > WARNING: SOUL NOT DETECTED
  > ATTEMPTING QUANTUM ENTANGLEMENT...
  > CONNECTION LOST: SERVER ON FIRE
  > FALLBACK: CARRIER PIGEON DISPATCHED
  > ESTIMATED VERIFICATION TIME: ∞ YEARS
  > RECOMMENDATION: SACRIFICE A GOAT TO THE SERVERS`}
          </pre>
        </div>

        <div style={{
          position: 'fixed', bottom: '80px', right: '20px',
          fontSize: '0.7rem', fontFamily: 'Courier New', color: '#444',
          transform: `rotate(-15deg) scale(${0.8 + Math.sin(time * 0.1) * 0.1})`
        }}>
          
        </div>
      </main>

      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5,
        background: `radial-gradient(ellipse at ${mousePos.x}px ${mousePos.y}px, transparent 0%, #0008 70%)`,
        animation: 'rainbow 10s linear infinite'
      }} />

      {[...Array(30)].map((_, i) => (
        <div key={i} style={{
          position: 'fixed',
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          width: `${2 + Math.random() * 6}px`,
          height: `${2 + Math.random() * 6}px`,
          background: randomColor(),
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: Math.floor(Math.random() * 3),
          animation: `float ${3 + Math.random() * 5}s ease-in-out infinite, blink ${0.5 + Math.random()}s infinite`,
          boxShadow: `0 0 10px ${randomColor()}`
        }} />
      ))}
    </>
  )
}