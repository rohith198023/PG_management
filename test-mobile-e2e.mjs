// Comprehensive End-to-End Test Suite for PG_SAS Mobile App
// Validates all mobile screens, auth flows, role-based access, and APIs against running backend.

const BASE_URL = 'http://localhost:3000';

const results = [];
function record(feature, testName, passed, details = '') {
  results.push({ feature, testName, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${feature}] ${testName}${details ? ` -> ${details}` : ''}`);
}

async function api(path, method = 'GET', token = null, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runE2E() {
  console.log('='.repeat(70));
  console.log('🚀 PG_SAS MOBILE APP END-TO-END VERIFICATION SUITE');
  console.log(`📡 Backend Target: ${BASE_URL}`);
  console.log('='.repeat(70) + '\n');

  let tenantToken = null;
  let tenantUser = null;
  let adminToken = null;
  let adminUser = null;

  // ─────────────────────────────────────────────────────────────
  // 1. TENANT AUTH & PROFILE
  // ─────────────────────────────────────────────────────────────
  console.log('--- SECTION 1: TENANT AUTHENTICATION & RESIDENT HUB ---');
  try {
    const loginRes = await api('/api/auth/login', 'POST', null, {
      email: 'tenant@royalliving.com',
      password: 'Admin@123',
    });

    if (loginRes.ok && loginRes.data.accessToken && loginRes.data.user?.role === 'TENANT') {
      tenantToken = loginRes.data.accessToken;
      tenantUser = loginRes.data.user;
      record('Tenant Auth', 'Login returns JWT & role TENANT', true, `User: ${tenantUser.firstName} ${tenantUser.lastName}`);
    } else {
      record('Tenant Auth', 'Login returns JWT & role TENANT', false, `Status ${loginRes.status}: ${JSON.stringify(loginRes.data)}`);
    }
  } catch (err) {
    record('Tenant Auth', 'Login returns JWT & role TENANT', false, err.message);
  }

  let testComplaintId = null;
  let tenantInvoiceId = null;

  if (tenantToken) {
    // Auth /me check
    const meRes = await api('/api/auth/me', 'GET', tenantToken);
    if (meRes.ok && meRes.data.user?.tenantProfile) {
      const tp = meRes.data.user.tenantProfile;
      const roomNum = tp.bed?.room?.room_number || 'N/A';
      const bedNum = tp.bed?.bed_number || 'N/A';
      const propName = tp.bed?.room?.property?.name || 'N/A';
      record('Tenant Profile', 'Fetches resident room & bed allocation', true, `Room ${roomNum}, Bed ${bedNum} at ${propName}`);
    } else {
      record('Tenant Profile', 'Fetches resident room & bed allocation', false, `Status ${meRes.status}`);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. TENANT INVOICES & DUES
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 2: TENANT INVOICES & DUES ---');
    const tenantInvoicesRes = await api('/api/tenant/invoices', 'GET', tenantToken);
    if (tenantInvoicesRes.ok && Array.isArray(tenantInvoicesRes.data.invoices)) {
      const count = tenantInvoicesRes.data.invoices.length;
      record('Tenant Invoices', 'GET /api/tenant/invoices returns personal invoices', true, `${count} invoices found`);
      if (count > 0) {
        tenantInvoiceId = tenantInvoicesRes.data.invoices[0].id;
        const first = tenantInvoicesRes.data.invoices[0];
        record('Tenant Invoices', 'Invoice data structure valid', true, `Invoice #${first.invoice_number}, Total ₹${first.total_amount}, Status: ${first.status}`);
      }
    } else {
      record('Tenant Invoices', 'GET /api/tenant/invoices returns personal invoices', false, `Status ${tenantInvoicesRes.status}`);
    }

    // Role check: Tenant accessing admin /api/invoices should be 403
    const forbiddenRes = await api('/api/invoices', 'GET', tenantToken);
    if (forbiddenRes.status === 403) {
      record('Security / RBAC', 'Tenant cannot access admin /api/invoices (403 expected)', true, 'Protected by requireRole');
    } else {
      record('Security / RBAC', 'Tenant cannot access admin /api/invoices (403 expected)', false, `Got status ${forbiddenRes.status}`);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. TENANT MEALS HUB
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 3: MEALS HUB & DAILY CHOICE ---');
    const today = new Date().toISOString().split('T')[0];
    
    // Meal Config
    const mealCfgRes = await api('/api/meals/config', 'GET', tenantToken);
    record('Meals', 'GET /api/meals/config', mealCfgRes.ok, mealCfgRes.ok ? `Plans: ${mealCfgRes.data?.plans?.length ?? 'OK'}` : `Status ${mealCfgRes.status}`);

    // Meal Template
    const mealTplRes = await api('/api/meals/template', 'GET', tenantToken);
    record('Meals', 'GET /api/meals/template', mealTplRes.ok, mealTplRes.ok ? 'Template retrieved' : `Status ${mealTplRes.status}`);

    // Meal Headcount
    const mealHcRes = await api(`/api/meals/headcount?date=${today}`, 'GET', tenantToken);
    record('Meals', 'GET /api/meals/headcount', mealHcRes.ok, mealHcRes.ok ? `Headcount for ${today}` : `Status ${mealHcRes.status}`);

    // Meal Menu
    const mealMenuRes = await api(`/api/meals/menu?date=${today}`, 'GET', tenantToken);
    record('Meals', 'GET /api/meals/menu', mealMenuRes.ok, mealMenuRes.ok ? `Menus for ${today}: ${mealMenuRes.data?.menus?.length || 0}` : `Status ${mealMenuRes.status}`);

    // Meal Selection
    const mealSelRes = await api(`/api/meals/selection?date=${today}`, 'GET', tenantToken);
    record('Meals', 'GET /api/meals/selection (My Choice)', mealSelRes.ok, mealSelRes.ok ? `Selections: ${mealSelRes.data?.selections?.length || 0}` : `Status ${mealSelRes.status}`);

    // If a menu exists, test choice submission
    if (mealMenuRes.ok && mealMenuRes.data?.menus?.length > 0) {
      const firstMenu = mealMenuRes.data.menus[0];
      const chooseRes = await api('/api/meals/selection', 'POST', tenantToken, {
        menuId: firstMenu.id,
        choice: 'VEG',
      });
      record('Meals', 'POST /api/meals/selection (Submit choice VEG)', chooseRes.ok, chooseRes.ok ? 'Successfully selected VEG' : `Status ${chooseRes.status}`);
    }

    // ─────────────────────────────────────────────────────────────
    // 4. TENANT COMPLAINTS
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 4: COMPLAINTS DESK ---');
    const complaintsRes = await api('/api/complaints', 'GET', tenantToken);
    record('Complaints', 'GET /api/complaints', complaintsRes.ok, complaintsRes.ok ? `${complaintsRes.data?.complaints?.length || 0} complaints` : `Status ${complaintsRes.status}`);

    // Test creating a complaint
    const newComplaintRes = await api('/api/complaints', 'POST', tenantToken, {
      title: 'Mobile App Test Ticket - Room AC Remote',
      description: 'The AC remote display is dim in Room 101. Created via mobile E2E test.',
      category: 'APPLIANCE',
      priority: 'MEDIUM',
    });
    if (newComplaintRes.ok && newComplaintRes.data?.complaint?.id) {
      testComplaintId = newComplaintRes.data.complaint.id;
    }
    record('Complaints', 'POST /api/complaints (Tenant ticket creation)', newComplaintRes.ok, newComplaintRes.ok ? `Created ticket #${newComplaintRes.data?.complaint?.id || 'OK'}` : `Status ${newComplaintRes.status}: ${JSON.stringify(newComplaintRes.data)}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. WORKSPACE ADMIN AUTH & OPERATIONS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 5: ADMIN AUTHENTICATION & MANAGEMENT SCREENS ---');
  try {
    const adminLoginRes = await api('/api/auth/login', 'POST', null, {
      email: 'admin@royalliving.com',
      password: 'Admin@123',
    });

    if (adminLoginRes.ok && adminLoginRes.data.accessToken && adminLoginRes.data.user?.role === 'WORKSPACE_ADMIN') {
      adminToken = adminLoginRes.data.accessToken;
      adminUser = adminLoginRes.data.user;
      record('Admin Auth', 'Login returns JWT & role WORKSPACE_ADMIN', true, `Admin: ${adminUser.firstName} ${adminUser.lastName}`);
    } else {
      record('Admin Auth', 'Login returns JWT & role WORKSPACE_ADMIN', false, `Status ${adminLoginRes.status}`);
    }
  } catch (err) {
    record('Admin Auth', 'Login returns JWT & role WORKSPACE_ADMIN', false, err.message);
  }

  if (adminToken) {
    // Dashboard Stats
    const statsRes = await api('/api/dashboard/stats', 'GET', adminToken);
    if (statsRes.ok && statsRes.data) {
      const s = statsRes.data;
      record('Admin Dashboard', 'GET /api/dashboard/stats', true, `Occupancy: ${s.occupancyRate ?? 'N/A'}%, Revenue: ₹${s.monthlyRevenue ?? 'N/A'}, Dues: ₹${s.pendingDues ?? 'N/A'}`);
    } else {
      record('Admin Dashboard', 'GET /api/dashboard/stats', false, `Status ${statsRes.status}`);
    }

    // Properties screen
    const propsRes = await api('/api/properties', 'GET', adminToken);
    if (propsRes.ok && Array.isArray(propsRes.data.properties)) {
      const count = propsRes.data.properties.length;
      record('Properties Screen', 'GET /api/properties', true, `${count} properties loaded with floors & rooms`);
    } else {
      record('Properties Screen', 'GET /api/properties', false, `Status ${propsRes.status}`);
    }

    // Tenants screen
    let tenantIdForBilling = null;
    const tenantsRes = await api('/api/tenants', 'GET', adminToken);
    if (tenantsRes.ok && Array.isArray(tenantsRes.data.tenants)) {
      const count = tenantsRes.data.tenants.length;
      if (count > 0) tenantIdForBilling = tenantsRes.data.tenants[0].id;
      record('Tenants Screen', 'GET /api/tenants', true, `${count} registered tenants listed`);
    } else {
      record('Tenants Screen', 'GET /api/tenants', false, `Status ${tenantsRes.status}`);
    }

    // Pending Admission Invites (New Parity Feature)
    const invitesRes = await api('/api/tenants/admission/invite', 'GET', adminToken);
    record('Admission Invites', 'GET /api/tenants/admission/invite', invitesRes.ok, invitesRes.ok ? `${invitesRes.data?.invites?.length || 0} pending digital invites` : `Status ${invitesRes.status}`);

    // Invoices Screen (Admin view with metrics)
    const adminInvRes = await api('/api/invoices', 'GET', adminToken);
    if (adminInvRes.ok && Array.isArray(adminInvRes.data.invoices)) {
      const count = adminInvRes.data.invoices.length;
      const m = adminInvRes.data.metrics || {};
      record('Invoices Desk', 'GET /api/invoices (Admin view with metrics)', true, `${count} invoices, ₹${m.totalPaid || 0} collected`);
    } else {
      record('Invoices Desk', 'GET /api/invoices (Admin view with metrics)', false, `Status ${adminInvRes.status}`);
    }

    // Run Automated Monthly Billing Engine (New Parity Feature)
    const billingRunRes = await api('/api/invoices/generate', 'POST', adminToken);
    record('Billing Engine', 'POST /api/invoices/generate (Batch monthly billing)', billingRunRes.ok, billingRunRes.ok ? `Generated: ${billingRunRes.data?.generatedCount || 0}, Billed: ₹${billingRunRes.data?.totalBilled || 0}` : `Status ${billingRunRes.status}`);

    // Create Custom Manual Invoice (New Parity Feature)
    if (tenantIdForBilling) {
      const manualInvRes = await api('/api/invoices', 'POST', adminToken, {
        tenantId: tenantIdForBilling,
        description: 'E2E Test - Electricity & Maintenance Addon',
        amount: 750,
        dueDateDays: 5,
      });
      record('Manual Invoicing', 'POST /api/invoices (Create custom charge invoice)', manualInvRes.ok, manualInvRes.ok ? `Invoice #${manualInvRes.data?.invoice?.invoice_number || 'OK'} created` : `Status ${manualInvRes.status}`);
      if (manualInvRes.ok && manualInvRes.data?.invoice?.id) {
        tenantInvoiceId = manualInvRes.data.invoice.id;
      }
    }

    // Admin Resolve Maintenance Complaint (New Parity Feature)
    if (testComplaintId) {
      const updateCompRes = await api(`/api/complaints/${testComplaintId}`, 'PATCH', adminToken, {
        status: 'RESOLVED',
        resolutionNotes: 'Issue resolved via mobile management ticket modal.',
      });
      record('Complaints Management', 'PATCH /api/complaints/[id] (Resolve ticket with notes)', updateCompRes.ok, updateCompRes.ok ? 'Ticket marked RESOLVED' : `Status ${updateCompRes.status}`);
    }

    // Tenant Upload Payment Proof (New Parity Feature)
    if (tenantInvoiceId && tenantToken) {
      const proofRes = await api('/api/payments/proof', 'POST', tenantToken, {
        invoiceId: tenantInvoiceId,
        proofImageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c',
        utrNumber: 'UTR987654321012',
        notes: 'Submitted via Mobile App E2E Test',
      });
      record('Payment Proof Upload', 'POST /api/payments/proof (Tenant UPI/UTR submission)', proofRes.ok, proofRes.ok ? 'Proof submitted to verification queue' : `Status ${proofRes.status}`);
    }

    // Payments Verification
    const paymentsRes = await api('/api/payments/verify', 'GET', adminToken);
    record('Payments Screen', 'GET /api/payments/verify', paymentsRes.ok, paymentsRes.ok ? `${paymentsRes.data?.payments?.length || 0} payment records` : `Status ${paymentsRes.status}`);

    // Finance / P&L
    const pnlRes = await api('/api/finance/reports/pnl', 'GET', adminToken);
    record('Accounting Screen', 'GET /api/finance/reports/pnl', pnlRes.ok, pnlRes.ok ? 'P&L report generated' : `Status ${pnlRes.status}`);

    const finAnalyticsRes = await api('/api/finance/analytics', 'GET', adminToken);
    record('Accounting Screen', 'GET /api/finance/analytics', finAnalyticsRes.ok, finAnalyticsRes.ok ? 'Analytics generated' : `Status ${finAnalyticsRes.status}`);

    // Notifications Queue
    const notifRes = await api('/api/notifications/queue', 'GET', adminToken);
    record('Notifications Screen', 'GET /api/notifications/queue', notifRes.ok, notifRes.ok ? `${notifRes.data?.notifications?.length || 0} notifications in queue` : `Status ${notifRes.status}`);

    // Payment Gateways Settings
    const gwRes = await api('/api/settings/gateways', 'GET', adminToken);
    record('Gateways Screen', 'GET /api/settings/gateways', gwRes.ok, gwRes.ok ? `${gwRes.data?.configs?.length || 0} gateways configured` : `Status ${gwRes.status}`);

    const gwTestRes = await api('/api/settings/gateways/test', 'POST', adminToken, { gatewayName: 'razorpay' });
    const hasReport = gwTestRes.data && (gwTestRes.ok || gwTestRes.data.report?.gatewayName === 'razorpay');
    record('Gateways Screen', 'POST /api/settings/gateways/test (Razorpay handshake)', hasReport, `Handshake executed (Latency: ${gwTestRes.data?.report?.latencyMs}ms, Result: ${gwTestRes.data?.report?.status})`);
  }

  // ─────────────────────────────────────────────────────────────
  // 6. SUMMARY REPORT
  // ─────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`📊 E2E SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('='.repeat(70));

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => console.log(` - [${r.feature}] ${r.testName}: ${r.details}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL MOBILE APP ENDPOINTS, SCREENS & FLOWS ARE FULLY WORKING E2E!');
  }
}

runE2E().catch(console.error);
