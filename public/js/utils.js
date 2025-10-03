// Konfigurasi opsi agar mudah diubah
const CONFIG = {
  jenisJamu: [
    { value: "", label: "Pilih jenis" },
    { value: "kunyit asam", label: "Kunyit Asam" },
    { value: "beras kencur", label: "Beras Kencur" },
  ],
  ukuran: [
    { value: "", label: "Pilih ukuran" },
    { value: "250ml", label: "250ml" },
    { value: "600ml", label: "600ml" },
    { value: "1L", label: "1L" },
  ],
  option: [
    { value: "", label: "Pilih option" },
    { value: "less", label: "Less" },
    { value: "normal", label: "Normal" },
  ],
};

// Utility functions
function mountOptions(selectEl, options) {
  selectEl.innerHTML = "";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    selectEl.appendChild(o);
  }
}

function show(el, msg) {
  el.textContent = msg;
  el.style.display = "block";
}

function hide(el) {
  el.style.display = "none";
  el.textContent = "";
}

function setFieldError(id, message) {
  const el = document.getElementById(`error-${id}`);
  if (el) {
    if (message) {
      el.textContent = message;
      el.style.display = "block";
    } else {
      el.textContent = "";
      el.style.display = "none";
    }
  }
}

function validateHeader(formData) {
  let valid = true;
  if (!formData.name || formData.name.length < 2) {
    setFieldError("name", "Nama minimal 2 karakter.");
    valid = false;
  } else setFieldError("name", "");
  if (!formData.batch) {
    setFieldError("batch", "Batch wajib diisi.");
    valid = false;
  } else setFieldError("batch", "");
  return valid;
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return "Minimal 1 item.";
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it.jenisJamu) return `Item ${i + 1}: jenis jamu wajib.`;
    if (!it.ukuran) return `Item ${i + 1}: ukuran wajib.`;
    if (!it.option) return `Item ${i + 1}: option wajib.`;
    const qty = Number(it.qty);
    if (!Number.isFinite(qty) || qty <= 0)
      return `Item ${i + 1}: jumlah harus > 0.`;
  }
  return "";
}

function createItemRow(idx) {
  const row = document.createElement("div");
  row.className = "item-row";
  row.innerHTML = `
    <div class="col">
      <label>Jenis Jamu</label>
      <select class="jenis"></select>
    </div>
    <div class="col">
      <label>Ukuran</label>
      <select class="ukuran"></select>
    </div>
    <div class="col">
      <label>Option</label>
      <select class="option"></select>
    </div>
    <div class="col">
      <label>Jumlah</label>
      <input type="number" class="qty-input qty" min="1" value="1" style="width: 80px" />
    </div>
    <div>
      <button type="button" class="inline remove-btn">🗑️<span>Hapus</span></button>
    </div>
  `;
  const jenisEl = row.querySelector(".jenis");
  const ukuranEl = row.querySelector(".ukuran");
  const optionEl = row.querySelector(".option");
  mountOptions(jenisEl, CONFIG.jenisJamu);
  mountOptions(ukuranEl, CONFIG.ukuran);
  mountOptions(optionEl, CONFIG.option);
  row.querySelector(".remove-btn").addEventListener("click", () => {
    row.remove();
  });
  return row;
}

function formatBatchWeekOfMonth(d = new Date()) {
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const dayOfWeekFirst = (firstOfMonth.getDay() + 6) % 7;
  const dayOfMonth = d.getDate();
  const offset = dayOfWeekFirst;
  const weekIndex = Math.floor((offset + dayOfMonth - 1) / 7) + 1;
  const yyyy = year;
  const mm = String(month + 1).padStart(2, "0");
  return `B-${yyyy}-${mm}-W${weekIndex}`;
}

async function loadRecentBatches() {
  try {
    const res = await fetch("/api/batches");
    const json = await res.json();
    if (res.ok && Array.isArray(json.batches)) {
      const dl = document.getElementById("recentBatches");
      if (dl) {
        dl.innerHTML = "";
        json.batches.forEach((b) => {
          const opt = document.createElement("option");
          opt.value = b;
          dl.appendChild(opt);
        });
      }
    }
  } catch (error) {
    console.error("Error loading batches:", error);
  }
}

function formatOrderSummary(data) {
  const items = data.items
    .map((item) => {
      const jenisJamu =
        CONFIG.jenisJamu.find((j) => j.value === item.jenisJamu)?.label ||
        item.jenisJamu;
      const ukuran =
        CONFIG.ukuran.find((u) => u.value === item.ukuran)?.label ||
        item.ukuran;
      const option =
        CONFIG.option.find((o) => o.value === item.option)?.label ||
        item.option;
      return `${item.qty}x ${jenisJamu} ${ukuran} (${option})`;
    })
    .join("\\n");

  return `Konfirmasi Order\n
Nama: ${data.name}
Batch: ${data.batch}
Catatan: ${data.notes ? data.notes : "-"}
\nItem pesanan:\n${items}\n
Lanjutkan menyimpan order?`;
}

// Function untuk load data edit ketika kembali ke halaman input
function loadEditData() {
  const editData = localStorage.getItem('editOrderData');
  if (editData) {
    return JSON.parse(editData);
  }
  return null;
}

// Function untuk clear data edit setelah digunakan
function clearEditData() {
  localStorage.removeItem('editOrderData');
}

// Export functions untuk digunakan di file lain
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFIG,
    mountOptions,
    show,
    hide,
    setFieldError,
    validateHeader,
    validateItems,
    createItemRow,
    formatBatchWeekOfMonth,
    loadRecentBatches,
    formatOrderSummary,
    loadEditData,
    clearEditData
  };
}