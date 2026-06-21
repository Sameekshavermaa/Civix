/* ============================================================
   Civix – Maintenance Module
   ============================================================ */

let _allMaintenance = [];
let _allPayments    = [];

async function loadMaintenance() {
    showLoading('maintenanceTableBody', 'Loading maintenance records...');
    try {
        const [mRes, pRes] = await Promise.all([
            Api.maintenance.society(App.societyId()),
            Api.maintenance.societyPayments(App.societyId())
        ]);
        if (mRes && mRes.success) {
            _allMaintenance = mRes.data;
            renderMaintenanceTable(_allMaintenance);
        }
        if (pRes && pRes.success) {
            _allPayments = pRes.data;
            renderPaymentsTable(_allPayments);
        }
    } catch { Toast.error('Failed to load maintenance data.'); }
}

async function loadMyMaintenance() {
    showLoading('myMaintenanceTableBody', 'Loading dues...');
    try {
        const [mRes, pRes] = await Promise.all([
            Api.maintenance.my(),
            Api.maintenance.myPayments()
        ]);
        if (mRes && mRes.success) {
            _allMaintenance = mRes.data;
            renderMyMaintenanceTable(_allMaintenance);
            renderDueSummary(_allMaintenance);
        }
        if (pRes && pRes.success) {
            _allPayments = pRes.data;
            renderMyPaymentsTable(_allPayments);
        }
    } catch { Toast.error('Failed to load maintenance data.'); }
}

function renderDueSummary(list) {
    const pending = list.filter(m => ['PENDING','OVERDUE','PARTIAL'].includes(m.paymentStatus));
    const totalDue = pending.reduce((s, m) => s + parseFloat(m.balance || 0), 0);
    const el = document.getElementById('myDueSummary');
    if (!el) return;
    el.innerHTML = pending.length
        ? `<div class="alert alert-warning"><i class="fa-solid fa-triangle-exclamation"></i><div><strong>Outstanding Balance: ${formatCurrency(totalDue)}</strong><br><span style="font-size:.82rem">${pending.length} pending payment(s). Please pay before the due date to avoid late fees.</span></div></div>`
        : `<div class="alert alert-success"><i class="fa-solid fa-circle-check"></i><strong>All dues are cleared!</strong></div>`;
}

function renderMaintenanceTable(list) {
    const tbody = document.getElementById('maintenanceTableBody');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state" style="padding:40px"><div class="empty-icon"><i class="fa-solid fa-receipt"></i></div><h3>No Records</h3><p>No maintenance records found.</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(m => `
        <tr>
            <td>
                <div class="font-bold" style="font-size:.88rem">${escHtml(m.residentName)}</div>
                <div class="text-muted text-sm">${escHtml(m.unitNumber)}</div>
            </td>
            <td class="text-sm">${formatDate(m.chargeMonth)}</td>
            <td class="font-bold">${formatCurrency(m.amountDue)}</td>
            <td style="color:var(--success)">${formatCurrency(m.amountPaid)}</td>
            <td style="color:var(--danger);font-weight:600">${formatCurrency(m.balance)}</td>
            <td>${statusBadge(m.paymentStatus)}</td>
            <td class="text-muted text-sm">${formatDate(m.dueDate)}</td>
            <td>
                ${['PENDING','OVERDUE','PARTIAL'].includes(m.paymentStatus)
                    ? `<button class="btn btn-sm btn-success" onclick="openRecordPayment(${m.id}, '${escHtml(m.residentName)}', ${m.balance})">
                           <i class="fa-solid fa-indian-rupee-sign"></i> Pay
                       </button>`
                    : `<span class="text-muted text-sm">${m.paidDate ? formatDate(m.paidDate) : '—'}</span>`}
            </td>
        </tr>`).join('');
}

function renderMyMaintenanceTable(list) {
    const tbody = document.getElementById('myMaintenanceTableBody');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:32px"><div class="empty-icon"><i class="fa-solid fa-receipt"></i></div><h3>No Records</h3><p>No maintenance records found.</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(m => `
        <tr>
            <td class="text-sm">${formatDate(m.chargeMonth)}</td>
            <td class="font-bold">${formatCurrency(m.amountDue)}</td>
            <td style="color:var(--success)">${formatCurrency(m.amountPaid)}</td>
            <td style="color:var(--danger);font-weight:600">${formatCurrency(m.balance)}</td>
            <td>${statusBadge(m.paymentStatus)}</td>
            <td class="text-muted text-sm">${formatDate(m.dueDate)}</td>
        </tr>`).join('');
}

function renderPaymentsTable(list) {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:32px"><div class="empty-icon"><i class="fa-solid fa-money-bill"></i></div><h3>No Payments</h3><p>No payment records found.</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(p => `
        <tr>
            <td><span class="font-bold text-sm" style="color:var(--primary)">${escHtml(p.paymentRef)}</span></td>
            <td>
                <div class="font-bold" style="font-size:.88rem">${escHtml(p.residentName)}</div>
                <div class="text-muted text-sm">${escHtml(p.unitNumber)}</div>
            </td>
            <td class="font-bold">${formatCurrency(p.amount)}</td>
            <td>${statusBadge(p.paymentMode)}</td>
            <td class="text-muted text-sm">${formatDate(p.paymentDate)}</td>
            <td class="text-muted text-sm">${escHtml(p.recordedByName)}</td>
        </tr>`).join('');
}

function renderMyPaymentsTable(list) {
    const tbody = document.getElementById('myPaymentsTableBody');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding:32px"><div class="empty-icon"><i class="fa-solid fa-money-bill"></i></div><h3>No Payments</h3></div></td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(p => `
        <tr>
            <td><span class="font-bold text-sm" style="color:var(--primary)">${escHtml(p.paymentRef)}</span></td>
            <td class="font-bold">${formatCurrency(p.amount)}</td>
            <td>${statusBadge(p.paymentMode)}</td>
            <td class="text-muted text-sm">${formatDate(p.paymentDate)}</td>
            <td class="text-muted text-sm">${escHtml(p.remarks || '—')}</td>
        </tr>`).join('');
}

function filterMaintenance() {
    const search = (document.getElementById('searchMaintenance')?.value || '').toLowerCase();
    const status = document.getElementById('filterPaymentStatus')?.value || '';
    const filtered = _allMaintenance.filter(m =>
        (!search || m.residentName.toLowerCase().includes(search) || m.unitNumber.toLowerCase().includes(search)) &&
        (!status || m.paymentStatus === status)
    );
    renderMaintenanceTable(filtered);
}

function openRecordPayment(recordId, residentName, balance) {
    document.getElementById('paymentRecordId').value    = recordId;
    document.getElementById('paymentResidentName').textContent = residentName;
    document.getElementById('paymentAmount').value      = parseFloat(balance).toFixed(2);
    document.getElementById('paymentDate').value        = new Date().toISOString().split('T')[0];
    document.getElementById('paymentMode').value        = 'CASH';
    document.getElementById('paymentTransactionId').value = '';
    document.getElementById('paymentRemarks').value     = '';
    openModal('recordPaymentModal');
}

async function submitRecordPayment(e) {
    e.preventDefault();
    const payload = {
        maintenanceRecordId: parseInt(document.getElementById('paymentRecordId').value),
        amount:              parseFloat(document.getElementById('paymentAmount').value),
        paymentMode:         document.getElementById('paymentMode').value,
        transactionId:       document.getElementById('paymentTransactionId').value.trim() || null,
        paymentDate:         document.getElementById('paymentDate').value,
        remarks:             document.getElementById('paymentRemarks').value.trim() || null
    };
    if (!payload.amount || payload.amount <= 0) { Toast.warning('Please enter a valid amount.'); return; }
    const btn = document.getElementById('savePaymentBtn');
    btn.disabled = true;
    try {
        const res = await Api.maintenance.recordPayment(payload);
        if (res && res.success) {
            Toast.success('Payment recorded successfully.');
            closeModal('recordPaymentModal');
            loadMaintenance();
        } else { Toast.error(res?.error || 'Payment recording failed.'); }
    } catch { Toast.error('Error recording payment.'); }
    finally { btn.disabled = false; }
}

async function submitCreateCharges(e) {
    e.preventDefault();
    const month = document.getElementById('chargeMonth').value;
    const payload = {
        chargeMonth:  month,
        baseAmount:   parseFloat(document.getElementById('chargeAmount').value),
        lateFee:      parseFloat(document.getElementById('chargeLateF').value || '0'),
        description:  document.getElementById('chargeDesc').value.trim(),
        dueDate:      document.getElementById('chargeDueDate').value
    };
    if (!payload.chargeMonth || !payload.baseAmount || !payload.dueDate) {
        Toast.warning('Month, amount and due date are required.'); return;
    }
    const btn = document.getElementById('saveChargeBtn');
    btn.disabled = true;
    try {
        const res = await Api.maintenance.createCharges(App.societyId(), payload);
        if (res && res.success) {
            Toast.success('Monthly charges created for all residents.');
            closeModal('createChargeModal');
            document.getElementById('createChargeForm').reset();
            loadMaintenance();
        } else { Toast.error(res?.error || 'Failed to create charges.'); }
    } catch { Toast.error('Error creating charges.'); }
    finally { btn.disabled = false; }
}
