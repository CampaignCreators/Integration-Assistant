/**
 * Cost estimation for LLM + research usage (spec §10 cost control).
 *
 * Rates are USD per million tokens. Cache reads bill at ~0.1x input and
 * 5-minute cache writes at ~1.25x input. Confirm current numbers against
 * Anthropic pricing at deploy time — they are configurable via env so a price
 * change does not require a code change.
 */

export interface ModelRates {
  inputPerMTok: number;
  outputPerMTok: number;
}

const MODEL_RATES: Record<string, ModelRates> = {
  "claude-opus-5": { inputPerMTok: 5, outputPerMTok: 25 },
  "claude-opus-4-8": { inputPerMTok: 5, outputPerMTok: 25 },
  "claude-sonnet-5": { inputPerMTok: 3, outputPerMTok: 15 },
  "claude-haiku-4-5": { inputPerMTok: 1, outputPerMTok: 5 },
};

const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

/** Per-request cost of the built-in web search tool. Override via env. */
const WEB_SEARCH_PER_1K = Number(process.env.WEB_SEARCH_COST_PER_1K ?? 10);

export interface UsageCounts {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  web_search_requests?: number | null;
}

export function ratesForModel(model: string): ModelRates {
  const rates = MODEL_RATES[model];
  if (rates) return rates;
  // Unknown model: fall back to the most expensive known tier so cost is
  // over-reported rather than silently under-reported.
  return { inputPerMTok: 5, outputPerMTok: 25 };
}

export function estimateCostUsd(model: string, usage: UsageCounts): number {
  const { inputPerMTok, outputPerMTok } = ratesForModel(model);
  const perToken = inputPerMTok / 1_000_000;

  const uncachedInput = usage.input_tokens * perToken;
  const cachedRead = (usage.cache_read_input_tokens ?? 0) * perToken * CACHE_READ_MULTIPLIER;
  const cacheWrite =
    (usage.cache_creation_input_tokens ?? 0) * perToken * CACHE_WRITE_MULTIPLIER;
  const output = (usage.output_tokens * outputPerMTok) / 1_000_000;
  const search = ((usage.web_search_requests ?? 0) * WEB_SEARCH_PER_1K) / 1000;

  const total = uncachedInput + cachedRead + cacheWrite + output + search;
  // Store to 4dp, matching the numeric(10,4) column.
  return Math.round(total * 10_000) / 10_000;
}
