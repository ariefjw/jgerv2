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
      <div class="details">${stock.ukuran} • ${stock.option}</div>
      <div class="stock-info">
        <span class="stock-qty">${stock.qty} botol</span>
        <span class="badge ${status.class}">${status.text}</span>
      </div>
    </div>
  `;
}

// Stock loading function
async function loadStocks() {
  try {
    const res = await fetch("/api/stock");
    const json = await res.json();
    if (!res.ok)
      throw new Error(json.message || "Gagal memuat data stok");

    // Kelompokkan stok berdasarkan jenis jamu
    const grouped = json.stocks.reduce((acc, stock) => {
      if (!acc[stock.jenisJamu]) acc[stock.jenisJamu] = [];
      acc[stock.jenisJamu].push(stock);
      return acc;
    }, {});

    // Update ringkasan stok
    const totalProducts = json.stocks.length;
    const totalStock = json.stocks.reduce((sum, stock) => sum + stock.qty, 0);

    document.getElementById("totalProducts").textContent = totalProducts;
    document.getElementById("totalStock").textContent = totalStock;

    // Render groups
    const stockGroups = document.getElementById("stockGroups");
    stockGroups.innerHTML = Object.entries(grouped)
      .map(([jenis, stocks]) => `
        <div class="stock-group">
          <h3>${jenis}</h3>
          <div class="stock-grid">
            ${stocks.map(formatStockCard).join("")}
          </div>
        </div>
      `)
      .join("");

  } catch (err) {
    const alertError = document.getElementById("alertError");
    show(alertError, err.message);
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
});