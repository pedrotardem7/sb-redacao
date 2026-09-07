import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import AiAnalysis from './AiAnalysis.jsx'
import './App.css'

const RemoteTimer = lazy(() => import('./RemoteTimer.jsx'))

const TOTAL_LINES = 30
const STORAGE_KEY = 'soph-enem-redacao'
const THEME_KEY = 'soph-enem-theme'
const PEER_ID_KEY = 'soph-enem-peer-id'
const PRESETS = [30, 60, 80, 120]

function newPeerId() {
  return 'enem-' + Math.random().toString(36).slice(2, 10)
}

const NUMBERS = Array.from({ length: TOTAL_LINES }, (_, i) => i + 1)

function formatTime(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch {}
}

function Ic({ children }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

function IconMenu() {
  return (
    <Ic>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </Ic>
  )
}

function IconFocus() {
  return (
    <Ic>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </Ic>
  )
}

function IconTrash() {
  return (
    <Ic>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </Ic>
  )
}

function IconCopy() {
  return (
    <Ic>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Ic>
  )
}

function IconQr() {
  return (
    <Ic>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <path d="M13.5 13.5h3v3h-3z" fill="currentColor" stroke="none" />
      <path d="M17.5 17.5h3v3h-3z" fill="currentColor" stroke="none" />
    </Ic>
  )
}

function IconTheme() {
  return (
    <Ic>
      <circle cx="12" cy="12" r="9" />
      <circle cx="8.5" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="10" r="1.1" fill="currentColor" stroke="none" />
    </Ic>
  )
}

function IconSparkle() {
  return (
    <Ic>
      <path d="M12 3l1.7 4.8 4.8 1.7-4.8 1.7L12 16l-1.7-4.8L5.5 9.5l4.8-1.7z" />
      <path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
    </Ic>
  )
}

function IconPrint() {
  return (
    <Ic>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </Ic>
  )
}

function App() {
  const params = new URLSearchParams(window.location.search)
  const remotePeerId = params.get('r')
  if (remotePeerId) {
    return (
      <Suspense fallback={<div className="remote-loading">Carregando cronômetro...</div>}>
        <RemoteTimer peerId={remotePeerId} />
      </Suspense>
    )
  }

  return <Editor />
}

function Editor() {
  const [essay, setEssay] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [cursive, setCursive] = useState(false)
  const [fs, setFs] = useState(18)
  const [visualLines, setVisualLines] = useState(0)
  const [toasts, setToasts] = useState([])
  const [focusMode, setFocusMode] = useState(false)
  const [caretLine, setCaretLine] = useState(null)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) ?? 'padrao'
    } catch {
      return 'padrao'
    }
  })
  const areaRef = useRef(null)
  const measureRef = useRef(null)
  const caretMeasureRef = useRef(null)

  const [timerMode, setTimerMode] = useState('off')
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerValue, setTimerValue] = useState(4800)
  const [preset, setPreset] = useState(4800)
  const [customMin, setCustomMin] = useState(80)
  const [timerOpen, setTimerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const startRef = useRef(0)
  const endRef = useRef(0)
  const timerWrapRef = useRef(null)
  const menuWrapRef = useRef(null)

  const [peerId, setPeerId] = useState(() => {
    try {
      let id = localStorage.getItem(PEER_ID_KEY)
      if (!id) {
        id = newPeerId()
        localStorage.setItem(PEER_ID_KEY, id)
      }
      return id
    } catch {
      return newPeerId()
    }
  })
  const [qrOpen, setQrOpen] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [phoneConnected, setPhoneConnected] = useState(false)
  const peerRef = useRef(null)
  const peerPromiseRef = useRef(null)
  const connRef = useRef(null)
  const toastId = useRef(0)
  const sendStateRef = useRef(() => {})
  const cmdRef = useRef({ toggle: () => {}, reset: () => {} })

  useEffect(() => {
    if (!timerOpen) return
    const handler = (e) => {
      if (timerWrapRef.current && !timerWrapRef.current.contains(e.target)) {
        setTimerOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setTimerOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [timerOpen])

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, essay)
      } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [essay])

  useEffect(() => {
    if (theme === 'rosa') {
      document.documentElement.dataset.theme = 'rosa'
    } else {
      delete document.documentElement.dataset.theme
    }
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {}
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'rosa' ? 'padrao' : 'rosa'
    const applyAttr = () => {
      if (next === 'rosa') {
        document.documentElement.dataset.theme = 'rosa'
      } else {
        delete document.documentElement.dataset.theme
      }
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (document.startViewTransition && !reduce) {
      document.startViewTransition(() => {
        flushSync(() => setTheme(next))
        applyAttr()
      })
    } else {
      setTheme(next)
    }
  }

  useEffect(() => {
    const el = measureRef.current
    if (!el) return
    const lh = parseFloat(getComputedStyle(el).lineHeight)
    setVisualLines(lh ? Math.max(1, Math.round(el.scrollHeight / lh)) : 1)
  }, [essay, cursive, fs])

  useEffect(() => {
    if (!timerRunning || timerMode === 'off') return
    const id = setInterval(() => {
      setTimerValue(() => {
        if (timerMode === 'down') {
          return Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000))
        }
        return Math.floor((Date.now() - startRef.current) / 1000)
      })
    }, 250)
    return () => clearInterval(id)
  }, [timerRunning, timerMode])

  useEffect(() => {
    if (timerMode === 'down' && timerRunning && timerValue === 0) {
      setTimerRunning(false)
      setTimedOut(true)
      beep()
    }
  }, [timerValue, timerRunning, timerMode])

  const sendState = () => {
    const c = connRef.current
    if (!c || !c.open) return
    const payload = { t: 'state', mode: timerMode, running: timerRunning, value: timerValue, preset, focus: focusMode, cursive, fs, theme }
    if (timerMode === 'down' && timerRunning) {
      payload.down = { endAt: endRef.current }
    } else if (timerMode === 'up' && timerRunning) {
      payload.up = { startAt: startRef.current }
    }
    c.send(payload)
  }
  sendStateRef.current = sendState

  const pushToast = (msg) => {
    const id = ++toastId.current
    setToasts((t) => [...t.slice(-2), { id, msg }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 2600)
  }

  useEffect(() => {
    if (qrUrl) {
      let cancelled = false
      import('qrcode')
        .then((m) =>
          m.default.toDataURL(qrUrl, {
            width: 240,
            margin: 2,
            color: { dark: '#0b0e1a', light: '#ffffff' },
          }),
        )
        .then((url) => {
          if (!cancelled) setQrDataUrl(url)
        })
        .catch(() => {})
      return () => {
        cancelled = true
      }
    }
  }, [qrUrl])

  const attachPeerHandlers = (peer) => {
    peer.on('connection', (c) => {
      c.on('open', () => {
        connRef.current = c
        setPhoneConnected(true)
      })
      c.on('data', (d) => {
        if (!d || d.t !== 'cmd') return
        if (d.a === 'toggle') cmdRef.current.toggle()
        if (d.a === 'reset') cmdRef.current.reset()
        if (d.a === 'mode') cmdRef.current.mode(d.mode)
        if (d.a === 'preset') cmdRef.current.preset(d.seconds)
        if (d.a === 'focus') cmdRef.current.focus(!!d.on)
        if (d.a === 'font') cmdRef.current.font(!!d.cursive)
        if (d.a === 'fontsize') cmdRef.current.fontsize(Number(d.fs))
        if (d.a === 'sync') sendStateRef.current()
      })
      c.on('close', () => {
        connRef.current = null
        setPhoneConnected(false)
      })
      c.on('error', () => {
        connRef.current = null
        setPhoneConnected(false)
      })
    })
    peer.on('error', (err) => {
      if (err?.type === 'unavailable-id') {
        try {
          peer.destroy()
        } catch {}
        const fresh = newPeerId()
        try {
          localStorage.setItem(PEER_ID_KEY, fresh)
        } catch {}
        peerRef.current = null
        peerPromiseRef.current = null
        setPeerId(fresh)
      } else {
        setPhoneConnected(false)
      }
    })
    peerRef.current = peer
    return peer
  }

  const ensurePeer = () => {
    if (peerRef.current) return Promise.resolve(peerRef.current)
    if (!peerPromiseRef.current) {
      peerPromiseRef.current = import('peerjs')
        .then(({ Peer }) => attachPeerHandlers(new Peer(peerId, { debug: 0 })))
        .catch(() => {
          peerPromiseRef.current = null
          return null
        })
    }
    return peerPromiseRef.current
  }

  const openQr = () => {
    setQrOpen(true)
  }

  useEffect(() => {
    if (!qrOpen) return
    let cancelled = false
    ensurePeer().then(() => {
      if (!cancelled) {
        setQrUrl(window.location.origin + window.location.pathname + '?r=' + peerId)
      }
    })
    return () => {
      cancelled = true
    }
  }, [qrOpen, peerId])

  const goToSheet = () => {
    setQrOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    areaRef.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    if (!qrOpen) return
    const handler = (e) => {
      if (e.target === e.currentTarget) setQrOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setQrOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [qrOpen])

  useEffect(() => {
    sendStateRef.current()
  }, [timerMode, timerRunning, timerValue, phoneConnected, focusMode, cursive, fs, theme])

  const words = essay.trim() ? essay.trim().split(/\s+/).length : 0
  const chars = essay.length
  const overLimit = visualLines > TOTAL_LINES

  const timerClass =
    timerMode === 'down' && timerValue === 0
      ? 'done'
      : timerMode === 'down' && timerValue <= 300
        ? 'warn'
        : ''

  const handleChange = (e) => setEssay(e.target.value)

  const updateCaret = (text, pos) => {
    const mirror = caretMeasureRef.current
    if (!mirror) return
    const slice = text.slice(0, pos)
    if (!slice) {
      setCaretLine(0)
      return
    }
    mirror.textContent = slice
    const lh = parseFloat(getComputedStyle(mirror).lineHeight)
    if (!lh) return
    const idx = Math.round(mirror.scrollHeight / lh) - 1
    setCaretLine(idx >= 0 && idx < TOTAL_LINES ? idx : null)
  }

  const handleClear = () => {
    if (essay && !window.confirm('Apagar toda a redação?')) return
    const had = essay.length > 0
    setEssay('')
    areaRef.current?.focus()
    if (had) pushToast('Texto apagado')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(essay)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = essay
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {}
      ta.remove()
    }
    pushToast('Texto copiado')
  }

  const handlePrint = () => window.print()

  const switchTimerMode = (m) => {
    setTimerRunning(false)
    setTimedOut(false)
    setTimerMode(m)
    if (m === 'down') setTimerValue(preset)
    if (m === 'up') setTimerValue(0)
  }

  const setPresetFrom = (seconds) => {
    setPreset(seconds)
    setCustomMin(seconds / 60)
    if (!timerRunning) setTimerValue(seconds)
  }

  const startPause = () => {
    if (timerMode === 'off') return
    if (timerRunning) {
      setTimerRunning(false)
      pushToast('Cronômetro pausado')
      return
    }
    if (timerMode === 'down') {
      if (timerValue === 0) {
        setTimerValue(preset)
        endRef.current = Date.now() + preset * 1000
      } else {
        endRef.current = Date.now() + timerValue * 1000
      }
    } else {
      startRef.current = Date.now() - timerValue * 1000
    }
    setTimedOut(false)
    setTimerRunning(true)
    pushToast('Cronômetro iniciado')
  }

  const resetTimer = () => {
    setTimerRunning(false)
    setTimedOut(false)
    setTimerValue(timerMode === 'down' ? preset : 0)
    pushToast('Cronômetro reiniciado')
  }

  const remoteToggle = () => {
    if (timerMode === 'off') {
      setTimerMode('up')
      setTimerValue(0)
      startRef.current = Date.now()
      setTimedOut(false)
      setTimerRunning(true)
      pushToast('Cronômetro iniciado')
    } else {
      startPause()
    }
  }

  const remoteReset = () => {
    if (timerMode === 'off') {
      setTimerMode('up')
      setTimerValue(0)
      setTimerRunning(false)
    } else {
      resetTimer()
    }
  }

  cmdRef.current = {
    toggle: remoteToggle,
    reset: remoteReset,
    mode: switchTimerMode,
    preset: setPresetFrom,
    focus: setFocusMode,
    font: setCursive,
    fontsize: (v) => setFs(Math.max(12, Math.min(28, Number.isFinite(v) ? v : 18))),
  }

  useEffect(() => {
    if (!focusMode) return
    const onKey = (e) => {
      if (e.key === 'Escape') setFocusMode(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [focusMode])

  return (
    <div className={`app ${focusMode ? 'focus-mode' : ''}`}>
      <div className="background" />
      <div className="blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <header className="toolbar">
        <span className="brand">SB ENEM</span>

        <div className="stats">
          <span className={`stat ${overLimit ? 'warn' : ''}`}>
            Linhas <strong>{visualLines}/{TOTAL_LINES}</strong>
          </span>
          <span className="stat">Palavras <strong>{words}</strong></span>
          <span className="stat">Caracteres <strong>{chars}</strong></span>
          <div className="timer-wrap" ref={timerWrapRef}>
            <button
              className={`timer-chip ${timerClass} ${timerMode === 'off' ? 'off' : ''}`}
              onClick={() => setTimerOpen((o) => !o)}
              title="Cronômetro e temporizador"
            >
              {timerMode === 'off' ? (
                'Desligado'
              ) : (
                <>
                  Tempo <strong>{formatTime(timerValue)}</strong>
                </>
              )}
            </button>
            {timerOpen && (
              <div className="timer-panel">
                <div className="segmented timer-modes">
                  <button
                    className={timerMode === 'off' ? 'active' : ''}
                    onClick={() => switchTimerMode('off')}
                  >
                    Desligado
                  </button>
                  <button
                    className={timerMode === 'up' ? 'active' : ''}
                    onClick={() => switchTimerMode('up')}
                  >
                    Cronômetro
                  </button>
                  <button
                    className={timerMode === 'down' ? 'active' : ''}
                    onClick={() => switchTimerMode('down')}
                  >
                    Temporizador
                  </button>
                </div>

                {timerMode === 'off' ? (
                  <p className="timer-off-hint">Cronômetro desligado.</p>
                ) : (
                  <div className={`timer-time ${timerClass} ${timerRunning ? 'running' : ''}`}>
                    {formatTime(timerValue)}
                  </div>
                )}

                {timerMode === 'down' && (
                  <>
                    <div className="timer-presets">
                      {PRESETS.map((p) => (
                        <button
                          key={p}
                          className={`chip ${preset === p * 60 ? 'active' : ''}`}
                          onClick={() => setPresetFrom(p * 60)}
                        >
                          {p} min
                        </button>
                      ))}
                    </div>
                    <div className="timer-custom">
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={customMin}
                        onChange={(e) => {
                          const v = Math.max(1, Math.min(300, Number(e.target.value) || 1))
                          setCustomMin(v)
                          setPresetFrom(v * 60)
                        }}
                      />
                      <span>min</span>
                    </div>
                  </>
                )}

                {timerMode !== 'off' && (
                  <div className="timer-actions">
                    <button className="btn btn-primary" onClick={startPause}>
                      {timerRunning ? 'Pausar' : 'Iniciar'}
                    </button>
                    <button className="icon-btn" onClick={resetTimer}>Reiniciar</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="controls">
          <div className="segmented" title="Fonte do texto">
            <button className={!cursive ? 'active' : ''} onClick={() => setCursive(false)}>
              Digitação
            </button>
            <button className={cursive ? 'active' : ''} onClick={() => setCursive(true)}>
              Cursiva
            </button>
          </div>
          <div className="segmented" title="Tamanho do texto">
            <button onClick={() => setFs((v) => Math.max(12, v - 1))}>A−</button>
            <span className="fs-val">{fs}</span>
            <button onClick={() => setFs((v) => Math.min(28, v + 1))}>A+</button>
          </div>
          <div className="menu-wrap" ref={menuWrapRef}>
            <button className="icon-btn menu-btn" onClick={() => setMenuOpen((o) => !o)} title="Ações" aria-label="Abrir menu de ações">
              <IconMenu />
            </button>
            {menuOpen && (
              <div className="menu-panel">
                <button
                  className="menu-item"
                  onClick={() => { setMenuOpen(false); setFocusMode(true); }}
                >
                  <IconFocus />
                  Modo foco
                </button>
                <button
                  className="menu-item"
                  onClick={() => { setMenuOpen(false); handleClear(); }}
                >
                  <IconTrash />
                  Limpar texto
                </button>
                <button
                  className="menu-item"
                  onClick={() => { setMenuOpen(false); handleCopy(); }}
                >
                  <IconCopy />
                  Copiar texto
                </button>
                <button
                  className="menu-item"
                  onClick={() => { setMenuOpen(false); openQr(); }}
                >
                  <IconQr />
                  Cronômetro no celular
                  <span className={`dot ${phoneConnected ? 'on' : ''}`} />
                </button>
                <button
                  className="menu-item"
                  onClick={toggleTheme}
                >
                  <IconTheme />
                  {theme === 'rosa' ? '✓ Tema rosa bebê' : 'Tema rosa bebê'}
                </button>
                <button
                  className="menu-item"
                  onClick={() => { setMenuOpen(false); setAiOpen(true); }}
                >
                  <IconSparkle />
                  Análise por IA
                </button>
                <div className="menu-sep" />
                <button
                  className="menu-item primary"
                  onClick={() => { setMenuOpen(false); handlePrint(); }}
                >
                  <IconPrint />
                  Imprimir / PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        {timedOut && (
          <div className="warning warning-timer">
            Tempo esgotado! Se estiver treinando a prova, finalize a redação agora.
            <button className="warning-close" onClick={() => setTimedOut(false)}>Fechar</button>
          </div>
        )}

        {overLimit && (
          <div className="warning">
            Atenção: sua redação passou de 30 linhas ({visualLines}). Na prova oficial o texto fica
            limitado à folha definitiva.
          </div>
        )}

        <div
          className={`sheet ${cursive ? 'sheet-cursive' : ''}`}
          style={{ '--user-fs': `${fs}px`, '--user-fs-cursive': `${Math.round(fs * 1.45)}px` }}
        >
          <div className="sheet-header">
            <p className="h-top">Exame Nacional do Ensino Médio</p>
            <h2 className="h-title">Redação</h2>
            <p className="h-sub">Folha definitiva — 30 linhas</p>
          </div>

          <div className="writing-area">
            <div className="lines">
              {NUMBERS.map((n, i) => (
                <div className={`line${i === caretLine ? ' active' : ''}`} key={n}>
                  <div className="line-num">
                    {i === 0 ? (
                      <span className="num-label">TEXTO<br />DEFINITIVO</span>
                    ) : (
                      n
                    )}
                  </div>
                  <div className="line-text" />
                </div>
              ))}
            </div>
            {essay === '' && <span className="caret" aria-hidden="true" />}
            <div
              ref={measureRef}
              className={`line-measure ${cursive ? 'cursive' : ''}`}
              aria-hidden="true"
            >
              {essay}
            </div>
            <div
              ref={caretMeasureRef}
              className={`line-measure ${cursive ? 'cursive' : ''}`}
              aria-hidden="true"
            />
            <textarea
              ref={areaRef}
              className={`typing ${cursive ? 'cursive' : ''}`}
              value={essay}
              onChange={(e) => {
                handleChange(e)
                updateCaret(e.target.value, e.target.selectionStart ?? e.target.value.length)
              }}
              onSelect={(e) => updateCaret(e.target.value, e.target.selectionStart ?? 0)}
              onClick={(e) => updateCaret(e.target.value, e.target.selectionStart ?? 0)}
              onKeyUp={(e) => updateCaret(e.target.value, e.target.selectionStart ?? 0)}
              onFocus={(e) => updateCaret(e.target.value, e.target.selectionStart ?? 0)}
              onBlur={() => setCaretLine(null)}
              placeholder="Comece a escrever sua redação aqui..."
              spellCheck="false"
              aria-label="Texto da redação"
            />
          </div>
        </div>
      </main>

      <footer className="footer">
        Feito por{' '}
        <a href="https://www.instagram.com/pedrotardem" target="_blank" rel="noreferrer">
          @pedrotardem
        </a>
      </footer>

      {focusMode && (
        <button className="focus-exit" onClick={() => setFocusMode(false)} title="Sair do modo foco (Esc)">
          Sair do foco
        </button>
      )}

      {focusMode && timerMode !== 'off' && (
        <div className={`focus-timer ${timerClass}`} title="Tempo">
          {formatTime(timerValue)}
        </div>
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.msg}
          </div>
        ))}
      </div>

      <AiAnalysis essay={essay} open={aiOpen} onClose={() => setAiOpen(false)} />

      {qrOpen && (
        <div className="overlay">
          <div className="modal">
            {phoneConnected ? (
              <>
                <div className="qr-success" aria-hidden="true" />
                <h3>Cronômetro no celular</h3>
                <div className="qr-status on">
                  Celular conectado! O cronômetro está sincronizado.
                </div>
                <button className="btn btn-primary btn-big" onClick={goToSheet}>
                  Ir para a tela da redação
                </button>
                <button className="link-btn" onClick={() => setQrOpen(false)}>Fechar</button>
              </>
            ) : (
              <>
                <h3>Cronômetro no celular</h3>
                <p className="modal-desc">
                  Aponte a câmera do celular para o QR Code (ou abra o link). O celular vira o
                  cronômetro sincronizado com este site.
                </p>
                <div className="qr-box">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code para abrir o cronômetro no celular" />
                  ) : (
                    <div className="qr-loading">Gerando QR Code...</div>
                  )}
                </div>
                <a className="qr-link" href={qrUrl} target="_blank" rel="noreferrer">
                  {qrUrl}
                </a>
                <div className="qr-status">
                  Aguardando conexão do celular...
                </div>
                <button className="icon-btn" onClick={() => setQrOpen(false)}>Fechar</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
