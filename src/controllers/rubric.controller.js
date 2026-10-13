const db = require("../models/inMemoryDb");
const rubricService = require("../services/rubric.service");

class RubricController {
  getAllRubrics(req, res) {
    const rubrics = db.getAllRubrics();
    return res.json({ success: true, data: rubrics });
  }

  getRubricById(req, res) {
    const rubric = db.getRubric(req.params.id);
    if (!rubric) {
      return res.status(404).json({ success: false, error: { message: "Rubric not found" } });
    }
    return res.json({ success: true, data: rubric });
  }

  updateRubric(req, res) {
    const { id } = req.params;
    const { name, criteria } = req.body;

    const existing = db.getRubric(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: "Rubric not found" } });
    }

    if (criteria) {
      const validation = rubricService.validateRubricWeights(criteria);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: { message: validation.error } });
      }
    }

    const updated = {
      ...existing,
      name: name || existing.name,
      criteria: criteria || existing.criteria,
      version: existing.version + 1,
      updatedAt: new Date().toISOString()
    };

    db.saveRubric(updated);
    return res.json({ success: true, data: updated });
  }
}

module.exports = new RubricController();
