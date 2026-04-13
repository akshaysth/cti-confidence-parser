import type { ModelConfig } from '../types';

export interface IntelligenceClaim {
  id: string;
  claim: string;
  confidence: string;
  confidenceLevel: number;
  timeframe?: string;
  evidence: string[];
  assumptions: string[];
  sourceReferences: string[];
  entities: string[]; // Organizations, actors, locations mentioned
}

const CLAIM_PROMPT = `You are an expert intelligence analyst. Extract structured intelligence claims from the provided text.

For each claim, identify:
- The specific claim/assertion being made
- The confidence level expressed (certain, probable, likely, possible, unlikely, remote)
- Any timeframe mentioned (e.g., "next 6 months", "by 2025", "imminent")
- Evidence or reasoning provided
- Key assumptions
- Source references (report sections, citations)
- Entities mentioned (organizations, threat actors, locations)

Respond ONLY with a valid JSON array of claims. Each claim should follow this structure:
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
- Return an empty array [] if no claims are found`;

function parseClaimResponse(content: string): IntelligenceClaim[] {
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: Record<string, unknown>, index: number) => ({
      id: `claim-${index}`,
      claim: String(item.claim || ''),
      confidence: String(item.confidence || 'unknown'),
      confidenceLevel: Math.max(0, Math.min(100, Number(item.confidenceLevel) || 0)),
      timeframe: item.timeframe ? String(item.timeframe) : undefined,
      evidence: Array.isArray(item.evidence) ? item.evidence.map(String) : [],
      assumptions: Array.isArray(item.assumptions) ? item.assumptions.map(String) : [],
      sourceReferences: Array.isArray(item.sourceReferences) ? item.sourceReferences.map(String) : [],
      entities: Array.isArray(item.entities) ? item.entities.map(String) : [],
    })).filter((c: IntelligenceClaim) => c.claim.length > 0);
  } catch {
    return [];
  }
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
      format: 'json',
    }),
  });

  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content: string = data.message?.content ?? '';
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
  const content: string = data.choices?.[0]?.message?.content ?? '';
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
