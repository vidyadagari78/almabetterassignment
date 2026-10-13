const express = require("express");
const router = express.Router();
const submissionController = require("../controllers/submission.controller");

router.post("/", (req, res) => submissionController.createSubmission(req, res));
router.post("/:id/upload-url", (req, res) => submissionController.getPresignedUploadUrl(req, res));
router.get("/:id", (req, res) => submissionController.getSubmissionById(req, res));

module.exports = router;
