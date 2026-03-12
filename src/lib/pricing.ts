// Pricing per million tokens in USD
// Hardcoded table is the source of truth at deploy time and fallback when fetch fails.
// At runtime, prices are refreshed every 24h from LiteLLM's community-maintained JSON.

const LITELLM_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

const FALLBACK_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-opus-4-6':            { input: 15,   output: 75  },
  'claude-sonnet-4-6':          { input: 3,    output: 15  },
  'claude-haiku-4-5-20251001':  { input: 0.8,  output: 4   },
  'claude-opus-4-5-20251101':   { input: 15,   output: 75  },
  'claude-sonnet-4-5-20250929': { input: 3,    output: 15  },
  'claude-opus-4-1-20250805':   { input: 15,   output: 75  },
  'claude-sonnet-4-20250514':   { input: 3,    output: 15  },
  'claude-opus-4-20250514':     { input: 15,   output: 75  },
  // OpenAI
  'gpt-5.4':                    { input: 10,   output: 40  },
  'gpt-5.4-pro':                { input: 20,   output: 80  },
  'gpt-5':                      { input: 10,   output: 40  },
  'gpt-5-mini':                 { input: 1,    output: 4   },
  'gpt-5-nano':                 { input: 0.5,  output: 2   },
  'gpt-4.1':                    { input: 2,    output: 8   },
  'gpt-4.1-mini':               { input: 0.4,  output: 1.6 },
  'gpt-4o':                     { input: 2.5,  output: 10  },
  'gpt-4o-mini':                { input: 0.15, output: 0.6 },
};

// In-memory cache — starts with hardcoded values, updated in background
let livePricing: Record<string, { input: number; output: number }> = { ...FALLBACK_PRICING };
export let lastPricingFetch: Date | null = null;

async function refreshPricing() {
  try {
    const res = await fetch(LITELLM_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return;

    const data = await res.json() as Record<string, unknown>;
    const updated: Record<string, { input: number; output: number }> = { ...FALLBACK_PRICING };

    for (const [model, info] of Object.entries(data)) {
      const m = info as Record<string, unknown>;
      if (typeof m.input_cost_per_token === 'number' && typeof m.output_cost_per_token === 'number') {
        updated[model] = {
          input:  m.input_cost_per_token  * 1_000_000,
          output: m.output_cost_per_token * 1_000_000,
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

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = livePricing[model] ?? FALLBACK_PRICING[model];
  if (!pricing) return 0;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
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
