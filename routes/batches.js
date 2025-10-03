const express = require("express");
const router = express.Router();
const SheetsService = require("../services/sheetsService");

const sheetsService = new SheetsService();

// Get recent batches
router.get("/", async (req, res) => {
  try {
    const rows = await sheetsService.getAllOrders();
    const unique = Array.from(new Set(rows.map((r) => r.batch))).filter(Boolean);
    const recent = unique.slice(-20).reverse();
    res.json({ count: recent.length, batches: recent });
  } catch (err) {
    console.error("Error getting batches:", err);
    res.status(500).json({ message: "Gagal mengambil daftar batch." });
  }
});

module.exports = router;