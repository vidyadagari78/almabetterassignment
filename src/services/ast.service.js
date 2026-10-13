/**
 * AST & Static Code Analysis Service
 * Gathers deterministic facts, dependency structures, and metrics
 * BEFORE dispatching requests to LLM agents.
 */

class ASTAnalysisService {
  /**
   * Analyzes an in-memory or extracted file tree.
   * @param {Array<{ path: string, content: string }>} files
   */
  analyzeProjectFiles(files) {
    let totalLinesOfCode = 0;
    let commentsAndBlanks = 0;
    let endpointCount = 0;
    let testCount = 0;
    let tryCatchBlocks = 0;
    let unhandledAsyncPatterns = 0;

    const detectedFrameworks = new Set();
    const manifestFiles = [];
    const sourceFiles = [];
    const docFiles = [];

    for (const file of files) {
      const lowerPath = file.path.toLowerCase();

      // Categorize files
      if (lowerPath.endsWith(".md") || lowerPath.endsWith(".txt")) {
        docFiles.push(file);
      } else if (lowerPath.endsWith(".json") || lowerPath.endsWith(".yml") || lowerPath.endsWith(".yaml")) {
        manifestFiles.push(file);
      } else if (/\.(js|ts|jsx|tsx|py|java|go)$/.test(lowerPath)) {
        sourceFiles.push(file);
      }

      // Analyze source code metrics
      if (/\.(js|ts|jsx|tsx)$/.test(lowerPath)) {
        const lines = (file.content || "").split("\n");
        totalLinesOfCode += lines.length;

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
            commentsAndBlanks++;
            continue;
          }

          // Framework & Dependency Detection
          if (/require\(["']express["']\)|from\s+["']express["']/.test(trimmed)) {
            detectedFrameworks.add("Express.js");
          }
          if (/require\(["']mongoose["']\)|from\s+["']mongoose["']/.test(trimmed)) {
            detectedFrameworks.add("MongoDB / Mongoose");
          }
          if (/require\(["']pg["']\)|from\s+["']pg["']|prisma|sequelize/.test(trimmed)) {
            detectedFrameworks.add("PostgreSQL / Relational ORM");
          }
          if (/jsonwebtoken|jwt/.test(trimmed)) {
            detectedFrameworks.add("JWT Authentication");
          }
          if (/redis|ioredis/.test(trimmed)) {
            detectedFrameworks.add("Redis Caching");
          }
          if (/from\s+["']react["']|require\(["']react["']\)/.test(trimmed)) {
            detectedFrameworks.add("React Frontend");
          }

          // Endpoints Detection
          if (/app\.(get|post|put|delete|patch)\(|router\.(get|post|put|delete|patch)\(/.test(trimmed)) {
            endpointCount++;
          }

          // Quality & Reliability Indicators
          if (/try\s*\{/.test(trimmed)) {
            tryCatchBlocks++;
          }
          if (/async\s+function|async\s*\(/.test(trimmed) && !file.content.includes("try {")) {
            unhandledAsyncPatterns++;
          }

          // Test suite indicators
          if (/describe\(|test\(|it\(|expect\(/.test(trimmed)) {
            testCount++;
          }
        }
      }
    }

    const functionalLOC = Math.max(0, totalLinesOfCode - commentsAndBlanks);
    const cyclomaticComplexityScore = Math.min(10, Math.max(2, Math.round((tryCatchBlocks * 1.5) + (endpointCount * 0.8))));

    return {
      totalFiles: files.length,
      sourceFilesCount: sourceFiles.length,
      functionalLOC,
      detectedFrameworks: Array.from(detectedFrameworks),
      endpointCount,
      testAssertionsFound: testCount,
      hasUnitTests: testCount > 0,
      tryCatchBlocks,
      unhandledAsyncPatterns,
      cyclomaticComplexityScore,
      summary: `Analyzed ${sourceFiles.length} source files (${functionalLOC} functional LOC). Found ${endpointCount} API routes and ${testCount} automated test assertions.`
    };
  }
}

module.exports = new ASTAnalysisService();
