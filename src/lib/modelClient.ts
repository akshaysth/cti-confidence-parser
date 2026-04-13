import type { ModelConfig } from '../types';

export interface ModelAnalysisResult {
  isWEL: boolean;
  confidence: number;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are an expert intelligence analyst trained in Sherman Kent's Words of Estimative Language (WEL).
Your task: evaluate whether a specific word or phrase in a sentence is being used as an estimative language term—expressing analytical probability or uncertainty.

Respond ONLY with valid JSON in this exact format:
{"is_wel": true, "confidence": 85, "reasoning": "brief explanation"}

Fields:
- is_wel: boolean — is the word/phrase expressing estimative probability in an analytical sense?
- confidence: integer 0–100 — your confidence that this IS a WEL usage (100 = definitively WEL)
- reasoning: string — 1–2 sentence explanation`;

const QUALITY_PROMPT = `You are an expert intelligence analyst. Evaluate the quality of justification for a confidence assessment.

Rate how well the sentence provides evidence or reasoning supporting the confidence level expressed.

Respond ONLY with valid JSON in this exact format:
{"score": 4, "explanation": "brief explanation"}

Score rubric (1-5):
5 = Excellent: Strong evidence, clear reasoning, specific details supporting the assessment
4 = Good: Adequate evidence, reasonable justification provided
3 = Fair: Minimal evidence, weak connection to confidence level
2 = Poor: Little to no evidence, mostly unsupported assertion
1 = Inadequate: No evidence, pure speculation, or contradictory reasoning

Fields:
- score: integer 1-5
- explanation: 1 sentence explaining the rating`;

export interface QualityScore {
  score: number;
  explanation: string;
}

function qualityUserPrompt(phrase: string, sentence: string): string {
  return `Phrase: "${phrase}"
Sentence: "${sentence}"

Rate the quality of justification for this confidence assessment.`;
}

function parseQualityResponse(content: string): QualityScore {
  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) return { score: 0, explanation: 'Could not parse response' };

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: Math.max(1, Math.min(5, Number(parsed.score) || 0)),
      explanation: String(parsed.explanation || ''),
    };
  } catch {
    return { score: 0, explanation: 'Invalid response format' };
  }
}

function userPrompt(phrase: string, sentence: string): string {
  return `Sentence: "${sentence}"

Evaluate whether "${phrase}" is being used as a Word of Estimative Language (expressing probability/uncertainty analytically).`;
}

function parseResponse(content: string): ModelAnalysisResult {
  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error(`No JSON in model response: ${content}`);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Invalid JSON from model: ${jsonMatch[0]}`);
  }
  return {
    isWEL: Boolean(parsed.is_wel),
    confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
    reasoning: String(parsed.reasoning ?? ''),
  };
}

async function callOllama(
  config: ModelConfig,
  phrase: string,
  sentence: string,
): Promise<ModelAnalysisResult> {
  const res = await fetch(`${config.endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt(phrase, sentence) },
      ],
      stream: false,
      format: 'json',
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content: string = data.message?.content ?? '';
  return parseResponse(content);
}

async function callOpenAICompatible(
  config: ModelConfig,
  phrase: string,
  sentence: string,
): Promise<ModelAnalysisResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  const res = await fetch(`${config.endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt(phrase, sentence) },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';
  return parseResponse(content);
}

async function callOllamaQuality(
config: ModelConfig,
phrase: string,
sentence: string,
): Promise<QualityScore> {
const res = await fetch(`${config.endpoint}/api/chat`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
model: config.model,
messages: [
{ role: 'system', content: QUALITY_PROMPT },
{ role: 'user', content: qualityUserPrompt(phrase, sentence) },
],
stream: false,
format: 'json',
}),
});
if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
const data = await res.json();
const content: string = data.message?.content ?? '';
return parseQualityResponse(content);
}

async function callOpenAICompatibleQuality(
config: ModelConfig,
phrase: string,
sentence: string,
): Promise<QualityScore> {
const headers: Record<string, string> = {
'Content-Type': 'application/json',
};
if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

const res = await fetch(`${config.endpoint}/v1/chat/completions`, {
method: 'POST',
headers,
body: JSON.stringify({
model: config.model,
messages: [
{ role: 'system', content: QUALITY_PROMPT },
{ role: 'user', content: qualityUserPrompt(phrase, sentence) },
],
temperature: 0.1,
response_format: { type: 'json_object' },
}),
});
if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
const data = await res.json();
const content: string = data.choices?.[0]?.message?.content ?? '';
return parseQualityResponse(content);
}

export async function analyzeWEL(
config: ModelConfig,
phrase: string,
sentence: string,
): Promise<ModelAnalysisResult> {
if (config.backend === 'ollama') {
return callOllama(config, phrase, sentence);
}
return callOpenAICompatible(config, phrase, sentence);
}

export async function analyzeQuality(
config: ModelConfig,
phrase: string,
sentence: string,
): Promise<QualityScore> {
if (config.backend === 'ollama') {
return callOllamaQuality(config, phrase, sentence);
}
return callOpenAICompatibleQuality(config, phrase, sentence);
}

// Fetch available models from the configured server
export async function fetchModels(config: ModelConfig): Promise<string[]> {
  if (config.backend === 'ollama') {
    const res = await fetch(`${config.endpoint}/api/tags`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.models ?? []).map((m: { name: string }) => m.name);
  } else {
    const headers: Record<string, string> = {};
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
    const res = await fetch(`${config.endpoint}/v1/models`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.data ?? []).map((m: { id: string }) => m.id);
  }
}

// Test connectivity and model availability
export async function testConnection(
  config: ModelConfig,
): Promise<{ ok: boolean; message: string }> {
  try {
    if (config.backend === 'ollama') {
      const res = await fetch(`${config.endpoint}/api/tags`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const models: string[] = (data.models ?? []).map(
        (m: { name: string }) => m.name,
      );
      const found = models.some((m) =>
        m.toLowerCase().startsWith(config.model.toLowerCase()),
      );
      if (!found && models.length > 0) {
        return {
          ok: false,
          message: `Model "${config.model}" not found. Available: ${models.slice(0, 5).join(', ')}`,
        };
      }
      return { ok: true, message: `Connected. ${models.length} model(s) available.` };
    } else {
      const headers: Record<string, string> = {};
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
      const res = await fetch(`${config.endpoint}/v1/models`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ok: true, message: 'Connected to OpenAI-compatible endpoint.' };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Connection failed: ${msg}` };
  }
}
