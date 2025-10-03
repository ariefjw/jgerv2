// app.js - Logic untuk halaman input order

// Initialize form ketika DOM siap
window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("orderForm");
  const submitBtn = document.getElementById("submitBtn");
  const alertSuccess = document.getElementById("alertSuccess");
  const alertError = document.getElementById("alertError");
  const itemsContainer = document.getElementById("itemsContainer");
  const addItemBtn = document.getElementById("addItemBtn");
  const generateBatchBtn = document.getElementById("generateBatchBtn");
  const batchInput = document.getElementById("batch");
  const notesInput = document.getElementById("notes");

  // Restore last batch
  const lastBatch = localStorage.getItem("lastBatch");
  if (lastBatch) batchInput.value = lastBatch;

  // Tambahkan minimal satu baris item
  itemsContainer.appendChild(createItemRow(0));

  addItemBtn.addEventListener("click", () => {
    itemsContainer.appendChild(createItemRow(itemsContainer.children.length));
  });

  generateBatchBtn.addEventListener("click", () => {
    batchInput.value = formatBatchWeekOfMonth();
    localStorage.setItem("lastBatch", batchInput.value);
  });

  batchInput.addEventListener("change", () => {
    localStorage.setItem("lastBatch", batchInput.value);
  });

  loadRecentBatches();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hide(alertSuccess);
    hide(alertError);
    setFieldError("items", "");

    const data = {
      name: document.getElementById("name").value.trim(),
      batch: batchInput.value.trim(),
      notes: (notesInput?.value || "").trim(),
      items: Array.from(itemsContainer.children)
        .map((row) => ({
          jenisJamu: row.querySelector(".jenis").value,
          ukuran: row.querySelector(".ukuran").value,
          option: row.querySelector(".option").value,
          qty: Number(row.querySelector(".qty").value || 0),
        }))
        .filter((x) => x.jenisJamu || x.ukuran || x.option || x.qty > 0),
    };

    const headerValid = validateHeader(data);
    const itemsError = validateItems(data.items);
    if (!headerValid || itemsError) {
      if (itemsError) setFieldError("items", itemsError);
      show(alertError, "Mohon perbaiki input yang salah.");
      return;
    }

    // Tampilkan konfirmasi dengan ringkasan order
    if (!confirm(formatOrderSummary(data))) {
      return; // Batal jika user klik Cancel
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Menyimpan...";
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menyimpan");
      show(alertSuccess, json.message || "Berhasil disimpan");
      form.reset();
      itemsContainer.innerHTML = "";
      itemsContainer.appendChild(createItemRow(0));
      setFieldError("name", "");
      setFieldError("batch", "");
      setFieldError("items", "");
      // Beritahu tab lain untuk refresh (summary dll)
      localStorage.setItem("orderUpdated", new Date().toISOString());
    } catch (err) {
      show(alertError, err.message || "Terjadi kesalahan.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Simpan Order";
    }
  });
});