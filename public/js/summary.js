// Simple function to check if order can be edited
function canEditOrder(status) {
  return status === 'proses' || status === 'packing';
}

function formatCurrency(n) {
  return new Intl.NumberFormat("id-ID").format(n);
}
// Batch combobox functionality
function setupBatchCombobox() {
  const batchInput = document.getElementById('batch');
  const batchToggle = document.getElementById('batchToggle');
  const batchDropdown = document.getElementById('batchDropdown');
  let isDropdownOpen = false;

  // Toggle dropdown
  batchToggle.addEventListener('click', function() {
    isDropdownOpen = !isDropdownOpen;
    if (isDropdownOpen) {
      batchDropdown.classList.add('show');
    } else {
      batchDropdown.classList.remove('show');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    if (!batchInput.contains(event.target) && !batchToggle.contains(event.target) && !batchDropdown.contains(event.target)) {
      batchDropdown.classList.remove('show');
      isDropdownOpen = false;
    }
  });

  // Handle input focus
  batchInput.addEventListener('focus', function() {
    if (batchDropdown.children.length > 0) {
      batchDropdown.classList.add('show');
      isDropdownOpen = true;
    }
  });

  // Filter options when typing
  batchInput.addEventListener('input', function() {
    const filter = this.value.toLowerCase();
    const options = batchDropdown.getElementsByClassName('combobox-option');
    
    for (let option of options) {
      const text = option.textContent.toLowerCase();
      if (text.includes(filter)) {
        option.style.display = 'block';
      } else {
        option.style.display = 'none';
      }
    }
    
    // Show dropdown if there are visible options
    const visibleOptions = Array.from(options).filter(opt => opt.style.display !== 'none');
    if (visibleOptions.length > 0 && this.value) {
      batchDropdown.classList.add('show');
      isDropdownOpen = true;
    }
  });
}

async function loadRecentBatches() {
  try {
    const res = await fetch("/api/batches");
    const json = await res.json();
    if (res.ok) {
      const batchDropdown = document.getElementById("batchDropdown");
      
      // Clear existing options
      batchDropdown.innerHTML = "";
      
      // Add batches to dropdown
      json.batches.forEach((batch) => {
        const option = document.createElement("div");
        option.className = "combobox-option";
        option.textContent = batch;
        option.addEventListener('click', function() {
          document.getElementById('batch').value = batch;
          batchDropdown.classList.remove('show');
          // Auto-load the selected batch
          localStorage.setItem("lastBatch", batch);
          const forceReload = true;
          loadSummary(batch, forceReload);
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

  // Hitung total per ukuran
  const sizeTotals = {};
  rows.forEach(row => {
    const ukuran = row.ukuran;
    const qty = parseInt(row.qty) || 0;
    sizeTotals[ukuran] = (sizeTotals[ukuran] || 0) + qty;
  });

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
  });

  // Tampilkan summary jika ada data
  if (Object.keys(sizeTotals).length > 0) {
    sizeSummary.classList.remove("hidden");
  } else {
    sizeSummary.classList.add("hidden");
  }
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
    
    const summaryTable = document.getElementById("summaryTable");
    if (summaryTable) {
      summaryTable.style.display = "table";
    }
  }

  // Render size summary
  renderSizeSummary(json.rows);
}

// Simple edit function dengan verifikasi status
function editCustomerOrder(customerName) {
  const customers = window.currentCustomersData || [];
  const customer = customers.find(c => c.name === customerName);
  
  if (!customer) {
    showMobileAlert('Data customer tidak ditemukan', 'error');
    return;
  }

  if (!canEditOrder(customer.status)) {
    showMobileAlert(`Order tidak dapat di-edit karena status sudah "${customer.status}"`, 'error');
    return;
  }

  showEditModal(customer);
}

// Function to show edit modal
function showEditModal(customer) {
  const modal = document.getElementById('editOrderModal');
  const form = document.getElementById('editOrderForm');
  
  // Isi form dengan data customer
  document.getElementById('editCustomerName').value = customer.name;
  document.getElementById('editBatch').value = currentBatch;
  document.getElementById('editNotes').value = customer.notes ? customer.notes.join('\n') : '';
  
  // Isi items
  renderEditItems(customer.items);
  
  // Setup form submission
  form.onsubmit = (e) => handleEditSubmit(e, customer.name);
  
  // Tampilkan modal
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// Function to render items in edit modal
function renderEditItems(items) {
  const container = document.getElementById('editItemsContainer');
  container.innerHTML = '';
  
  items.forEach((item, index) => {
    const itemRow = createEditItemRow(index, item);
    container.appendChild(itemRow);
  });
  
  // Jika tidak ada items, tambahkan satu row kosong
  if (items.length === 0) {
    addEditItemRow();
  }
}

// Function to create edit item row
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
      <input 
        type="number" 
        class="qty" 
        min="1" 
        value="${item ? item.qty : 1}" 
        required
        style="width: 80px"
      >
    </div>
    <div>
      <button type="button" class="inline remove-btn" onclick="removeEditItemRow(this)">🗑️</button>
    </div>
  `;
  
  return row;
}

// Function to add new item row
function addEditItemRow() {
  const container = document.getElementById('editItemsContainer');
  const index = container.children.length;
  const newRow = createEditItemRow(index);
  container.appendChild(newRow);
}

// Function to remove item row
function removeEditItemRow(button) {
  const container = document.getElementById('editItemsContainer');
  if (container.children.length > 1) {
    button.closest('.item-row').remove();
  } else {
    showMobileAlert('Minimal harus ada 1 item', 'error');
  }
}

// Function to close edit modal
function closeEditModal() {
  const modal = document.getElementById('editOrderModal');
  modal.style.display = 'none';
  document.body.style.overflow = 'auto'; // Restore scroll
  
  // Reset form
  document.getElementById('editOrderForm').reset();
  document.getElementById('editItemsContainer').innerHTML = '';
}

// Function to handle edit form submission
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

  // Validasi
  const itemsError = validateItems(formData.items);
  if (itemsError) {
    setFieldError('editItems', itemsError);
    showMobileAlert('Mohon perbaiki input item yang salah', 'error');
    return;
  }

  // Konfirmasi
  if (!confirm(`Update order ${formData.name}?`)) {
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengupdate...';
    
    // Kirim request edit
    const response = await fetch("/api/orders/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: originalCustomerName, // Gunakan nama original untuk identifikasi
        batch: currentBatch,
        items: formData.items,
        notes: formData.notes
      }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.message || "Gagal mengupdate order");

    showMobileAlert('Order berhasil diupdate', 'success');
    closeEditModal();
    
    // Reload data summary
    localStorage.removeItem("summaryData");
    loadSummary(currentBatch, true);
    
    // Trigger event untuk halaman lain
    localStorage.setItem("orderUpdated", new Date().toISOString());
    
  } catch (err) {
    showMobileAlert(err.message || "Terjadi kesalahan saat mengupdate", 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Simple render mobile customer cards
function renderMobileCustomerCards(customers) {
  const mobileContainer = document.getElementById('mobileCustomerCards');
  if (!mobileContainer) return;

  mobileContainer.innerHTML = customers.map(customer => {
    const status = customer.status || 'proses';
    const statusText = {
      'proses': 'Proses',
      'packing': 'Packing', 
      'scheduled': 'Scheduled',
      'delivered': 'Terkirim',
      'paid': 'Lunas'
    }[status] || status;

    const canEdit = canEditOrder(status);

    return `
      <div class="mobile-customer-card" data-customer="${customer.name}">
        <div class="mobile-card-header">
          <div class="mobile-customer-name" title="${customer.name}">${customer.name}</div>
          <span class="mobile-status-badge ${status}">${statusText}</span>
        </div>
        
        <div class="mobile-card-content">
          <div class="mobile-stats">
            <div class="mobile-stat">
              <span class="mobile-stat-label">Total Botol</span>
              <span class="mobile-stat-value">${customer.totalQty}</span>
            </div>
            <div class="mobile-stat">
              <span class="mobile-stat-label">Total Tagihan</span>
              <span class="mobile-stat-value">Rp ${formatCurrency(customer.totalAmount)}</span>
            </div>
          </div>
          
          <div class="mobile-actions">
            <button class="btn-status" onclick="showStatusModal('${customer.name}', '${status}')">
              Status
            </button>
            <button class="btn-edit" onclick="editCustomerOrder('${customer.name}')" ${!canEdit ? 'style="display:none"' : ''}>
              Edit
            </button>
            <button class="btn-view" onclick="toggleCustomerDetails('${customer.name}')">
              Detail
            </button>
          </div>
        </div>

        <div class="mobile-card-details" id="details-${customer.name.replace(/\s+/g, '-')}">
          ${customer.notes && customer.notes.length > 0 ? `
            <div class="mobile-notes">
              <div class="mobile-notes-label">Catatan:</div>
              <div class="mobile-notes-content">${customer.notes.join('\n')}</div>
            </div>
          ` : ''}

          <div class="mobile-product-items">
            ${customer.items.map(item => `
              <div class="mobile-product-item">
                <div class="mobile-product-info">
                  <div class="mobile-product-name">${item.jenisJamu}</div>
                  <div class="mobile-product-details">
                    <span>${item.ukuran}</span>
                    <span>•</span>
                    <span>${item.option}</span>
                  </div>
                </div>
                <div class="mobile-product-qty">${item.qty}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Function to toggle customer details
function toggleCustomerDetails(customerName) {
  const safeId = customerName.replace(/\s+/g, '-');
  const detailsElement = document.getElementById(`details-${safeId}`);
  const button = event.target;
  
  if (detailsElement.style.display === 'block') {
    detailsElement.style.display = 'none';
    button.textContent = 'Detail';
  } else {
    detailsElement.style.display = 'block';
    button.textContent = 'Tutup';
  }
}

// Function to show status update modal
function showStatusModal(customerName, currentStatus) {
  const modal = document.createElement('div');
  modal.className = 'mobile-status-modal';
  modal.style.display = 'flex';
  
  const statusOrder = ['proses', 'packing', 'scheduled', 'delivered', 'paid'];
  const statusLabels = {
    'proses': 'Proses',
    'packing': 'Packing',
    'scheduled': 'Scheduled', 
    'delivered': 'Terkirim',
    'paid': 'Lunas'
  };
  
  const currentIndex = statusOrder.indexOf(currentStatus);
  
  modal.innerHTML = `
    <div class="mobile-status-modal-content">
      <div class="mobile-status-modal-title">Update Status ${customerName}</div>
      <div class="mobile-status-options">
        ${statusOrder.map((status, index) => `
          <div class="mobile-status-option ${index === currentIndex ? 'selected' : ''} ${index <= currentIndex ? 'disabled' : ''}" 
               onclick="${index > currentIndex ? `selectStatus('${status}')` : ''}" 
               style="${index <= currentIndex ? 'opacity: 0.6; cursor: not-allowed;' : ''}">
            ${statusLabels[status]}
          </div>
        `).join('')}
      </div>
      <div class="mobile-modal-actions">
        <button class="mobile-modal-btn mobile-modal-cancel" onclick="closeStatusModal()">Batal</button>
        <button class="mobile-modal-btn mobile-modal-confirm" onclick="confirmStatusUpdate('${customerName}')" id="confirmStatusBtn" disabled>
          Update
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  window.currentStatusSelection = null;
  window.statusModal = modal;
  window.statusCustomerName = customerName;
}

// Function to select status in modal
function selectStatus(status) {
  const options = document.querySelectorAll('.mobile-status-option');
  options.forEach(opt => opt.classList.remove('selected'));
  event.target.classList.add('selected');
  window.currentStatusSelection = status;
  document.getElementById('confirmStatusBtn').disabled = false;
}

// Function to confirm status update
async function confirmStatusUpdate(customerName) {
  if (!window.currentStatusSelection) return;
  
  try {
    const response = await fetch("/api/summary/customers/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        batch: currentBatch, 
        name: customerName, 
        status: window.currentStatusSelection 
      }),
    });

    if (response.ok) {
      localStorage.removeItem("summaryData");
      loadSummary(currentBatch, true);
      showMobileAlert('Status berhasil diupdate', 'success');
    } else {
      const json = await response.json();
      showMobileAlert(json.message || "Gagal mengupdate status", 'error');
    }
  } catch (err) {
    showMobileAlert("Gagal mengupdate status", 'error');
  }
  
  closeStatusModal();
}

// Function to close status modal
function closeStatusModal() {
  if (window.statusModal) {
    window.statusModal.remove();
    window.statusModal = null;
    window.currentStatusSelection = null;
    window.statusCustomerName = null;
  }
}

// Function to show mobile alerts
function showMobileAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 16px;
    border-radius: 6px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    max-width: 90%;
    text-align: center;
    font-size: 13px;
    ${type === 'success' ? 'background: #10b981;' : ''}
    ${type === 'error' ? 'background: #ef4444;' : ''}
    ${type === 'info' ? 'background: #3b82f6;' : ''}
  `;
  alertDiv.textContent = message;
  
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 2000);
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

// Helper functions untuk renderCustomers
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

// Simple event handlers
function setupEventHandlers() {
  console.log('Setting up event handlers...');
  
  // Gunakan event delegation untuk element yang mungkin dirender ulang
  document.addEventListener('click', function(e) {
    // Handle toggle buttons
    if (e.target.classList.contains('toggle') || 
        (e.target.closest('.toggle') && !e.target.classList.contains('btn-edit'))) {
      console.log('Toggle button clicked via delegation');
      const btn = e.target.classList.contains('toggle') ? e.target : e.target.closest('.toggle');
      const row = btn.closest("tr");
      const next = row.nextElementSibling;
      if (!next) {
        console.log('No next sibling found');
        return;
      }
      next.style.display = next.style.display === "none" ? "table-row" : "none";
      btn.textContent = next.style.display === "none" ? "Lihat" : "Tutup";
      e.preventDefault();
    }
    
    // Handle edit buttons
    if (e.target.classList.contains('btn-edit') || 
        (e.target.closest('.btn-edit') && !e.target.disabled)) {
      console.log('Edit button clicked via delegation');
      const btn = e.target.classList.contains('btn-edit') ? e.target : e.target.closest('.btn-edit');
      const name = btn.getAttribute("data-name");
      if (name) {
        editCustomerOrder(name);
      }
      e.preventDefault();
    }
  });

  // Status selects - tetap menggunakan event langsung
  document.querySelectorAll(".statusSelect").forEach((select) => {
    const existing = select.getAttribute("data-initialized");
    if (existing) return;

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
          const statusBadgeClass = status === "paid" ? "success" : status === "delivered" ? "warning" : "gray";
          statusBadge.className = `badge ${statusBadgeClass}`;
          statusBadge.textContent = status;

          localStorage.removeItem("summaryData");
          loadSummary(currentBatch, true);
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

  console.log(`Event handlers setup complete: 
    ${document.querySelectorAll('.statusSelect').length} status selects`);
}

// Function to setup mobile search
function setupMobileSearch() {
  const searchInput = document.getElementById('mobileSearch');
  if (!searchInput) return;

  const debouncedFilter = debounce((searchTerm) => {
    filterMobileCustomerCards(searchTerm);
  }, 300);

  searchInput.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    debouncedFilter(searchTerm);
  });
}

// Function to filter mobile customer cards
function filterMobileCustomerCards(searchTerm) {
  const cards = document.querySelectorAll('.mobile-customer-card');
  
  cards.forEach(card => {
    const customerName = card.querySelector('.mobile-customer-name').textContent.toLowerCase();
    const status = card.querySelector('.mobile-status-badge').textContent.toLowerCase();
    
    if (customerName.includes(searchTerm) || status.includes(searchTerm)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

// Function to setup mobile sort
function setupMobileSort() {
  const sortSelect = document.getElementById('mobileSort');
  if (!sortSelect) return;

  sortSelect.addEventListener('change', function(e) {
    sortMobileCustomerCards(e.target.value);
  });
}

// Function to sort mobile customer cards
function sortMobileCustomerCards(sortBy) {
  const container = document.getElementById('mobileCustomerCards');
  const cards = Array.from(container.querySelectorAll('.mobile-customer-card'));
  
  cards.sort((a, b) => {
    const nameA = a.querySelector('.mobile-customer-name').textContent.toLowerCase();
    const nameB = b.querySelector('.mobile-customer-name').textContent.toLowerCase();
    const qtyA = parseInt(a.querySelector('.mobile-stat-value').textContent);
    const qtyB = parseInt(b.querySelector('.mobile-stat-value').textContent);
    const amountA = parseFloat(a.querySelector('.mobile-stat-value:nth-child(2)').textContent.replace(/[^\d]/g, ''));
    const amountB = parseFloat(b.querySelector('.mobile-stat-value:nth-child(2)').textContent.replace(/[^\d]/g, ''));
    const statusA = a.querySelector('.mobile-status-badge').textContent;
    const statusB = b.querySelector('.mobile-status-badge').textContent;
    
    switch(sortBy) {
      case 'name-asc':
        return nameA.localeCompare(nameB);
      case 'name-desc':
        return nameB.localeCompare(nameA);
      case 'qty-desc':
        return qtyB - qtyA;
      case 'qty-asc':
        return qtyA - qtyB;
      case 'amount-desc':
        return amountB - amountA;
      case 'amount-asc':
        return amountA - amountB;
      case 'status':
        return statusA.localeCompare(statusB);
      default:
        return 0;
    }
  });
  
  // Clear and re-append sorted cards
  container.innerHTML = '';
  cards.forEach(card => container.appendChild(card));
}

// Function to export data as CSV
function exportData() {
  if (!window.currentCustomersData) {
    showMobileAlert('Tidak ada data untuk di-export', 'error');
    return;
  }
  
  const customers = window.currentCustomersData;
  const batch = currentBatch || 'unknown-batch';
  
  // Create CSV content
  let csvContent = 'Nama,Total Botol,Total Tagihan,Status\n';
  
  customers.forEach(customer => {
    const row = [
      `"${customer.name}"`,
      customer.totalQty,
      customer.totalAmount,
      customer.status
    ].join(',');
    
    csvContent += row + '\n';
  });
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `summary-${batch}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showMobileAlert('Data berhasil di-export', 'success');
}

// Debounce function for performance
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
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
          updateRevenueSummary(customersData);
          return;
        }
      }
    }

    const res = await fetch(
      "/api/summary?batch=" + encodeURIComponent(batch),
      { cache: 'no-store' }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Gagal memuat summary");
    renderSummary(json);

    // Load customers summary & save to cache
    const res2 = await fetch(
      "/api/summary/customers?batch=" + encodeURIComponent(batch),
      { cache: 'no-store' }
    );
    const json2 = await res2.json();
    if (!res2.ok)
      throw new Error(json2.message || "Gagal memuat summary customer");

    // Update revenue summary cards
    updateRevenueSummary(json2);

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

// Initialize summary page
window.addEventListener("DOMContentLoaded", () => {
  const batchInput = document.getElementById("batch");
  const generateBtn = document.getElementById("generateBatchBtn");
  const loadBtn = document.getElementById("loadBtn");
  const exportBtn = document.getElementById("exportBtn");
  const lastBatch = localStorage.getItem("lastBatch");
  const navEntry = performance.getEntriesByType('navigation')[0];
  const isReload = navEntry && navEntry.type === 'reload';
  
  // Setup custom combobox
  setupBatchCombobox();
  
  if (lastBatch) {
    batchInput.value = lastBatch;
    // Load initial data
    if (isReload) {
      localStorage.removeItem("summaryData");
      loadSummary(lastBatch, true);
    } else {
      loadSummary(lastBatch);
    }
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

      // Force reload jika batch berbeda
      const cachedData = localStorage.getItem("summaryData");
      const forceReload = !cachedData || JSON.parse(cachedData).batch !== newBatch;
      loadSummary(newBatch, forceReload);
    }
  });

  // Setup export button
  if (exportBtn) {
    exportBtn.addEventListener('click', exportData);
  }

  // Setup mobile features
  setupMobileSearch();
  setupMobileSort();

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

  // Close modal when clicking outside
  document.getElementById('editOrderModal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeEditModal();
    }
  });

  loadRecentBatches();
});