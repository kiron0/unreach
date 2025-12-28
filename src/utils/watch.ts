import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { runScan } from "../cli/handler.js";
import type { ScanOptions } from "../types/index.js";

export class FileWatcher {
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private isWatching: boolean = false;
  private scanOptions: ScanOptions;
  private cwd: string;
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly debounceDelay: number = 500;
  private lastScanTime: number = 0;
  private readonly minScanInterval: number;
  private scanQueue: boolean = false;

  constructor(cwd: string, scanOptions: ScanOptions) {
    this.cwd = cwd;
    this.scanOptions = { ...scanOptions, watch: false };
    const rateLimit = (scanOptions as any).watchRateLimit || 1;
    this.minScanInterval = Math.max(100, 1000 / rateLimit);
  }

  async start(): Promise<void> {
    if (this.isWatching) {
      return;
    }

    this.isWatching = true;
    console.log(
      chalk.cyan.bold(
        "\n👀 Watch mode enabled. Monitoring for file changes...",
      ),
    );
    console.log(chalk.gray("   Press Ctrl+C to stop watching.\n"));

    await this.performScan();

    await this.watchDirectory(this.cwd);
  }

  private async watchDirectory(dir: string): Promise<void> {
    try {
      const stats = fs.statSync(dir);
      if (!stats.isDirectory()) {
        return;
      }

      const watchOptions: { recursive?: boolean } = {};
      try {
        const watcher = fs.watch(
          dir,
          { recursive: true, ...watchOptions },
          async (eventType, filename) => {
            if (!filename) return;

            const filePath = path.join(dir, filename);
            const ext = path.extname(filePath).toLowerCase();

            if (
              [".ts", ".tsx", ".js", ".jsx", ".json"].includes(ext) ||
              filename.includes("package.json") ||
              filename.includes("tsconfig.json")
            ) {
              this.debounceScan();
            }
          },
        );

        this.watchers.set(dir, watcher);

        watcher.on("error", (error) => {
          if (this.isWatching) {
            console.warn(
              chalk.yellow(`⚠️  Watch error for ${dir}: ${error.message}`),
            );
          }
        });
      } catch (error) {
        const watcher = fs.watch(dir, async (eventType, filename) => {
          if (!filename) return;
          const filePath = path.join(dir, filename);
          const ext = path.extname(filePath).toLowerCase();

          if (
            [".ts", ".tsx", ".js", ".jsx", ".json"].includes(ext) ||
            filename.includes("package.json") ||
            filename.includes("tsconfig.json")
          ) {
            this.debounceScan();
          }
        });

        this.watchers.set(dir, watcher);
      }
    } catch (error) {
      if (this.isWatching) {
        console.warn(
          chalk.yellow(
            `⚠️  Cannot watch ${dir}: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
    }
  }

  private debounceScan(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.performScanWithRateLimit();
    }, this.debounceDelay);
  }

  private async performScanWithRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastScan = now - this.lastScanTime;

    if (timeSinceLastScan < this.minScanInterval) {
      if (!this.scanQueue) {
        this.scanQueue = true;
        const waitTime = this.minScanInterval - timeSinceLastScan;
        setTimeout(() => {
          this.scanQueue = false;
          this.performScan();
        }, waitTime);
      }
      return;
    }

    this.scanQueue = false;
    this.lastScanTime = now;
    await this.performScan();
  }

  private async performScan(): Promise<void> {
    if (!this.isWatching) {
      return;
    }

    console.log(chalk.cyan("\n🔄 File change detected. Re-scanning...\n"));

    try {
      const result = await runScan(this.scanOptions);
      if (result && "message" in result) {
        console.error(chalk.red(`\n❌ Error: ${result.message}\n`));
      } else {
        console.log(
          chalk.green("\n✅ Scan complete. Watching for changes...\n"),
        );
      }
    } catch (error) {
      console.error(
        chalk.red(
          `\n❌ Unexpected error during scan: ${error instanceof Error ? error.message : String(error)}\n`,
        ),
      );
    }
  }

  stop(): void {
    if (!this.isWatching) {
      return;
    }

    this.isWatching = false;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    for (const [dir, watcher] of this.watchers) {
      try {
        watcher.close();
      } catch (error) {}
    }

    this.watchers.clear();
    console.log(chalk.gray("\n👋 Watch mode stopped.\n"));
  }
}
