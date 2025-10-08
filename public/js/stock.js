// Utility functions
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

function getStatusInfo(qty) {
  if (qty > 10) return { text: "Cukup", class: "success" };
  if (qty > 0) return { text: "Menipis", class: "warning" };
  return { text: "Habis", class: "error" };
}

function formatStockCard(stock) {
  const status = getStatusInfo(stock.qty);
  return `
    <div class="stock-card">
      <div class="title">${stock.jenisJamu}</div>
      <div class="details">${stock.ukuran}</div>
      <div class="stock-info">
        <span class="stock-qty">${stock.qty} ${stock.option}</span>
        <span class="badge ${status.class}">${status.text}</span>
      </div>
    </div>
  `;
}

// Function to load stock history
async function loadStockHistory() {
  try {
    const res = await fetch("/api/stock/history");
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Gagal memuat history stok");

    renderStockHistory(json.history);
  } catch (err) {
    console.error("Error loading stock history:", err);
    const stockHistory = document.getElementById("stockHistory");
    if (stockHistory) {
      stockHistory.innerHTML = '<p class="no-data">Gagal memuat history stok</p>';
    }
  }
}

// Function to render stock history
function renderStockHistory(history) {
  const container = document.getElementById("stockHistory");
  if (!container) return;

  if (!Array.isArray(history) || history.length === 0) {
    container.innerHTML = '<p class="no-data">Belum ada history input stok</p>';
    return;
  }

  const historyHTML = history.map(record => `
    <div class="history-card">
      <div class="history-header">
        <div class="history-action ${record.action === 'add' ? 'add' : 'reduce'}">
          ${record.action === 'add' ? '➕ Tambah' : '➖ Kurangi'}
        </div>
        <div class="history-date">${formatHistoryDate(record.createdAt)}</div>
      </div>
      <div class="history-content">
        <div class="history-product">
          <span class="product-name">${record.jenisJamu}</span>
          <span class="product-details">${record.ukuran} • ${record.option}</span>
        </div>
        <div class="history-qty ${record.action === 'add' ? 'positive' : 'negative'}">
          ${record.action === 'add' ? '+' : '-'}${record.qty}
        </div>
      </div>
      ${record.notes ? `
        <div class="history-notes">
          <strong>Catatan:</strong> ${record.notes}
        </div>
      ` : ''}
    </div>
  `).join('');

  container.innerHTML = historyHTML;
}

// Function to format history date
function formatHistoryDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit yang lalu`;
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return `${diffDays} hari yang lalu`;
  
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Stock loading function
async function loadStocks() {
  try {
    const res = await fetch("/api/stock");
    const json = await res.json();
    if (!res.ok)
      throw new Error(json.message || "Gagal memuat data stok");

    // Update ringkasan stok
    const totalProducts = json.stocks.length;
    const totalStock = json.stocks.reduce((sum, stock) => sum + stock.qty, 0);

    const totalProductsEl = document.getElementById("totalProducts");
    const totalStockEl = document.getElementById("totalStock");
    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    if (totalStockEl) totalStockEl.textContent = totalStock;

    // Render stock summary cards (mirroring sizeSummary style)
    renderStockSummary(json.stocks);
    
    // Load stock history
    loadStockHistory();

  } catch (err) {
    const alertError = document.getElementById("alertError");
    show(alertError, err.message);
  }
}

// Render stock summary grouped per row by jenisJamu, with cards per ukuran • option
function renderStockSummary(stocks) {
  const stockSummary = document.getElementById("stockSummary");
  const sizeCards = document.querySelector("#stockSummary .size-cards");
  if (!stockSummary || !sizeCards) return;

  // Hitung total per kombinasi jenisJamu|ukuran|option
  const comboTotals = {};
  stocks.forEach((s) => {
    const key = `${s.jenisJamu}|${s.ukuran}|${s.option}`;
    const qty = parseInt(s.qty) || 0;
    comboTotals[key] = (comboTotals[key] || 0) + qty;
  });

  // Kelompokkan ke dalam baris per jenisJamu
  const jenisToCombos = {};
  Object.entries(comboTotals).forEach(([key, total]) => {
    const [jenisJamu, ukuran, option] = key.split("|");
    if (!jenisToCombos[jenisJamu]) jenisToCombos[jenisJamu] = [];
    jenisToCombos[jenisJamu].push({ ukuran, option, total });
  });

  // Kosongkan container
  sizeCards.innerHTML = "";

  // Sort jenisJamu: Kunyit Asam first, then Beras Kencur
  const sortedJenis = Object.entries(jenisToCombos).sort(([a], [b]) => {
    if (a === "kunyit asam") return -1;
    if (b === "kunyit asam") return 1;
    if (a === "beras kencur") return -1;
    if (b === "beras kencur") return 1;
    return a.localeCompare(b);
  });

  // Render satu baris per jenisJamu
  sortedJenis.forEach(([jenisJamu, combos]) => {
    const row = document.createElement("div");
    row.className = "size-row";

    const title = document.createElement("div");
    title.className = "size-row-title";
    title.textContent = jenisJamu;
    row.appendChild(title);

    const rowCards = document.createElement("div");
    rowCards.className = "size-row-cards";

    combos.forEach(({ ukuran, option, total }) => {
      const card = document.createElement("div");
      card.className = "size-card";
      card.innerHTML = `
        <div class="size-label">${ukuran}</div>
        <div class="size-unit">${option}</div>
        <div class="size-total">${total}</div>
        
      `;
      rowCards.appendChild(card);
    });

    row.appendChild(rowCards);
    sizeCards.appendChild(row);
  });

  // Tampilkan/hidden summary
  if (Object.keys(jenisToCombos).length > 0) {
    stockSummary.classList.remove("hidden");
  } else {
    stockSummary.classList.add("hidden");
  }
}

// Quick stock action function
async function quickStockAction(jenisJamu, ukuran, option, action) {
  const actionText = action === 'reduce' ? 'mengurangi' : 'menambah';
  const alertSuccess = document.getElementById("alertSuccess");
  const alertError = document.getElementById("alertError");
  
  if (!confirm(`Yakin ${actionText} 1 stok ${jenisJamu} ${ukuran} ${option}?`)) {
    return;
  }

  try {
    const endpoint = action === 'reduce' ? '/api/stock/reduce' : '/api/stock/add';
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jenisJamu,
        ukuran,
        option,
        qty: 1,
        notes: `Aksi cepat: ${actionText} stok`
      }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    const successText = action === 'reduce' ? 'berhasil dikurangi 1' : 'berhasil ditambah 1';
    show(alertSuccess, `Stok ${successText}`);
    loadStocks();
    loadStockHistory();
  } catch (err) {
    show(alertError, err.message);
  }
}

// Initialize stock page
window.addEventListener("DOMContentLoaded", () => {
  const stockForm = document.getElementById("stockForm");
  const alertSuccess = document.getElementById("alertSuccess");
  const alertError = document.getElementById("alertError");

  // Form kelola stok
  stockForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hide(alertSuccess);
    hide(alertError);

    const formData = new FormData(stockForm);
    const data = Object.fromEntries(formData.entries());
    const action = e.submitter?.value || 'add';

    // Validasi
    let valid = true;
    if (!data.jenisJamu) {
      setFieldError("jenisJamu", "Pilih jenis jamu");
      valid = false;
    }
    if (!data.ukuran) {
      setFieldError("ukuran", "Pilih ukuran");
      valid = false;
    }
    if (!data.qty || data.qty < 1) {
      setFieldError("qty", "Jumlah harus > 0");
      valid = false;
    }

    if (!valid) return;

    // Tentukan endpoint dan teks konfirmasi berdasarkan action
    const endpoint = action === 'reduce' ? '/api/stock/reduce' : '/api/stock/add';
    const actionText = action === 'reduce' ? 'mengurangi' : 'menambah';
    const successText = action === 'reduce' ? 'berhasil dikurangi' : 'berhasil ditambahkan';

    // Konfirmasi
    if (!confirm(`Yakin ${actionText} stok ${data.jenisJamu} ${data.ukuran} ${data.option} sebanyak ${data.qty}?`)) {
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message);

      show(alertSuccess, `Stok ${successText}`);
      stockForm.reset();
      loadStocks();
      loadStockHistory();
    } catch (err) {
      show(alertError, err.message);
    }
  });

  // Load initial data
  loadStocks();

  // Listen untuk event dari halaman lain
  window.addEventListener("storage", (e) => {
    if (e.key === "orderUpdated" && e.newValue) {
      // Reload stock ketika ada update order
      loadStocks();
    }
  });

  loadStocks();
  loadStockHistory();
});