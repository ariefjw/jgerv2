// Function to load edit data into form
function loadEditOrderData() {
  const editData = loadEditData();
  if (!editData) return false;

  // Isi form dengan data edit
  document.getElementById('name').value = editData.customerName;
  document.getElementById('batch').value = editData.batch;
  document.getElementById('notes').value = editData.notes.join('\n');
  
  // Clear existing items
  const itemsContainer = document.getElementById('itemsContainer');
  itemsContainer.innerHTML = '';
  
  // Add items from edit data
  editData.items.forEach((item, index) => {
    const itemRow = createItemRow(index);
    
    // Set values for this item
    setTimeout(() => {
      const jenisEl = itemRow.querySelector('.jenis');
      const ukuranEl = itemRow.querySelector('.ukuran');
      const optionEl = itemRow.querySelector('.option');
      const qtyEl = itemRow.querySelector('.qty');
      
      if (jenisEl) jenisEl.value = item.jenisJamu;
      if (ukuranEl) ukuranEl.value = item.ukuran;
      if (optionEl) optionEl.value = item.option;
      if (qtyEl) qtyEl.value = item.qty;
    }, 0);
    
    itemsContainer.appendChild(itemRow);
  });

  // Show edit mode notification
  const alertSuccess = document.getElementById('alertSuccess');
  show(alertSuccess, `Edit mode: Order ${editData.customerName}. Pastikan untuk menyimpan perubahan.`);
  
  // Change submit button text
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.textContent = 'Update Order';
    submitBtn.style.background = '#8b5cf6';
  }

  return true;
}

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
  container.innerHTML = opts.length
    ? opts.map(s => `<div class="mobile-status-option" data-status="${s}">${s}</div>`).join('')
    : '<p class="text-center text-gray-500">Tidak ada status lanjutan</p>';
}

async function refreshStockSummary() {
  try {
    const res = await fetch("/api/stock");
    const data = await res.json();
    if (data.stocks) {
      document.querySelector("#totalStock").textContent = data.stocks.reduce((a, b) => a + b.qty, 0);
      // Update elemen lainnya sesuai HTML-mu
    }
  } catch (err) {
    console.error("Gagal refresh stok:", err);
  }
}


// Function to handle edit order submission
async function submitEditOrder(formData) {
  try {
    const editData = loadEditData();
    if (!editData) {
      throw new Error('Data edit tidak ditemukan');
    }

    // Kirim request edit ke endpoint khusus
    const res = await fetch("/api/orders/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editData.customerName,
        batch: editData.batch,
        items: formData.items,
        notes: formData.notes
      }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Gagal mengupdate order");
    
    // Clear edit data
    clearEditData();
    
    return json;
  } catch (err) {
    throw err;
  }
}

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
  const modal = document.querySelector('.mobile-status-modal');
  const confirmBtn = document.querySelector('.mobile-modal-confirm');
  const cancelBtn = document.querySelector('.mobile-modal-cancel');
  let selectedStatus = null;
  let currentOrderId = null;

  document.querySelectorAll('.btn-status').forEach(btn => {
    btn.addEventListener('click', () => {
      currentOrderId = btn.dataset.id;
      const currentStatus = btn.dataset.status;
      showStatusOptions(currentStatus); // tampilkan hanya opsi yang valid
      modal.style.display = 'flex';
    });
  });

  // Event listener untuk memilih status
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('mobile-status-option')) {
      document.querySelectorAll('.mobile-status-option').forEach(o => o.classList.remove('selected'));
      e.target.classList.add('selected');
      selectedStatus = e.target.dataset.status;
    }
  });

  // Konfirmasi update status
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
      refreshStockSummary(); // update stok otomatis
      alert(result.message);
    } catch (err) {
      alert("Gagal update status: " + err.message);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Konfirmasi";
    }
  });

  cancelBtn.addEventListener('click', () => (modal.style.display = 'none'));

  // Cek apakah ada data edit
  const isEditMode = loadEditData();
  if (isEditMode) {
    loadEditOrderData();
  } else {
    // Restore last batch hanya jika tidak dalam mode edit
    const lastBatch = localStorage.getItem("lastBatch");
    if (lastBatch) batchInput.value = lastBatch;
  }

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

    // Cek apakah dalam mode edit
    const isEditMode = loadEditData();
    const confirmMessage = isEditMode ? 
      `Update order ${data.name}?` : 
      formatOrderSummary(data);

    if (!confirm(confirmMessage)) {
      return;
    }

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
      setFieldError("name", "");
      setFieldError("batch", "");
      setFieldError("items", "");
      
      // Reset submit button jika dalam mode edit
      if (isEditMode) {
        clearEditData();
        submitBtn.textContent = "Simpan Order";
        submitBtn.style.background = '';
      }
      
      // Beritahu tab lain untuk refresh
      localStorage.setItem("orderUpdated", new Date().toISOString());
    } catch (err) {
      show(alertError, err.message || "Terjadi kesalahan.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isEditMode ? "Update Order" : "Simpan Order";
    }
  });
});