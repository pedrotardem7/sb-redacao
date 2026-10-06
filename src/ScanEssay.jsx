import { useEffect, useRef, useState } from 'react'

const GEMINI_KEY_STORAGE = 'soph-enem-gemini-key'
const GEMINI_MODEL = 'gemini-3.5-flash-lite'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const TRANSCRIBE_PROMPT = `Transcreva com fidelidade total o texto da redação visível nesta foto. Regras:
- Responda SOMENTE com o texto transcrito, sem comentários, sem aspas extras, sem markdown.
- Preserve parágrafos (linha em branco entre eles) e a pontuação original.
- Não corrija ortografia nem gramática, apenas transcreva o que está escrito.
- Se houver trecho ilegível, escreva [ilegível] no lugar.
- Se não houver texto algum, responda vazio.`

function loadKey() {
  try {
    return localStorage.getItem(GEMINI_KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

function downscaleToJpeg(dataUrl, maxDim = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    img.src = dataUrl
  })
}

async function transcribeWithGemini(apiKey, jpegDataUrl) {
  const base64 = jpegDataUrl.split(',')[1] ?? ''
  if (!base64) throw new Error('Imagem inválida.')
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: TRANSCRIBE_PROMPT },
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 4000 },
    }),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const data = await res.json()
      detail = data?.error?.message ? ` (${data.error.message})` : ''
    } catch {}
    if (res.status === 400) throw new Error('Requisição rejeitada. Confira a chave e tente outra foto.' + detail)
    if (res.status === 401 || res.status === 403) throw new Error('Chave inválida. Confira sua chave Gemini.')
    if (res.status === 404) throw new Error('Modelo indisponível no momento. Tente mais tarde.' + detail)
    if (res.status === 429) throw new Error('Limite gratuito atingido. Aguarde e tente de novo.')
    throw new Error('Não foi possível transcrever.' + detail)
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  return text.trim()
}

function ScanEssay({ open, onClose, onInsert, hasText }) {
  const [apiKey, setApiKey] = useState(() => loadKey())
  const [keyInput, setKeyInput] = useState('')
  const [image, setImage] = useState(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef = useRef(null)

  const stopCamera = () => {
    try {
      streamRef.current?.getTracks()?.forEach((t) => t.stop())
    } catch {}
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }

  useEffect(() => {
    if (!open) return
    setError('')
    setResult('')
    setStatus('idle')
    setImage(null)
    setCameraError('')
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      try {
        streamRef.current?.getTracks()?.forEach((t) => t.stop())
      } catch {}
      streamRef.current = null
    }
  }, [open, onClose])

  if (!open) return null

  const startCamera = async () => {
    setCameraError('')
    setError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Câmera não suportada neste navegador. Use o upload da foto.')
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      setCameraOn(true)
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      })
    } catch {
      setCameraError('Não consegui acessar a câmera. Confira a permissão ou use o upload.')
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) {
      setError('A câmera ainda não está pronta. Aguarde um instante.')
      return
    }
    const canvas = document.createElement('canvas')
    const maxDim = 1600
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    setImage(canvas.toDataURL('image/jpeg', 0.9))
    stopCamera()
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      const raw = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result)
        r.onerror = () => reject(new Error('Falha ao ler arquivo.'))
        r.readAsDataURL(file)
      })
      const jpeg = await downscaleToJpeg(String(raw))
      setImage(jpeg)
      stopCamera()
    } catch {
      setError('Não foi possível ler essa imagem.')
    }
  }

  const saveKey = () => {
    const k = keyInput.trim()
    if (!k) return
    try {
      localStorage.setItem(GEMINI_KEY_STORAGE, k)
    } catch {}
    setApiKey(k)
    setKeyInput('')
  }

  const transcribe = async () => {
    if (!image) return
    if (!apiKey) {
      setError('Cole sua chave gratuita do Gemini primeiro (a mesma da Análise por IA).')
      return
    }
    setStatus('loading')
    setError('')
    setResult('')
    try {
      const text = await transcribeWithGemini(apiKey, image)
      if (!text) {
        setError('Não encontrei texto legível nessa foto. Tente aproximar e com boa luz.')
        setStatus('error')
        return
      }
      setResult(text)
      setStatus('done')
    } catch (err) {
      setError(err?.message || 'Falha ao transcrever. Tente de novo.')
      setStatus('error')
    }
  }

  return (
    <div className="overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) { stopCamera(); onClose() } }}>
      <div className="modal modal-ai">
        <h3>Escanear redação</h3>
        <p className="modal-desc">
          Tire uma foto da sua folha e eu transcrevo o texto para cá usando o Gemini.
        </p>

        {!apiKey ? (
          <>
            <p className="modal-desc">
              Use a mesma chave gratuita da Análise por IA (Google AI Studio, sem cartão).
            </p>
            <a className="btn btn-primary btn-big" href="https://aistudio.google.com" target="_blank" rel="noreferrer">
              Abrir o Google AI Studio
            </a>
            <div className="ai-key-row">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Cole sua chave Gemini aqui"
                aria-label="Chave da API Gemini"
              />
              <button className="icon-btn" onClick={saveKey}>Salvar</button>
            </div>
          </>
        ) : (
          <>
            {!image ? (
              <>
                {cameraOn ? (
                  <video ref={videoRef} className="scan-video" playsInline muted autoPlay />
                ) : (
                  <div className="scan-placeholder">
                    {cameraError || 'Nenhuma foto ainda. Ative a câmera ou envie uma foto.'}
                  </div>
                )}
                <div className="scan-actions">
                  {!cameraOn ? (
                    <button className="btn btn-primary" onClick={startCamera}>
                      Ativar câmera
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={capturePhoto}>
                      Capturar foto
                    </button>
                  )}
                  <button className="icon-btn" onClick={() => fileRef.current?.click()}>
                    Tirar foto / Enviar
                  </button>
                </div>
                {cameraOn && (
                  <button className="link-btn" onClick={stopCamera}>Desligar câmera</button>
                )}
              </>
            ) : (
              <>
                <img src={image} alt="Foto da redação para transcrever" className="scan-preview" />
                <div className="scan-actions">
                  <button
                    className="btn btn-primary"
                    onClick={transcribe}
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? 'Transcrevendo...' : 'Transcrever foto'}
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => { setImage(null); setResult(''); setStatus('idle'); setError('') }}
                  >
                    Refazer
                  </button>
                </div>
              </>
            )}

            {status === 'loading' && (
              <p className="ai-loading">Lendo sua letra e transcrevendo...</p>
            )}
            {error && <div className="ai-error">{error}</div>}

            {result && (
              <>
                <p className="modal-desc">Confira e edite se precisar antes de jogar na folha:</p>
                <textarea
                  className="scan-result"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  rows={8}
                  aria-label="Texto transcrito"
                />
                <div className="scan-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => { onInsert(result, 'replace'); stopCamera(); onClose() }}
                  >
                    {hasText ? 'Substituir texto' : 'Jogar na folha'}
                  </button>
                  {hasText && (
                    <button
                      className="icon-btn"
                      onClick={() => { onInsert(result, 'append'); stopCamera(); onClose() }}
                    >
                      Adicionar ao final
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFile}
        />

        <button className="icon-btn" onClick={() => { stopCamera(); onClose() }}>Fechar</button>
      </div>
    </div>
  )
}

export default ScanEssay
