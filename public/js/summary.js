// Simple function to check if order can be edited
function canEditOrder(status) {
  return status === 'proses' || status === 'packing';
}

function formatCurrency(n) {
  return new Intl.NumberFormat("id-ID").format(n);
}

function getStatusBadgeClass(status) {
  const classMap = {
    'paid': 'success',
    'delivered': 'warning',
    'proses': 'gray',
    'packing': 'gray', 
    'scheduled': 'gray'
  };
  return classMap[status] || 'gray';
}

function createDetailRow(customer) {
  const detailRow = document.createElement("tr");
  detailRow.className = "details";
  detailRow.style.display = "none";
  const detailCell = document.createElement("td");
  detailCell.colSpan = 5;
  detailCell.innerHTML = `
    <div style="margin: 10px 0; width: 100%;">
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
                ${customer.items.map((it) => `
                    <tr>
                        <td>${it.jenisJamu}</td>
                        <td>${it.ukuran}</td>
                        <td>${it.option}</td>
                        <td>${it.qty}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>

        ${Array.isArray(customer.notes) && customer.notes.length ? `
        <div class="order-notes" style="margin-top: 10px;">
          <div style="font-weight:600; margin-bottom:6px;">Catatan</div>
          <div style="white-space: pre-wrap;">${customer.notes.join("\n")}</div>
        </div>
        ` : ""}

        <div class="product-cards">
            ${customer.items.map((it) => `
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
            `).join("")}
        </div>
    </div>
  `;
  detailRow.appendChild(detailCell);
  return detailRow;
}

// Batch combobox functionality
function setupBatchCombobox() {
  const batchInput = document.getElementById('batch');
  const batchToggle = document.getElementById('batchToggle');
  const batchDropdown = document.getElementById('batchDropdown');
  let isDropdownOpen = false;

  batchToggle.addEventListener('click', function() {
    isDropdownOpen = !isDropdownOpen;
    batchDropdown.classList.toggle('show', isDropdownOpen);
  });

  document.addEventListener('click', function(event) {
    if (!batchInput.contains(event.target) && !batchToggle.contains(event.target) && !batchDropdown.contains(event.target)) {
      batchDropdown.classList.remove('show');
      isDropdownOpen = false;
    }
  });

  batchInput.addEventListener('focus', function() {
    if (batchDropdown.children.length > 0) {
      batchDropdown.classList.add('show');
      isDropdownOpen = true;
    }
  });

  batchInput.addEventListener('input', function() {
    const filter = this.value.toLowerCase();
    const options = batchDropdown.getElementsByClassName('combobox-option');
    for (let option of options) {
      const text = option.textContent.toLowerCase();
      option.style.display = text.includes(filter) ? 'block' : 'none';
    }
    const visibleOptions = Array.from(options).filter(opt => opt.style.display !== 'none');
    batchDropdown.classList.toggle('show', visibleOptions.length > 0 && this.value);
  });
}

async function loadRecentBatches() {
  try {
    const res = await fetch("/api/batches");
    const json = await res.json();
    if (res.ok) {
      const batchDropdown = document.getElementById("batchDropdown");
      batchDropdown.innerHTML = "";
      json.batches.forEach((batch) => {
        const option = document.createElement("div");
        option.className = "combobox-option";
        option.textContent = batch;
        option.addEventListener('click', function() {
          document.getElementById('batch').value = batch;
          batchDropdown.classList.remove('show');
          localStorage.setItem("lastBatch", batch);
          loadSummary(batch, true);
        });
        batchDropdown.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error loading batches:", error);
  }
}

// Function to update revenue summary cards
function updateRevenueSummary(customersData) {
  if (!customersData) return;
  const totalOrders = customersData.totalOrders || 0;
  const totalRevenue = customersData.totalAmount || 0;
  const totalOrdersCard = document.getElementById('totalOrdersCard');
  const totalRevenueCard = document.getElementById('totalRevenueCard');
  if (totalOrdersCard) totalOrdersCard.textContent = totalOrders;
  if (totalRevenueCard) totalRevenueCard.textContent = `Rp ${formatCurrency(totalRevenue)}`;
}

// Size summary rendering
function renderSizeSummary(rows) {
  const sizeSummary = document.getElementById("sizeSummary");
  const sizeCards = document.querySelector(".size-cards");
  if (!sizeSummary || !sizeCards) return;
  const sizeTotals = {};
  rows.forEach(row => {
    const ukuran = row.ukuran;
    const qty = parseInt(row.qty) || 0;
    sizeTotals[ukuran] = (sizeTotals[ukuran] || 0) + qty;
  });
  sizeCards.innerHTML = "";
  Object.entries(sizeTotals).forEach(([ukuran, total]) => {
    const card = document.createElement("div");
    card.className = "size-card";
    card.innerHTML = `
      <div class="size-label">${ukuran}</div>
      <div class="size-total">${total}</div>
      <div class="size-unit">botol</div>
    `;
    sizeCards.appendChild(card);
  });
  sizeSummary.classList.toggle("hidden", Object.keys(sizeTotals).length === 0);
}

// Summary rendering
function renderSummary(json) {
  const summaryTbody = document.querySelector("#summaryTable tbody");
  if (summaryTbody) {
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
  }
  renderSizeSummary(json.rows);
}

// Simple edit function
function editCustomerOrder(customerName) {
  const customers = window.currentCustomersData || [];
  const customer = customers.find(c => c.name === customerName);
  if (!customer) return showMobileAlert('Data customer tidak ditemukan', 'error');
  if (!canEditOrder(customer.status))
    return showMobileAlert(`Order tidak dapat di-edit karena status sudah "${customer.status}"`, 'error');
  showEditModal(customer);
}

function showEditModal(customer) {
  const modal = document.getElementById('editOrderModal');
  const form = document.getElementById('editOrderForm');
  document.getElementById('editCustomerName').value = customer.name;
  document.getElementById('editBatch').value = currentBatch;
  document.getElementById('editNotes').value = customer.notes ? customer.notes.join('\n') : '';
  renderEditItems(customer.items);
  form.onsubmit = (e) => handleEditSubmit(e, customer.name);
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function renderEditItems(items) {
  const container = document.getElementById('editItemsContainer');
  container.innerHTML = '';
  items.forEach((item, index) => {
    const itemRow = createEditItemRow(index, item);
    container.appendChild(itemRow);
  });
  if (items.length === 0) addEditItemRow();
}

function createEditItemRow(index, item = null) {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <div class="col">
      <label>Jenis Jamu</label>
      <select class="jenis" required>
        ${CONFIG.jenisJamu.map(opt => 
          `<option value="${opt.value}" ${item && item.jenisJamu === opt.value ? 'selected' : ''}>${opt.label}</option>`
        ).join('')}
      </select>
    </div>
    <div class="col">
      <label>Ukuran</label>
      <select class="ukuran" required>
        ${CONFIG.ukuran.map(opt => 
          `<option value="${opt.value}" ${item && item.ukuran === opt.value ? 'selected' : ''}>${opt.label}</option>`
        ).join('')}
      </select>
    </div>
    <div class="col">
      <label>Option</label>
      <select class="option" required>
        ${CONFIG.option.map(opt => 
          `<option value="${opt.value}" ${item && item.option === opt.value ? 'selected' : ''}>${opt.label}</option>`
        ).join('')}
      </select>
    </div>
    <div class="col">
      <label>Jumlah</label>
      <input type="number" class="qty" min="1" value="${item ? item.qty : 1}" required style="width: 80px">
    </div>
    <div><button type="button" class="inline remove-btn" onclick="removeEditItemRow(this)">🗑️</button></div>
  `;
  return row;
}

function addEditItemRow() {
  const container = document.getElementById('editItemsContainer');
  container.appendChild(createEditItemRow(container.children.length));
}

function removeEditItemRow(button) {
  const container = document.getElementById('editItemsContainer');
  if (container.children.length > 1) button.closest('.item-row').remove();
  else showMobileAlert('Minimal harus ada 1 item', 'error');
}

function closeEditModal() {
  const modal = document.getElementById('editOrderModal');
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
  document.getElementById('editOrderForm').reset();
  document.getElementById('editItemsContainer').innerHTML = '';
}

async function handleEditSubmit(e, originalCustomerName) {
  e.preventDefault();
  const formData = {
    name: document.getElementById('editCustomerName').value.trim(),
    batch: document.getElementById('editBatch').value.trim(),
    notes: document.getElementById('editNotes').value.trim(),
    items: Array.from(document.getElementById('editItemsContainer').children).map((row) => ({
      jenisJamu: row.querySelector('.jenis').value,
      ukuran: row.querySelector('.ukuran').value,
      option: row.querySelector('.option').value,
      qty: Number(row.querySelector('.qty').value || 0),
    })).filter((x) => x.jenisJamu && x.ukuran && x.option && x.qty > 0),
  };

  if (!confirm(`Update order ${formData.name}?`)) return;
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengupdate...';
    const response = await fetch("/api/orders/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: originalCustomerName, batch: currentBatch, items: formData.items, notes: formData.notes }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || "Gagal mengupdate order");
    showMobileAlert('Order berhasil diupdate', 'success');
    closeEditModal();
    localStorage.removeItem("summaryData");
    loadSummary(currentBatch, true);
    localStorage.setItem("orderUpdated", new Date().toISOString());
  } catch (err) {
    showMobileAlert(err.message || "Terjadi kesalahan", 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// MOBILE CARD rendering with select instead of modal
function renderMobileCustomerCards(customers) {
  const mobileContainer = document.getElementById('mobileCustomerCards');
  if (!mobileContainer) return;
  mobileContainer.innerHTML = customers.map(customer => {
    const status = customer.status || 'proses';
    const statusText = { 'proses': 'Proses', 'packing': 'Packing', 'scheduled': 'Scheduled', 'delivered': 'Delivered', 'paid': 'Paid' }[status] || status;
    const canEdit = canEditOrder(status);
    return `
      <div class="mobile-customer-card" data-customer="${customer.name}">
        <div class="mobile-card-header">
          <div class="mobile-customer-name" title="${customer.name}">${customer.name}</div>
          <span class="mobile-status-badge ${status}">${statusText}</span>
        </div>
        <div class="mobile-card-content">
          <div class="mobile-stats">
            <div class="mobile-stat"><span class="mobile-stat-label">Total Botol</span><span class="mobile-stat-value">${customer.totalQty}</span></div>
            <div class="mobile-stat"><span class="mobile-stat-label">Total Tagihan</span><span class="mobile-stat-value">Rp ${formatCurrency(customer.totalAmount)}</span></div>
          </div>
          <div class="mobile-actions">
            <div class="mobile-status-container">
              <select class="statusSelect" data-name="${customer.name}" ${status === "paid" ? "disabled" : ""}>
                ${getStatusOptions(status)}
              </select>
            </div>
            <button class="btn-edit" onclick="editCustomerOrder('${customer.name}')" ${!canEdit ? 'style="display:none"' : ''}>Edit</button>
            <button class="btn-view" onclick="toggleCustomerDetails('${customer.name}')">Detail</button>
          </div>
        </div>
        <div class="mobile-card-details" id="details-${customer.name.replace(/\s+/g, '-')}">
          ${customer.notes && customer.notes.length > 0 ? `<div class="mobile-notes"><div class="mobile-notes-label">Catatan:</div><div class="mobile-notes-content">${customer.notes.join('\n')}</div></div>` : ''}
          <div class="mobile-product-items">
            ${customer.items.map(item => `
              <div class="mobile-product-item">
                <div class="mobile-product-info">
                  <div class="mobile-product-name">${item.jenisJamu}</div>
                  <div class="mobile-product-details"><span>${item.ukuran}</span><span>•</span><span>${item.option}</span></div>
                </div>
                <div class="mobile-product-qty">${item.qty}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
  setupEventHandlers();
}

function toggleCustomerDetails(customerName) {
  const safeId = customerName.replace(/\s+/g, '-');
  const details = document.getElementById(`details-${safeId}`);
  const button = event.target;
  const isVisible = details.style.display === 'block';
  details.style.display = isVisible ? 'none' : 'block';
  button.textContent = isVisible ? 'Detail' : 'Tutup';
}

// Event handlers
function setupEventHandlers() {
  document.addEventListener("click", function(e) {
    // ✅ DETAIL button (desktop)
    if (e.target.classList.contains("toggle")) {
      const btn = e.target;
      const row = btn.closest("tr");
      const next = row.nextElementSibling;
      if (!next) return;
      next.style.display = next.style.display === "none" ? "table-row" : "none";
      btn.textContent = next.style.display === "none" ? "Lihat" : "Tutup";
    }

    // ✅ EDIT button (desktop)
    if (e.target.classList.contains("btn-edit") && !e.target.disabled) {
      const name = e.target.dataset.name;
      editCustomerOrder(name);
    }

    // ✅ DETAIL button (mobile)
    if (e.target.classList.contains("btn-view")) {
      const customerName = e.target.closest(".mobile-customer-card").dataset.customer;
      toggleCustomerDetails(customerName);
    }

    // ✅ EDIT button (mobile)
    if (e.target.classList.contains("btn-edit") && e.target.closest(".mobile-customer-card")) {
      const customerName = e.target.closest(".mobile-customer-card").dataset.customer;
      editCustomerOrder(customerName);
    }
  });
}

// other helper functions remain same
function getStatusOptions(status) {
  const statusMap = {
    'proses': '<option value="proses" selected>Proses</option><option value="packing">Packing</option>',
    'packing': '<option value="packing" selected>Packing</option><option value="scheduled">Scheduled</option>',
    'scheduled': '<option value="scheduled" selected>Scheduled</option><option value="delivered">Delivered</option>',
    'delivered': '<option value="delivered" selected>Delivered</option><option value="paid">Paid</option>',
    'paid': '<option value="paid" selected>Paid</option>'
  };
  return statusMap[status] || statusMap.proses;
}


// Simple render customers untuk desktop
function renderCustomers(json2) {
  const customersTbody = document.querySelector("#customersTable tbody");
  if (!customersTbody) return;

  customersTbody.innerHTML = "";
  window.currentCustomersData = json2.customers;
  
  json2.customers.forEach((c) => {
    const status = (c.status || "proses").toLowerCase();
    const canEdit = canEditOrder(status);
    
    // Main row
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Customer">${c.name}</td>
      <td data-label="Total Botol">${c.totalQty}</td>
      <td data-label="Total Tagihan">Rp ${formatCurrency(c.totalAmount)}</td>
      <td data-label="Status">
        <div class="status-container">
          <select class="statusSelect" data-name="${c.name}" ${status === "paid" ? "disabled" : ""}>
            ${getStatusOptions(status)}
          </select>
          <span class="badge ${getStatusBadgeClass(status)}">${status}</span>
        </div>
      </td>
      <td data-label="Aksi">
        <div class="action-buttons">
          <button type="button" class="btn-view toggle" data-name="${c.name}">Lihat</button>
          <button type="button" class="btn-edit" data-name="${c.name}" ${!canEdit ? 'disabled' : ''}>
            ${canEdit ? 'Edit' : '🔒'}
          </button>
        </div>
      </td>`;
    customersTbody.appendChild(tr);

    // Detail row
    const detailRow = createDetailRow(c);
    customersTbody.appendChild(detailRow);
  });

  // Setup handlers
  setupEventHandlers();
  renderMobileCustomerCards(json2.customers);
}

function showMobileAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    padding: 10px 16px; border-radius: 6px; color: white; font-weight: 500;
    z-index: 1000; max-width: 90%; text-align: center; font-size: 13px;
    ${type === 'success' ? 'background: #10b981;' : ''}
    ${type === 'error' ? 'background: #ef4444;' : ''}
    ${type === 'info' ? 'background: #3b82f6;' : ''}
  `;
  alertDiv.textContent = message;
  document.body.appendChild(alertDiv);
  setTimeout(() => alertDiv.remove(), 2000);
}

// Load summary
let currentBatch = "";
async function loadSummary(batch, forceReload = false) {
  const alertError = document.getElementById("alertError");
  hide(alertError);
  currentBatch = batch;
  try {
    const res = await fetch("/api/summary?batch=" + encodeURIComponent(batch), { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Gagal memuat summary");
    renderSummary(json);
    const res2 = await fetch("/api/summary/customers?batch=" + encodeURIComponent(batch), { cache: 'no-store' });
    const json2 = await res2.json();
    if (!res2.ok) throw new Error(json2.message || "Gagal memuat summary customer");
    renderCustomers(json2);
    setupEventHandlers();
    setupDesktopStatusSelects();
    setupMobileStatusSelects();
  } catch (err) {
    show(alertError, err.message);
  }
}

async function updateOrderStatus(name, status) {
  try {
    // 1️⃣ Update status order di backend
    const response = await fetch("/api/summary/customers/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch: currentBatch, name, status }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Gagal update status order");

    // 2️⃣ Jika status = packing, ambil detail order → kurangi stok
    if (status === "packing") {
      try {
        // Ambil data order lengkap (pastikan endpoint ini tersedia)
        const orderRes = await fetch(
          `/api/orders/get?batch=${encodeURIComponent(currentBatch)}&name=${encodeURIComponent(name)}`
        );
        const orderJson = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderJson.message || "Gagal ambil data order");

        // Kurangi stok untuk setiap item
        if (Array.isArray(orderJson.items)) {
          for (const item of orderJson.items) {
            if (!item.jenisJamu || !item.ukuran || !item.qty) continue; // skip invalid
            const stockRes = await fetch("/api/stock/reduce", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jenisJamu: item.jenisJamu,
                ukuran: item.ukuran,
                option: item.option || "normal",
                qty: item.qty,
                notes: `Auto reduce for order ${name} (${currentBatch})`
              }),
            });
            const stockJson = await stockRes.json();
            if (!stockRes.ok) throw new Error(stockJson.message || "Gagal update stok");
          }
          showMobileAlert(`Stok untuk ${name} berhasil disesuaikan.`, "success");
        }
      } catch (errStock) {
        console.error("❌ Gagal mengurangi stok:", errStock);
        showMobileAlert("Gagal menyesuaikan stok otomatis.", "error");
      }
    }

    // 3️⃣ Beri notifikasi & refresh UI
    showMobileAlert(`Status ${name} berhasil diupdate menjadi ${status}`, "success");
    localStorage.removeItem("summaryData");
    loadSummary(currentBatch, true);
    localStorage.setItem("orderUpdated", new Date().toISOString());

  } catch (err) {
    console.error("❌ Error updateOrderStatus:", err);
    showMobileAlert(err.message || "Terjadi kesalahan update status", "error");
  }
}


function setupDesktopStatusSelects() {
  document.querySelectorAll(".statusSelect").forEach(select => {
    if (select.dataset.initialized) return;
    select.dataset.initialized = "true";

    select.addEventListener("change", async (e) => {
      const name = e.target.dataset.name;
      const status = e.target.value;
      await updateOrderStatus(name, status);
    });
  });
}

function setupMobileStatusSelects() {
  document.querySelectorAll(".mobile-customer-card .statusSelect").forEach(select => {
    if (select.dataset.initialized) return;
    select.dataset.initialized = "true";

    select.addEventListener("change", async (e) => {
      const name = e.target.dataset.name;
      const status = e.target.value;
      await updateOrderStatus(name, status);
    });
  });
}

window.addEventListener("DOMContentLoaded", () => {
  const batchInput = document.getElementById("batch");
  const generateBtn = document.getElementById("generateBatchBtn");
  const loadBtn = document.getElementById("loadBtn");
  const exportBtn = document.getElementById("exportBtn");
  const lastBatch = localStorage.getItem("lastBatch");
  setupBatchCombobox();
  if (lastBatch) {
    batchInput.value = lastBatch;
    loadSummary(lastBatch);
  }
  generateBtn.addEventListener("click", () => {
    const newBatch = formatBatchWeekOfMonth();
    batchInput.value = newBatch;
    localStorage.setItem("lastBatch", newBatch);
  });
  loadBtn.addEventListener("click", () => {
    if (batchInput.value) {
      const newBatch = batchInput.value;
      localStorage.setItem("lastBatch", newBatch);
      loadSummary(newBatch, true);
    }
  });
  if (exportBtn) exportBtn.addEventListener('click', exportData);
  loadRecentBatches();
});
