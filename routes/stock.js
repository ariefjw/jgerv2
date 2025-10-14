const express = require("express");
const router = express.Router();
const SheetsService = require("../services/sheetsService");

const sheetsService = new SheetsService();

// Get stock levels
router.get("/", async (req, res) => {
  try {
    const stocks = await sheetsService.getStockLevels();
    res.json({ stocks });
  } catch (err) {
    console.error("Error getting stock:", err);
    res.status(500).json({ message: "Gagal mengambil data stok." });
  }
});

// Add stock
router.post("/add", async (req, res) => {
  try {
    const { jenisJamu, ukuran, option = "normal", qty, notes } = req.body;

    if (!jenisJamu || !ukuran || !qty || qty <= 0) {
      return res.status(400).json({
        message: "jenisJamu, ukuran, dan qty (> 0) wajib diisi.",
      });
    }

    await sheetsService.addStockEntry(
      jenisJamu,
      ukuran,
      option,
      qty,
      "in",
      notes || "Penambahan stok"
    );

    res.json({
      message: "Stok berhasil ditambahkan.",
      jenisJamu,
      ukuran,
      qty,
    });
  } catch (err) {
    console.error("Error adding stock:", err);
    res.status(500).json({ message: "Gagal menambah stok." });
  }
});

// Reduce stock
router.post("/reduce", async (req, res) => {
  try {
    const { jenisJamu, ukuran, option = "normal", qty, notes } = req.body;

    if (!jenisJamu || !ukuran || !qty || qty <= 0) {
      return res.status(400).json({
        message: "jenisJamu, ukuran, dan qty (> 0) wajib diisi.",
      });
    }

    // Check available stock
    const currentStocks = await sheetsService.getStockLevels();
    const currentStock = currentStocks.find(s => 
      s.jenisJamu === jenisJamu && 
      s.ukuran === ukuran && 
      s.option === option
    );

    if (!currentStock || currentStock.qty < qty) {
      return res.status(400).json({
        message: `Stok tidak cukup. Stok saat ini: ${currentStock ? currentStock.qty : 0}`,
      });
    }

    await sheetsService.addStockEntry(
      jenisJamu,
      ukuran,
      option,
      qty,
      "out",
      notes || "Pengurangan stok manual"
    );

    res.json({
      message: "Stok berhasil dikurangi.",
      jenisJamu,
      ukuran,
      qty,
    });
  } catch (err) {
    console.error("Error reducing stock:", err);
    res.status(500).json({ message: "Gagal mengurangi stok." });
  }
});

// Get stock history
router.get("/history", async (req, res) => {
  try {
    const history = await sheetsService.getStockHistory();
    res.json({ history });
  } catch (err) {
    console.error("Error getting stock history:", err);
    res.status(500).json({ message: "Gagal memuat history stok." });
  }
});

router.post("/status", async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ message: "ID dan status wajib diisi." });

    const order = await sheetsService.getOrderById(id);
    if (!order) return res.status(404).json({ message: "Order tidak ditemukan." });

    // Validasi transisi status
    const validTransitions = {
      proses: ["packing"],
      packing: ["scheduled", "delivered"],
      scheduled: ["delivered"],
      delivered: ["paid"],
      paid: [],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({ message: `Transisi tidak valid dari ${order.status} ke ${status}.` });
    }

    // Jika masuk status packing → kurangi stok
    if (status === "packing") {
      for (const item of order.items) {
        await sheetsService.addStockEntry(
          item.jenisJamu,
          item.ukuran,
          item.option || "normal",
          item.qty,
          "out",
          `Order ${order.customerName}`
        );
      }
    }

    // Update status di Google Sheet
    await sheetsService.updateOrderStatus(id, status);

    res.json({ success: true, message: `Status order diperbarui ke ${status}`, newStatus: status });
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ message: "Gagal memperbarui status order." });
  }
});


module.exports = router;