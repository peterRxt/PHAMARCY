/**
 * =====================================================
 * MAIN APPLICATION
 * =====================================================
 */

// Initialize app
async function initializeApp() {
    try {
        await db.init();
        console.log('Database initialized');

        await processor.loadOrInitializeData();
        console.log('Data loaded');

        updateDateRangeDisplay();
        setupEventListeners();

        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Error initializing application');
    }
}

/**
 * Update date range display with accuracy info
 */
function updateDateRangeDisplay() {
    const rangeElement = document.getElementById('date-range');
    
    if (!processor.dataRange.minDate || !processor.dataRange.maxDate) {
        rangeElement.textContent = 'No data loaded';
        return;
    }

    const rangeText = getDateRangeString(processor.dataRange.minDate, processor.dataRange.maxDate);
    const totalRecords = processor.originalData.sales.length;
    const totalSales = processor.getTotalSalesUnfiltered();
    
    rangeElement.textContent = `Data Range: ${rangeText} | Records: ${formatNumber(totalRecords)} | Total: ${formatCurrency(totalSales)}`;
}

/**
 * Handle sales file upload
 */
async function handleSalesFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        showLoading(true);
        const salesData = await processor.processSalesFile(file);
        
        if (salesData.length === 0) {
            alert('No valid sales records found in file');
            showLoading(false);
            return;
        }

        const fileTotal = sumBy(salesData, 'amount');
        console.log(`File total sales: ${formatCurrency(fileTotal)}`);

        await processor.appendSalesData(salesData);
        updateDateRangeDisplay();
        
        alert(`Successfully added ${salesData.length} sales records\nFile Total: ${formatCurrency(fileTotal)}`);
    } catch (error) {
        console.error('Error uploading sales file:', error);
        alert('Error uploading sales file: ' + error.message);
    } finally {
        showLoading(false);
        event.target.value = '';
    }
}

/**
 * Handle BC file upload
 */
async function handleBCFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        showLoading(true);
        const bcData = await processor.processBCFile(file);
        
        if (bcData.length === 0) {
            alert('No BC records found in file');
            showLoading(false);
            return;
        }

        await processor.setBCData(bcData);
        
        alert(`Successfully loaded ${bcData.length} BC records`);
    } catch (error) {
        console.error('Error uploading BC file:', error);
        alert('Error uploading BC file: ' + error.message);
    } finally {
        showLoading(false);
        event.target.value = '';
    }
}

/**
 * Handle clear all data
 */
async function handleClearData() {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        return;
    }

    try {
        showLoading(true);
        await processor.clearAllData();
        updateDateRangeDisplay();
        
        document.getElementById('summary-table-container').innerHTML = '';
        document.getElementById('dailysales-table-container').innerHTML = '';
        document.getElementById('margins-table-container').innerHTML = '';
        document.getElementById('fastmoving-table-container').innerHTML = '';
        document.getElementById('slowmoving-table-container').innerHTML = '';
        document.getElementById('cashiers-table-container').innerHTML = '';
        document.getElementById('categories-table-container').innerHTML = '';
        document.getElementById('topcustomers-table-container').innerHTML = '';
        document.getElementById('growth-table-container').innerHTML = '';
        document.getElementById('roadtotarget-table-container').innerHTML = '';
        
        alert('All data cleared successfully');
    } catch (error) {
        console.error('Error clearing data:', error);
        alert('Error clearing data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Handle process data button
 */
async function handleProcessData() {
    try {
        showLoading(true);
        
        if (processor.originalData.sales.length === 0) {
            alert('Please upload sales data first');
            showLoading(false);
            return;
        }

        processor.applyFilters();

        const filteredTotal = sumBy(processor.getFilteredSales(), 'amount');
        console.log(`Filtered sales total: ${formatCurrency(filteredTotal)}`);

        renderDashboard();
        renderSummaryReport();
        renderDailySalesReport('all');
        renderSalesMarginReport('all');
        renderFastMovingProducts('all');
        renderSlowMovingProducts('all');
        renderCashiersReport();
        renderCategoriesReport();
        renderTopCustomersReport('enrolled');
        renderGrowthAnalysis();
        renderRoadToTarget();

        alert('Data processed successfully');
    } catch (error) {
        console.error('Error processing data:', error);
        alert('Error processing data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Handle apply filter
 */
async function handleApplyFilter() {
    try {
        const branch = document.getElementById('branchFilter').value;
        const startDateInput = document.getElementById('startDate').value;
        const endDateInput = document.getElementById('endDate').value;

        const filters = {
            branch: branch
        };

        if (startDateInput) {
            filters.startDate = new Date(startDateInput);
        }

        if (endDateInput) {
            filters.endDate = new Date(endDateInput);
        }

        processor.setFilters(filters);
        await handleProcessData();
    } catch (error) {
        console.error('Error applying filter:', error);
        alert('Error applying filter: ' + error.message);
    }
}

/**
 * Handle reset filter
 */
async function handleResetFilter() {
    try {
        document.getElementById('branchFilter').value = 'all';
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';

        processor.resetFilters();
        await handleProcessData();
    } catch (error) {
        console.error('Error resetting filter:', error);
        alert('Error resetting filter: ' + error.message);
    }
}

/**
 * Update filter display
 */
function updateFilterDisplay() {
    console.log('Filter values updated');
}

/**
 * Handle navigation
 */
function handleNavigation(event) {
    event.preventDefault();
    
    const page = event.currentTarget.getAttribute('data-page');
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) {
        pageElement.classList.add('active');
    }

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');

    const titleText = event.currentTarget.textContent.trim();
    document.getElementById('page-title').textContent = titleText.replace(/[^a-zA-Z\s]/g, '').trim();

    if (page === 'summary') {
        renderSummaryReport();
    } else if (page === 'dailysales') {
        renderDailySalesReport('all');
    } else if (page === 'margins') {
        renderSalesMarginReport('all');
    } else if (page === 'fastmoving') {
        renderFastMovingProducts('all');
    } else if (page === 'slowmoving') {
        renderSlowMovingProducts('all');
    } else if (page === 'cashiers') {
        renderCashiersReport();
    } else if (page === 'categories') {
        renderCategoriesReport();
    } else if (page === 'topcustomers') {
        renderTopCustomersReport('enrolled');
    } else if (page === 'growth') {
        renderGrowthAnalysis();
    } else if (page === 'roadtotarget') {
        renderRoadToTarget();
    } else if (page === 'dashboard') {
        renderDashboard();
    }
}

/**
 * Handle daily sales branch tabs
 */
function setupDailySalesTabs() {
    const tabs = document.querySelectorAll('#dailysales-page .branch-tabs .tab-button');
    tabs.forEach(button => {
        button.addEventListener('click', function() {
            const branch = this.getAttribute('data-branch');
            const container = this.closest('.products-section');
            
            container.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            renderDailySalesReport(branch);
        });
    });
}

/**
 * Handle fast/slow moving branch tabs
 */
function setupBranchTabs() {
    document.querySelectorAll('.branch-tabs .tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const branch = this.getAttribute('data-branch');
            const container = this.closest('.products-section');
            
            container.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const pageId = container.closest('.page').id;
            
            if (pageId === 'margins-page') {
                renderSalesMarginReport(branch);
            } else if (pageId === 'fastmoving-page') {
                renderFastMovingProducts(branch);
            } else if (pageId === 'slowmoving-page') {
                renderSlowMovingProducts(branch);
            }
        });
    });
}

/**
 * Handle top customers tabs
 */
function setupTopCustomersTabs() {
    document.querySelectorAll('.tabs .tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            const container = this.closest('.report-section');
            
            container.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            renderTopCustomersReport(tab);
        });
    });
}

/**
 * Handle export to Excel with comprehensive summary and color coding
 */
function handleExportData() {
    try {
        showLoading(true);

        const summary = reportGenerator.generateSummaryReport();
        const roadToTarget = reportGenerator.generateRoadToTargetReport();
        const dailySales = DailySalesReport.generateDailySalesByBranch();
        const margins = reportGenerator.generateSalesMarginReport('all');
        const fastMoving = reportGenerator.generateFastMovingProducts('all');
        const slowMoving = reportGenerator.generateSlowMovingProducts('all');
        const cashiers = reportGenerator.generateCashiersReport();
        const categories = reportGenerator.generateCategoriesReport();
        const topCustomers = reportGenerator.generateTopCustomersReport('enrolled');
        const growth = reportGenerator.generateGrowthAnalysis();

        const totalSalesDb = sumBy(processor.originalData.sales, 'amount');
        
        const workbook = XLSX.utils.book_new();

        let dataRangeText = 'No data loaded';
        if (processor.dataRange.minDate && processor.dataRange.maxDate) {
            dataRangeText = getDateRangeString(processor.dataRange.minDate, processor.dataRange.maxDate);
        }

        // 0. COMPREHENSIVE SUMMARY SHEET
        const summaryOverview = [
            ['PHARMACY ANALYTICS COMPREHENSIVE REPORT'],
            ['Generated:', new Date().toLocaleString('en-KE')],
            ['Data Range:', dataRangeText],
            ['Total Sales Records:', processor.originalData.sales.length],
            ['Total BC Records:', processor.originalData.bc.length],
            ['VERIFIED TOTAL SALES:', totalSalesDb],
            [],
            ['EXECUTIVE SUMMARY - KEY PERFORMANCE INDICATORS'],
            ['KPI', 'Syokimau', 'Katani', 'Totals', 'Notes'],
        ];

        Object.keys(summary).forEach(kpi => {
            const data = summary[kpi];
            let syokimauVal = data['Syokimau'];
            let kataniVal = data['Katani'];
            let totalsVal = data['Totals'];
            let notes = '';

            if (kpi.includes('Sales')) {
                syokimauVal = roundToTwo(syokimauVal);
                kataniVal = roundToTwo(kataniVal);
                totalsVal = roundToTwo(totalsVal);
                notes = 'In KSh';
            } else if (kpi.includes('%') || kpi.includes('Margin') || kpi.includes('Actual')) {
                syokimauVal = roundToTwo(syokimauVal);
                kataniVal = roundToTwo(kataniVal);
                totalsVal = roundToTwo(totalsVal);
                notes = 'Percentage';
            } else {
                notes = 'Count';
            }

            summaryOverview.push([kpi, syokimauVal, kataniVal, totalsVal, notes]);
        });

        summaryOverview.push([]);
        summaryOverview.push(['PRODUCT MOVEMENT ANALYSIS']);
        summaryOverview.push(['Fast Moving Products (Top 5)', 'Qty Sold', 'Revenue', 'Velocity', 'Margin %']);
        
        const topFastMoving = fastMoving.slice(0, 5);
        topFastMoving.forEach(product => {
            const productMargins = margins.find(m => m.product === product.product);
            const margin = productMargins ? productMargins.marginPercentage : 0;
            summaryOverview.push([
                product.product,
                product.quantity,
                roundToTwo(product.revenue),
                roundToTwo(product.velocity),
                roundToTwo(margin)
            ]);
        });

        summaryOverview.push([]);
        summaryOverview.push(['Slow Moving Products (Top 5)', 'Qty Sold', 'Revenue', 'Velocity', 'Margin %']);
        
        const topSlowMoving = slowMoving.slice(0, 5);
        topSlowMoving.forEach(product => {
            const productMargins = margins.find(m => m.product === product.product);
            const margin = productMargins ? productMargins.marginPercentage : 0;
            summaryOverview.push([
                product.product,
                product.quantity,
                roundToTwo(product.revenue),
                roundToTwo(product.velocity),
                roundToTwo(margin)
            ]);
        });

        summaryOverview.push([]);
        summaryOverview.push(['CASHIER PERFORMANCE (Top 5)', 'Branch', 'Transactions', 'Total Sales', 'Avg Transaction']);
        
        const topCashiers = cashiers.slice(0, 5);
        topCashiers.forEach(cashier => {
            summaryOverview.push([
                cashier.cashier,
                cashier.branch,
                cashier.transactions,
                roundToTwo(cashier.totalSales),
                roundToTwo(cashier.avgTransaction)
            ]);
        });

        summaryOverview.push([]);
        summaryOverview.push(['CATEGORY PERFORMANCE', 'Qty Sold', 'Revenue', 'Avg Price', 'Margin %']);
        
        categories.forEach(cat => {
            summaryOverview.push([
                cat.category,
                cat.quantity,
                roundToTwo(cat.revenue),
                roundToTwo(cat.avgPrice),
                roundToTwo(cat.margin)
            ]);
        });

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryOverview);
        summarySheet['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        
        for (let i = 0; i < 5; i++) {
            const cell = summarySheet[XLSX.utils.encode_cell({r: 0, c: i})];
            if (cell) {
                cell.fill = { fgColor: { rgb: 'FF2563EB' } };
                cell.font = { bold: true, color: { rgb: 'FFFFFFFF' }, size: 12 };
            }
        }

        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

        // 1. Daily Sales Sheet
        const dailySalesData = [['Date', 'Day', 'Branch', 'Total Sales', 'Transactions', 'Unique Invoices', 'Avg Sale/Transaction']];
        dailySales.forEach(item => {
            dailySalesData.push([
                item.dateFormatted,
                item.dayName,
                item.branch,
                roundToTwo(item.totalSales),
                item.transactions,
                item.uniqueInvoices,
                roundToTwo(item.totalSales / item.transactions)
            ]);
        });

        const dailySalesSheet = XLSX.utils.aoa_to_sheet(dailySalesData);
        dailySalesSheet['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 }];
        
        for (let i = 0; i < 7; i++) {
            const cell = dailySalesSheet[XLSX.utils.encode_cell({r: 0, c: i})];
            if (cell) {
                cell.fill = { fgColor: { rgb: 'FF059669' } };
                cell.font = { bold: true, color: { rgb: 'FFFFFFFF' } };
            }
        }

        for (let i = 1; i < dailySalesData.length; i++) {
            for (let j = 0; j < 7; j++) {
                const cell = dailySalesSheet[XLSX.utils.encode_cell({r: i, c: j})];
                if (cell && i % 2 === 0) {
                    cell.fill = { fgColor: { rgb: 'FFF0FDF4' } };
                }
                if (j === 1 && (dailySalesData[i][1] === 'Saturday' || dailySalesData[i][1] === 'Sunday')) {
                    if (!cell) dailySalesSheet[XLSX.utils.encode_cell({r: i, c: j})] = {};
                    dailySalesSheet[XLSX.utils.encode_cell({r: i, c: j})].fill = { fgColor: { rgb: 'FFFFFF99' } };
                }
            }
        }

        XLSX.utils.book_append_sheet(workbook, dailySalesSheet, 'Daily Sales');

        // 2. Road to Target Sheet
        const roadData = [['Month', 'Branch', 'Sales', 'Target', 'Remaining', '% Achieved', 'Days Recorded', 'Status']];
        roadToTarget.forEach(item => {
            roadData.push([
                item.month,
                item.branch,
                roundToTwo(item.sales),
                roundToTwo(item.target),
                roundToTwo(item.remaining),
                roundToTwo(item.percentage),
                `${item.daysRecorded}/${item.totalDays}`,
                item.status
            ]);
        });
        const roadSheet = XLSX.utils.aoa_to_sheet(roadData);
        roadSheet['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
        
        for (let i = 0; i < 8; i++) {
            const cell = roadSheet[XLSX.utils.encode_cell({r: 0, c: i})];
            if (cell) {
                cell.fill = { fgColor: { rgb: 'FF3B82F6' } };
                cell.font = { bold: true, color: { rgb: 'FFFFFFFF' } };
            }
        }

        for (let i = 1; i < roadData.length; i++) {
            const percentage = roadData[i][5];
            const cell = roadSheet[XLSX.utils.encode_cell({r: i, c: 5})];
            if (cell) {
                if (percentage >= 100) {
                    cell.fill = { fgColor: { rgb: 'FFD1FAE5' } };
                } else if (percentage >= 75) {
                    cell.fill = { fgColor: { rgb: 'FFFEF3C7' } };
                } else {
                    cell.fill = { fgColor: { rgb: 'FFfee2e2' } };
                }
            }
            
            const statusCell = roadSheet[XLSX.utils.encode_cell({r: i, c: 7})];
            if (statusCell) {
                if (roadData[i][7] === 'Achieved') {
                    statusCell.fill = { fgColor: { rgb: 'FFD1FAE5' } };
                    statusCell.font = { bold: true, color: { rgb: 'FF065F46' } };
                } else if (roadData[i][7] === 'In Progress') {
                    statusCell.fill = { fgColor: { rgb: 'FFFEF3C7' } };
                    statusCell.font = { bold: true, color: { rgb: 'FF92400E' } };
                } else {
                    statusCell.fill = { fgColor: { rgb: 'FFFEE2E2' } };
                    statusCell.font = { bold: true, color: { rgb: 'FF7F1D1D' } };
                }
            }
        }

        XLSX.utils.book_append_sheet(workbook, roadSheet, 'Road to Target');

        // 3. Sales Margins Sheet
        const marginsData = [['Product', 'Category', 'Qty Sold', 'Avg Selling Price', 'Avg Cost Price', 'Total Sales', 'Total Cost', 'Profit', 'Margin %']];
        margins.forEach(item => {
            marginsData.push([
                item.product,
                item.category,
                item.quantity,
                roundToTwo(item.avgSellingPrice),
                roundToTwo(item.avgCostPrice),
                roundToTwo(item.totalSales),
                roundToTwo(item.totalCost),
                roundToTwo(item.totalMargin),
                roundToTwo(item.marginPercentage)
            ]);
        });
        const marginsSheet = XLSX.utils.aoa_to_sheet(marginsData);
        marginsSheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
        
        for (let i = 0; i < 9; i++) {
            const cell = marginsSheet[XLSX.utils.encode_cell({r: 0, c: i})];
            if (cell) {
                cell.fill = { fgColor: { rgb: 'FF8B5CF6' } };
                cell.font = { bold: true, color: { rgb: 'FFFFFFFF' } };
            }
        }

        for (let i = 1; i < marginsData.length; i++) {
            const margin = marginsData[i][8];
            const cell = marginsSheet[XLSX.utils.encode_cell({r: i, c: 8})];
            if (cell) {
                if (margin >= 30) {
                    cell.fill = { fgColor: { rgb: 'FFD1FAE5' } };
                    cell.font = { bold: true, color: { rgb: 'FF065F46' } };
                } else if (margin >= 15) {
                    cell.fill = { fgColor: { rgb: 'FFFEF3C7' } };
                    cell.font = { bold: true, color: { rgb: 'FF92400E' } };
                } else {
                    cell.fill = { fgColor: { rgb: 'FFFEE2E2' } };
                    cell.font = { bold: true, color: { rgb: 'FF7F1D1D' } };
                }
            }
        }

        XLSX.utils.book_append_sheet(workbook, marginsSheet, 'Sales Margins');

        // 4. Fast Moving Products Sheet
        const fastData = [['Product', 'Qty Sold', 'Revenue', 'Transactions', 'Velocity (per day)', 'Avg Price']];
        fastMoving.forEach(item => {
            fastData.push([
                item.product,
                item.quantity,
                roundToTwo(item.revenue),
                item.transactions,
                roundToTwo(item.velocity),
                roundToTwo(item.avgPrice)
            ]);
        });
        const fastSheet = XLSX.utils.aoa_to_sheet(fastData);
        fastSheet['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }];
        
        for (let i = 0; i < 6; i++) {
            const cell = fastSheet[XLSX.utils.encode_cell({r: 0, c: i})];
            if (cell) {
                cell.fill = { fgColor: { rgb: 'FF10B981' } };
                cell.font = { bold: true, color: { rgb: 'FFFFFFFF' } };
            }
        }

        for (let i = 1; i < fastData.length; i++) {
            for (let j = 0; j < 6; j++) {
                const cell = fastSheet[XLSX.utils.encode_cell({r: i, c: j})];
                if (cell && i % 2 === 0) {
                    cell.fill = { fgColor: { rgb: 'FFF0FDF4' } };
                }
            }
        }

        XLSX.utils.book_append_sheet(workbook, fastSheet, 'Fast Moving Products');

        // 5. Slow Moving Products Sheet
        const slowData = [['Product', 'Qty Sold', 'Revenue', 'Transactions', 'Velocity (per day)', 'Avg Price']];
        slowMoving.forEach(item => {
            slowData.push([
                item.product,
                item.quantity,
                roundToTwo(item.revenue),
                item.transactions,
                roundToTwo(item.velocity),
                roundToTwo(item.avgPrice)
            ]);
        });
        const slowSheet = XLSX.utils.aoa_to_sheet(slowData);
        slowSheet['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }];
        
        for (let i = 0; i < 6; i++) {
            const cell = slowSheet[XLSX.utils.encode_cell({r: 0, c: i})];
            if (cell) {
                cell.fill = { fgColor: { rgb: 'FFF59E0B' } };
                cell.font = { bold: true, color: { rgb: 'FFFFFFFF' } };
            }
        }

        for (let i = 1; i < slowData.length; i++) {
            for (let j = 0; j < 6; j++) {
                const cell = slowSheet[XLSX.utils.encode_cell({r: i, c: j})];
                if (cell && i % 2 === 0) {
                    cell.fill = { fgColor: { rgb: 'FFFFFBEB' } };
                }
            }
        }

        XLSX.utils.book_append_sheet(workbook, slowSheet, 'Slow Moving Products');

        // 6. Cashiers Report Sheet
        const cashierData = [['Cashier', 'Branch', 'Transactions', 'Total Sales', 'Avg Transaction']];
        cashiers.forEach(item => {
            cashierData.push([
                item.cashier,
                item.branch,
                item.transactions,
                roundToTwo(item.totalSales),
                roundToTwo(item.avgTransaction)
            ]);
        });
        const cashierSheet = XLSX.utils.aoa_to_sheet(cashierData);
        cashierSheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        
        for (let i = 0; i < 5; i++) {
            const cell = cashierSheet[XLSX.utils.encode_cell({r: 0, c: i})];
            if (cell) {
                cell.fill = { fgColor: { rgb: 'FF0891B2' } };
                cell.font = { bold: true, color: { rgb: 'FFFFFFFF' } };
            }
        }

        for (let i = 1; i < cashierData.length; i++) {
            for (let j = 0; j < 5; j++) {
                const cell = cashierSheet[XLSX.utils.encode_cell({r: i, c: j})];
                if (cell && i % 2 === 0) {
                    cell.fill = { fgColor: { rgb: 'FFF0F9FA' } };
                }
            }
        }

        XLSX.utils.book_append_sheet(workbook, cashierSheet, 'Cashiers Report');

        // 7. Categories Sheet
        const categoryData = [['Category', 'Qty Sold', 'Revenue', 'Transactions', 'Avg Price', 'Margin %']];
        categories.forEach(item => {
            categoryData.push([
                item.category,
                item.quantity,
                roundToTwo(item.revenue),
                item.transactions,
                roundToTwo(item.avgPrice),
                roundToTwo(item.margin)
            ]);
        });
        const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
        categorySheet['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
        
        for (let i = 0; i < 6; i++) {
            const cell = categorySheet[XLSX.utils.encode_cell({r: 0, c: i})];
            if (cell) {
                cell.fill = { fgColor: { rgb: 'FF6366F1' } };
                cell.font = { bold: true, color: { rgb: 'FFFFFFFF' } };
            }
        }

        for (let i = 1; i < categoryData.length; i++) {
            const margin = categoryData[i][5];
            const cell = categorySheet[XLSX.utils.encode_cell({r: i, c: 5})];
            if (cell) {
                if (margin >= 30) {
                    cell.fill = { fgColor: { rgb: 'FFD1FAE5' } };
                    cell.font = { bold: true, color: { rgb: 'FF065F46' } };
                } else if (margin >= 15) {
                    cell.fill = { fgColor: { rgb: 'FFFEF3C7' } };
                    cell.font = { bold: true, color: { rgb: 'FF92400E' } };
                } else {
                    cell.fill = { fgColor: { rgb: 'FFFEE2E2' } };
                    cell.font = { bold: true, color: { rgb: 'FF7F1D1D' } };
                }
            }
        }

        XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categories');

        // 8. Top Customers Sheet
        const customerData = [['Customer', 'Transactions', 'Total Spent', 'Avg Transaction', 'Last Visit']];
        topCustomers.forEach(item => {
            customerData.push([
                item.customer,
                item.transactions,
                roundToTwo(item.totalSpent),
                roundToTwo(item.avgTransaction),
                formatDate(item.lastVisit)
            ]);
        });
        const customerSheet = XLSX.utils.aoa_to_sheet(customerData);
        customerSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        
        for (let i = 0; i < 5; i++) {
            const cell = customerSheet[XLSX.utils.encode_cell({r: 0, c: i})];
            if (cell) {
                cell.fill = { fgColor: { rgb: 'FFD97706' } };
                cell.font = { bold: true, color: { rgb: 'FFFFFFFF' } };
            }
        }

        const maxSpent = Math.max(...topCustomers.map(c => c.totalSpent));
        for (let i = 1; i < customerData.length; i++) {
            const spent = customerData[i][2];
            const percentage = (spent / maxSpent) * 100;
            const cell = customerSheet[XLSX.utils.encode_cell({r: i, c: 2})];
            if (cell) {
                if (percentage >= 80) {
                    cell.fill = { fgColor: { rgb: 'FFD1FAE5' } };
                } else if (percentage >= 50) {
                    cell.fill = { fgColor: { rgb: 'FFFEF3C7' } };
                } else {
                    cell.fill = { fgColor: { rgb: 'FFF3F4F6' } };
                }
            }
        }

        XLSX.utils.book_append_sheet(workbook, customerSheet, 'Top Customers');

        // 9. Growth Analysis Sheet
        const growthData = [['Month', 'Sales', 'Transactions', 'Unique Customers', 'Growth Amount', 'Growth Rate %']];
        growth.forEach(item => {
            growthData.push([
                item.month,
                roundToTwo(item.sales),
                item.transactions,
                item.uniqueCustomers,
                roundToTwo(item.growth),
                roundToTwo(item.growthRate)
            ]);
        });
        const growthSheet = XLSX.utils.aoa_to_sheet(growthData);
        growthSheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 }];
        
        for (let i = 0; i < 6; i++) {
            const cell = growthSheet[XLSX.utils.encode_cell({r: 0, c: i})];
            if (cell) {
                cell.fill = { fgColor: { rgb: 'FF7C3AED' } };
                cell.font = { bold: true, color: { rgb: 'FFFFFFFF' } };
            }
        }

        for (let i = 1; i < growthData.length; i++) {
            const growthRate = growthData[i][5];
            const cell = growthSheet[XLSX.utils.encode_cell({r: i, c: 5})];
            if (cell) {
                if (growthRate > 0) {
                    cell.fill = { fgColor: { rgb: 'FFD1FAE5' } };
                    cell.font = { bold: true, color: { rgb: 'FF065F46' } };
                } else if (growthRate === 0) {
                    cell.fill = { fgColor: { rgb: 'FFF3F4F6' } };
                } else {
                    cell.fill = { fgColor: { rgb: 'FFFEE2E2' } };
                    cell.font = { bold: true, color: { rgb: 'FF7F1D1D' } };
                }
            }
        }

        XLSX.utils.book_append_sheet(workbook, growthSheet, 'Growth Analysis');

        // Generate and download file
        const fileName = `Pharmacy_Report_${formatDateISO(new Date())}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        alert(`Report exported successfully!\n\nVERIFICATION:\nTotal Sales in System: ${formatCurrency(totalSalesDb)}`);
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Error exporting report: ' + error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Show/hide loading indicator
 */
function showLoading(show) {
    const indicator = document.getElementById('loadingIndicator');
    if (show) {
        indicator.classList.remove('hidden');
    } else {
        indicator.classList.add('hidden');
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // File uploads
    document.getElementById('salesFileInput').addEventListener('change', handleSalesFileUpload);
    document.getElementById('bcFileInput').addEventListener('change', handleBCFileUpload);

    // Buttons
    document.getElementById('clearDataBtn').addEventListener('click', handleClearData);
    document.getElementById('processDataBtn').addEventListener('click', handleProcessData);
    document.getElementById('applyFilterBtn').addEventListener('click', handleApplyFilter);
    document.getElementById('resetFilterBtn').addEventListener('click', handleResetFilter);
    document.getElementById('exportDataBtn').addEventListener('click', handleExportData);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });

    // Set up tabs
    setTimeout(setupDailySalesTabs, 100);
    setTimeout(setupBranchTabs, 100);
    setTimeout(setupTopCustomersTabs, 100);

    // Filter changes
    document.getElementById('branchFilter').addEventListener('change', updateFilterDisplay);
    document.getElementById('startDate').addEventListener('change', updateFilterDisplay);
    document.getElementById('endDate').addEventListener('change', updateFilterDisplay);
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

console.log('✅ App loaded successfully with complete functionality');