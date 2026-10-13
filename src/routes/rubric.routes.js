const express = require("express");
const router = express.Router();
const rubricController = require("../controllers/rubric.controller");

router.get("/", (req, res) => rubricController.getAllRubrics(req, res));
router.get("/:id", (req, res) => rubricController.getRubricById(req, res));
router.put("/:id", (req, res) => rubricController.updateRubric(req, res));

module.exports = router;
