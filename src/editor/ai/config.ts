/**
 * 「AI帮我写」配置 —— 用户自带模型与 API（OpenAI Chat Completions 兼容协议）。
 * 配置保存在 localStorage，不经过任何第三方服务。
 */
export interface AIConfig {
  baseURL: string
  apiKey: string
  model: string
  temperature: number
}

const KEY = 'feishu-clone:ai-config'

export const DEFAULT_AI_CONFIG: AIConfig = {
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
}

export function loadAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_AI_CONFIG }
    return { ...DEFAULT_AI_CONFIG, ...(JSON.parse(raw) as Partial<AIConfig>) }
  } catch {
    return { ...DEFAULT_AI_CONFIG }
  }
}

export function saveAIConfig(cfg: AIConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

export function hasAIConfig(cfg: AIConfig): boolean {
  return Boolean(cfg.apiKey.trim() && cfg.baseURL.trim() && cfg.model.trim())
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 流式调用 OpenAI 兼容 /chat/completions。
 * onDelta 逐段回调增量文本；返回完整文本。abort 用于停止生成。
 */
export async function streamChat(
  cfg: AIConfig,
  messages: ChatMessage[],
  onDelta: (chunk: string) => void,
  abort: AbortSignal,
): Promise<string> {
  const url = `${cfg.baseURL.replace(/\/+$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      stream: true,
      temperature: cfg.temperature,
    }),
    signal: abort,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`请求失败 ${res.status}：${text.slice(0, 300) || res.statusText}`)
  }
  if (!res.body) throw new Error('当前环境不支持流式响应')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data:')) continue
      const data = t.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>
        }
        const chunk = json.choices?.[0]?.delta?.content
        if (chunk) {
          full += chunk
          onDelta(chunk)
        }
      } catch {
        /* 忽略无法解析的心跳/注释行 */
      }
    }
  }
  return full
}
