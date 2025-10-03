function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return "Minimal 1 item.";
  for (let i = 0; i < items.length; i++) {
    const it = items[i] || {};
    if (!it.jenisJamu) return `Item ${i + 1}: jenis jamu wajib.`;
    if (!it.ukuran) return `Item ${i + 1}: ukuran wajib.`;
    if (!it.option) return `Item ${i + 1}: option wajib.`;
    const qty = Number(it.qty);
    if (!Number.isFinite(qty) || qty <= 0)
      return `Item ${i + 1}: jumlah harus > 0.`;
  }
  return "";
}

function validateOrder(req, res, next) {
  const { name, batch, items } = req.body || {};

  if (!name || name.length < 2) {
    return res.status(400).json({ message: "Nama minimal 2 karakter." });
  }
  if (!batch) {
    return res.status(400).json({ message: "Batch wajib diisi." });
  }

  const itemsError = validateItems(items);
  if (itemsError) {
    return res.status(400).json({ message: itemsError });
  }

  next();
}

module.exports = {
  validateItems,
  validateOrder
};