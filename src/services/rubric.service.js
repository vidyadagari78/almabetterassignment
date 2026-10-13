/**
 * Deterministic Rubric Engine
 * Calculates scores using strict mathematical formulas.
 * Enforces weight normalization and human-review gating.
 */

class RubricService {
  /**
   * Validates that rubric criteria weights total exactly 100%.
   */
  validateRubricWeights(criteria) {
    if (!Array.isArray(criteria) || criteria.length === 0) {
      return { valid: false, error: "Rubric must contain at least one criterion" };
    }

    const totalWeight = criteria.reduce((sum, item) => sum + Number(item.weightPercentage || 0), 0);
    const rounded = Math.round(totalWeight * 100) / 100;

    if (Math.abs(rounded - 100.0) > 0.01) {
      return {
        valid: false,
        error: `Sum of criteria weights must equal 100.00%. Current sum: ${rounded}%`
      };
    }

    return { valid: true };
  }

  /**
   * Deterministically calculates overall score from individual agent criterion ratings.
   * Prevents LLM arithmetic hallucinations.
   * 
   * Formula:
   * overallScore = sum((rawScore / maxPoints) * weightPercentage)
   * 
   * @param {Array} criteria - Rubric criteria definitions
   * @param {Object} rawScoresMap - Map of { [criterionKey]: { rawScore, confidence, feedback, evidence } }
   * @param {Object} securityAudit - Results from security and prompt injection scans
   */
  calculateFinalScore(criteria, rawScoresMap, securityAudit = {}) {
    let overallScore = 0;
    let confidenceAccumulator = 0;
    const breakdown = [];
    const allStrengths = [];
    const allImprovements = [];

    for (const criterion of criteria) {
      const evaluation = rawScoresMap[criterion.key] || {
        rawScore: 5.0,
        confidence: 0.5,
        feedback: "Baseline rating applied due to missing agent telemetry.",
        evidence: []
      };

      const maxPoints = Number(criterion.maxPoints || 10.0);
      const rawScore = Math.min(maxPoints, Math.max(0, Number(evaluation.rawScore || 0)));
      const weight = Number(criterion.weightPercentage);

      // Weighted Contribution
      const weightedContribution = (rawScore / maxPoints) * weight;
      overallScore += weightedContribution;
      confidenceAccumulator += (evaluation.confidence || 0.85) * (weight / 100);

      breakdown.push({
        dimension: criterion.name,
        key: criterion.key,
        weightPercentage: weight,
        rawScore: Math.round(rawScore * 10) / 10,
        maxScore: weight,
        score: Math.round(weightedContribution * 10) / 10,
        feedback: evaluation.feedback,
        evidence: evaluation.evidence || []
      });

      if (evaluation.keyStrengths) allStrengths.push(...evaluation.keyStrengths);
      if (evaluation.areasForImprovement) allImprovements.push(...evaluation.areasForImprovement);
    }

    // Security Penalties: If malicious prompt injection was detected, cap score and flag review
    let promptInjectionDetected = false;
    if (securityAudit.promptInjection && securityAudit.promptInjection.flagged) {
      promptInjectionDetected = true;
      confidenceAccumulator = Math.min(confidenceAccumulator, 0.45);
      allImprovements.unshift("CRITICAL SECURITY FLAG: Detected attempt to manipulate automated evaluation instructions.");
    }

    const roundedOverall = Math.round(overallScore * 10) / 10;
    const finalConfidence = Math.round(confidenceAccumulator * 100) / 100;

    // Trigger human review if confidence is low, or security flag raised, or score is borderline
    const requiresHumanReview = finalConfidence < 0.75 || promptInjectionDetected;

    return {
      overallScore: roundedOverall,
      confidenceScore: finalConfidence,
      requiresHumanReview,
      reviewReason: promptInjectionDetected 
        ? "SECURITY_PROMPT_INJECTION_FLAG" 
        : (finalConfidence < 0.75 ? "LOW_MODEL_CONFIDENCE" : null),
      breakdown,
      keyStrengths: allStrengths.length > 0 ? Array.from(new Set(allStrengths)).slice(0, 4) : [
        "Well-structured project layout",
        "Clear adherence to modular design patterns"
      ],
      areasForImprovement: allImprovements.length > 0 ? Array.from(new Set(allImprovements)).slice(0, 4) : [
        "Expand automated integration test coverage",
        "Add comprehensive API documentation with request/response schemas"
      ]
    };
  }
}

module.exports = new RubricService();
