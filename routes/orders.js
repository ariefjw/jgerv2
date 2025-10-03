const express = require("express");
const router = express.Router();
const SheetsService = require("../services/sheetsService");
const { validateOrder } = require("../middleware/validation");

const sheetsService = new SheetsService();

// Test connection
router.get("/test", async (req, res) => {
  try {
    const connected = await sheetsService.testConnection();
    res.json({
      connected,
      message: connected ? "Connection successful" : "Connection failed",
    });
  } catch (error) {
    res.status(500).json({ connected: false, message: error.message });
  }
});

// Create new order
router.post("/", validateOrder, async (req, res) => {
  try {
    const { name, batch, items, notes = "" } = req.body;
    
    await sheetsService.appendOrder(name, batch, items, notes);
    return res.json({ message: "Order berhasil disimpan." });
    
  } catch (err) {
    console.error("Error in /api/order:", err);
    return res.status(500).json({ message: "Gagal menyimpan order." });
  }
});

// EDIT ORDER ENDPOINT - INI YANG PERLU DITAMBAHKAN
router.post("/edit", validateOrder, async (req, res) => {
  try {
    const { name, batch, items, notes = "" } = req.body;

    console.log("📝 Editing order for:", name, "batch:", batch);

    // Delete old order and rewrite
    const orders = await sheetsService.getAllOrders();
    const otherOrders = orders.filter(
      (o) => !(o.batch === batch && o.name.toLowerCase() === name.toLowerCase())
    );

    await sheetsService.rewriteOrders([
      ...otherOrders,
      ...items.map((item) => ({
        timestamp: new Date().toISOString(),
        name,
        batch,
        jenisJamu: item.jenisJamu,
        ukuran: item.ukuran,
        option: item.option,
        qty: item.qty,
        notes,
      })),
    ]);

    return res.json({ message: "Order berhasil diupdate." });
  } catch (err) {
    console.error("Error editing order:", err);
    return res.status(500).json({ message: "Gagal mengupdate order." });
  }
});

// Get all orders
router.get("/", async (req, res) => {
  try {
    const rows = await sheetsService.getAllOrders();
    res.json({ count: rows.length, orders: rows });
  } catch (err) {
    console.error("Error getting orders:", err);
    res.status(500).json({ message: "Gagal mengambil data orders." });
  }
});

module.exports = router;