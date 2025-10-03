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