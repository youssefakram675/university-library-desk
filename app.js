document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const logoutBtn = document.getElementById('logout-btn');
    const loginStatus = document.getElementById('login-status');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    
    const itemTypeSelect = document.getElementById('item-type');
    const itemInputContainer = document.getElementById('item-input-container');
    const loanForm = document.getElementById('loan-form');
    const dueDateInput = document.getElementById('due-date');
    const tableSearch = document.getElementById('table-search');
    const loansTableBody = document.getElementById('loans-table-body');
    const tableLiveCount = document.getElementById('table-live-count');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const navLinks = document.querySelectorAll('.nav-link');

    const statusModal = document.getElementById('status-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    
    const totalActiveLoansEl = document.getElementById('stat-active-loans');
    const overdueItemsEl = document.getElementById('stat-overdue');
    const pendingFinesEl = document.getElementById('stat-fines');
    const fineBreakdownContainer = document.getElementById('fine-breakdown-container');

    const paginationContainer = document.getElementById('pagination-controls');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageInfoEl = document.getElementById('page-info');

    let currentFilter = 'all';
    let pendingAction = null; 
    let allLoans = [];
    let currentPage = 1;
    const rowsPerPage = 5;

    // Set default due date to 14 days from today (capped at 2027-01-31)
    if (dueDateInput) {
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 14);
        const maxLimit = new Date('2027-01-31');
        const targetDue = defaultDue > maxLimit ? maxLimit : defaultDue;
        dueDateInput.value = targetDue.toISOString().split('T')[0];
    }

    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggleBtn) themeToggleBtn.textContent = '☀️ Light Mode';
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeToggleBtn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
        });
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    }

    // --- Dynamic Item Input Swapper based on Category with exact 4 Hardware options ---
    if (itemTypeSelect && itemInputContainer) {
        itemTypeSelect.addEventListener('change', (e) => {
            const category = e.target.value;
            itemInputContainer.innerHTML = '';

            if (category === 'Book') {
                const bookInput = document.createElement('input');
                bookInput.type = 'text';
                bookInput.id = 'dynamic-item-input';
                bookInput.name = 'itemTitle';
                bookInput.placeholder = 'Enter book title (e.g. Data Structures)';
                bookInput.required = true;
                itemInputContainer.appendChild(bookInput);
            } else if (category === 'Equipment') {
                const eqSelect = document.createElement('select');
                eqSelect.id = 'dynamic-item-input';
                eqSelect.name = 'itemTitle';
                eqSelect.required = true;
                eqSelect.innerHTML = `
                    <option value="">-- Select Specific Hardware --</option>
                    <option value="MacBook Air 13-inch">MacBook Air 13-inch</option>
                    <option value="Anker USB-C Adapter">Anker USB-C Adapter</option>
                    <option value="Portable External SSD (1TB)">Portable External SSD (1TB)</option>
                    <option value="Calculator">Calculator</option>
                `;
                itemInputContainer.appendChild(eqSelect);
            } else {
                const placeholderInput = document.createElement('input');
                placeholderInput.type = 'text';
                placeholderInput.id = 'dynamic-item-input';
                placeholderInput.disabled = true;
                placeholderInput.placeholder = 'Select a category first...';
                itemInputContainer.appendChild(placeholderInput);
            }
        });
    }

    // --- Header Navigation Mapping ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetEl = document.querySelector(targetId);

            if (targetEl && !dashboardSection.hidden) {
                targetEl.scrollIntoView({ behavior: 'smooth' });
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                if (targetId === '#loans-section') {
                    currentFilter = 'active';
                    filterTabs.forEach(t => {
                        if (t.getAttribute('data-filter') === 'active') {
                            t.classList.add('active');
                            t.setAttribute('aria-selected', 'true');
                        } else {
                            t.classList.remove('active');
                            t.setAttribute('aria-selected', 'false');
                        }
                    });
                    currentPage = 1;
                    renderLoans();
                } else if (targetId === '#new-loan-section') {
                    document.getElementById('student-id').focus();
                } else if (targetId === '#dashboard-section') {
                    document.getElementById('dashboard-heading').focus();
                }
            }
        });
    });

    // --- Sign-In Validation ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const usernameError = document.getElementById('username-error');
            const passwordError = document.getElementById('password-error');

            let isValid = true;
            usernameError.textContent = '';
            passwordError.textContent = '';

            const usernameVal = usernameInput.value.trim();
            const passwordVal = passwordInput.value;
            const lettersCount = (usernameVal.match(/[a-zA-Z]/g) || []).length;

            if (!usernameVal) { 
                usernameError.textContent = 'Staff username is required.'; 
                isValid = false; 
            } else if (lettersCount < 3) {
                usernameError.textContent = 'Username must contain at least 3 letters.';
                isValid = false;
            }

            if (!passwordVal) { 
                passwordError.textContent = 'Password is required.'; 
                isValid = false; 
            } else if (passwordVal.length < 8) { 
                passwordError.textContent = 'Password must be at least 8 characters long.'; 
                isValid = false; 
            }

            if (!isValid) return;

            loginStatus.textContent = 'Signing in...';
            setTimeout(() => {
                authSection.classList.remove('active-view');
                authSection.hidden = true;
                dashboardSection.classList.add('active-view');
                dashboardSection.hidden = false;
                logoutBtn.style.display = 'inline-block';
                loginStatus.textContent = '';
                document.getElementById('dashboard-heading').focus();
                loadLoans();
                showToast('Successfully signed in as Library Staff.');
            }, 400);
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            dashboardSection.classList.remove('active-view');
            dashboardSection.hidden = true;
            authSection.classList.add('active-view');
            authSection.hidden = false;
            logoutBtn.style.display = 'none';
            loginForm.reset();
            document.getElementById('auth-heading').focus();
            showToast('Signed out successfully.');
        });
    }

    async function loadLoans() {
        try {
            const response = await fetch('/api/loans');
            const rawLoans = await response.json();
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            allLoans = rawLoans.map(loan => {
                if (loan.status.toUpperCase() === 'ACTIVE') {
                    const due = new Date(loan.dueDate);
                    due.setHours(0, 0, 0, 0);
                    if (due < today) {
                        return { ...loan, status: 'OVERDUE' };
                    }
                }
                return loan;
            });

            renderLoans();
            updateStats();
        } catch (err) {
            console.error('Error loading loans:', err);
            showToast('Failed to connect to database.', 'error');
        }
    }

    function renderLoans() {
        if (!loansTableBody) return;
        loansTableBody.innerHTML = '';
        const query = tableSearch ? tableSearch.value.toLowerCase() : '';

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filtered = allLoans.filter(loan => {
            const matchesFilter = (currentFilter === 'all') || (loan.status.toLowerCase() === currentFilter);
            const matchesSearch = (loan.studentId && loan.studentId.toLowerCase().includes(query)) ||
                                  (loan.title && loan.title.toLowerCase().includes(query));
            return matchesFilter && matchesSearch;
        });

        const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * rowsPerPage;
        const paginatedData = filtered.slice(start, start + rowsPerPage);

        if (filtered.length === 0) {
            loansTableBody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                            <p>No loan records found matching your criteria.</p>
                        </div>
                    </td>
                </tr>`;
            if (tableLiveCount) tableLiveCount.textContent = `Showing 0 of ${allLoans.length} records.`;
            if (paginationContainer) paginationContainer.hidden = true;
            return;
        }

        paginatedData.forEach(loan => {
            const tr = document.createElement('tr');
            const statusLower = loan.status.toLowerCase();
            const badgeClass = statusLower === 'active' ? 'active' : (statusLower === 'overdue' ? 'overdue' : 'returned');
            
            const due = new Date(loan.dueDate);
            due.setHours(0, 0, 0, 0);
            const canBeOverdue = due < today;

            let actionButtons = '';
            if (statusLower === 'returned') {
                actionButtons = `
                    <button class="action-btn status-trigger" data-id="${loan.id}" data-status="ACTIVE">Reactivate</button>
                `;
            } else if (statusLower === 'overdue') {
                actionButtons = `
                    <button class="action-btn pay-fine-trigger" data-id="${loan.id}">Pay Fine & Return</button>
                    <button class="action-btn extend-trigger" data-id="${loan.id}">Extend (+7d)</button>
                `;
            } else {
                actionButtons = `
                    <button class="action-btn status-trigger" data-id="${loan.id}" data-status="RETURNED">Return</button>
                    <button class="action-btn extend-trigger" data-id="${loan.id}">Extend (+7d)</button>
                    ${canBeOverdue ? `<button class="action-btn status-trigger" data-id="${loan.id}" data-status="OVERDUE">Overdue</button>` : ''}
                `;
            }

            tr.innerHTML = `
                <td>${escapeHTML(loan.studentId)}</td>
                <td>${escapeHTML(loan.title)}</td>
                <td>${escapeHTML(loan.type || 'Book')}</td>
                <td>${escapeHTML(formatDate(loan.dueDate))}</td>
                <td><span class="badge ${badgeClass}">${loan.status.toUpperCase()}</span></td>
                <td>${actionButtons}</td>
            `;
            loansTableBody.appendChild(tr);
        });

        if (tableLiveCount) {
            tableLiveCount.textContent = `Showing ${paginatedData.length} of ${filtered.length} filtered records.`;
        }

        if (paginationContainer) {
            paginationContainer.hidden = filtered.length <= rowsPerPage;
            pageInfoEl.textContent = `Page ${currentPage} of ${totalPages}`;
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage === totalPages;
        }
    }

    document.addEventListener('click', (e) => {
        const statusBtn = e.target.closest('.status-trigger');
        const extendBtn = e.target.closest('.extend-trigger');
        const payFineBtn = e.target.closest('.pay-fine-trigger');

        if (statusBtn) {
            const id = statusBtn.getAttribute('data-id');
            const targetStatus = statusBtn.getAttribute('data-status');
            pendingAction = { id, targetStatus, actionType: 'status' };

            if (statusModal) {
                if (targetStatus === 'RETURNED') {
                    modalTitle.textContent = 'Confirm Item Return';
                    modalDesc.textContent = 'Are you sure you want to mark this item as returned?';
                } else if (targetStatus === 'ACTIVE') {
                    modalTitle.textContent = 'Reactivate Loan Record';
                    modalDesc.textContent = 'Are you sure you want to change this record back to ACTIVE?';
                } else {
                    modalTitle.textContent = 'Flag Item as Overdue';
                    modalDesc.textContent = 'Are you sure you want to mark this loan item as OVERDUE?';
                }
                statusModal.hidden = false;
                statusModal.style.display = 'flex';
                modalConfirmBtn.focus();
            }
        }

        if (payFineBtn) {
            const id = payFineBtn.getAttribute('data-id');
            const loan = allLoans.find(l => l.id === id);
            if (loan) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const due = new Date(loan.dueDate);
                due.setHours(0, 0, 0, 0);
                const diffDays = Math.max(1, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
                const fineTotal = diffDays * 5.00;

                pendingAction = { id, targetStatus: 'RETURNED', actionType: 'payFine' };

                if (statusModal) {
                    modalTitle.textContent = 'Settle Fine & Return Item';
                    modalDesc.textContent = `Student owes $${fineTotal.toFixed(2)} (${diffDays} days overdue at $5/day). Confirm fine payment and mark item as returned?`;
                    statusModal.hidden = false;
                    statusModal.style.display = 'flex';
                    modalConfirmBtn.focus();
                }
            }
        }

        if (extendBtn) {
            const id = extendBtn.getAttribute('data-id');
            const loan = allLoans.find(l => l.id === id);
            if (loan) {
                const currentDue = new Date(loan.dueDate);
                currentDue.setDate(currentDue.getDate() + 7);
                const maxAllowedDate = new Date('2027-01-31');
                
                if (currentDue > maxAllowedDate) {
                    showToast('Cannot extend past January 31, 2027 due limit.', 'error');
                    return;
                }

                const newDueStr = currentDue.toISOString().split('T')[0];
                pendingAction = { id, newDueDate: newDueStr, actionType: 'extend' };

                if (statusModal) {
                    modalTitle.textContent = 'Extend Loan Due Date';
                    modalDesc.textContent = `Extend due date by 7 days to ${formatDate(newDueStr)}?`;
                    statusModal.hidden = false;
                    statusModal.style.display = 'flex';
                    modalConfirmBtn.focus();
                }
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && statusModal && !statusModal.hidden) {
            statusModal.hidden = true;
            statusModal.style.display = 'none';
            pendingAction = null;
        }
    });

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; renderLoans(); }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            currentPage++;
            renderLoans();
        });
    }

    function updateStats() {
        const activeCount = allLoans.filter(l => l.status.toLowerCase() === 'active').length;
        const overdueLoans = allLoans.filter(l => l.status.toLowerCase() === 'overdue');
        const overdueCount = overdueLoans.length;

        let totalFines = 0;
        let breakdownHTML = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        overdueLoans.forEach(loan => {
            const due = new Date(loan.dueDate);
            due.setHours(0, 0, 0, 0);
            const diffDays = Math.max(1, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
            const fineAmount = diffDays * 5.00;
            totalFines += fineAmount;

            breakdownHTML += `
                <div class="fine-breakdown-item">
                    <span>${escapeHTML(loan.title)} (${diffDays}d overdue)</span>
                    <strong>$${fineAmount.toFixed(2)}</strong>
                </div>
            `;
        });

        if (totalActiveLoansEl) totalActiveLoansEl.textContent = activeCount + overdueCount;
        if (overdueItemsEl) overdueItemsEl.textContent = overdueCount;
        if (pendingFinesEl) pendingFinesEl.textContent = `$${totalFines.toFixed(2)}`;

        if (fineBreakdownContainer) {
            if (overdueCount > 0) {
                fineBreakdownContainer.innerHTML = `<div class="fine-breakdown-list"><strong>Breakdown ($5.0/day):</strong>${breakdownHTML}</div>`;
            } else {
                fineBreakdownContainer.innerHTML = `<div class="fine-breakdown-list">No pending fines. All items on time.</div>`;
            }
        }
    }

    // --- Strict Loan Form Validation ---
    if (loanForm) {
        loanForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentIdInput = document.getElementById('student-id');
            const dynamicItemInput = document.getElementById('dynamic-item-input');
            
            const studentIdError = document.getElementById('student-id-error');
            const itemTypeError = document.getElementById('item-type-error');
            const itemTitleError = document.getElementById('item-title-error');
            const dueDateError = document.getElementById('due-date-error');

            let isValid = true;
            if (studentIdError) studentIdError.textContent = '';
            if (itemTypeError) itemTypeError.textContent = '';
            if (itemTitleError) itemTitleError.textContent = '';
            if (dueDateError) dueDateError.textContent = '';

            const studentIdVal = studentIdInput.value.trim();
            const itemVal = dynamicItemInput ? dynamicItemInput.value.trim() : '';
            const dueDateVal = dueDateInput.value;

            const studentIdRegex = /^STU-[0-9]{3,6}$/i;
            if (!studentIdVal) { 
                studentIdError.textContent = 'Student ID is required.'; 
                isValid = false; 
            } else if (!studentIdRegex.test(studentIdVal)) {
                studentIdError.textContent = 'Invalid format. Use format like STU-94821.';
                isValid = false;
            }

            if (!itemTypeSelect.value) { 
                itemTypeError.textContent = 'Please select an item category.'; 
                isValid = false; 
            }

            if (!itemVal) {
                itemTitleError.textContent = 'Please provide or select an item.';
                isValid = false;
            } else if (itemTypeSelect.value === 'Book') {
                const isNumericOnly = /^\d+$/.test(itemVal);
                const hasOnlySymbols = /^[^a-zA-Z0-9]+$/.test(itemVal);
                if (isNumericOnly || hasOnlySymbols) {
                    itemTitleError.textContent = 'Book title must contain valid text characters (not numbers or symbols only).';
                    isValid = false;
                } else if (itemVal.length < 3) {
                    itemTitleError.textContent = 'Book title must be at least 3 characters long.';
                    isValid = false;
                }
            }

            if (!dueDateVal) { 
                dueDateError.textContent = 'Due date is required.'; 
                isValid = false; 
            } else {
                const selectedDate = new Date(dueDateVal);
                selectedDate.setHours(0, 0, 0, 0);

                const maxAllowedDate = new Date('2027-01-31');
                maxAllowedDate.setHours(0, 0, 0, 0);

                if (selectedDate > maxAllowedDate) {
                    dueDateError.textContent = 'Due date cannot be later than January 31, 2027.';
                    isValid = false;
                }
            }

            if (!isValid) return;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const chosenDue = new Date(dueDateVal);
            chosenDue.setHours(0, 0, 0, 0);
            const initialStatus = chosenDue < today ? 'OVERDUE' : 'ACTIVE';

            const newLoan = {
                id: 'LOAN-' + Date.now().toString().slice(-5),
                studentId: studentIdVal,
                title: itemVal,
                type: itemTypeSelect.value,
                dueDate: dueDateVal,
                status: initialStatus
            };

            try {
                const response = await fetch('/api/loans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newLoan)
                });
                if (response.ok) {
                    showToast('Loan successfully registered!');
                    loanForm.reset();
                    itemInputContainer.innerHTML = '<input type="text" id="dynamic-item-input" placeholder="Select category first..." disabled>';
                    
                    const defaultDue = new Date();
                    defaultDue.setDate(defaultDue.getDate() + 14);
                    const maxLimit = new Date('2027-01-31');
                    const targetDue = defaultDue > maxLimit ? maxLimit : defaultDue;
                    dueDateInput.value = targetDue.toISOString().split('T')[0];

                    loadLoans();
                } else {
                    const errRes = await response.json();
                    showToast(errRes.error || 'Failed to register loan.', 'error');
                }
            } catch (err) {
                console.error('Error adding loan:', err);
                showToast('Error connecting to server database.', 'error');
            }
        });
    }

    if (filterTabs.length > 0) {
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                filterTabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
                e.target.classList.add('active');
                e.target.setAttribute('aria-selected', 'true');
                currentFilter = e.target.getAttribute('data-filter');
                currentPage = 1;
                renderLoans();
            });
        });
    }

    if (tableSearch) {
        tableSearch.addEventListener('input', () => { currentPage = 1; renderLoans(); });
    }

    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', () => {
            if (statusModal) {
                statusModal.hidden = true;
                statusModal.style.display = 'none';
            }
            pendingAction = null;
        });
    }

    if (modalConfirmBtn) {
        modalConfirmBtn.addEventListener('click', async () => {
            if (pendingAction) {
                try {
                    let endpointData = {};
                    if (pendingAction.actionType === 'extend') {
                        endpointData = { dueDate: pendingAction.newDueDate };
                    } else {
                        endpointData = { status: pendingAction.targetStatus };
                    }

                    const response = await fetch(`/api/loans/${pendingAction.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(endpointData)
                    });
                    if (response.ok) {
                        if (pendingAction.actionType === 'payFine') {
                            showToast('Fine settled successfully and item marked as returned!');
                        } else if (pendingAction.actionType === 'extend') {
                            showToast('Loan due date extended successfully!');
                        } else {
                            showToast(`Status updated to ${pendingAction.targetStatus}.`);
                        }
                        loadLoans();
                    } else {
                        showToast('Failed to update record.', 'error');
                    }
                } catch (err) {
                    console.error('Error updating loan record:', err);
                    showToast('Failed to connect to database.', 'error');
                }
            }
            if (statusModal) {
                statusModal.hidden = true;
                statusModal.style.display = 'none';
            }
            pendingAction = null;
        });
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    }
});