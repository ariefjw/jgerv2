// Utility functions
function hide(el) {
  el.style.display = "none";
  el.textContent = "";
}

function show(el, msg) {
  el.textContent = msg;
  el.style.display = "block";
}

function formatCurrency(n) {
  return new Intl.NumberFormat("id-ID").format(n);
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
    if (res.ok) {
      const dl = document.getElementById("recentBatches");
      dl.innerHTML = "";
      json.batches.forEach((b) => {
        const o = document.createElement("option");
        o.value = b;
        dl.appendChild(o);
      });
    }
  } catch {}
}

// Size summary rendering
function renderSizeSummary(rows) {
  console.log("renderSizeSummary called with:", rows);
  const sizeSummary = document.getElementById("sizeSummary");
  const sizeCards = document.querySelector(".size-cards");
  
  console.log("sizeSummary element:", sizeSummary);
  console.log("sizeCards element:", sizeCards);
  
  // Hitung total per ukuran
  const sizeTotals = {};
  rows.forEach(row => {
    const ukuran = row.ukuran;
    const qty = parseInt(row.qty) || 0;
    sizeTotals[ukuran] = (sizeTotals[ukuran] || 0) + qty;
  });

  console.log("sizeTotals:", sizeTotals);

  // Kosongkan cards
  sizeCards.innerHTML = "";

  // Buat card untuk setiap ukuran
  Object.entries(sizeTotals).forEach(([ukuran, total]) => {
    const card = document.createElement("div");
    card.className = "size-card";
    card.innerHTML = `
      <div class="size-label">${ukuran}</div>
      <div class="size-total">${total}</div>
      <div class="size-unit">botol</div>
    `;
    sizeCards.appendChild(card);
    console.log("Added card for:", ukuran, total);
  });

  // Tampilkan summary jika ada data
  if (Object.keys(sizeTotals).length > 0) {
    sizeSummary.classList.remove("hidden");
    console.log("Size summary shown");
  } else {
    sizeSummary.classList.add("hidden");
    console.log("Size summary hidden");
  }
}

// Summary rendering
function renderSummary(json) {
  const summaryTbody = document.querySelector("#summaryTable tbody");
  summaryTbody.innerHTML = "";
  json.rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Jenis Jamu">${r.jenisJamu}</td>
      <td data-label="Ukuran">${r.ukuran}</td>
      <td data-label="Option">${r.option}</td>
      <td data-label="Jumlah">${r.qty}</td>
    `;
    summaryTbody.appendChild(tr);
  });
  document.getElementById("summaryTable").style.display = "table";

  // Render size summary
  renderSizeSummary(json.rows);
}

// Customers rendering
function renderCustomers(json2) {
  const customersTbody = document.querySelector("#customersTable tbody");
  if (!customersTbody) return; // Guard clause untuk mencegah error

  customersTbody.innerHTML = "";
  json2.customers.forEach((c) => {
    const tr = document.createElement("tr");
    const rawStatus = (c.status || "proses").toLowerCase();
    const normalizeStatus = (s) => {
      const v = String(s || "").toLowerCase().trim();
      if (["proses", "process"].includes(v)) return "proses";
      if (["packing", "pack"].includes(v)) return "packing";
      if (["scheduled", "dijadwalkan", "schedule"].includes(v)) return "scheduled";
      if (["delivered", "dikirim", "kirim"].includes(v)) return "delivered";
      if (["paid", "terbayar", "lunas", "bayar"].includes(v)) return "paid";
      return v || "proses";
    };
    const status = normalizeStatus(rawStatus);
    const statusBadgeClass =
      status === "paid" ? "success" : status === "delivered" ? "warning" : "gray";

    let statusOptions = "";
    if (status === "proses") {
      statusOptions = `
        <option value="proses" selected>Proses</option>
        <option value="packing">Packing</option>
      `;
    } else if (status === "packing") {
      statusOptions = `
        <option value="packing" selected>Packing</option>
        <option value="scheduled">Scheduled</option>
      `;
    } else if (status === "scheduled") {
      statusOptions = `
        <option value="scheduled" selected>Scheduled</option>
        <option value="delivered">Delivered</option>
      `;
    } else if (status === "delivered") {
      statusOptions = `
        <option value="delivered" selected>Delivered</option>
        <option value="paid">Paid</option>
      `;
    } else if (status === "paid") {
      statusOptions = `
        <option value="paid" selected>Paid</option>
      `;
    }

    const noteText = Array.isArray(c.notes) ? c.notes.join("\\n") : (c.notes || "");
    tr.innerHTML = `
      <td data-label="Customer">${c.name}</td>
      <td data-label="Total Botol">${c.totalQty}</td>
      <td data-label="Total Tagihan">Rp ${formatCurrency(c.totalAmount)}</td>
      <td data-label="Status">
        <div class="status-container">
          <select class="statusSelect" data-name="${c.name}" ${
      status === "paid" ? "disabled" : ""
    }>
            ${statusOptions}
          </select>
          <span class="badge ${statusBadgeClass}">${status}</span>
        </div>
      </td>
      <td data-label="Aksi">
        <div style="display: flex; gap: 4px;">
          <button type="button" class="inline toggle" data-name="${
            c.name
          }">Lihat</button>
          <button type="button" class="inline edit-btn" data-name="${
            c.name
          }" data-items='${JSON.stringify(c.items)}' data-notes='${JSON.stringify(noteText)}'>Edit</button>
        </div>
      </td>`;
    customersTbody.appendChild(tr);

    // details row
    const detailRow = document.createElement("tr");
    detailRow.className = "details";
    detailRow.style.display = "none";
    const detailCell = document.createElement("td");
    detailCell.colSpan = 5;
    detailCell.innerHTML = `
      <div style="margin: 10px 0; width: 100%;">
          <!-- Tabel untuk desktop/tablet -->
          <table class="detail-table">
              <thead>
                  <tr>
                      <th>Jenis Jamu</th>
                      <th>Ukuran</th>
                      <th>Option</th>
                      <th>Jumlah</th>
                  </tr>
              </thead>
              <tbody>
                  ${c.items
                      .map(
                          (it) => `
                      <tr>
                          <td>${it.jenisJamu}</td>
                          <td>${it.ukuran}</td>
                          <td>${it.option}</td>
                          <td>${it.qty}</td>
                      </tr>
                  `
                      )
                      .join("")}
              </tbody>
          </table>

          ${Array.isArray(c.notes) && c.notes.length ? `
          <div class="order-notes" style="margin-top: 10px;">
            <div style="font-weight:600; margin-bottom:6px;">Catatan</div>
            <div style="white-space: pre-wrap;">${c.notes.join("\n")}</div>
          </div>
          ` : ""}

          <!-- Cards untuk mobile -->
          <div class="product-cards">
              ${c.items
                  .map(
                      (it) => `
                  <div class="product-card">
                      <div class="product-info">
                          <div class="product-name">${it.jenisJamu}</div>
                          <div class="product-details">
                              <span class="detail-tag">${it.ukuran}</span>
                              <span class="detail-tag">${it.option}</span>
                          </div>
                      </div>
                      <div class="product-quantity">
                          <span class="quantity-label">Jumlah</span>
                          <span class="quantity-value">${it.qty}</span>
                      </div>
                  </div>
              `
                  )
                  .join("")}
          </div>
      </div>
  `;
    detailRow.appendChild(detailCell);
    customersTbody.appendChild(detailRow);
  });
  document.getElementById("customersTable").style.display = "table";

  setupEventHandlers();
}

// Event handlers setup
function setupEventHandlers() {
  // hook status selects
  document.querySelectorAll(".statusSelect").forEach((select) => {
    const existing = select.getAttribute("data-initialized");
    if (existing) return; // Prevent duplicate handlers

    select.setAttribute("data-initialized", "true");
    select.addEventListener("change", async (e) => {
      const name = e.target.getAttribute("data-name");
      const status = e.target.value;
      const row = e.target.closest("tr");
      const statusBadge = row.querySelector(".badge");

      try {
        const response = await fetch("/api/summary/customers/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batch: currentBatch, name, status }),
        });

        if (response.ok) {
          const statusBadgeClass =
            status === "paid" ? "success" : status === "delivered" ? "warning" : "gray";

          statusBadge.className = `badge ${statusBadgeClass}`;
          statusBadge.textContent = status;

          // Invalidate cache and reload
          localStorage.removeItem("summaryData");
          loadSummary(currentBatch, true);

          // Trigger event untuk halaman lain
          localStorage.setItem("orderUpdated", new Date().toISOString());
        } else {
          const json = await response.json();
          alert(json.message || "Gagal mengupdate status");
          loadSummary(currentBatch, true);
        }
      } catch (err) {
        alert("Gagal mengupdate status");
        loadSummary(currentBatch, true);
      }
    });
  });

  document.querySelectorAll(".toggle").forEach((btn) => {
    const existing = btn.getAttribute("data-initialized");
    if (existing) return;

    btn.setAttribute("data-initialized", "true");
    btn.addEventListener("click", () => {
      const row = btn.closest("tr");
      const next = row.nextElementSibling;
      if (!next) return;
      next.style.display =
        next.style.display === "none" ? "table-row" : "none";
      btn.textContent =
        next.style.display === "none" ? "Lihat" : "Sembunyikan";
    });
  });
}

// Main summary loading
let currentBatch = "";

async function loadSummary(batch, forceReload = false) {
  const alertError = document.getElementById("alertError");
  hide(alertError);
  currentBatch = batch;

  try {
    // Cek cache jika tidak force reload
    if (!forceReload) {
      const cachedData = localStorage.getItem("summaryData");
      if (cachedData) {
        const {
          timestamp,
          batch: cachedBatch,
          data,
          customersData,
        } = JSON.parse(cachedData);

        // Gunakan cache jika batch sama dan belum lebih dari 5 menit
        if (cachedBatch === batch && Date.now() - timestamp < 300000) {
          renderSummary(data);
          renderCustomers(customersData);
          return;
        }
      }
    }

    const res = await fetch(
      "/api/summary?batch=" + encodeURIComponent(batch)
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Gagal memuat summary");
    renderSummary(json);

    // Load customers summary & save to cache
    const res2 = await fetch(
      "/api/summary/customers?batch=" + encodeURIComponent(batch)
    );
    const json2 = await res2.json();
    if (!res2.ok)
      throw new Error(json2.message || "Gagal memuat summary customer");

    // Save to cache
    localStorage.setItem(
      "summaryData",
      JSON.stringify({
        timestamp: Date.now(),
        batch: batch,
        data: json,
        customersData: json2,
      })
    );

    renderCustomers(json2);
  } catch (err) {
    show(alertError, err.message);
  }
}

// Edit modal functions
function createEditItemRow(item = {}) {
  const row = document.createElement("div");
  row.className = "item-row";
  row.innerHTML = `
    <div class="col">
      <label>Jenis Jamu</label>
      <select class="jenis">
        <option value="">Pilih jenis</option>
        <option value="kunyit asam" ${
          item.jenisJamu === "kunyit asam" ? "selected" : ""
        }>Kunyit Asam</option>
        <option value="beras kencur" ${
          item.jenisJamu === "beras kencur" ? "selected" : ""
        }>Beras Kencur</option>
      </select>
    </div>
    <div class="col">
      <label>Ukuran</label>
      <select class="ukuran">
        <option value="">Pilih ukuran</option>
        <option value="250ml" ${
          item.ukuran === "250ml" ? "selected" : ""
        }>250ml</option>
        <option value="600ml" ${
          item.ukuran === "600ml" ? "selected" : ""
        }>600ml</option>
        <option value="1L" ${
          item.ukuran === "1L" ? "selected" : ""
        }>1L</option>
      </select>
    </div>
    <div class="col">
      <label>Option</label>
      <select class="option">
        <option value="">Pilih option</option>
        <option value="less" ${
          item.option === "less" ? "selected" : ""
        }>Less</option>
        <option value="normal" ${
          item.option === "normal" ? "selected" : ""
        }>Normal</option>
      </select>
    </div>
    <div class="col">
      <label>Jumlah</label>
      <input type="number" class="qty" min="1" value="${
        item.qty || 1
      }" style="width: 80px" />
    </div>
    <div>
      <button type="button" class="inline remove-btn">🗑️<span>Hapus</span></button>
    </div>
  `;

  row.querySelector(".remove-btn").addEventListener("click", () => {
    row.remove();
  });

  return row;
}

function handleEditOrder(name, items, notes) {
  const modal = document.getElementById("editModal");
  const container = document.getElementById("editItemsContainer");
  const customerNameInput = document.getElementById("editCustomerName");
  const editNotes = document.getElementById("editNotes");

  customerNameInput.value = name;
  container.innerHTML = "";

  items.forEach((item) => {
    container.appendChild(createEditItemRow(item));
  });

  editNotes.value = notes || "";

  modal.style.display = "block";
}

// Initialize summary page
window.addEventListener("DOMContentLoaded", () => {
  const batchInput = document.getElementById("batch");
  const generateBtn = document.getElementById("generateBatchBtn");
  const loadBtn = document.getElementById("loadBtn");
  const lastBatch = localStorage.getItem("lastBatch");
  if (lastBatch) {
    batchInput.value = lastBatch;
    // Load initial data
    loadSummary(lastBatch);
  }

  generateBtn.addEventListener("click", () => {
    batchInput.value = formatBatchWeekOfMonth();
  });

  loadBtn.addEventListener("click", () => {
    if (batchInput.value) {
      const newBatch = batchInput.value;
      localStorage.setItem("lastBatch", newBatch);

      // Force reload jika batch berbeda
      const cachedData = localStorage.getItem("summaryData");
      const forceReload =
        !cachedData || JSON.parse(cachedData).batch !== newBatch;
      loadSummary(newBatch, forceReload);
    }
  });

  // Listen untuk event dari halaman lain
  window.addEventListener("storage", (e) => {
    if (e.key === "orderUpdated" && e.newValue) {
      // Hapus cache dan muat ulang data
      localStorage.removeItem("summaryData");
      if (currentBatch) {
        loadSummary(currentBatch, true);
      }
    }
  });

  // Setup event handlers untuk edit
  const editModal = document.getElementById("editModal");
  const editForm = document.getElementById("editForm");
  const addEditItemBtn = document.getElementById("addEditItemBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");

  // Event handler untuk tombol edit di setiap baris
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("edit-btn")) {
      const name = e.target.getAttribute("data-name");
      const items = JSON.parse(e.target.getAttribute("data-items"));
      const notes = JSON.parse(e.target.getAttribute("data-notes") || '""');
      handleEditOrder(name, items, notes);
    }
  });

  // Tambah item baru di form edit
  addEditItemBtn.addEventListener("click", () => {
    const container = document.getElementById("editItemsContainer");
    container.appendChild(createEditItemRow());
  });

  // Tutup modal
  cancelEditBtn.addEventListener("click", () => {
    editModal.style.display = "none";
  });

  // Submit form edit
  editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const customerName = document.getElementById("editCustomerName").value;
  const container = document.getElementById("editItemsContainer");
  const notes = document.getElementById("editNotes").value.trim();

  const items = Array.from(container.children)
    .map((row) => ({
      jenisJamu: row.querySelector(".jenis").value,
      ukuran: row.querySelector(".ukuran").value,
      option: row.querySelector(".option").value,
      qty: Number(row.querySelector(".qty").value || 0),
    }))
    .filter((x) => x.jenisJamu && x.ukuran && x.option && x.qty > 0);

  if (items.length === 0) {
    alert("Minimal harus ada 1 item");
    return;
  }

  if (confirm("Yakin ingin menyimpan perubahan?")) {
    try {
      // PERBAIKI ENDPOINT DI SINI:
      const res = await fetch("/api/orders/edit", {  // UBAH DARI "/api/order/edit" MENJADI "/api/orders/edit"
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName,
          batch: batchInput.value,
          items,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok)
        throw new Error(json.message || "Gagal mengupdate order");

      alert("Order berhasil diupdate");
      editModal.style.display = "none";

      // Invalidate cache dan reload
      localStorage.removeItem("summaryData");
      loadSummary(batchInput.value, true);

      // Trigger event untuk halaman lain
      localStorage.setItem("orderUpdated", new Date().toISOString());
    } catch (err) {
      alert(err.message || "Gagal mengupdate order");
    }
  }
});

  // Click di luar modal untuk menutup
  window.addEventListener("click", (e) => {
    if (e.target === editModal) {
      editModal.style.display = "none";
    }
  });

  loadRecentBatches();
});