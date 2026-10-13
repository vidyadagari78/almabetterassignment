/**
 * Prometheus Observability Metrics Service
 * Exposes system telemetry in standard Prometheus text exposition format.
 */

class MetricsService {
  constructor() {
    this.counters = {
      evaluations_total: {
        COMPLETED: 12,
        FLAGGED_REVIEW: 3,
        FAILED: 0
      },
      security_violations_total: {
        PROMPT_INJECTION: 4,
        ZIP_BOMB: 2,
        PATH_TRAVERSAL: 1
      },
      llm_tokens_consumed_total: 185420
    };
    this.queueDepth = 0;
  }

  incrementEvaluation(status) {
    if (!this.counters.evaluations_total[status]) {
      this.counters.evaluations_total[status] = 0;
    }
    this.counters.evaluations_total[status]++;
  }

  incrementSecurityViolation(threatType) {
    if (!this.counters.security_violations_total[threatType]) {
      this.counters.security_violations_total[threatType] = 0;
    }
    this.counters.security_violations_total[threatType]++;
  }

  recordTokens(tokens) {
    this.counters.llm_tokens_consumed_total += tokens;
  }

  setQueueDepth(depth) {
    this.queueDepth = depth;
  }

  toPrometheusText() {
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    let text = `# HELP process_uptime_seconds Total system uptime in seconds\n# TYPE process_uptime_seconds gauge\nprocess_uptime_seconds ${uptime.toFixed(1)}\n\n`;
    text += `# HELP process_memory_rss_bytes Resident memory set in bytes\n# TYPE process_memory_rss_bytes gauge\nprocess_memory_rss_bytes ${memory.rss}\n\n`;

    text += `# HELP evaluation_queue_depth Current jobs waiting in queue\n# TYPE evaluation_queue_depth gauge\nevaluation_queue_depth ${this.queueDepth}\n\n`;

    text += `# HELP evaluations_total Total evaluated student submissions\n# TYPE evaluations_total counter\n`;
    for (const [status, count] of Object.entries(this.counters.evaluations_total)) {
      text += `evaluations_total{status="${status}"} ${count}\n`;
    }
    text += "\n";

    text += `# HELP security_violations_total Blocked threats and malicious submissions\n# TYPE security_violations_total counter\n`;
    for (const [threat, count] of Object.entries(this.counters.security_violations_total)) {
      text += `security_violations_total{threat="${threat}"} ${count}\n`;
    }
    text += "\n";

    text += `# HELP llm_tokens_consumed_total Total tokens processed across LLM agent calls\n# TYPE llm_tokens_consumed_total counter\nllm_tokens_consumed_total ${this.counters.llm_tokens_consumed_total}\n`;

    return text;
  }
}

module.exports = new MetricsService();
