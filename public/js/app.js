//Utility: Refresh Stock Summary
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

// Utility: Status Transition Options
function showStatusOptions(currentStatus) {
  const nextOptions = {
    proses: ['packing'],
    packing: ['scheduled', 'delivered'],
    scheduled: ['delivered'],
    delivered: ['paid'],
    paid: []
  };
  const container = document.querySelector('.mobile-status-options');
  const opts = nextOptions[currentStatus] || [];
  if (!container) return;
  container.innerHTML = opts.length
    ? opts.map(s => `<div class="mobile-status-option" data-status="${s}">${s}</div>`).join('')
    : '<p class="text-center text-gray-500">Tidak ada status lanjutan</p>';
}

// DOM Ready
window.addEventListener("DOMContentLoaded", () => {
  //Bagian 1: FORM ORDER (Halaman Tambah/Edit Order)
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
      const confirmMessage = isEditMode ?
        `Update order ${data.name}?` :
        formatOrderSummary(data);

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

        show(alertSuccess, result.message || (isEditMode ? "Berhasil diupdate" : "Berhasil disimpan"));
        form.reset();
        itemsContainer.innerHTML = "";
        itemsContainer.appendChild(createItemRow(0));

        if (isEditMode) {
          clearEditData();
          submitBtn.textContent = "Simpan Order";
          submitBtn.style.background = '';
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

  //Bagian 2: MOBILE STATUS MODAL (Halaman Summary)
  const modal = document.querySelector('.mobile-status-modal');
  if (modal) {
    const confirmBtn = document.querySelector('.mobile-modal-confirm');
    const cancelBtn = document.querySelector('.mobile-modal-cancel');
    let selectedStatus = null;
    let currentOrderId = null;

    // Klik tombol status (btn-status)
    document.querySelectorAll('.btn-status').forEach(btn => {
      btn.addEventListener('click', () => {
        currentOrderId = btn.dataset.id;
        const currentStatus = btn.dataset.status;
        showStatusOptions(currentStatus);
        modal.style.display = 'flex';
      });
    });

    // Pilih status
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('mobile-status-option')) {
        document.querySelectorAll('.mobile-status-option').forEach(o => o.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedStatus = e.target.dataset.status;
      }
    });

    // Konfirmasi update
    confirmBtn.addEventListener('click', async () => {
      if (!selectedStatus) return alert("Pilih status terlebih dahulu.");
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Updating...";

      try {
        const res = await fetch("/api/orders/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: currentOrderId, status: selectedStatus }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.message);

        modal.style.display = 'none';
        alert(result.message);
        if (result.newStatus === 'packing') refreshStockSummary();
        localStorage.setItem("orderUpdated", new Date().toISOString());
      } catch (err) {
        alert("Gagal update status: " + err.message);
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Konfirmasi";
      }
    });

    cancelBtn.addEventListener('click', () => (modal.style.display = 'none'));
  }

  //Sinkronisasi Stok Antar-Tab
  window.addEventListener("storage", (e) => {
    if (e.key === "orderUpdated") {
      refreshStockSummary();
    }
  });
});
