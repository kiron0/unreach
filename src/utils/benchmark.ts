import * as os from "os";

export interface BenchmarkMetrics {
  parseTime: number;
  analysisTime: number;
  totalTime: number;
  fileCount: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cacheStats?: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

export class BenchmarkTracker {
  private startTime: number = 0;
  private parseStartTime: number = 0;
  private parseEndTime: number = 0;
  private analysisStartTime: number = 0;
  private analysisEndTime: number = 0;
  private initialMemory: NodeJS.MemoryUsage;
  private finalMemory: NodeJS.MemoryUsage | null = null;
  private fileCount: number = 0;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor() {
    this.startTime = performance.now();
    this.initialMemory = process.memoryUsage();
  }

  startParse(): void {
    this.parseStartTime = performance.now();
  }

  endParse(
    fileCount: number,
    cacheHits: number = 0,
    cacheMisses: number = 0,
  ): void {
    this.parseEndTime = performance.now();
    this.fileCount = fileCount;
    this.cacheHits = cacheHits;
    this.cacheMisses = cacheMisses;
  }

  startAnalysis(): void {
    this.analysisStartTime = performance.now();
  }

  endAnalysis(): void {
    this.analysisEndTime = performance.now();
    this.finalMemory = process.memoryUsage();
  }

  getMetrics(): BenchmarkMetrics {
    const totalTime = performance.now() - this.startTime;
    const parseTime = this.parseEndTime - this.parseStartTime;
    const analysisTime = this.analysisEndTime - this.analysisStartTime;

    const memoryUsage = this.finalMemory
      ? {
          heapUsed: this.finalMemory.heapUsed - this.initialMemory.heapUsed,
          heapTotal: this.finalMemory.heapTotal - this.initialMemory.heapTotal,
          external: this.finalMemory.external - this.initialMemory.external,
          rss: this.finalMemory.rss - this.initialMemory.rss,
        }
      : {
          heapUsed: 0,
          heapTotal: 0,
          external: 0,
          rss: 0,
        };

    const cacheStats =
      this.cacheHits + this.cacheMisses > 0
        ? {
            hits: this.cacheHits,
            misses: this.cacheMisses,
            hitRate:
              (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100,
          }
        : undefined;

    return {
      parseTime,
      analysisTime,
      totalTime,
      fileCount: this.fileCount,
      memoryUsage,
      cacheStats,
    };
  }

  formatMetrics(metrics: BenchmarkMetrics): string {
    const formatTime = (ms: number): string => {
      if (ms < 1000) return `${ms.toFixed(2)}ms`;
      return `${(ms / 1000).toFixed(2)}s`;
    };

    const formatBytes = (bytes: number): string => {
      const sizes = ["B", "KB", "MB", "GB"];
      if (bytes === 0) return "0 B";
      const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    let output = "\n📊 Benchmark Results\n";
    output += "═".repeat(50) + "\n\n";

    output += "⏱️  Timing:\n";
    output += `   Parse Time:     ${formatTime(metrics.parseTime)}\n`;
    output += `   Analysis Time:  ${formatTime(metrics.analysisTime)}\n`;
    output += `   Total Time:     ${formatTime(metrics.totalTime)}\n\n`;

    output += "📁 Files:\n";
    output += `   Files Analyzed:  ${metrics.fileCount}\n`;
    output += `   Avg Parse Time:  ${formatTime(metrics.parseTime / metrics.fileCount)}\n\n`;

    if (metrics.cacheStats) {
      output += "💾 Cache:\n";
      output += `   Hits:            ${metrics.cacheStats.hits}\n`;
      output += `   Misses:         ${metrics.cacheStats.misses}\n`;
      output += `   Hit Rate:       ${metrics.cacheStats.hitRate.toFixed(2)}%\n\n`;
    }

    output += "🧠 Memory:\n";
    output += `   Heap Used:       ${formatBytes(metrics.memoryUsage.heapUsed)}\n`;
    output += `   Heap Total:      ${formatBytes(metrics.memoryUsage.heapTotal)}\n`;
    output += `   External:        ${formatBytes(metrics.memoryUsage.external)}\n`;
    output += `   RSS:             ${formatBytes(metrics.memoryUsage.rss)}\n\n`;

    output += "💻 System:\n";
    output += `   CPU Cores:       ${os.cpus().length}\n`;
    output += `   Platform:        ${os.platform()}\n`;
    output += `   Node Version:    ${process.version}\n`;

    return output;
  }
}

if (
  typeof performance === "undefined" ||
  typeof performance.now !== "function"
) {
  const perf = (global as any).performance || {};
  perf.now = perf.now || (() => Date.now());
  (global as any).performance = perf;
}
