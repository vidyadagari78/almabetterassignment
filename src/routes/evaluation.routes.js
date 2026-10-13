const express = require("express");
const router = express.Router();
const evaluationController = require("../controllers/evaluation.controller");

// Start Evaluation (Attached to submission endpoint or evaluation endpoint)
router.post("/submission/:id", (req, res) => evaluationController.startEvaluation(req, res));
router.get("/:jobId/status", (req, res) => evaluationController.getJobStatus(req, res));
router.get("/:jobId/result", (req, res) => evaluationController.getEvaluationResult(req, res));
router.get("/:jobId/stream", (req, res) => evaluationController.streamJobProgress(req, res));
router.post("/:jobId/human-review", (req, res) => evaluationController.requestHumanReview(req, res));
router.post("/:jobId/decision", (req, res) => evaluationController.submitReviewDecision(req, res));

module.exports = router;
