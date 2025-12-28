import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  detectPackageManager,
  getInstallCommand,
  getRunCommand,
} from "../../src/utils/package-manager.js";

describe("PackageManager", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-pm-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    delete process.env.npm_config_user_agent;
  });

  describe("detectPackageManager", () => {
    it("should detect npm from package-lock.json", () => {
      const lockFile = path.join(tempDir, "package-lock.json");
      fs.writeFileSync(lockFile, "{}");

      const pm = detectPackageManager(tempDir);
      expect(pm.name).toBe("npm");
      expect(pm.installCommand).toBe("npm install");
      expect(pm.globalInstallCommand).toBe("npm install -g");
      expect(pm.runCommand).toBe("npm");
    });

    it("should detect yarn from yarn.lock", () => {
      const lockFile = path.join(tempDir, "yarn.lock");
      fs.writeFileSync(lockFile, "# yarn lockfile");

      const pm = detectPackageManager(tempDir);
      expect(pm.name).toBe("yarn");
      expect(pm.installCommand).toBe("yarn add");
      expect(pm.globalInstallCommand).toBe("yarn global add");
      expect(pm.runCommand).toBe("yarn");
    });

    it("should detect pnpm from pnpm-lock.yaml", () => {
      const lockFile = path.join(tempDir, "pnpm-lock.yaml");
      fs.writeFileSync(lockFile, "lockfileVersion: 5.4");

      const pm = detectPackageManager(tempDir);
      expect(pm.name).toBe("pnpm");
      expect(pm.installCommand).toBe("pnpm add");
      expect(pm.globalInstallCommand).toBe("pnpm add -g");
      expect(pm.runCommand).toBe("pnpm");
    });

    it("should detect bun from bun.lock", () => {
      const lockFile = path.join(tempDir, "bun.lock");
      fs.writeFileSync(lockFile, "bun lockfile");

      const pm = detectPackageManager(tempDir);
      expect(pm.name).toBe("bun");
      expect(pm.installCommand).toBe("bun add");
      expect(pm.globalInstallCommand).toBe("bun install -g");
      expect(pm.runCommand).toBe("bun");
    });

    it("should detect package manager from parent directory", () => {
      const subDir = path.join(tempDir, "sub", "dir");
      fs.mkdirSync(subDir, { recursive: true });
      const lockFile = path.join(tempDir, "yarn.lock");
      fs.writeFileSync(lockFile, "# yarn lockfile");

      const pm = detectPackageManager(subDir);
      expect(pm.name).toBe("yarn");
    });

    it("should fallback to npm when no lock file found", () => {
      const pm = detectPackageManager(tempDir);
      expect(pm.name).toBe("npm");
      expect(pm.installCommand).toBe("npm install");
      expect(pm.globalInstallCommand).toBe("npm install -g");
    });

    it("should detect yarn from npm_config_user_agent", () => {
      process.env.npm_config_user_agent = "yarn/1.22.0 npm/? node/v18.0.0";
      const pm = detectPackageManager(tempDir);
      expect(pm.name).toBe("yarn");
    });

    it("should detect pnpm from npm_config_user_agent", () => {
      process.env.npm_config_user_agent = "pnpm/8.0.0 npm/? node/v18.0.0";
      const pm = detectPackageManager(tempDir);
      expect(pm.name).toBe("pnpm");
    });

    it("should detect bun from npm_config_user_agent", () => {
      process.env.npm_config_user_agent = "bun/1.0.0 npm/? node/v18.0.0";
      const pm = detectPackageManager(tempDir);
      expect(pm.name).toBe("bun");
    });

    it("should prioritize lock files over environment variables", () => {
      process.env.npm_config_user_agent = "yarn/1.22.0";
      const lockFile = path.join(tempDir, "pnpm-lock.yaml");
      fs.writeFileSync(lockFile, "lockfileVersion: 5.4");

      const pm = detectPackageManager(tempDir);
      expect(pm.name).toBe("pnpm");
    });
  });

  describe("getInstallCommand", () => {
    it("should return local install command for npm", () => {
      const lockFile = path.join(tempDir, "package-lock.json");
      fs.writeFileSync(lockFile, "{}");

      const cmd = getInstallCommand("unreach", tempDir, false);
      expect(cmd).toBe("npm install unreach");
    });

    it("should return global install command for npm", () => {
      const lockFile = path.join(tempDir, "package-lock.json");
      fs.writeFileSync(lockFile, "{}");

      const cmd = getInstallCommand("unreach", tempDir, true);
      expect(cmd).toBe("npm install -g unreach");
    });

    it("should return local install command for yarn", () => {
      const lockFile = path.join(tempDir, "yarn.lock");
      fs.writeFileSync(lockFile, "# yarn lockfile");

      const cmd = getInstallCommand("unreach", tempDir, false);
      expect(cmd).toBe("yarn add unreach");
    });

    it("should return global install command for yarn", () => {
      const lockFile = path.join(tempDir, "yarn.lock");
      fs.writeFileSync(lockFile, "# yarn lockfile");

      const cmd = getInstallCommand("unreach", tempDir, true);
      expect(cmd).toBe("yarn global add unreach");
    });

    it("should return local install command for pnpm", () => {
      const lockFile = path.join(tempDir, "pnpm-lock.yaml");
      fs.writeFileSync(lockFile, "lockfileVersion: 5.4");

      const cmd = getInstallCommand("unreach", tempDir, false);
      expect(cmd).toBe("pnpm add unreach");
    });

    it("should return global install command for pnpm", () => {
      const lockFile = path.join(tempDir, "pnpm-lock.yaml");
      fs.writeFileSync(lockFile, "lockfileVersion: 5.4");

      const cmd = getInstallCommand("unreach", tempDir, true);
      expect(cmd).toBe("pnpm add -g unreach");
    });

    it("should return local install command for bun", () => {
      const lockFile = path.join(tempDir, "bun.lock");
      fs.writeFileSync(lockFile, "bun lockfile");

      const cmd = getInstallCommand("unreach", tempDir, false);
      expect(cmd).toBe("bun add unreach");
    });

    it("should return global install command for bun", () => {
      const lockFile = path.join(tempDir, "bun.lock");
      fs.writeFileSync(lockFile, "bun lockfile");

      const cmd = getInstallCommand("unreach", tempDir, true);
      expect(cmd).toBe("bun install -g unreach");
    });
  });

  describe("getRunCommand", () => {
    it("should return npm for npm projects", () => {
      const lockFile = path.join(tempDir, "package-lock.json");
      fs.writeFileSync(lockFile, "{}");

      const cmd = getRunCommand(tempDir);
      expect(cmd).toBe("npm");
    });

    it("should return yarn for yarn projects", () => {
      const lockFile = path.join(tempDir, "yarn.lock");
      fs.writeFileSync(lockFile, "# yarn lockfile");

      const cmd = getRunCommand(tempDir);
      expect(cmd).toBe("yarn");
    });

    it("should return pnpm for pnpm projects", () => {
      const lockFile = path.join(tempDir, "pnpm-lock.yaml");
      fs.writeFileSync(lockFile, "lockfileVersion: 5.4");

      const cmd = getRunCommand(tempDir);
      expect(cmd).toBe("pnpm");
    });

    it("should return bun for bun projects", () => {
      const lockFile = path.join(tempDir, "bun.lock");
      fs.writeFileSync(lockFile, "bun lockfile");

      const cmd = getRunCommand(tempDir);
      expect(cmd).toBe("bun");
    });
  });
});
