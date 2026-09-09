import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import AiAnalysis from './AiAnalysis.jsx'
import './App.css'

const RemoteTimer = lazy(() => import('./RemoteTimer.jsx'))

const TOTAL_LINES = 30
const STORAGE_KEY = 'soph-enem-redacao'
const THEME_KEY = 'soph-enem-theme'
const PEER_ID_KEY = 'soph-enem-peer-id'
const TITLE_KEY = 'soph-enem-titulo'
const SPELL_KEY = 'soph-enem-spellcheck'
const FS_KEY = 'soph-enem-fs'
const FONT_KEY = 'soph-enem-font'
const PRESETS = [30, 60, 80, 120]

function newPeerId() {
  return 'sb-' + Math.random().toString(36).slice(2, 10)
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

function IconSpell() {
  return (
    <Ic>
      <path d="M4 20L9 5l5 15" />
      <line x1="5.8" y1="15" x2="12.2" y2="15" />
      <polyline points="15 16 17.5 18.5 22 12" />
    </Ic>
  )
}

function IconDownload() {
  return (
    <Ic>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </Ic>
  )
}

function IconUpload() {
  return (
    <Ic>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </Ic>
  )
}

function IconMic() {
  return (
    <Ic>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="22" />
    </Ic>
  )
}

const SPOKEN_PUNCT = [
  [/ponto final/gi, '.'],
  [/ponto de interrogação/gi, '?'],
  [/ponto de exclamação/gi, '!'],
  [/ponto e vírgula/gi, ';'],
  [/dois pontos/gi, ':'],
  [/novo parágrafo/gi, '\n\n'],
  [/nova linha|quebra de linha/gi, '\n'],
  [/abre aspas|fecha aspas/gi, '"'],
  [/travessão/gi, '—'],
  [/vírgula/gi, ','],
  [/(^|\s)ponto(?!\s+de)(\s|$)/gi, '$1.$2'],
]

function normalizeSpoken(text) {
  let out = ` ${text}`
  for (const [re, sub] of SPOKEN_PUNCT) out = out.replace(re, sub)
  out = out.replace(/ {2,}/g, ' ').replace(/ ([.,;:!?])/g, '$1').replace(/\n /g, '\n').replace(/ \n/g, '\n')
  return out.trimStart()
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

function Intro() {
  const [phase, setPhase] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'gone' : 'in',
  )

  useEffect(() => {
    if (phase !== 'in') return undefined
    const t1 = setTimeout(() => setPhase('out'), 1400)
    const t2 = setTimeout(() => setPhase('gone'), 1900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase === 'gone') return null

  return (
    <div className={`intro ${phase}`} aria-hidden="true">
      <div className="intro-logo">SB REDAÇÃO</div>
      <div className="intro-sub">Folha de Redação</div>
      <div className="intro-bar">
        <span />
      </div>
    </div>
  )
}

function App() {
  const params = new URLSearchParams(window.location.search)
  const remotePeerId = params.get('r')

  return (
    <>
      <Intro />
      {remotePeerId ? (
        <Suspense fallback={<div className="remote-loading">Carregando cronômetro...</div>}>
          <RemoteTimer peerId={remotePeerId} />
        </Suspense>
      ) : (
        <Editor />
      )}
    </>
  )
}

function Editor() {
  const [essay, setEssay] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [cursive, setCursive] = useState(() => {
    try {
      return localStorage.getItem(FONT_KEY) === '1'
    } catch {
      return false
    }
  })
  const [fs, setFs] = useState(() => {
    try {
      const v = Number(localStorage.getItem(FS_KEY))
      return Number.isFinite(v) && localStorage.getItem(FS_KEY) !== null
        ? Math.max(8, Math.min(28, v))
        : 18
    } catch {
      return 18
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(FONT_KEY, cursive ? '1' : '0')
      localStorage.setItem(FS_KEY, String(fs))
    } catch {}
  }, [cursive, fs])
  const [visualLines, setVisualLines] = useState(0)
  const [toasts, setToasts] = useState([])
  const [spellcheck, setSpellcheck] = useState(() => {
    try {
      return localStorage.getItem(SPELL_KEY) === '1'
    } catch {
      return false
    }
  })
  const [listening, setListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const recogRef = useRef(null)
  const wantListeningRef = useRef(false)
  const restartsRef = useRef(0)
  const essayRef = useRef('')
  const [docTitle, setDocTitle] = useState(() => {
    try {
      return localStorage.getItem(TITLE_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const cancelTitleRef = useRef(false)
  const [focusMode, setFocusMode] = useState(false)
  const [caretLine, setCaretLine] = useState(null)
  const [writing, setWriting] = useState(false)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) ?? 'padrao'
    } catch {
      return 'padrao'
    }
  })
  const areaRef = useRef(null)
  const caretMeasureRef = useRef(null)
  const lhRef = useRef(28)
  const lhDirtyRef = useRef(true)
  const caretRaf = useRef(0)
  const fileRef = useRef(null)

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
  const chatOpenedAt = useRef(0)
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

  useEffect(
    () => () => {
      wantListeningRef.current = false
      try {
        recogRef.current?.abort()
      } catch {}
    },
    [],
  )

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
    remeasureAll()
  }, [fs, cursive])

  useEffect(() => {
    let t
    const onResize = () => {
      clearTimeout(t)
      t = setTimeout(() => remeasureAll(), 200)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    if (!essay) return
    const { text, limited, lines } = fitToLimit(essay)
    if (limited) {
      setEssay(text)
      setVisualLines(Math.max(1, lines))
      pushToast('Texto ajustado ao limite de 30 linhas')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const timerClass =
    timerMode === 'down' && timerValue === 0
      ? 'done'
      : timerMode === 'down' && timerValue <= 300
        ? 'warn'
        : ''

  essayRef.current = essay

  const speechSupported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const insertDictation = (chunk) => {
    const prev = essayRef.current
    const el = areaRef.current
    const start = el ? (el.selectionStart ?? prev.length) : prev.length
    const end = el ? (el.selectionEnd ?? prev.length) : prev.length
    const needsSpace =
      start > 0 && !/\s/.test(prev[start - 1]) && !/^[\s.,;:!?)"'\n—]/.test(chunk)
    const next = prev.slice(0, start) + (needsSpace ? ' ' : '') + chunk + prev.slice(end)
    const { text: fitted, limited, lines } = fitToLimit(next)
    if (limited) notifyLimit()
    setEssay(fitted)
    setVisualLines(Math.max(1, lines))
    const pos = Math.min(start + (needsSpace ? 1 : 0) + chunk.length, fitted.length)
    syncCaret(fitted, lines, pos)
    requestAnimationFrame(() => {
      try {
        el?.focus()
        el?.setSelectionRange(pos, pos)
      } catch {}
    })
  }

  const startDictation = async () => {
    try {
      if (navigator.brave && (await navigator.brave.isBrave())) {
        pushToast('O Brave bloqueia o ditado por voz. Use Chrome ou Edge')
        return
      }
    } catch {}
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      pushToast('Ditado não suportado neste navegador')
      return
    }
    if (!recogRef.current) {
      const rec = new SR()
      rec.lang = 'pt-BR'
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (e) => {
        restartsRef.current = 0
        let interim = ''
        let finals = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          if (e.results[i].isFinal) finals += t
          else interim += t
        }
        const chunk = normalizeSpoken(finals)
        if (chunk) insertDictation(chunk)
        setInterimText(interim)
      }
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          wantListeningRef.current = false
          setListening(false)
          setInterimText('')
          pushToast('Permissão do microfone negada')
        } else if (e.error === 'audio-capture') {
          wantListeningRef.current = false
          setListening(false)
          setInterimText('')
          pushToast('Nenhum microfone encontrado')
        }
      }
      rec.onend = () => {
        if (!wantListeningRef.current) {
          setListening(false)
          setInterimText('')
          return
        }
        restartsRef.current += 1
        if (restartsRef.current > 10) {
          wantListeningRef.current = false
          setListening(false)
          setInterimText('')
          pushToast('Ditado interrompido. Verifique o microfone e tente de novo')
          return
        }
        try {
          rec.start()
        } catch {}
      }
      recogRef.current = rec
    }
    wantListeningRef.current = true
    restartsRef.current = 0
    setListening(true)
    try {
      recogRef.current.start()
    } catch {}
  }

  const stopDictation = () => {
    wantListeningRef.current = false
    setInterimText('')
    try {
      recogRef.current?.stop()
    } catch {}
    setListening(false)
  }

  const lastLimitToast = useRef(0)

  const ensureLineHeight = () => {
    if (!lhDirtyRef.current) return lhRef.current
    lhDirtyRef.current = false
    const mirror = caretMeasureRef.current
    lhRef.current = mirror ? parseFloat(getComputedStyle(mirror).lineHeight) || 28 : 28
    return lhRef.current
  }

  const measureLines = (text) => {
    const mirror = caretMeasureRef.current
    if (!mirror || !text) return 0
    const lh = ensureLineHeight()
    mirror.textContent = text
    return Math.max(1, Math.round(mirror.scrollHeight / lh))
  }

  const fitToLimit = (text) => {
    const lines = measureLines(text)
    if (lines <= TOTAL_LINES) return { text, limited: false, lines }
    const mirror = caretMeasureRef.current
    const lh = lhRef.current
    let lo = 0
    let hi = text.length
    let loLines = 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      mirror.textContent = text.slice(0, mid)
      const l = Math.max(1, Math.round(mirror.scrollHeight / lh))
      if (l <= TOTAL_LINES) {
        lo = mid
        loLines = l
      } else hi = mid - 1
    }
    return { text: text.slice(0, lo), limited: true, lines: loLines }
  }

  const notifyLimit = () => {
    const now = Date.now()
    if (now - lastLimitToast.current > 2500) {
      lastLimitToast.current = now
      pushToast('Limite de 30 linhas atingido')
    }
  }

  const syncCaret = (text, lines, pos) => {
    const p = Math.min(pos, text.length)
    if (!text || p >= text.length) {
      setCaretLine(!text ? 0 : Math.min(lines - 1, TOTAL_LINES - 1))
      return
    }
    const mirror = caretMeasureRef.current
    if (!mirror) return
    ensureLineHeight()
    mirror.textContent = text.slice(0, p)
    const idx = Math.round(mirror.scrollHeight / lhRef.current) - 1
    setCaretLine(idx >= 0 && idx < TOTAL_LINES ? idx : null)
  }

  const handleChange = (e) => {
    const raw = e.target.value
    const caretPos = Math.min(e.target.selectionStart ?? raw.length, raw.length)
    const { text, limited, lines } = fitToLimit(raw)
    if (limited) notifyLimit()
    setEssay(text)
    setVisualLines(Math.max(1, lines))
    syncCaret(text, lines, caretPos)
  }

  const updateCaret = (text, pos) => {
    const slice = text.slice(0, pos)
    if (!slice) {
      setCaretLine(0)
      return
    }
    const mirror = caretMeasureRef.current
    if (!mirror) return
    ensureLineHeight()
    mirror.textContent = slice
    const idx = Math.round(mirror.scrollHeight / lhRef.current) - 1
    setCaretLine(idx >= 0 && idx < TOTAL_LINES ? idx : null)
  }

  const scheduleCaret = () => {
    if (caretRaf.current) return
    caretRaf.current = requestAnimationFrame(() => {
      caretRaf.current = 0
      const el = areaRef.current
      if (!el || document.activeElement !== el) return
      updateCaret(el.value, el.selectionStart ?? 0)
    })
  }

  const remeasureAll = () => {
    lhDirtyRef.current = true
    const text = essayRef.current
    if (!text) {
      setVisualLines(1)
      return
    }
    const lines = measureLines(text)
    setVisualLines(Math.max(1, lines))
    const el = areaRef.current
    if (el && document.activeElement === el) {
      syncCaret(text, lines, el.selectionStart ?? text.length)
    }
  }

  const handleClear = () => {
    if (essay && !window.confirm('Apagar toda a redação?')) return
    const had = essay.length > 0
    setEssay('')
    setVisualLines(1)
    setCaretLine(0)
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

  const startEditTitle = () => {
    setDraftTitle(docTitle)
    cancelTitleRef.current = false
    setEditingTitle(true)
  }

  const commitTitle = () => {
    if (cancelTitleRef.current) {
      cancelTitleRef.current = false
      setEditingTitle(false)
      return
    }
    const v = draftTitle.trim()
    setDocTitle(v)
    try {
      localStorage.setItem(TITLE_KEY, v)
    } catch {}
    setEditingTitle(false)
  }

  const slugify = (s) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'redacao'

  const EXPORT_SEP = '----------------------------------------'

  const handleExport = () => {
    const d = new Date()
    const p = (n) => String(n).padStart(2, '0')
    const header = [
      'SB Redação',
      `Tema: ${docTitle || 'Sem título'}`,
      `Fonte: ${cursive ? 'Cursiva' : 'Digitação'} (tamanho ${fs})`,
      `Data: ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`,
      EXPORT_SEP,
      '',
    ].join('\n')
    const blob = new Blob(['\uFEFF' + header + essay], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slugify(docTitle)}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    pushToast('Redação exportada')
  }

  const stripExportHeader = (text) => {
    const lines = text.split('\n')
    if (lines[0]?.trim() !== 'SB Redação') return text
    const sepIdx = lines.findIndex((l, i) => i > 0 && i < 10 && l.trim() === EXPORT_SEP)
    if (sepIdx < 0) return text
    return lines.slice(sepIdx + 1).join('\n').replace(/^\n/, '')
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const raw = stripExportHeader((await file.text()).replace(/^\uFEFF/, ''))
    if (essay && essay !== raw) {
      if (!window.confirm('Substituir o texto atual pelo conteúdo do arquivo?')) return
    }
    const { text, limited, lines } = fitToLimit(raw)
    setEssay(text)
    setVisualLines(Math.max(1, lines))
    syncCaret(text, lines, text.length)
    areaRef.current?.focus()
    pushToast(limited ? 'Texto ajustado ao limite de 30 linhas' : 'Redação importada')
  }

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
    fontsize: (v) => setFs(Math.max(8, Math.min(28, Number.isFinite(v) ? v : 18))),
  }

  const linesEl = useMemo(
    () =>
      NUMBERS.map((n, i) => (
        <div className={`line${i === caretLine ? ' active' : ''}`} key={n}>
          <div className="line-num">
            {i === 0 ? (
              <span className="num-label">
                TEXTO
                <br />
                DEFINITIVO
              </span>
            ) : (
              n
            )}
          </div>
          <div className="line-text" />
        </div>
      )),
    [caretLine],
  )

  useEffect(() => {
    if (!focusMode) return
    const onKey = (e) => {
      if (e.key === 'Escape') setFocusMode(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [focusMode])

  return (
    <div className={`app${focusMode ? ' focus-mode' : ''}${writing ? ' writing' : ''}`}>
      <div className="background" />
      <div className="blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <header className="toolbar">
        <span className="brand">SB REDAÇÃO</span>

        <div className="stats">
          <span className="stat">
            Linhas <strong>{Math.min(visualLines, TOTAL_LINES)}/{TOTAL_LINES}</strong>
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
            <button onClick={() => setFs((v) => Math.max(8, v - 1))}>A−</button>
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
                  onClick={() => { setMenuOpen(false); handleExport(); }}
                >
                  <IconDownload />
                  Exportar redação
                </button>
                <button
                  className="menu-item"
                  onClick={() => { setMenuOpen(false); fileRef.current?.click(); }}
                >
                  <IconUpload />
                  Importar redação
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    setSpellcheck((v) => {
                      try {
                        localStorage.setItem(SPELL_KEY, v ? '0' : '1')
                      } catch {}
                      return !v
                    })
                  }}
                >
                  <IconSpell />
                  {spellcheck ? '✓ Revisão ortográfica' : 'Revisão ortográfica'}
                </button>
                {speechSupported && (
                  <button
                    className="menu-item"
                    title="Fale a pontuação: ponto, vírgula, nova linha"
                    onClick={() => { setMenuOpen(false); listening ? stopDictation() : startDictation(); }}
                  >
                    <IconMic />
                    {listening ? 'Parar ditado' : 'Ditar texto'}
                  </button>
                )}
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

        <div
          className={`sheet ${cursive ? 'sheet-cursive' : ''}`}
          style={{ '--user-fs': `${fs}px`, '--user-fs-cursive': `${Math.round(fs * 1.45)}px` }}
        >
          <div className="sheet-header">
            <p className="h-top">SB Redação</p>
            <h2 className="h-title">Redação</h2>
            {editingTitle ? (
              <input
                className="h-sub-input"
                value={draftTitle}
                autoFocus
                maxLength={60}
                placeholder="Digite seu tema aqui"
                aria-label="Nome da redação"
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitle()
                  if (e.key === 'Escape') {
                    cancelTitleRef.current = true
                    setEditingTitle(false)
                  }
                }}
              />
            ) : (
              <p
                className={`h-sub${docTitle ? ' custom' : ''}`}
                onClick={startEditTitle}
                title="Clique para nomear a redação"
              >
                {docTitle || 'Digite seu tema aqui'}
              </p>
            )}
          </div>

          <div className="writing-area">
            <div className="lines">
              {linesEl}
            </div>
            {essay === '' && <span className="caret" aria-hidden="true" />}
            <div
              ref={caretMeasureRef}
              className={`line-measure ${cursive ? 'cursive' : ''}`}
              aria-hidden="true"
            />
            <textarea
              ref={areaRef}
              className={`typing ${cursive ? 'cursive' : ''}`}
              value={essay}
              onChange={handleChange}
              onSelect={scheduleCaret}
              onClick={scheduleCaret}
              onKeyUp={scheduleCaret}
              onFocus={(e) => {
                setWriting(true)
                updateCaret(e.target.value, e.target.selectionStart ?? 0)
              }}
              onBlur={() => {
                setWriting(false)
                setCaretLine(null)
              }}
              placeholder="Comece a escrever sua redação aqui..."
              spellCheck={spellcheck}
              lang="pt-BR"
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

      <button
        className="chat-fab"
        onClick={() => {
          if (Date.now() - chatOpenedAt.current < 5000) {
            pushToast('A janela do ChatGPT já está aberta')
            return
          }
          chatOpenedAt.current = Date.now()
          const url = 'https://chatgpt.com/'
          const w = window.open(
            url,
            'sb-chatgpt',
            'width=420,height=680,menubar=no,toolbar=no,location=yes,status=no',
          )
          if (!w) {
            chatOpenedAt.current = 0
            window.open(url, '_blank', 'noopener')
          }
        }}
        title="Abrir ChatGPT em janela flutuante"
        aria-label="Abrir ChatGPT em janela flutuante"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
        </svg>
      </button>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.msg}
          </div>
        ))}
      </div>

      {listening && (
        <button
          className="dictate-pill"
          onClick={stopDictation}
          title="Parar ditado"
          aria-label="Parar ditado"
        >
          <span className="dictate-dot" aria-hidden="true" />
          <span className="dictate-text">{interimText || 'Ouvindo... clique para parar'}</span>
        </button>
      )}

      <AiAnalysis essay={essay} open={aiOpen} onClose={() => setAiOpen(false)} />

      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,text/plain"
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleImport}
      />

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
