// Pricing per million tokens in USD
// Hardcoded table is the source of truth at deploy time and fallback when fetch fails.
// At runtime, prices are refreshed every 24h from LiteLLM's community-maintained JSON,
// including cache prices — so cache discounts auto-update along with base prices.

const LITELLM_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

type ModelPricing = {
  input: number;       // per million tokens
  output: number;      // per million tokens
  cacheWrite?: number; // Anthropic: tokens written to cache (1.25× input)
  cacheRead?: number;  // Anthropic: cache hit (0.10× input) | OpenAI: cached tokens (0.50× input)
};

const FALLBACK_PRICING: Record<string, ModelPricing> = {
  // ── Anthropic ──────────────────────────────────────────────────────────────
  // cacheWrite = 1.25× input | cacheRead = 0.10× input
  'claude-opus-4-6':            { input: 15,   output: 75,   cacheWrite: 18.75, cacheRead: 1.5   },
  'claude-sonnet-4-6':          { input: 3,    output: 15,   cacheWrite: 3.75,  cacheRead: 0.3   },
  'claude-haiku-4-5-20251001':  { input: 0.8,  output: 4,    cacheWrite: 1.0,   cacheRead: 0.08  },
  'claude-opus-4-5-20251101':   { input: 15,   output: 75,   cacheWrite: 18.75, cacheRead: 1.5   },
  'claude-sonnet-4-5-20250929': { input: 3,    output: 15,   cacheWrite: 3.75,  cacheRead: 0.3   },
  'claude-opus-4-1-20250805':   { input: 15,   output: 75,   cacheWrite: 18.75, cacheRead: 1.5   },
  'claude-sonnet-4-20250514':   { input: 3,    output: 15,   cacheWrite: 3.75,  cacheRead: 0.3   },
  'claude-opus-4-20250514':     { input: 15,   output: 75,   cacheWrite: 18.75, cacheRead: 1.5   },
  // ── OpenAI ─────────────────────────────────────────────────────────────────
  // cacheRead = 0.50× input (cached tokens are INCLUDED in inputTokens from the API)
  'gpt-5.4':                    { input: 10,   output: 40,   cacheRead: 5.0   },
  'gpt-5.4-pro':                { input: 20,   output: 80,   cacheRead: 10.0  },
  'gpt-5':                      { input: 10,   output: 40,   cacheRead: 5.0   },
  'gpt-5-mini':                 { input: 1,    output: 4,    cacheRead: 0.5   },
  'gpt-5-nano':                 { input: 0.5,  output: 2,    cacheRead: 0.25  },
  'gpt-4.1':                    { input: 2,    output: 8,    cacheRead: 1.0   },
  'gpt-4.1-mini':               { input: 0.4,  output: 1.6,  cacheRead: 0.2   },
  'gpt-4o':                     { input: 2.5,  output: 10,   cacheRead: 1.25  },
  'gpt-4o-mini':                { input: 0.15, output: 0.6,  cacheRead: 0.075 },
};

// In-memory cache — starts with hardcoded values, updated in background
let livePricing: Record<string, ModelPricing> = { ...FALLBACK_PRICING };
export let lastPricingFetch: Date | null = null;

async function refreshPricing() {
  try {
    const res = await fetch(LITELLM_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return;

    const data = await res.json() as Record<string, unknown>;
    const updated: Record<string, ModelPricing> = { ...FALLBACK_PRICING };

    for (const [model, info] of Object.entries(data)) {
      const m = info as Record<string, unknown>;
      if (typeof m.input_cost_per_token === 'number' && typeof m.output_cost_per_token === 'number') {
        updated[model] = {
          input:  m.input_cost_per_token  * 1_000_000,
          output: m.output_cost_per_token * 1_000_000,
          ...(typeof m.cache_creation_input_token_cost === 'number' && {
            cacheWrite: m.cache_creation_input_token_cost * 1_000_000,
          }),
          ...(typeof m.cache_read_input_token_cost === 'number' && {
            cacheRead: m.cache_read_input_token_cost * 1_000_000,
          }),
        };
      }
    }

    livePricing = updated;
    lastPricingFetch = new Date();
  } catch {
    // Keep existing pricing — no-op on network failure
  }
}

// Schedule refresh only once per process (global guard prevents hot-reload leaks in dev)
declare global {
  // eslint-disable-next-line no-var
  var __pricingRefreshScheduled: boolean | undefined;
}

if (typeof window === 'undefined' && !global.__pricingRefreshScheduled) {
  global.__pricingRefreshScheduled = true;
  refreshPricing();
  setInterval(refreshPricing, 24 * 60 * 60 * 1000);
}

/**
 * Calculates the exact cost for a message, including cache tokens.
 *
 * Anthropic: inputTokens (uncached) + cacheCreationTokens (separate) + cacheReadTokens (separate)
 * OpenAI:    inputTokens already includes cacheReadTokens — they receive a discount on that subset
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens = 0,
  cacheReadTokens = 0,
): number {
  const pricing = livePricing[model] ?? FALLBACK_PRICING[model];
  if (!pricing) return 0;

  let cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;

  if (model.startsWith('claude')) {
    // Anthropic: cache tokens are SEPARATE — add their individual costs
    if (cacheCreationTokens > 0) {
      const writePrice = pricing.cacheWrite ?? pricing.input * 1.25;
      cost += (cacheCreationTokens * writePrice) / 1_000_000;
    }
    if (cacheReadTokens > 0) {
      const readPrice = pricing.cacheRead ?? pricing.input * 0.1;
      cost += (cacheReadTokens * readPrice) / 1_000_000;
    }
  } else {
    // OpenAI: cached tokens are INCLUDED in inputTokens at full price — apply discount
    if (cacheReadTokens > 0) {
      const readPrice = pricing.cacheRead ?? pricing.input * 0.5;
      const discount = (cacheReadTokens * (pricing.input - readPrice)) / 1_000_000;
      cost -= discount;
    }
  }

  return Math.max(0, cost);
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${(usd * 100).toFixed(4)}¢`;
  return `$${usd.toFixed(4)}`;
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
