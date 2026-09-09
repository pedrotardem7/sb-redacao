import { useEffect, useState } from 'react'

const GEMINI_KEY_STORAGE = 'soph-enem-gemini-key'
const GROQ_KEY_STORAGE = 'soph-enem-groq-key'
const PROVIDER_STORAGE = 'soph-enem-ai-provider'

const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash']
const geminiUrl = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
const GROQ_MODEL = 'openai/gpt-oss-120b'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const PROVIDERS = {
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com',
    keyUrlLabel: 'Abrir o Google AI Studio',
    steps: [
      'Abra o Google AI Studio e entre com sua conta Google.',
      'Clique em Get API key e depois em Create API key (não precisa de cartão).',
      'Copie a chave e cole no campo abaixo.',
    ],
    note: 'Cota gratuita generosa. O texto da redação é enviado ao Google apenas para gerar a análise.',
  },
  groq: {
    id: 'groq',
    label: 'Groq (rápido)',
    keyUrl: 'https://console.groq.com/keys',
    keyUrlLabel: 'Abrir o GroqCloud',
    steps: [
      'Crie uma conta em console.groq.com (e-mail ou Google).',
      'Vá em API Keys e clique em Create API Key (não precisa de cartão).',
      'Copie a chave (começa com gsk_) e cole no campo abaixo.',
    ],
    note: 'Plano gratuito sem cartão, com respostas bem mais rápidas. O texto da redação é enviado à Groq apenas para gerar a análise.',
  },
}

const SCHEMA = {
  type: 'object',
  properties: {
    nota_total: { type: 'integer' },
    competencias: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          numero: { type: 'integer' },
          nome: { type: 'string' },
          nota: { type: 'integer' },
          comentario: { type: 'string' },
        },
        required: ['numero', 'nome', 'nota', 'comentario'],
      },
    },
    pontos_fortes: { type: 'array', items: { type: 'string' } },
    para_melhorar: { type: 'array', items: { type: 'string' } },
    resumo: { type: 'string' },
  },
  required: ['nota_total', 'competencias', 'pontos_fortes', 'para_melhorar', 'resumo'],
}

const SYSTEM_PROMPT = `Você é um corretor experiente de redações dissertativa-argumentativas: rigoroso e imparcial, como um ser humano que corrige milhares de redações. Nota 1000 é RARÍSSIMA — só dê 200 numa competência se TODOS os requisitos do nível máximo estiverem cumpridos. Na dúvida entre dois níveis, escolha o MENOR.

ESCALA (cada competência): 0, 40, 80, 120, 160 ou 200.

COMPETÊNCIA 1 — Norma culta: 200 só com zero a pouquíssimos desvios pontuais em todo o texto. Cada erro de ortografia, concordância, regência, pontuação ou crase conta. Cite cada desvio encontrado.

COMPETÊNCIA 2 — Tema e repertório: 200 só se o repertório for LEGÍTIMO, PERTINENTE e PRODUTIVO (desenvolvido a serviço do argumento). Mencionar nomes ou dados sem desenvolver, repertório decorativo, genérico ou chavões ("nos dias atuais", "desde os primórdios") limita a 120–160. Tangenciar o tema derruba a nota.

COMPETÊNCIA 3 — Argumentação: tese clara e ponto de vista defendido do início ao fim. Argumentos incompletos, contraditórios ou abandonados no meio do texto derrubam para 120 ou menos. Enrolação sem progressão de ideias não pontua.

COMPETÊNCIA 4 — Coesão: repertório VARIADO de conectivos bem empregados. Repetir os mesmos conectivos ("além disso", "portanto", "dessa forma") várias vezes limita a 120–160. Falhas de articulação entre parágrafos derrubam mais.

COMPETÊNCIA 5 — Intervenção: 200 só com os 5 elementos ARTICULADOS ao texto — agente, ação, meio/modo, efeito/finalidade e detalhamento de um deles — e sem desrespeito aos direitos humanos. Proposta vaga ou genérica: 80–120. Falta de detalhamento: máximo 160. Qualquer desrespeito aos direitos humanos zera a redação (todas as notas 0).

REGRAS: para cada competência, transcreva entre aspas o trecho exato que sustenta a nota OU a falha que tirou pontos. Sem evidência citada, não dê 200. Seja específico e direto, sem elogio vazio. Responda SOMENTE com o JSON, sem markdown nem explicações fora dele, em português: comentários de 1 a 2 frases (incluindo a evidência citada), até 3 pontos fortes, até 3 pontos a melhorar e resumo de 2 frases. A nota total é a soma das 5 competências.`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function friendlyError(status, data, provider) {
  const detail = data?.error?.message ? ` (${data.error.message})` : ''
  if (status === 400) return 'Chave inválida ou requisição rejeitada. Confira a chave e tente de novo.'
  if (status === 401 || status === 403) return 'Acesso negado. Confira se a chave está correta e ativa.'
  if (status === 404) {
    return provider === 'groq'
      ? 'Modelo indisponível na Groq. Confira a lista de modelos ativos no console.'
      : `Modelo de IA indisponível no momento. Tente novamente mais tarde.${detail}`
  }
  if (status === 429) return 'Limite gratuito atingido por agora. Aguarde alguns minutos e tente de novo.'
  if (status === 503) return 'O modelo está com alta demanda agora. Tente novamente em alguns minutos.'
  return `Não foi possível analisar.${detail}`
}

function normalizeResult(r) {
  const comps = (Array.isArray(r?.competencias) ? r.competencias : []).slice(0, 5).map((c, i) => ({
    numero: Number(c?.numero) || i + 1,
    nome: String(c?.nome || `Competência ${i + 1}`),
    nota: Math.max(0, Math.min(200, Number(c?.nota) || 0)),
    comentario: String(c?.comentario || ''),
  }))
  return {
    nota_total: Number.isFinite(Number(r?.nota_total))
      ? Number(r.nota_total)
      : comps.reduce((s, c) => s + c.nota, 0),
    competencias: comps,
    pontos_fortes: (Array.isArray(r?.pontos_fortes) ? r.pontos_fortes : []).map(String).slice(0, 5),
    para_melhorar: (Array.isArray(r?.para_melhorar) ? r.para_melhorar : []).map(String).slice(0, 5),
    resumo: String(r?.resumo || ''),
  }
}

function cleanJson(raw) {
  return String(raw ?? '').replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
}

function extractJson(raw) {
  const t = cleanJson(raw)
  const s = t.indexOf('{')
  const e = t.lastIndexOf('}')
  const slice = s >= 0 && e > s ? t.slice(s, e + 1) : t
  return JSON.parse(slice)
}

const VALID_NOTES = [0, 40, 80, 120, 160, 200]

function isValidResult(r) {
  if (!r || !Array.isArray(r.competencias) || r.competencias.length !== 5) return false
  return r.competencias.every(
    (c) =>
      c &&
      typeof c.nome === 'string' && c.nome.trim().length > 0 &&
      VALID_NOTES.includes(Number(c.nota)) &&
      typeof c.comentario === 'string' && c.comentario.trim().length > 0,
  )
}

async function callGeminiModel(model, key, text) {
  const res = await fetch(geminiUrl(model), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: `Redação para corrigir:\n\n${text}` }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
      },
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw { status: res.status, data, retryable: res.status === 429 || res.status === 503 }
  }
  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!raw) throw { status: 0, data: {}, retryable: false, message: 'A IA não retornou a análise. Tente novamente.' }
  return extractJson(raw)
}

async function attemptGemini(key, text) {
  let lastErr = null
  for (const model of GEMINI_MODELS) {
    try {
      return { data: await callGeminiModel(model, key, text), model }
    } catch (e) {
      lastErr = e
      if (e?.status === 400 || e?.status === 404 || e?.status === 429 || e?.status === 503) {
        continue
      }
      throw e
    }
  }
  throw lastErr
}

async function checkGeminiKey(key) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
  )
  if (!res.ok) throw { status: res.status }
}

async function checkGroqKey(key) {
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!res.ok) throw { status: res.status }
}

async function attemptGroq(key, text) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Redação para corrigir:\n\n${text}` },
      ],
      temperature: 0.3,
      max_completion_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw {
      status: res.status,
      data,
      retryable: [429, 500, 502, 503].includes(res.status),
    }
  }
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content
  if (!raw) throw { status: 0, data: {}, retryable: false, message: 'A IA não retornou a análise. Tente novamente.' }
  return { data: extractJson(raw), model: GROQ_MODEL }
}

function loadKey(name) {
  try {
    return localStorage.getItem(name) ?? ''
  } catch {
    return ''
  }
}

function AiAnalysis({ essay, open, onClose }) {
  const [provider, setProvider] = useState(() => {
    try {
      return localStorage.getItem(PROVIDER_STORAGE) ?? 'gemini'
    } catch {
      return 'gemini'
    }
  })
  const [keys, setKeys] = useState(() => ({
    gemini: loadKey(GEMINI_KEY_STORAGE),
    groq: loadKey(GROQ_KEY_STORAGE),
  }))
  const [key, setKey] = useState('')
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [usedModel, setUsedModel] = useState('')
  const [error, setError] = useState('')
  const [retryNote, setRetryNote] = useState('')
  const [validating, setValidating] = useState(false)
  const [keyMsg, setKeyMsg] = useState(null)

  const info = PROVIDERS[provider] ?? PROVIDERS.gemini
  const savedKey = keys[provider] ?? ''

  useEffect(() => {
    if (open) setError('')
  }, [open ])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const switchProvider = (id) => {
    setProvider(id)
    setResult(null)
    setError('')
    setKeyMsg(null)
    try {
      localStorage.setItem(PROVIDER_STORAGE, id)
    } catch {}
  }

  const validateKey = async () => {
    if (!savedKey || validating) return
    setValidating(true)
    setKeyMsg(null)
    try {
      if (provider === 'groq') await checkGroqKey(savedKey)
      else await checkGeminiKey(savedKey)
      setKeyMsg({ ok: true, text: 'Chave válida e funcionando.' })
    } catch (e) {
      const status = typeof e?.status === 'number' ? e.status : 0
      setKeyMsg({
        ok: false,
        text: status ? friendlyError(status, {}, provider) : 'Falha de conexão. Verifique a internet.',
      })
    } finally {
      setValidating(false)
    }
  }

  const saveKey = () => {
    const k = key.trim()
    if (!k) return
    const storage = provider === 'groq' ? GROQ_KEY_STORAGE : GEMINI_KEY_STORAGE
    try {
      localStorage.setItem(storage, k)
    } catch {}
    setKeys((prev) => ({ ...prev, [provider]: k }))
    setKey('')
  }

  const removeKey = () => {
    const storage = provider === 'groq' ? GROQ_KEY_STORAGE : GEMINI_KEY_STORAGE
    try {
      localStorage.removeItem(storage)
    } catch {}
    setKeys((prev) => ({ ...prev, [provider]: '' }))
    setResult(null)
    setStatus('idle')
  }

  const analyze = async () => {
    if (!essay.trim()) {
      setError('Escreva sua redação na folha antes de analisar.')
      return
    }
    if (!savedKey) {
      setError('Cole sua chave gratuita primeiro.')
      return
    }
    setStatus('loading')
    setError('')
    setResult(null)
    setUsedModel('')
    setRetryNote('')
    const attempt = provider === 'groq' ? attemptGroq : attemptGemini
    const waits = [4000, 10000, 20000]
    let shapeRetries = 0
    for (let i = 0; ; i++) {
      try {
        const { data: parsed, model: used } = await attempt(savedKey, essay.trim())
        if (!isValidResult(parsed)) {
          if (shapeRetries < 2) {
            shapeRetries += 1
            setRetryNote('Resposta incompleta, pedindo novamente...')
            continue
          }
          throw new Error('A IA retornou uma análise incompleta. Tente novamente.')
        }
        setResult(normalizeResult(parsed))
        setUsedModel(used)
        setStatus('done')
        setRetryNote('')
        return
      } catch (e) {
        if (e?.retryable && i < waits.length) {
          setRetryNote(`Modelo ocupado. Tentando novamente... (${i + 2} de ${waits.length + 1})`)
          await sleep(waits[i])
          continue
        }
        setError(e?.message || friendlyError(e?.status ?? 0, e?.data ?? {}, provider))
        setStatus('error')
        setRetryNote('')
        return
      }
    }
  }

  return (
    <div className="overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal modal-ai">
        <h3>Análise por IA</h3>

        <div className="segmented ai-provider">
          <button
            className={provider === 'gemini' ? 'active' : ''}
            onClick={() => switchProvider('gemini')}
          >
            Google Gemini
          </button>
          <button
            className={provider === 'groq' ? 'active' : ''}
            onClick={() => switchProvider('groq')}
          >
            Groq (rápido)
          </button>
        </div>

        {!savedKey ? (
          <>
            <p className="modal-desc">
              Para corrigir sua redação com IA, use sua própria chave gratuita. A chave fica
              salva só neste navegador e a cota gratuita é sua.
            </p>
            <ol className="ai-steps">
              {info.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <a className="btn btn-primary btn-big" href={info.keyUrl} target="_blank" rel="noreferrer">
              {info.keyUrlLabel}
            </a>
            <div className="ai-key-row">
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Cole sua chave aqui"
                aria-label={`Chave da API (${info.label})`}
              />
              <button className="icon-btn" onClick={saveKey}>Salvar</button>
            </div>
            <p className="ai-note">{info.note}</p>
          </>
        ) : (
          <>
            <div className="ai-key-saved">
              <span>Chave {info.label} salva: ••••{savedKey.slice(-4)}</span>
              <div className="ai-key-actions">
                <button className="icon-btn ai-key-btn" onClick={validateKey} disabled={validating}>
                  {validating ? 'Validando...' : 'Validar'}
                </button>
                <button className="link-btn" onClick={removeKey}>Remover</button>
              </div>
            </div>
            {keyMsg && (
              <div className={keyMsg.ok ? 'ai-ok' : 'ai-error'}>{keyMsg.text}</div>
            )}
            <button
              className="btn btn-primary btn-big"
              onClick={analyze}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Analisando...' : 'Analisar minha redação'}
            </button>
          </>
        )}

        {status === 'loading' && (
          <p className="ai-loading">{retryNote || 'Lendo sua redação e calculando a nota...'}</p>
        )}

        {error && <div className="ai-error">{error}</div>}

        {result && (
          <div className="ai-result">
            <div className="ai-total">
              <span>{result.nota_total}</span>
              <small>/ 1000</small>
            </div>
            {usedModel && <p className="ai-model">Modelo: {usedModel}</p>}
            {result.resumo && <p className="ai-resumo">{result.resumo}</p>}
            <div className="ai-comps">
              {(result.competencias ?? []).map((c) => (
                <div className="ai-comp" key={c.numero}>
                  <div className="ai-comp-head">
                    <strong>C{c.numero} · {c.nome}</strong>
                    <span>{c.nota}/200</span>
                  </div>
                  <div className="ai-bar">
                    <span style={{ width: `${Math.max(0, Math.min(100, (c.nota / 200) * 100))}%` }} />
                  </div>
                  <p>{c.comentario}</p>
                </div>
              ))}
            </div>
            {(result.pontos_fortes ?? []).length > 0 && (
              <>
                <h4>Pontos fortes</h4>
                <ul>
                  {result.pontos_fortes.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </>
            )}
            {(result.para_melhorar ?? []).length > 0 && (
              <>
                <h4>Para melhorar</h4>
                <ul>
                  {result.para_melhorar.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="ai-note">
              Estimativa para estudo — não é uma nota oficial.
            </p>
          </div>
        )}

        <button className="icon-btn" onClick={onClose}>Fechar</button>
      </div>
    </div>
  )
}

export default AiAnalysis
