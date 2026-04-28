/**
 * Cost tracking for edge enrichment scripts
 * Follows Anushree's pattern from enrich-claims.js
 */

export const costs = {
  exa_searches: 0,
  exa_cost: 0,
  claude_calls: 0,
  claude_input_tokens: 0,
  claude_output_tokens: 0,
  claude_cost: 0,

  trackExa() {
    this.exa_searches++
    this.exa_cost = this.exa_searches * 0.008
  },

  trackClaude(usage) {
    this.claude_calls++
    this.claude_input_tokens += usage.input_tokens || 0
    this.claude_output_tokens += usage.output_tokens || 0
    // Claude Sonnet pricing: $3/M input, $15/M output
    this.claude_cost =
      (this.claude_input_tokens / 1_000_000) * 3 + (this.claude_output_tokens / 1_000_000) * 15
  },

  summary() {
    const total = this.exa_cost + this.claude_cost
    const perEdge = total / Math.max(this.claude_calls, 1)
    return (
      `Exa: ${this.exa_searches} searches ($${this.exa_cost.toFixed(3)}) | ` +
      `Claude: ${this.claude_calls} calls, ${this.claude_input_tokens} in / ${this.claude_output_tokens} out ($${this.claude_cost.toFixed(3)}) | ` +
      `Total: $${total.toFixed(3)} ($${perEdge.toFixed(3)}/edge)`
    )
  },

  reset() {
    this.exa_searches = 0
    this.exa_cost = 0
    this.claude_calls = 0
    this.claude_input_tokens = 0
    this.claude_output_tokens = 0
    this.claude_cost = 0
  },
}
