const { v4: uuidv4 } = require("uuid");
const db = require("../models/inMemoryDb");
const queueService = require("../services/queue.service");

class EvaluationController {
  /**
   * POST /api/v1/submissions/:id/evaluate
   * Triggers an asynchronous evaluation pipeline
   */
  startEvaluation(req, res) {
    try {
      const { id } = req.params;
      const { rubricId } = req.body;
      const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey;

      const submission = db.getSubmission(id);
      if (!submission) {
        return res.status(404).json({ success: false, error: { message: "Submission not found" } });
      }

      // Enqueue job via async queue service
      const { job, isDuplicate } = queueService.enqueueEvaluationJob(submission.id, rubricId || "rub_default_mern_v1");

      const statusCode = isDuplicate ? 200 : 202;
      return res.status(statusCode).json({
        success: true,
        data: {
          jobId: job.id,
          submissionId: submission.id,
          status: job.status,
          currentStage: job.currentStage,
          progressPercentage: job.progressPercentage,
          isDuplicate,
          statusStreamUrl: `/api/v1/evaluations/${job.id}/stream`
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  /**
   * GET /api/v1/evaluations/:jobId/status
   */
  getJobStatus(req, res) {
    const { jobId } = req.params;
    const job = db.getEvaluationJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, error: { message: "Evaluation job not found" } });
    }

    return res.json({
      success: true,
      data: {
        jobId: job.id,
        submissionId: job.submissionId,
        status: job.status,
        currentStage: job.currentStage,
        progressPercentage: job.progressPercentage,
        assignedWorkerId: job.assignedWorkerId,
        startedAt: job.startedAt,
        completedAt: job.completedAt
      }
    });
  }

  /**
   * GET /api/v1/evaluations/:jobId/result
   */
  getEvaluationResult(req, res) {
    const { jobId } = req.params;
    const result = db.getEvaluationResultByJobId(jobId);

    if (!result) {
      const job = db.getEvaluationJob(jobId);
      if (job && job.status !== "COMPLETED") {
        return res.status(202).json({
          success: true,
          message: `Evaluation is still in progress (stage: ${job.currentStage}, ${job.progressPercentage}%)`,
          data: null
        });
      }
      return res.status(404).json({ success: false, error: { message: "Evaluation result not found" } });
    }

    return res.json({
      success: true,
      data: result
    });
  }

  /**
   * POST /api/v1/evaluations/:jobId/human-review
   */
  requestHumanReview(req, res) {
    try {
      const { jobId } = req.params;
      const { reason, studentNotes, disputedDimensionKey } = req.body;

      const result = db.getEvaluationResultByJobId(jobId);
      if (!result) {
        return res.status(404).json({ success: false, error: { message: "Evaluation result not found" } });
      }

      const reviewId = `rev_${uuidv4().replace(/-/g, "").substring(0, 14)}`;
      const review = {
        id: reviewId,
        jobId,
        evaluationResultId: result.id,
        reason: reason || "DISPUTED_SCORE",
        studentNotes: studentNotes || "Requested mentor re-assessment.",
        disputedDimensionKey,
        status: "PENDING_MENTOR_REVIEW",
        requestedAt: new Date().toISOString()
      };

      db.createHumanReview(review);
      db.updateEvaluationResult(result.id, { requiresHumanReview: true, status: "IN_HUMAN_REVIEW" });

      return res.status(202).json({
        success: true,
        data: review
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  /**
   * POST /api/v1/evaluations/:jobId/human-review/decision
   * Mentor / Evaluator approves or overrides scores
   */
  submitReviewDecision(req, res) {
    try {
      const { jobId } = req.params;
      const { decision, revisedDimensionScores, evaluatorComments } = req.body;

      const result = db.getEvaluationResultByJobId(jobId);
      if (!result) {
        return res.status(404).json({ success: false, error: { message: "Evaluation result not found" } });
      }

      let revisedOverall = result.overallScore;

      // Apply overrides if provided
      if (decision === "OVERRIDE_SCORE" && revisedDimensionScores) {
        const rubric = db.getRubric("rub_default_mern_v1");
        const updatedBreakdown = result.breakdown.map((item) => {
          if (revisedDimensionScores[item.key] !== undefined) {
            const newScore = Number(revisedDimensionScores[item.key]);
            return {
              ...item,
              score: newScore,
              feedback: `${item.feedback} [Mentor Adjusted: ${evaluatorComments || "Reviewed and revised"}]`
            };
          }
          return item;
        });

        revisedOverall = updatedBreakdown.reduce((sum, item) => sum + item.score, 0);
        revisedOverall = Math.round(revisedOverall * 10) / 10;

        db.updateEvaluationResult(result.id, {
          overallScore: revisedOverall,
          breakdown: updatedBreakdown,
          status: "PUBLISHED_AFTER_HUMAN_REVIEW",
          requiresHumanReview: false,
          humanReviewAudit: {
            decision,
            comments: evaluatorComments,
            reviewedAt: new Date().toISOString()
          }
        });
      } else {
        db.updateEvaluationResult(result.id, {
          status: "APPROVED_BY_MENTOR",
          requiresHumanReview: false,
          humanReviewAudit: {
            decision: "APPROVED_AS_IS",
            comments: evaluatorComments,
            reviewedAt: new Date().toISOString()
          }
        });
      }

      return res.json({
        success: true,
        data: {
          jobId,
          decision,
          revisedOverallScore: revisedOverall,
          status: "PUBLISHED"
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  /**
   * GET /api/v1/evaluations/:jobId/stream
   * Server-Sent Events (SSE) for live streaming progress updates to UI
   */
  streamJobProgress(req, res) {
    const { jobId } = req.params;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const listener = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (data.status === "COMPLETED" || data.status === "FAILED") {
        res.end();
      }
    };

    queueService.on(`job:${jobId}:update`, listener);

    req.on("close", () => {
      queueService.removeListener(`job:${jobId}:update`, listener);
    });
  }
}

module.exports = new EvaluationController();
