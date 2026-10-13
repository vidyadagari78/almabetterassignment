const path = require("path");

class SecurityService {
  constructor() {
    // Limits as specified in the Architecture Threat Model
    this.MAX_FILES_COUNT = 5000;
    this.MAX_UNCOMPRESSED_BYTES = 500 * 1024 * 1024; // 500 MB
    this.MAX_COMPRESSION_RATIO = 10.0; // 10:1

    // Known Prompt Injection Patterns
    this.PROMPT_INJECTION_PATTERNS = [
      /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
      /you\s+are\s+now\s+in\s+developer\s+mode/i,
      /give\s+(me\s+)?(100|full\s+marks|10\/10|a\+\+)/i,
      /system\s+prompt\s+override/i,
      /<system>/i,
      /disregard\s+(the\s+)?rubric/i,
      /act\s+as\s+an\s+evaluator\s+who\s+gives\s+perfect\s+scores/i,
      /secret\s+evaluator\s+token/i
    ];

    // Secret Leakage Patterns (Trufflehog-style pre-scan)
    this.SECRET_PATTERNS = [
      /(AKIA[0-9A-Z]{16})/g, // AWS Access Key
      /ghp_[0-9a-zA-Z]{36}/g, // GitHub Personal Token
      /sk-[a-zA-Z0-9]{48}/g, // OpenAI Key
      /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/g // MongoDB URI credentials
    ];
  }

  /**
   * Validates ZIP archive headers prior to complete extraction.
   * Defends against Decompression Bombs.
   */
  validateZipSecurity(zipEntries, compressedSizeBytes) {
    if (!zipEntries || zipEntries.length === 0) {
      return { valid: false, error: "Empty archive or invalid zip structure" };
    }

    if (zipEntries.length > this.MAX_FILES_COUNT) {
      return {
        valid: false,
        error: `ZIP Bomb Alert: File count (${zipEntries.length}) exceeds safety limit (${this.MAX_FILES_COUNT})`
      };
    }

    let totalUncompressed = 0;
    for (const entry of zipEntries) {
      totalUncompressed += entry.header.size;
    }

    if (totalUncompressed > this.MAX_UNCOMPRESSED_BYTES) {
      return {
        valid: false,
        error: `ZIP Bomb Alert: Total uncompressed size (${(totalUncompressed / (1024*1024)).toFixed(1)}MB) exceeds limit (${this.MAX_UNCOMPRESSED_BYTES / (1024*1024)}MB)`
      };
    }

    const ratio = compressedSizeBytes > 0 ? (totalUncompressed / compressedSizeBytes) : 1;
    if (ratio > this.MAX_COMPRESSION_RATIO && totalUncompressed > 10 * 1024 * 1024) {
      return {
        valid: false,
        error: `ZIP Bomb Alert: Suspicious compression ratio (${ratio.toFixed(1)}:1) exceeds limit`
      };
    }

    return { valid: true, totalFiles: zipEntries.length, totalBytes: totalUncompressed };
  }

  /**
   * Validates target extraction path to prevent directory traversal attacks (e.g. ../../etc/passwd)
   */
  validatePathTraversal(sandboxDir, relativeFilePath) {
    const safeBase = path.resolve(sandboxDir);
    const resolvedTarget = path.resolve(sandboxDir, relativeFilePath);

    // Must be strictly within safeBase directory
    if (!resolvedTarget.startsWith(safeBase + path.sep) && resolvedTarget !== safeBase) {
      return {
        safe: false,
        error: `Path Traversal Alert: Detected illegal traversal attempt for file '${relativeFilePath}'`
      };
    }
    return { safe: true, safePath: resolvedTarget };
  }

  /**
   * Scans untrusted documentation / code for prompt injection attempts.
   */
  detectPromptInjections(text) {
    if (!text || typeof text !== "string") return { flagged: false, threats: [] };

    const detectedThreats = [];
    for (const pattern of this.PROMPT_INJECTION_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        detectedThreats.push(`Pattern detected: "${match[0]}"`);
      }
    }

    return {
      flagged: detectedThreats.length > 0,
      threats: detectedThreats
    };
  }

  /**
   * Scans code content for exposed credentials and redacts them.
   */
  redactSecrets(text) {
    if (!text || typeof text !== "string") return { sanitized: "", secretsFound: 0 };

    let sanitized = text;
    let secretsFound = 0;

    for (const pattern of this.SECRET_PATTERNS) {
      sanitized = sanitized.replace(pattern, (match) => {
        secretsFound++;
        return "[REDACTED_CREDENTIAL_" + match.substring(0, 4) + "...]";
      });
    }

    return { sanitized, secretsFound };
  }
}

module.exports = new SecurityService();
