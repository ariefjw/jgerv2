const express = require("express");
const router = express.Router();
const SheetsService = require("../services/sheetsService");

const sheetsService = new SheetsService();

// Get summary by batch
router.get("/", async (req, res) => {
  try {
    const batch = String(req.query.batch || "").trim();
    if (!batch) return res.status(400).json({ message: "batch wajib diisi" });

    const rows = await sheetsService.getAllOrders();
    const filtered = rows.filter((r) => r.batch === batch);

    const byKey = new Map();
    let totalQty = 0;

    for (const r of filtered) {
      const key = `${r.jenisJamu}__${r.ukuran}__${r.option}`;
      const prev = byKey.get(key) || {
        jenisJamu: r.jenisJamu,
        ukuran: r.ukuran,
        option: r.option,
        qty: 0,
      };
      prev.qty += Number(r.qty);
      byKey.set(key, prev);
      totalQty += Number(r.qty);
    }

    const rowsOut = Array.from(byKey.values()).sort(
      (a, b) =>
        a.jenisJamu.localeCompare(b.jenisJamu) ||
        a.ukuran.localeCompare(b.ukuran) ||
        a.option.localeCompare(b.option)
    );

    res.json({
      batch,
      orders: new Set(filtered.map((r) => r.name)).size,
      totalQty,
      rows: rowsOut,
    });
  } catch (err) {
    console.error("Error in summary:", err);
    res.status(500).json({ message: "Gagal membuat summary." });
  }
});

// Get customer summary
router.get("/customers", async (req, res) => {
  try {
    const batch = String(req.query.batch || "").trim();
    if (!batch) return res.status(400).json({ message: "batch wajib diisi" });

    const rows = await sheetsService.getAllOrders();
    const payments = await sheetsService.getPaymentsMap();
    const filtered = rows.filter((r) => r.batch === batch);

    const byCustomer = new Map();
    for (const r of filtered) {
      const name = r.name;
      const entry = byCustomer.get(name) || {
        name,
        totalQty: 0,
        items: [],
        qtyBySize: { "250ml": 0, "600ml": 0, "1L": 0 },
        notes: new Set(),
      };

      entry.totalQty += Number(r.qty);
      const sizeLower = String(r.ukuran).toLowerCase();

      if (sizeLower === "250ml") entry.qtyBySize["250ml"] += Number(r.qty);
      else if (sizeLower === "600ml") entry.qtyBySize["600ml"] += Number(r.qty);
      else if (sizeLower === "1l" || sizeLower === "1l " || sizeLower === "1 l") {
        entry.qtyBySize["1L"] += Number(r.qty);
      }

      entry.items.push({
        jenisJamu: r.jenisJamu,
        ukuran: r.ukuran,
        option: r.option,
        qty: Number(r.qty),
      });
      if (r.notes) entry.notes.add(String(r.notes));
      byCustomer.set(name, entry);
    }

    const customers = Array.from(byCustomer.values())
      .map((c) => {
        const price250 = calculatePriceBundles250ml(c.qtyBySize["250ml"]);
        const price600 = c.qtyBySize["600ml"] * 30000;
        const price1l = c.qtyBySize["1L"] * 50000;
        const totalAmount = price250 + price600 + price1l;
        const status = (
          payments.get(`${batch}__${c.name.toLowerCase()}`) || "proses"
        ).toLowerCase();

        return {
          name: c.name,
          totalQty: c.totalQty,
          totalAmount,
          status,
          items: c.items,
          notes: Array.from(c.notes || []),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const summary = {
      batch,
      customers,
      totalOrders: new Set(filtered.map((r) => r.name)).size,
      totalCustomers: customers.length,
      totalQty: customers.reduce((s, r) => s + r.totalQty, 0),
      totalAmount: customers.reduce((s, r) => s + r.totalAmount, 0),
    };

    res.json(summary);
  } catch (err) {
    console.error("Error in customer summary:", err);
    res.status(500).json({ message: "Gagal membuat summary per customer." });
  }
});

// Update payment status
router.post("/customers/pay", async (req, res) => {
  try {
    const { batch, name, status } = req.body;

    const normalizedStatus = normalizeStatus(status);

    const validStatuses = ["proses", "packing", "scheduled", "delivered", "paid"];
    const statusOrder = { proses: 1, packing: 2, scheduled: 3, delivered: 4, paid: 5 };

    if (!batch || !name || !validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        message: "batch, name, dan status valid wajib.",
      });
    }

    // Check current status
    const payments = await sheetsService.getPaymentsMap();
    const currentStatus = (
      payments.get(`${batch}__${name.toLowerCase()}`) || "proses"
    ).toLowerCase();

    // Validate status order
    if (statusOrder[normalizedStatus] <= statusOrder[currentStatus]) {
      return res.status(400).json({
        message: `Status tidak dapat diubah dari ${currentStatus} ke ${normalizedStatus}.`,
      });
    }

    // If moving to packing, check and reduce stock
    if (normalizedStatus === "packing") {
      const currentStocks = await sheetsService.getStockLevels();
      const stockMap = new Map(
        currentStocks.map((s) => [
          `${s.jenisJamu}__${s.ukuran}__${s.option}`,
          s.qty,
        ])
      );

      const orders = await sheetsService.getAllOrders();
      const userOrders = orders.filter(
        (o) => o.batch === batch && o.name === name
      );

      for (const order of userOrders) {
        const key = `${order.jenisJamu}__${order.ukuran}__${order.option}`;
        const availableStock = stockMap.get(key) || 0;

        if (availableStock < order.qty) {
          return res.status(400).json({
            message: `Stok tidak cukup untuk ${order.jenisJamu} ${order.ukuran} ${order.option}.`,
          });
        }
      }

      // Reduce stock
      for (const order of userOrders) {
        await sheetsService.addStockEntry(
          order.jenisJamu,
          order.ukuran,
          order.option,
          order.qty,
          "out",
          `Order ${batch} - ${name}`
        );
      }
    }

    await sheetsService.setPayment(batch, name, normalizedStatus);
    res.json({ message: "Status terupdate.", batch, name, status: normalizedStatus });
    
  } catch (err) {
    console.error("Error updating payment:", err);
    res.status(500).json({ message: "Gagal mengupdate status pembayaran." });
  }
});

// Helper functions
function calculatePriceBundles250ml(totalQty250) {
  const pairs = Math.floor(totalQty250 / 2);
  const remainder = totalQty250 % 2;
  return pairs * 25000 + remainder * 13000;
}

function normalizeStatus(s) {
  const v = String(s || "").toLowerCase().trim();
  if (["proses", "process"].includes(v)) return "proses";
  if (["packing", "pack"].includes(v)) return "packing";
  if (["scheduled", "dijadwalkan", "schedule"].includes(v)) return "scheduled";
  if (["delivered", "dikirim", "kirim"].includes(v)) return "delivered";
  if (["paid", "terbayar", "lunas", "bayar"].includes(v)) return "paid";
  return v;
}

module.exports = router;