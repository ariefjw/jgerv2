// =====================================================
// 🧠 Utility: Refresh Stock Summary
// =====================================================
async function refreshStockSummary() {
  try {
    const res = await fetch("/api/stock");
    const data = await res.json();
    if (data.stocks && document.querySelector("#totalStock")) {
      document.querySelector("#totalStock").textContent = data.stocks.reduce((a, b) => a + b.qty, 0);
    }
  } catch (err) {
    console.error("Gagal refresh stok:", err);
  }
}

// =====================================================
// 🧠 Utility: Tentukan status berikutnya
// =====================================================
function getNextStatus(currentStatus) {
  const nextOptions = {
    proses: "packing",
    packing: "scheduled",
    scheduled: "delivered",
    delivered: "paid",
    paid: null,
  };
  return nextOptions[currentStatus] || null;
}

// =====================================================
// 🚀 DOM Ready
// =====================================================
window.addEventListener("DOMContentLoaded", () => {
  // =====================================================
  // 🧩 Bagian 1: FORM ORDER (Halaman Tambah/Edit Order)
  // =====================================================
  const orderForm = document.getElementById("orderForm");
  if (orderForm) {
    const form = orderForm;
    const submitBtn = document.getElementById("submitBtn");
    const alertSuccess = document.getElementById("alertSuccess");
    const alertError = document.getElementById("alertError");
    const itemsContainer = document.getElementById("itemsContainer");
    const addItemBtn = document.getElementById("addItemBtn");
    const generateBatchBtn = document.getElementById("generateBatchBtn");
    const batchInput = document.getElementById("batch");
    const notesInput = document.getElementById("notes");

    // Load edit mode jika ada data edit
    const isEditMode = loadEditData();
    if (isEditMode) {
      loadEditOrderData();
    } else {
      const lastBatch = localStorage.getItem("lastBatch");
      if (lastBatch) batchInput.value = lastBatch;
    }

    // Tambah satu baris item default
    if (itemsContainer && itemsContainer.children.length === 0) {
      itemsContainer.appendChild(createItemRow(0));
    }

    addItemBtn?.addEventListener("click", () => {
      itemsContainer.appendChild(createItemRow(itemsContainer.children.length));
    });

    generateBatchBtn?.addEventListener("click", () => {
      batchInput.value = formatBatchWeekOfMonth();
      localStorage.setItem("lastBatch", batchInput.value);
    });

    batchInput?.addEventListener("change", () => {
      localStorage.setItem("lastBatch", batchInput.value);
    });

    loadRecentBatches?.();

    // Submit handler
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

      const isEditMode = loadEditData();
      const confirmMessage = isEditMode
        ? `Update order ${data.name}?`
        : formatOrderSummary(data);

      if (!confirm(confirmMessage)) return;

      submitBtn.disabled = true;
      submitBtn.textContent = isEditMode ? "Mengupdate..." : "Menyimpan...";

      try {
        let result;
        if (isEditMode) {
          result = await submitEditOrder(data);
        } else {
          const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          result = await res.json();
          if (!res.ok) throw new Error(result.message || "Gagal menyimpan");
        }

        show(
          alertSuccess,
          result.message || (isEditMode ? "Berhasil diupdate" : "Berhasil disimpan")
        );
        form.reset();
        itemsContainer.innerHTML = "";
        itemsContainer.appendChild(createItemRow(0));

        if (isEditMode) {
          clearEditData();
          submitBtn.textContent = "Simpan Order";
          submitBtn.style.background = "";
        }

        // Notifikasi antar-tab
        localStorage.setItem("orderUpdated", new Date().toISOString());
      } catch (err) {
        show(alertError, err.message || "Terjadi kesalahan.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isEditMode ? "Update Order" : "Simpan Order";
      }
    });
  }

  // =====================================================
  // 🧩 Bagian 2: UPDATE STATUS LANGSUNG (Desktop & Mobile)
  // =====================================================
  function getNextOptions(currentStatus) {
  const options = {
    proses: ["packing"],
    packing: ["scheduled", "delivered"],
    scheduled: ["delivered"],
    delivered: ["paid"],
    paid: [],
  };
  return options[currentStatus] || [];
}

// Delegasi klik agar tetap jalan meski tombol muncul belakangan
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn-status, .mobile-btn-status");
  if (!btn) return;

  const orderId = btn.dataset.id;
  const currentStatus = btn.dataset.status;
  const nextOptions = getNextOptions(currentStatus);

  // Mode mobile (<=768px)
  const isMobile = window.innerWidth <= 768;

  // ==============================
  // 📱 MOBILE MODE: Tampilkan <select>
  // ==============================
  if (isMobile) {
    // Jangan buat select kalau sudah ada
    if (btn.nextElementSibling?.classList.contains("statusSelect")) return;

    if (nextOptions.length === 0) {
      alert("Status sudah final dan tidak bisa diubah lagi.");
      return;
    }

    const select = document.createElement("select");
    select.className = "statusSelect";
    select.innerHTML = `
      <option value="">Pilih status...</option>
      ${nextOptions.map((s) => `<option value="${s}">${s}</option>`).join("")}
    `;

    btn.insertAdjacentElement("afterend", select);

    select.addEventListener("change", async () => {
      const selectedStatus = select.value;
      if (!selectedStatus) return;

      if (!confirm(`Ubah status dari ${currentStatus} → ${selectedStatus}?`))
        return;

      select.disabled = true;

      try {
        const res = await fetch("/api/orders/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: orderId, status: selectedStatus }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.message);

        alert(result.message);
        btn.textContent = selectedStatus;
        btn.dataset.status = selectedStatus;
        select.remove();

        if (selectedStatus === "packing") refreshStockSummary();
        localStorage.setItem("orderUpdated", new Date().toISOString());
      } catch (err) {
        alert("Gagal update status: " + err.message);
        select.disabled = false;
      }
    });
    return;
  }

  // ==============================
  // 💻 DESKTOP MODE: Update langsung
  // ==============================
  const nextStatus = nextOptions[0];
  if (!nextStatus) {
    alert("Status sudah final dan tidak bisa diubah lagi.");
    return;
  }

  if (!confirm(`Ubah status dari ${currentStatus} → ${nextStatus}?`)) return;

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Updating...";

  try {
    const res = await fetch("/api/orders/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, status: nextStatus }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message);

    alert(result.message);
    btn.textContent = nextStatus;
    btn.dataset.status = nextStatus;

    if (nextStatus === "packing") refreshStockSummary();
    localStorage.setItem("orderUpdated", new Date().toISOString());
  } catch (err) {
    alert("Gagal update status: " + err.message);
    btn.textContent = originalText;
  } finally {
    btn.disabled = false;
  }
});

  // =====================================================
  // 🧩 Sinkronisasi Stok Antar-Tab
  // =====================================================
  window.addEventListener("storage", (e) => {
    if (e.key === "orderUpdated") {
      refreshStockSummary();
    }
  });
});
