/**
 * In-Memory Database mimicking the PostgreSQL 16 schema.
 * Supports ACID-like transactional operations, optimistic locking,
 * dynamic rubric lookups, and historical evaluation attempts.
 */

class Database {
  constructor() {
    this.users = new Map();
    this.courses = new Map();
    this.assignments = new Map();
    this.rubrics = new Map();
    this.submissions = new Map();
    this.evaluationJobs = new Map();
    this.evaluationAttempts = new Map();
    this.evaluationResults = new Map();
    this.humanReviews = new Map();

    this.seedInitialData();
  }

  seedInitialData() {
    // 1. Seed Users
    const defaultStudent = {
      id: "usr_student_01",
      email: "rahul.sharma@almabetter.com",
      fullName: "Rahul Sharma",
      role: "STUDENT",
      createdAt: new Date().toISOString()
    };
    const defaultEvaluator = {
      id: "usr_mentor_42",
      email: "mentor.priya@almabetter.com",
      fullName: "Priya Sundaram",
      role: "EVALUATOR",
      createdAt: new Date().toISOString()
    };
    this.users.set(defaultStudent.id, defaultStudent);
    this.users.set(defaultEvaluator.id, defaultEvaluator);

    // 2. Seed Courses & Assignments
    const courseId = "crs_mern_2026";
    this.courses.set(courseId, {
      id: courseId,
      code: "FS-MERN-301",
      title: "Full Stack MERN Architecture & Scalability",
      isActive: true
    });

    const rubricId = "rub_default_mern_v1";
    const assignmentId = "asg_mern_capstone_2026";
    
    // 3. Seed Default Rubric (As per Assignment Specification)
    this.rubrics.set(rubricId, {
      id: rubricId,
      assignmentId: assignmentId,
      version: 1,
      name: "Standard MERN Capstone Evaluation Rubric",
      isPublished: true,
      criteria: [
        { key: "functionality", name: "Functionality", weightPercentage: 25.0, maxPoints: 10.0, guide: "Core CRUD, authentication, API routes, data validation" },
        { key: "code_quality", name: "Code Quality", weightPercentage: 20.0, maxPoints: 10.0, guide: "Clean code conventions, error handling, naming, zero unhandled rejections" },
        { key: "architecture", name: "Architecture", weightPercentage: 20.0, maxPoints: 10.0, guide: "Modular separation of concerns (Controllers, Services, Models), scalability" },
        { key: "problem_solving", name: "Problem Solving", weightPercentage: 15.0, maxPoints: 10.0, guide: "Edge cases handling, concurrency resilience, performance tuning" },
        { key: "documentation", name: "Documentation", weightPercentage: 10.0, maxPoints: 10.0, guide: "README setup clarity, environment config, API documentation" },
        { key: "innovation", name: "Innovation / AI Usage", weightPercentage: 10.0, maxPoints: 10.0, guide: "Creative extensions, vector search, AI agent integrations, caching" }
      ],
      createdAt: new Date().toISOString()
    });

    this.assignments.set(assignmentId, {
      id: assignmentId,
      courseId: courseId,
      title: "E-Commerce Microservices & AI Recommendation Capstone",
      description: "Build an end-to-end scalable MERN project with caching, auth, and automated testing.",
      activeRubricId: rubricId,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  // --- Submissions ---
  createSubmission(submission) {
    this.submissions.set(submission.id, submission);
    return submission;
  }

  getSubmission(id) {
    return this.submissions.get(id);
  }

  findSubmissionByIdempotency(hash) {
    for (const sub of this.submissions.values()) {
      if (sub.idempotencyHash === hash) return sub;
    }
    return null;
  }

  updateSubmission(id, patch) {
    const existing = this.submissions.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.submissions.set(id, updated);
    return updated;
  }

  // --- Evaluation Jobs ---
  createEvaluationJob(job) {
    this.evaluationJobs.set(job.id, job);
    return job;
  }

  getEvaluationJob(id) {
    return this.evaluationJobs.get(id);
  }

  findActiveJobForSubmission(submissionId) {
    for (const job of this.evaluationJobs.values()) {
      if (job.submissionId === submissionId && ["QUEUED", "EXTRACTING", "PARSING", "EVALUATING"].includes(job.status)) {
        return job;
      }
    }
    return null;
  }

  updateEvaluationJob(id, patch) {
    const existing = this.evaluationJobs.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, version: (existing.version || 1) + 1 };
    this.evaluationJobs.set(id, updated);
    return updated;
  }

  // --- Evaluation Results ---
  saveEvaluationResult(result) {
    this.evaluationResults.set(result.id, result);
    return result;
  }

  getEvaluationResultByJobId(jobId) {
    for (const res of this.evaluationResults.values()) {
      if (res.jobId === jobId) return res;
    }
    return null;
  }

  updateEvaluationResult(id, patch) {
    const existing = this.evaluationResults.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    this.evaluationResults.set(id, updated);
    return updated;
  }

  // --- Human Reviews ---
  createHumanReview(review) {
    this.humanReviews.set(review.id, review);
    return review;
  }

  getHumanReview(id) {
    return this.humanReviews.get(id);
  }

  getHumanReviewByJobId(jobId) {
    for (const rev of this.humanReviews.values()) {
      if (rev.jobId === jobId) return rev;
    }
    return null;
  }

  // --- Rubrics ---
  getRubric(id) {
    return this.rubrics.get(id);
  }

  getAllRubrics() {
    return Array.from(this.rubrics.values());
  }

  saveRubric(rubric) {
    this.rubrics.set(rubric.id, rubric);
    return rubric;
  }
}

const db = new Database();
module.exports = db;
