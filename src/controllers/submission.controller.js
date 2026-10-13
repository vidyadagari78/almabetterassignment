const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const db = require("../models/inMemoryDb");
const securityService = require("../services/security.service");

class SubmissionController {
  /**
   * POST /api/v1/submissions
   * Create submission metadata
   */
  createSubmission(req, res) {
    try {
      const { assignmentId, submissionType, githubRepoUrl, commitHash, liveUrl, notes } = req.body;

      if (!assignmentId) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "assignmentId is required" }
        });
      }

      if (!["GITHUB_REPO", "ZIP_ARCHIVE", "PDF_DOCUMENT", "HYBRID"].includes(submissionType)) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid submissionType" }
        });
      }

      // Check student user (simulated auth)
      const studentId = req.headers["x-user-id"] || "usr_student_01";

      // Calculate Idempotency Hash (SHA256 of student + assignment + repo/hash)
      const rawIdentity = `${studentId}:${assignmentId}:${githubRepoUrl || ""}:${commitHash || ""}`;
      const idempotencyHash = crypto.createHash("sha256").update(rawIdentity).digest("hex");

      // Check if duplicate submission exists
      const existing = db.findSubmissionByIdempotency(idempotencyHash);
      if (existing) {
        return res.status(200).json({
          success: true,
          data: existing,
          meta: { note: "Returned existing submission matching idempotency fingerprint" }
        });
      }

      const submissionId = `sub_${uuidv4().replace(/-/g, "").substring(0, 16)}`;
      const newSubmission = {
        id: submissionId,
        assignmentId,
        studentId,
        submissionType,
        githubRepoUrl,
        commitHash: commitHash || "main-head",
        liveUrl,
        notes,
        status: "DRAFT",
        idempotencyHash,
        createdAt: new Date().toISOString()
      };

      db.createSubmission(newSubmission);

      return res.status(201).json({
        success: true,
        data: newSubmission
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  /**
   * POST /api/v1/submissions/:id/upload-url
   * Generates presigned S3 upload URL for direct client multipart upload
   */
  getPresignedUploadUrl(req, res) {
    try {
      const { id } = req.params;
      const { fileName, fileSizeBytes, mimeType } = req.body;

      const submission = db.getSubmission(id);
      if (!submission) {
        return res.status(404).json({ success: false, error: { message: "Submission not found" } });
      }

      // 1GB safety check
      const MAX_BYTES = 1024 * 1024 * 1024;
      if (fileSizeBytes > MAX_BYTES) {
        return res.status(400).json({
          success: false,
          error: {
            code: "SUBMISSION_FILE_TOO_LARGE",
            message: `File size exceeds the 1GB limit (${(fileSizeBytes / (1024*1024)).toFixed(1)}MB)`
          }
        });
      }

      const s3Key = `raw/${submission.id}/${Date.now()}_${pathSafe(fileName || "archive.zip")}`;
      const presignedUrl = `https://almabetter-submissions-prod.s3.amazonaws.com/${s3Key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600`;

      db.updateSubmission(id, {
        s3ArchiveKey: s3Key,
        status: "UPLOAD_PENDING"
      });

      return res.status(200).json({
        success: true,
        data: {
          submissionId: submission.id,
          uploadUrl: presignedUrl,
          s3Key,
          expiresInSeconds: 3600,
          requiredHeaders: { "Content-Type": mimeType || "application/zip" }
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  /**
   * GET /api/v1/submissions/:id
   */
  getSubmissionById(req, res) {
    const submission = db.getSubmission(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, error: { message: "Submission not found" } });
    }
    return res.json({ success: true, data: submission });
  }
}

function pathSafe(str) {
  return str.replace(/[^a-zA-Z0-9._-]/g, "_");
}

module.exports = new SubmissionController();
