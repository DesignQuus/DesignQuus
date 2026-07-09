import { Injectable } from '@nestjs/common';

type HttpMetric = {
  count: number;
  durationMs: number;
};

function escapeLabel(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private readonly httpMetrics = new Map<string, HttpMetric>();

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationMs: number,
  ): void {
    const labels = [method.toUpperCase(), route || 'unknown', statusCode];
    const key = JSON.stringify(labels);
    const current = this.httpMetrics.get(key) ?? { count: 0, durationMs: 0 };

    current.count += 1;
    current.durationMs += durationMs;
    this.httpMetrics.set(key, current);
  }

  renderPrometheus(): string {
    const lines = [
      '# HELP ai_hvac_build_info Build metadata for the running API process.',
      '# TYPE ai_hvac_build_info gauge',
      `ai_hvac_build_info{version="${escapeLabel(process.env.APP_VERSION ?? '1.2.0-dev')}",git_sha="${escapeLabel(process.env.GIT_SHA ?? 'unknown')}"} 1`,
      '# HELP ai_hvac_process_uptime_seconds Process uptime in seconds.',
      '# TYPE ai_hvac_process_uptime_seconds gauge',
      `ai_hvac_process_uptime_seconds ${Math.floor((Date.now() - this.startedAt) / 1000)}`,
      '# HELP ai_hvac_http_requests_total Total HTTP requests by method, route, and status.',
      '# TYPE ai_hvac_http_requests_total counter',
      '# HELP ai_hvac_http_request_duration_ms_sum Sum of HTTP request durations in milliseconds.',
      '# TYPE ai_hvac_http_request_duration_ms_sum counter',
    ];

    for (const [key, metric] of [...this.httpMetrics.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const [method, route, statusCode] = JSON.parse(key) as [string, string, number];
      const labelSet = `method="${escapeLabel(method)}",route="${escapeLabel(route)}",status="${statusCode}"`;
      lines.push(`ai_hvac_http_requests_total{${labelSet}} ${metric.count}`);
      lines.push(
        `ai_hvac_http_request_duration_ms_sum{${labelSet}} ${metric.durationMs.toFixed(3)}`,
      );
    }

    return `${lines.join('\n')}\n`;
  }
}
