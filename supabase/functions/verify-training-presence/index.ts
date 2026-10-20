import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const GEMINI_MODEL = 'gemini-2.0-flash'

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function buildPrompt(trainingName: string, employeeName: string) {
  return `Você é um auditor de documentos de treinamento obrigatório (segurança do trabalho).
Analise o documento anexado, que deveria ser uma LISTA DE PRESENÇA (folha de registro) de um treinamento.

Treinamento esperado: "${trainingName}"
Colaborador que deveria estar presente e assinar: "${employeeName}"

Verifique:
1. O documento é uma lista de presença / folha de registro de treinamento? (Se for certificado, declaração ou outro tipo de documento, e_lista_presenca=false e treinamento_confere=false, explicando na observação.)
2. O nome do treinamento esperado aparece no documento (título, cabeçalho ou conteúdo)? Considere variações e abreviações (ex.: "NR-35" vs "Trabalho em Altura").
3. O colaborador esperado está na lista E assinou (assinatura ou rubrica manuscrita na linha do nome dele)? Nome apenas impresso ou digitado NÃO conta como assinado.

Responda APENAS com JSON válido, sem markdown:
{"e_lista_presenca": boolean, "treinamento_confere": boolean, "treinamento_encontrado": string, "colaborador_assinou": boolean, "nome_assinado": string, "confianca": number, "observacao": string}

Campos:
- e_lista_presenca: true se o documento for lista de presença/folha de registro
- treinamento_confere: true se o documento corresponde ao treinamento esperado
- treinamento_encontrado: nome do treinamento identificado no documento ("" se não identificado)
- colaborador_assinou: true se o colaborador esperado está na lista com assinatura/rubrica
- nome_assinado: nome que aparece assinado para o colaborador ("" se não assinou/não encontrou)
- confianca: 0 a 100
- observacao: em português, 1-2 frases explicando a decisão`
}

function parseAiJson(text: string) {
  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('Resposta da IA sem JSON válido')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function toBase64(ab: ArrayBuffer): string {
  const bytes = new Uint8Array(ab)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any)
  }
  return btoa(bin)
}

function sniffMime(bytes: Uint8Array, contentType: string | null): string {
  if (bytes[0] === 0x25 && bytes[1] === 0x50) return 'application/pdf'
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png'
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif'
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return 'image/webp'
  if (contentType) return contentType.split(';')[0].trim()
  return 'application/pdf'
}

async function callGemini(
  apiKey: string,
  prompt: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
  const body = {
    contents: [
      {
        parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }],
      },
    ],
    generationConfig: { temperature: 0.1 },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text)
      .filter(Boolean)
      .join('') || ''
  if (!text) throw new Error('Gemini retornou resposta vazia')
  return text
}

async function callOpenAI(
  apiKey: string,
  prompt: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  if (!mimeType.startsWith('image/')) {
    throw new Error('Fallback OpenAI suporta apenas imagens (PDF requer GOOGLE_AI_API_KEY)')
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('OpenAI retornou resposta vazia')
  return text
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonRes({ error: 'Use POST com { record_id }' }, 405)
  }

  let recordId: string | undefined
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonRes({ error: 'Missing Authorization header' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const body = await req.json()
    recordId = body?.record_id
    if (!recordId) return jsonRes({ error: 'Missing record_id' }, 400)

    const { data: rec, error: recErr } = await admin
      .from('employee_training_records')
      .select(
        'id, document_url, completion_date, employee_id, training_id, employees(name), trainings(name)',
      )
      .eq('id', recordId)
      .single()

    if (recErr || !rec) return jsonRes({ error: 'Registro de treinamento não encontrado' }, 404)
    const record = rec as any
    if (!record.document_url) {
      return jsonRes({ error: 'Registro sem documento anexado' }, 400)
    }

    const employeeName: string = record.employees?.name || ''
    const trainingName: string = record.trainings?.name || ''

    // Baixa o documento e identifica o tipo pelo magic bytes
    const fileRes = await fetch(record.document_url)
    if (!fileRes.ok) {
      throw new Error(`Falha ao baixar o documento (${fileRes.status})`)
    }
    const ab = await fileRes.arrayBuffer()
    const sizeMb = ab.byteLength / (1024 * 1024)
    if (sizeMb > 18) {
      throw new Error('Documento muito grande para análise (limite ~18MB)')
    }
    const firstBytes = new Uint8Array(ab.slice(0, 16))
    const mimeType = sniffMime(firstBytes, fileRes.headers.get('content-type'))
    const base64 = toBase64(ab)

    const prompt = buildPrompt(trainingName, employeeName)
    const geminiKey = Deno.env.get('GOOGLE_AI_API_KEY') || ''
    const openaiKey = Deno.env.get('OPENAI_API_KEY') || ''

    let raw: string
    if (geminiKey) {
      raw = await callGemini(geminiKey, prompt, base64, mimeType)
    } else if (openaiKey) {
      raw = await callOpenAI(openaiKey, prompt, base64, mimeType)
    } else {
      throw new Error('Nenhuma chave de IA configurada (GOOGLE_AI_API_KEY ou OPENAI_API_KEY)')
    }

    const parsed = parseAiJson(raw)
    const confere = parsed.treinamento_confere === true
    const assinou = parsed.colaborador_assinou === true
    const status = confere && assinou ? 'verified' : 'rejected'
    const notes = String(parsed.observacao || '').slice(0, 500)
    const signedName = String(parsed.nome_assinado || '').slice(0, 200)
    const confidence = typeof parsed.confianca === 'number' ? parsed.confianca : 50

    await admin
      .from('employee_training_records')
      .update({
        verification_status: status,
        verification_notes: notes,
        verification_signed_name: signedName,
        verification_confidence: confidence,
        verified_at: new Date().toISOString(),
      })
      .eq('id', recordId)

    return jsonRes({
      success: true,
      status,
      notes,
      signed_name: signedName,
      confidence,
      training_found: String(parsed.treinamento_encontrado || ''),
      is_presence_list: parsed.e_lista_presenca === true,
    })
  } catch (error: any) {
    const message = String(error?.message || error)
    if (recordId) {
      try {
        const admin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )
        await admin
          .from('employee_training_records')
          .update({
            verification_status: 'failed',
            verification_notes: message.slice(0, 500),
            verified_at: new Date().toISOString(),
          })
          .eq('id', recordId)
      } catch (_e) {
        // não bloqueia a resposta de erro
      }
    }
    return jsonRes({ success: false, error: message }, 500)
  }
})
