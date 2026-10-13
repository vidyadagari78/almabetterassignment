const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const submissionRoutes = require("./routes/submission.routes");
const evaluationRoutes = require("./routes/evaluation.routes");
const rubricRoutes = require("./routes/rubric.routes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static files for Evaluator / Student Dashboard Portal & Documentation
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.static(path.join(__dirname, "..")));

// Explicit convenient routes for opening deliverables
app.get("/SYSTEM_DESIGN_DOCUMENT.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../SYSTEM_DESIGN_DOCUMENT.html"));
});
app.get("/SYSTEM_DESIGN_DOCUMENT.md", (req, res) => {
  res.sendFile(path.join(__dirname, "../SYSTEM_DESIGN_DOCUMENT.md"));
});
app.get("/README.md", (req, res) => {
  res.sendFile(path.join(__dirname, "../README.md"));
});
app.get("/assignment.pdf", (req, res) => {
  res.sendFile(path.join(__dirname, "../assignment.pdf"));
});
app.get("/assignment.png", (req, res) => {
  res.sendFile(path.join(__dirname, "../assignment.png"));
});

// Liveness & Readiness Probes (for AWS ALB / Kubernetes)
app.get("/api/v1/health", (req, res) => {
  return res.json({
    status: "HEALTHY",
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    activeWorkers: 4,
    queueCapacity: "HEALTHY"
  });
});

// Mount Routes
app.use("/api/v1/submissions", submissionRoutes);
app.use("/api/v1/evaluations", evaluationRoutes);
app.use("/api/v1/rubrics", rubricRoutes);

// Root fallback
app.get("/api/v1", (req, res) => {
  res.json({
    name: "AlmaBetter AI-Powered Project Evaluation Engine API",
    version: "v1.0.0",
    docs: "/SYSTEM_DESIGN_DOCUMENT.html",
    endpoints: {
      submissions: "/api/v1/submissions",
      evaluations: "/api/v1/evaluations",
      rubrics: "/api/v1/rubrics",
      health: "/api/v1/health"
    }
  });
});

// Centralized Global Error Handler
app.use((err, req, res, next) => {
  console.error("[Global Error Boundary]", err);
  return res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected system error occurred"
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 AlmaBetter AI Evaluation Backend running on port ${PORT}`);
    console.log(`📡 Dashboard Portal: http://localhost:${PORT}`);
    console.log(`📄 Technical Architecture HTML: http://localhost:${PORT}/SYSTEM_DESIGN_DOCUMENT.html`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
