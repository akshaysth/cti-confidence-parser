import type { ModelConfig, IntelligenceClaim } from '../types';

const CLAIM_PROMPT = `You are an expert intelligence analyst. Extract structured intelligence claims from the provided text.

For each claim, identify:
- The specific claim/assertion being made
- The confidence level expressed (certain, probable, likely, possible, unlikely, remote)
- Any timeframe mentioned (e.g., "next 6 months", "by 2025", "imminent")
- Evidence or reasoning provided
- Key assumptions
- Source references (report sections, citations)
- Entities mentioned (organizations, threat actors, locations)

IMPORTANT: Respond ONLY with a valid JSON array. Do NOT wrap the response in markdown code blocks (no triple backticks). Return the raw JSON array only.

Example format:
[{"claim": "...", "confidence": "...", "confidenceLevel": 65, ...}]

Each claim should follow this structure:
{
  "claim": "string - the specific assertion",
  "confidence": "string - confidence term used",
  "confidenceLevel": "number - 0-100 based on confidence term",
  "timeframe": "string or null - when this might occur",
  "evidence": ["array of evidence strings"],
  "assumptions": ["array of assumptions"],
  "sourceReferences": ["array of source refs"],
  "entities": ["array of entities mentioned"]
}

Rules:
- Extract only actual claims/assertions, not background info
- Each claim should be atomic (single assertion)
- Convert confidence terms to numbers: certain=93, probable=65, likely=55, possible=37, unlikely=30, remote=10
- Include empty arrays [] if no items for a field
- Return an empty array [] if no claims are found
- NO markdown formatting, NO code blocks, ONLY raw JSON`;


function cleanMarkdownCodeBlocks(content: string): string {
  // Remove markdown code block wrappers (```json or ```)
  return content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

function isValidJsonArray(content: string): boolean {
  // Check for basic structural issues
  const openBrackets = (content.match(/\[/g) || []).length;
  const closeBrackets = (content.match(/\]/g) || []).length;
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;

  return openBrackets === closeBrackets && openBraces === closeBraces;
}

function attemptToFixTruncatedJson(content: string): string | null {
  // Try to complete a truncated JSON array
  let fixed = content.trim();

  // Count unclosed structures
  let openBrackets = (fixed.match(/\[/g) || []).length;
  let closeBrackets = (fixed.match(/\]/g) || []).length;
  let openBraces = (fixed.match(/\{/g) || []).length;
  let closeBraces = (fixed.match(/\}/g) || []).length;

  // Add missing closing braces and brackets
  while (closeBraces < openBraces) {
    fixed += '}';
    closeBraces++;
  }
  while (closeBrackets < openBrackets) {
    fixed += ']';
    closeBrackets++;
  }

  // Remove trailing comma if present
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');

  return fixed;
}

function parseClaimResponse(content: string): IntelligenceClaim[] {
  // First, try to clean markdown wrappers
  const cleaned = cleanMarkdownCodeBlocks(content);
  console.log('[Claims] Cleaned content (first 500 chars):', cleaned.substring(0, 500));
  console.log('[Claims] Content length:', cleaned.length);
  console.log('[Claims] Content ends with:', cleaned.slice(-50));

  // Check if JSON looks complete
  if (!isValidJsonArray(cleaned)) {
    console.log('[Claims] JSON appears incomplete (unbalanced brackets/braces)');
    const fixed = attemptToFixTruncatedJson(cleaned);
    if (fixed) {
      console.log('[Claims] Attempting to fix truncated JSON...');
      try {
        const parsed = JSON.parse(fixed);
        if (Array.isArray(parsed)) {
          console.log(`[Claims] Successfully parsed ${parsed.length} claims from fixed JSON`);
          return processClaims(parsed);
        }
      } catch (err) {
        console.log('[Claims] Could not fix truncated JSON, trying partial extraction...');
      }
    }
  }

  // Then find the JSON array - be more specific to avoid nested bracket issues
  const jsonMatch = cleaned.match(/^\s*(\[[\s\S]*\])\s*$/);
  if (!jsonMatch) {
    console.log('[Claims] No JSON array match found. Trying alternative...');
    // Try finding array more loosely
    const looseMatch = cleaned.match(/\[[\s\S]*$/);
    if (!looseMatch) {
      console.log('[Claims] No JSON array found in response');
      return [];
    }
    console.log('[Claims] Found loose match, attempting parse...');
    try {
      // Try to fix and parse
      const fixed = attemptToFixTruncatedJson(looseMatch[0]) || looseMatch[0];
      const parsed = JSON.parse(fixed);
      if (!Array.isArray(parsed)) {
        console.log('[Claims] Parsed content is not an array');
        return [];
      }
      console.log(`[Claims] Parsed ${parsed.length} claims from loose match`);
      return processClaims(parsed);
    } catch (err) {
      console.error('[Claims] JSON parse error with loose match:', err);
    }
    return [];
  }

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    if (!Array.isArray(parsed)) {
      console.log('[Claims] Parsed content is not an array');
      return [];
    }

    console.log(`[Claims] Parsed ${parsed.length} claims from response`);
    return processClaims(parsed);
  } catch (err) {
    console.error('[Claims] JSON parse error:', err);
    console.error('[Claims] Attempted to parse:', jsonMatch[1]?.substring(0, 300));
    return [];
  }
}

function processClaims(parsed: unknown[]): IntelligenceClaim[] {
  return parsed.map((item: unknown, index: number) => {
    const record = item as Record<string, unknown>;
    return {
      id: `claim-${index}`,
      claim: String(record.claim || ''),
      confidence: String(record.confidence || 'unknown'),
      confidenceLevel: Math.max(0, Math.min(100, Number(record.confidenceLevel) || 0)),
      timeframe: record.timeframe ? String(record.timeframe) : undefined,
      evidence: Array.isArray(record.evidence) ? record.evidence.map(String) : [],
      assumptions: Array.isArray(record.assumptions) ? record.assumptions.map(String) : [],
      sourceReferences: Array.isArray(record.sourceReferences) ? record.sourceReferences.map(String) : [],
      entities: Array.isArray(record.entities) ? record.entities.map(String) : [],
    };
  }).filter((c: IntelligenceClaim) => c.claim.length > 0);
}

async function extractClaimsOllama(
  config: ModelConfig,
  text: string,
): Promise<IntelligenceClaim[]> {
  const res = await fetch(`${config.endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: CLAIM_PROMPT },
        { role: 'user', content: `Extract intelligence claims from this text:\n\n${text}` },
      ],
      stream: false,
      // Note: Some models don't respect format: 'json' and wrap in markdown
    }),
  });

  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  console.log('[Claims] Full API response:', data);
  const content: string = data.message?.content ?? '';
  console.log('[Claims] Raw content length:', content.length);
  console.log('[Claims] Full content:', content);
  return parseClaimResponse(content);
}

async function extractClaimsOpenAI(
  config: ModelConfig,
  text: string,
): Promise<IntelligenceClaim[]> {
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
        { role: 'system', content: CLAIM_PROMPT },
        { role: 'user', content: `Extract intelligence claims from this text:\n\n${text}` },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  console.log('[Claims] Full API response:', data);
  const content: string = data.choices?.[0]?.message?.content ?? '';
  console.log('[Claims] Raw content length:', content.length);
  console.log('[Claims] Full content:', content);
  return parseClaimResponse(content);
}

export async function extractClaims(
  config: ModelConfig,
  text: string,
): Promise<IntelligenceClaim[]> {
  if (config.backend === 'ollama') {
    return extractClaimsOllama(config, text);
  }
  return extractClaimsOpenAI(config, text);
}

// Export claims to STIX 2.1 format
export function exportToSTIX(claims: IntelligenceClaim[]): string {
  const stix = {
    type: 'bundle',
    id: `bundle--${crypto.randomUUID()}`,
    spec_version: '2.1',
    objects: claims.map((claim) => ({
      type: 'threat-actor',
      id: `threat-actor--${crypto.randomUUID()}`,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      name: claim.claim.slice(0, 100),
      description: claim.claim,
      threat_actor_types: ['nation-state'], // Simplified
      confidence: claim.confidenceLevel,
      labels: claim.entities,
      // Custom properties for WEL
      'x_wel_claim': {
        confidence_term: claim.confidence,
        timeframe: claim.timeframe,
        evidence: claim.evidence,
        assumptions: claim.assumptions,
        source_refs: claim.sourceReferences,
      },
    })),
  };

  return JSON.stringify(stix, null, 2);
}
