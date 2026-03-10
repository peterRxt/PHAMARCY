/**
 * =====================================================
 * REPORTS GENERATION
 * =====================================================
 */

class ReportGenerator {
    constructor() {
        this.reports = {};
    }

    /**
     * Generate summary report
     */
    generateSummaryReport() {
        const sales = processor.getFilteredSales();

        const kataniSales = sales.filter(s => String(s.service_point).trim() === 'Katani Pharmacy');
        const syokimauSales = sales.filter(s => String(s.service_point).trim() === 'Pharmacy POS');

        const totalSalesKatani = sumBy(kataniSales, 'amount');
        const totalSalesSyokimau = sumBy(syokimauSales, 'amount');
        const totalSalesAll = totalSalesKatani + totalSalesSyokimau;

        const clientsKatani = this.getUniqueInvoices(kataniSales).size;
        const clientsSyokimau = this.getUniqueInvoices(syokimauSales).size;
        const clientsAll = clientsKatani + clientsSyokimau;

        const marginKatani = this.calculateGrossMargin(kataniSales);
        const marginSyokimau = this.calculateGrossMargin(syokimauSales);
        const marginAll = this.calculateGrossMargin(sales);

        const targetKatani = this.calculateTargetPercentage(kataniSales, 'Katani Pharmacy');
        const targetSyokimau = this.calculateTargetPercentage(syokimauSales, 'Pharmacy POS');
        const targetAll = this.calculateTargetPercentage(sales, 'all');

        const enrolledKatani = this.getEnrolledCustomers(kataniSales);
        const enrolledSyokimau = this.getEnrolledCustomers(syokimauSales);
        const enrolledAll = enrolledKatani + enrolledSyokimau;

        const newCustomersKatani = this.calculateNewCustomerPercentage(kataniSales);
        const newCustomersSyokimau = this.calculateNewCustomerPercentage(syokimauSales);
        const newCustomersAll = this.calculateNewCustomerPercentage(sales);

        const repeatKatani = this.calculateRepeatCustomerPercentage(kataniSales);
        const repeatSyokimau = this.calculateRepeatCustomerPercentage(syokimauSales);
        const repeatAll = this.calculateRepeatCustomerPercentage(sales);

        return {
            'Total Sales': {
                'Syokimau': totalSalesSyokimau,
                'Katani': totalSalesKatani,
                'Totals': totalSalesAll
            },
            'Number of Clients Served': {
                'Syokimau': clientsSyokimau,
                'Katani': clientsKatani,
                'Totals': clientsAll
            },
            'Gross Margin of Sales (%)': {
                'Syokimau': marginSyokimau,
                'Katani': marginKatani,
                'Totals': marginAll
            },
            '% Actual vs Forecast': {
                'Syokimau': targetSyokimau,
                'Katani': targetKatani,
                'Totals': targetAll
            },
            'Enrolled Customers': {
                'Syokimau': enrolledSyokimau,
                'Katani': enrolledKatani,
                'Totals': enrolledAll
            },
            '% of New Customers': {
                'Syokimau': newCustomersSyokimau,
                'Katani': newCustomersKatani,
                'Totals': newCustomersAll
            },
            '% of Repeat Customers': {
                'Syokimau': repeatSyokimau,
                'Katani': repeatKatani,
                'Totals': repeatAll
            }
        };
    }

    /**
     * Get unique invoices
     */
    getUniqueInvoices(sales) {
        return new Set(sales.map(s => s.invoice_no).filter(inv => inv));
    }

    /**
     * Calculate gross margin
     */
    calculateGrossMargin(sales) {
        if (!sales || sales.length === 0) return 0;

        let totalRevenue = 0;
        let totalCost = 0;

        sales.forEach(sale => {
            const marginCalc = processor.calculateSaleMargin(sale);
            totalRevenue += marginCalc.sellingPrice;
            totalCost += marginCalc.costPrice;
        });

        if (totalRevenue === 0) return 0;
        const margin = ((totalRevenue - totalCost) / totalRevenue) * 100;
        return roundToTwo(Math.max(0, margin));
    }

    /**
     * Calculate target percentage
     */
    calculateTargetPercentage(sales, branch) {
        if (!sales || sales.length === 0) return 0;

        const totalSales = sumBy(sales, 'amount');
        
        let firstValidDate = null;
        for (let sale of sales) {
            if (sale.parsedDate && sale.parsedDate instanceof Date && isValidDate(sale.parsedDate)) {
                firstValidDate = sale.parsedDate;
                break;
            }
        }
        
        if (!firstValidDate) return 0;

        const month = firstValidDate.getMonth() + 1;
        const year = firstValidDate.getFullYear();
        const monthDays = daysInMonth(year, month);

        let branches = [];
        if (branch === 'all') {
            branches = ['Katani Pharmacy', 'Pharmacy POS'];
        } else {
            branches = [branch];
        }

        let totalTarget = 0;
        branches.forEach(b => {
            const dailyTarget = getDailyTarget(b, month);
            totalTarget += dailyTarget * monthDays;
        });

        if (totalTarget === 0) return 0;
        return roundToTwo((totalSales / totalTarget) * 100);
    }

    /**
     * Get enrolled customers count
     */
    getEnrolledCustomers(sales) {
        const uniqueCustomers = new Set();
        sales.forEach(sale => {
            if (sale.customer_name && !isWalkInCustomer(sale.customer_name)) {
                uniqueCustomers.add(sale.customer_name);
            }
        });
        return uniqueCustomers.size;
    }

    /**
     * Calculate new customer percentage
     */
    calculateNewCustomerPercentage(sales) {
        if (!sales || sales.length === 0) return 0;

        const totalCustomers = new Set(
            sales
                .map(s => s.customer_name)
                .filter(name => name && !isWalkInCustomer(name))
        ).size;

        if (totalCustomers === 0) return 0;

        const customerFirstTransaction = {};
        const sortedSales = sortBy(sales, 'parsedDate');

        sortedSales.forEach(sale => {
            const customer = sale.customer_name;
            if (customer && !isWalkInCustomer(customer)) {
                if (!customerFirstTransaction[customer]) {
                    customerFirstTransaction[customer] = sale.parsedDate;
                }
            }
        });

        return roundToTwo((Object.keys(customerFirstTransaction).length / totalCustomers) * 100);
    }

    /**
     * Calculate repeat customer percentage
     */
    calculateRepeatCustomerPercentage(sales) {
        if (!sales || sales.length === 0) return 0;

        const customerTransactions = {};
        sales.forEach(sale => {
            const customer = sale.customer_name;
            if (customer && !isWalkInCustomer(customer)) {
                customerTransactions[customer] = (customerTransactions[customer] || 0) + 1;
            }
        });

        const repeatCount = Object.values(customerTransactions).filter(count => count > 1).length;
        const totalCustomers = Object.keys(customerTransactions).length;

        if (totalCustomers === 0) return 0;
        return roundToTwo((repeatCount / totalCustomers) * 100);
    }

    /**
     * Generate sales margins report
     */
    generateSalesMarginReport(branchFilter = 'all') {
        let sales = processor.getFilteredSales();

        if (!sales || sales.length === 0) return [];

        if (branchFilter !== 'all') {
            sales = sales.filter(s => String(s.service_point).trim() === branchFilter);
        }

        const productMargins = {};
        
        sales.forEach(sale => {
            const product = sale.product || 'Unknown';
            const marginCalc = processor.calculateSaleMargin(sale);

            if (!productMargins[product]) {
                productMargins[product] = {
                    product: product,
                    category: sale.category || 'Uncategorized',
                    quantity: 0,
                    totalSales: 0,
                    totalCost: 0,
                    totalMargin: 0,
                    marginPercentage: 0,
                    avgSellingPrice: 0,
                    avgCostPrice: 0,
                    transactions: 0,
                    branch: branchFilter === 'all' ? 'All' : branchFilter
                };
            }

            productMargins[product].quantity += sale.qty || 0;
            productMargins[product].totalSales += marginCalc.sellingPrice;
            productMargins[product].totalCost += marginCalc.costPrice;
            productMargins[product].totalMargin += marginCalc.margin;
            productMargins[product].transactions += 1;
        });

        Object.keys(productMargins).forEach(product => {
            const metrics = productMargins[product];
            metrics.avgSellingPrice = roundToTwo(metrics.totalSales / metrics.transactions) || 0;
            metrics.avgCostPrice = roundToTwo(metrics.totalCost / metrics.quantity) || 0;
            
            if (metrics.totalSales > 0) {
                metrics.marginPercentage = roundToTwo((metrics.totalMargin / metrics.totalSales) * 100);
            } else {
                metrics.marginPercentage = 0;
            }
        });

        return sortBy(Object.values(productMargins), '-marginPercentage', '-totalSales');
    }

    /**
     * Generate fast moving products
     */
    generateFastMovingProducts(branchFilter = 'all') {
        let sales = processor.getFilteredSales();

        if (!sales || sales.length === 0) return [];

        if (branchFilter !== 'all') {
            sales = sales.filter(s => String(s.service_point).trim() === branchFilter);
        }

        const productMetrics = {};
        sales.forEach(sale => {
            const product = sale.product || 'Unknown';
            if (!productMetrics[product]) {
                productMetrics[product] = {
                    product: product,
                    quantity: 0,
                    revenue: 0,
                    transactions: 0,
                    avgPrice: 0,
                    velocity: 0
                };
            }
            productMetrics[product].quantity += sale.qty || 0;
            productMetrics[product].revenue += sale.amount || 0;
            productMetrics[product].transactions += 1;
        });

        const minDate = processor.dataRange.minDate;
        const maxDate = processor.dataRange.maxDate;
        
        let dayRange = 1;
        if (minDate && maxDate && minDate instanceof Date && maxDate instanceof Date && isValidDate(minDate) && isValidDate(maxDate)) {
            dayRange = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));
        }

        Object.keys(productMetrics).forEach(product => {
            const metrics = productMetrics[product];
            metrics.avgPrice = roundToTwo(metrics.revenue / metrics.quantity) || 0;
            metrics.velocity = roundToTwo(metrics.transactions / dayRange);
        });

        return sortBy(Object.values(productMetrics), '-velocity', '-revenue').slice(0, 20);
    }

    /**
     * Generate slow moving products
     */
    generateSlowMovingProducts(branchFilter = 'all') {
        let sales = processor.getFilteredSales();

        if (!sales || sales.length === 0) return [];

        if (branchFilter !== 'all') {
            sales = sales.filter(s => String(s.service_point).trim() === branchFilter);
        }

        const productMetrics = {};
        sales.forEach(sale => {
            const product = sale.product || 'Unknown';
            if (!productMetrics[product]) {
                productMetrics[product] = {
                    product: product,
                    quantity: 0,
                    revenue: 0,
                    transactions: 0,
                    avgPrice: 0,
                    velocity: 0
                };
            }
            productMetrics[product].quantity += sale.qty || 0;
            productMetrics[product].revenue += sale.amount || 0;
            productMetrics[product].transactions += 1;
        });

        const minDate = processor.dataRange.minDate;
        const maxDate = processor.dataRange.maxDate;
        
        let dayRange = 1;
        if (minDate && maxDate && minDate instanceof Date && maxDate instanceof Date && isValidDate(minDate) && isValidDate(maxDate)) {
            dayRange = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));
        }

        Object.keys(productMetrics).forEach(product => {
            const metrics = productMetrics[product];
            metrics.avgPrice = roundToTwo(metrics.revenue / metrics.quantity) || 0;
            metrics.velocity = roundToTwo(metrics.transactions / dayRange);
        });

        return sortBy(Object.values(productMetrics), 'velocity', 'revenue').slice(0, 20);
    }

    /**
     * Generate cashiers report
     */
    generateCashiersReport() {
        const sales = processor.getFilteredSales();

        if (!sales || sales.length === 0) return [];

        const cashierMetrics = {};
        sales.forEach(sale => {
            const cashier = sale.user || 'Unknown';
            if (!cashierMetrics[cashier]) {
                cashierMetrics[cashier] = {
                    cashier: cashier,
                    transactions: 0,
                    totalSales: 0,
                    avgTransaction: 0,
                    branch: sale.service_point
                };
            }
            cashierMetrics[cashier].transactions += 1;
            cashierMetrics[cashier].totalSales += sale.amount || 0;
        });

        Object.keys(cashierMetrics).forEach(cashier => {
            const metrics = cashierMetrics[cashier];
            metrics.avgTransaction = roundToTwo(metrics.totalSales / metrics.transactions);
        });

        return sortBy(Object.values(cashierMetrics), '-totalSales');
    }

    /**
     * Generate categories report
     */
    generateCategoriesReport() {
        const sales = processor.getFilteredSales();

        if (!sales || sales.length === 0) return [];

        const categoryMetrics = {};
        sales.forEach(sale => {
            const category = sale.category || 'Uncategorized';
            if (!categoryMetrics[category]) {
                categoryMetrics[category] = {
                    category: category,
                    quantity: 0,
                    revenue: 0,
                    transactions: 0,
                    avgPrice: 0,
                    margin: 0
                };
            }
            categoryMetrics[category].quantity += sale.qty || 0;
            categoryMetrics[category].revenue += sale.amount || 0;
            categoryMetrics[category].transactions += 1;
        });

        Object.keys(categoryMetrics).forEach(category => {
            const metrics = categoryMetrics[category];
            metrics.avgPrice = roundToTwo(metrics.revenue / metrics.quantity) || 0;
            
            let cost = 0;
            sales
                .filter(s => s.category === category)
                .forEach(sale => {
                    const marginCalc = processor.calculateSaleMargin(sale);
                    cost += marginCalc.costPrice;
                });

            if (metrics.revenue > 0) {
                metrics.margin = roundToTwo(((metrics.revenue - cost) / metrics.revenue) * 100);
            }
        });

        return sortBy(Object.values(categoryMetrics), '-revenue');
    }

    /**
     * Generate top customers report
     */
    generateTopCustomersReport(customerType = 'enrolled') {
        const sales = processor.getFilteredSales();

        if (!sales || sales.length === 0) return [];

        let filteredSales = sales;
        if (customerType === 'enrolled') {
            filteredSales = sales.filter(s => !isWalkInCustomer(s.customer_name));
        } else if (customerType === 'walkin') {
            filteredSales = sales.filter(s => isWalkInCustomer(s.customer_name));
        }

        const customerMetrics = {};
        filteredSales.forEach(sale => {
            const customer = sale.customer_name || 'Unknown';
            if (!customerMetrics[customer]) {
                customerMetrics[customer] = {
                    customer: customer,
                    transactions: 0,
                    totalSpent: 0,
                    avgTransaction: 0,
                    lastVisit: sale.parsedDate
                };
            }
            customerMetrics[customer].transactions += 1;
            customerMetrics[customer].totalSpent += sale.amount || 0;
            if (sale.parsedDate && sale.parsedDate > customerMetrics[customer].lastVisit) {
                customerMetrics[customer].lastVisit = sale.parsedDate;
            }
        });

        Object.keys(customerMetrics).forEach(customer => {
            const metrics = customerMetrics[customer];
            metrics.avgTransaction = roundToTwo(metrics.totalSpent / metrics.transactions);
        });

        return sortBy(Object.values(customerMetrics), '-totalSpent').slice(0, 50);
    }

    /**
     * Generate growth analysis
     */
    generateGrowthAnalysis() {
        const sales = processor.getFilteredSales();

        if (!sales || sales.length === 0) return [];

        const monthlyData = {};
        sales.forEach(sale => {
            if (!sale.parsedDate || !(sale.parsedDate instanceof Date) || !isValidDate(sale.parsedDate)) return;
            
            const components = getDateComponents(sale.parsedDate);
            const monthKey = `${components.year}-${String(components.month).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    month: monthKey,
                    sales: 0,
                    transactions: 0,
                    customers: new Set(),
                    growth: 0,
                    growthRate: 0
                };
            }
            monthlyData[monthKey].sales += sale.amount || 0;
            monthlyData[monthKey].transactions += 1;
            monthlyData[monthKey].customers.add(sale.customer_name);
        });

        const sortedMonths = Object.keys(monthlyData).sort();
        const result = [];

        sortedMonths.forEach((monthKey, index) => {
            const data = monthlyData[monthKey];
            const [year, month] = monthKey.split('-');

            if (index > 0) {
                const prevData = monthlyData[sortedMonths[index - 1]];
                const growth = data.sales - prevData.sales;
                const growthRate = prevData.sales > 0 ? (growth / prevData.sales) * 100 : 0;

                data.growth = growth;
                data.growthRate = roundToTwo(growthRate);
            }

            result.push({
                month: `${getMonthName(parseInt(month))} ${year}`,
                sales: roundToTwo(data.sales),
                transactions: data.transactions,
                uniqueCustomers: data.customers.size,
                growth: roundToTwo(data.growth),
                growthRate: data.growthRate
            });
        });

        return result;
    }

    /**
     * Generate road to target report
     */
    generateRoadToTargetReport() {
        const sales = processor.getFilteredSales();

        if (!sales || sales.length === 0) return [];

        const monthlyData = {};
        sales.forEach(sale => {
            if (!sale.parsedDate || !(sale.parsedDate instanceof Date) || !isValidDate(sale.parsedDate)) return;
            
            const components = getDateComponents(sale.parsedDate);
            const monthKey = `${components.year}-${String(components.month).padStart(2, '0')}`;
            const branch = sale.service_point;

            const key = `${monthKey}_${branch}`;
            if (!monthlyData[key]) {
                monthlyData[key] = {
                    month: monthKey,
                    branch: branch,
                    sales: 0,
                    daysWithSales: new Set(),
                    transactions: 0
                };
            }
            monthlyData[key].sales += sale.amount || 0;
            monthlyData[key].daysWithSales.add(formatDateISO(sale.parsedDate));
            monthlyData[key].transactions += 1;
        });

        const result = [];
        const sortedKeys = Object.keys(monthlyData).sort();

        sortedKeys.forEach(key => {
            const data = monthlyData[key];
            const [year, month] = data.month.split('-');
            const monthNum = parseInt(month);
            const yearNum = parseInt(year);

            const dailyTarget = getDailyTarget(data.branch, monthNum);
            const daysInCurrentMonth = daysInMonth(yearNum, monthNum);
            const monthlyTarget = dailyTarget * daysInCurrentMonth;

            const daysRecorded = data.daysWithSales.size;
            
            let estimatedMonthlyTarget = monthlyTarget;
            if (daysRecorded > 0) {
                estimatedMonthlyTarget = (data.sales / daysRecorded) * daysInCurrentMonth;
            }

            const isComplete = daysRecorded === daysInCurrentMonth;
            const targetAchieved = data.sales >= estimatedMonthlyTarget;
            const remaining = Math.max(0, estimatedMonthlyTarget - data.sales);
            const percentage = estimatedMonthlyTarget > 0 ? roundToTwo((data.sales / estimatedMonthlyTarget) * 100) : 0;

            result.push({
                month: `${getMonthName(monthNum)} ${year}`,
                branch: data.branch,
                sales: roundToTwo(data.sales),
                target: roundToTwo(estimatedMonthlyTarget),
                remaining: roundToTwo(remaining),
                percentage: percentage,
                daysRecorded: daysRecorded,
                totalDays: daysInCurrentMonth,
                status: isComplete ? (targetAchieved ? 'Achieved' : 'Not Achieved') : 'In Progress',
                targetStatus: targetAchieved ? 'On Track' : 'Behind'
            });
        });

        return result;
    }
}

const reportGenerator = new ReportGenerator();

/**
 * Render Summary Report
 */
function renderSummaryReport() {
    const summary = reportGenerator.generateSummaryReport();

    let html = `<table>
        <thead>
            <tr>
                <th>KPI</th>
                <th>Syokimau</th>
                <th>Katani</th>
                <th>Totals</th>
            </tr>
        </thead>
        <tbody>`;

    Object.keys(summary).forEach(kpi => {
        const data = summary[kpi];
        
        let syokimauVal = data['Syokimau'];
        let kataniVal = data['Katani'];
        let totalsVal = data['Totals'];
        
        if (kpi.includes('Sales')) {
            syokimauVal = formatCurrency(syokimauVal);
            kataniVal = formatCurrency(kataniVal);
            totalsVal = formatCurrency(totalsVal);
        } else if (kpi.includes('%') || kpi.includes('Margin') || kpi.includes('Actual')) {
            syokimauVal = roundToTwo(syokimauVal).toFixed(2) + '%';
            kataniVal = roundToTwo(kataniVal).toFixed(2) + '%';
            totalsVal = roundToTwo(totalsVal).toFixed(2) + '%';
        } else {
            syokimauVal = formatNumber(syokimauVal);
            kataniVal = formatNumber(kataniVal);
            totalsVal = formatNumber(totalsVal);
        }
        
        html += `<tr>
            <td class="font-bold">${kpi}</td>
            <td>${syokimauVal}</td>
            <td>${kataniVal}</td>
            <td class="font-bold">${totalsVal}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    document.getElementById('summary-table-container').innerHTML = html;
}

/**
 * Render Sales Margin Report
 */
function renderSalesMarginReport(branchFilter = 'all') {
    const products = reportGenerator.generateSalesMarginReport(branchFilter);

    if (!products || products.length === 0) {
        document.getElementById('margins-table-container').innerHTML = '<p style="padding: 20px;">No margin data found</p>';
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Qty Sold</th>
                <th>Avg Selling Price</th>
                <th>Avg Cost Price</th>
                <th>Total Sales</th>
                <th>Total Cost</th>
                <th>Profit</th>
                <th>Margin %</th>
            </tr>
        </thead>
        <tbody>`;

    products.forEach(product => {
        const marginColor = product.marginPercentage >= 30 ? 'row-success' : (product.marginPercentage >= 15 ? 'row-warning' : 'row-danger');
        html += `<tr class="${marginColor}">
            <td><strong>${product.product}</strong></td>
            <td>${product.category}</td>
            <td>${formatNumber(product.quantity)}</td>
            <td>${formatCurrency(product.avgSellingPrice)}</td>
            <td>${formatCurrency(product.avgCostPrice)}</td>
            <td>${formatCurrency(product.totalSales)}</td>
            <td>${formatCurrency(product.totalCost)}</td>
            <td class="font-bold">${formatCurrency(product.totalMargin)}</td>
            <td><span class="badge ${product.marginPercentage >= 30 ? 'badge-success' : (product.marginPercentage >= 15 ? 'badge-warning' : 'badge-danger')}">${product.marginPercentage.toFixed(2)}%</span></td>
        </tr>`;
    });

    html += `</tbody></table>`;
    document.getElementById('margins-table-container').innerHTML = html;
}

/**
 * Render Fast Moving Products
 */
function renderFastMovingProducts(branchFilter = 'all') {
    const products = reportGenerator.generateFastMovingProducts(branchFilter);

    if (!products || products.length === 0) {
        document.getElementById('fastmoving-table-container').innerHTML = '<p style="padding: 20px;">No fast moving products found</p>';
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Product</th>
                <th>Qty Sold</th>
                <th>Revenue</th>
                <th>Transactions</th>
                <th>Velocity</th>
                <th>Avg Price</th>
            </tr>
        </thead>
        <tbody>`;

    products.forEach(product => {
        html += `<tr class="row-success">
            <td>${product.product}</td>
            <td>${formatNumber(product.quantity)}</td>
            <td>${formatCurrency(product.revenue)}</td>
            <td>${product.transactions}</td>
            <td><span class="badge badge-success">${product.velocity.toFixed(2)}/day</span></td>
            <td>${formatCurrency(product.avgPrice)}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    document.getElementById('fastmoving-table-container').innerHTML = html;
}

/**
 * Render Slow Moving Products
 */
function renderSlowMovingProducts(branchFilter = 'all') {
    const products = reportGenerator.generateSlowMovingProducts(branchFilter);

    if (!products || products.length === 0) {
        document.getElementById('slowmoving-table-container').innerHTML = '<p style="padding: 20px;">No slow moving products found</p>';
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Product</th>
                <th>Qty Sold</th>
                <th>Revenue</th>
                <th>Transactions</th>
                <th>Velocity</th>
                <th>Avg Price</th>
            </tr>
        </thead>
        <tbody>`;

    products.forEach(product => {
        html += `<tr class="row-warning">
            <td>${product.product}</td>
            <td>${formatNumber(product.quantity)}</td>
            <td>${formatCurrency(product.revenue)}</td>
            <td>${product.transactions}</td>
            <td><span class="badge badge-warning">${product.velocity.toFixed(2)}/day</span></td>
            <td>${formatCurrency(product.avgPrice)}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    document.getElementById('slowmoving-table-container').innerHTML = html;
}

/**
 * Render Cashiers Report
 */
function renderCashiersReport() {
    const cashiers = reportGenerator.generateCashiersReport();

    if (!cashiers || cashiers.length === 0) {
        document.getElementById('cashiers-table-container').innerHTML = '<p style="padding: 20px;">No cashier data found</p>';
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Cashier</th>
                <th>Branch</th>
                <th>Transactions</th>
                <th>Total Sales</th>
                <th>Avg Transaction</th>
            </tr>
        </thead>
        <tbody>`;

    cashiers.forEach(cashier => {
        html += `<tr>
            <td>${cashier.cashier}</td>
            <td>${cashier.branch}</td>
            <td>${formatNumber(cashier.transactions)}</td>
            <td>${formatCurrency(cashier.totalSales)}</td>
            <td>${formatCurrency(cashier.avgTransaction)}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    document.getElementById('cashiers-table-container').innerHTML = html;
}

/**
 * Render Categories Report
 */
function renderCategoriesReport() {
    const categories = reportGenerator.generateCategoriesReport();

    if (!categories || categories.length === 0) {
        document.getElementById('categories-table-container').innerHTML = '<p style="padding: 20px;">No category data found</p>';
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Category</th>
                <th>Qty Sold</th>
                <th>Revenue</th>
                <th>Transactions</th>
                <th>Avg Price</th>
                <th>Margin %</th>
            </tr>
        </thead>
        <tbody>`;

    categories.forEach(category => {
        const marginColor = category.margin >= 30 ? 'row-success' : (category.margin >= 15 ? 'row-warning' : 'row-danger');
        html += `<tr class="${marginColor}">
            <td>${category.category}</td>
            <td>${formatNumber(category.quantity)}</td>
            <td>${formatCurrency(category.revenue)}</td>
            <td>${category.transactions}</td>
            <td>${formatCurrency(category.avgPrice)}</td>
            <td><span class="badge badge-info">${category.margin.toFixed(2)}%</span></td>
        </tr>`;
    });

    html += `</tbody></table>`;
    document.getElementById('categories-table-container').innerHTML = html;
    createCategoryDetailChart();
}

/**
 * Render Top Customers Report
 */
function renderTopCustomersReport(customerType = 'enrolled') {
    const customers = reportGenerator.generateTopCustomersReport(customerType);

    if (!customers || customers.length === 0) {
        document.getElementById('topcustomers-table-container').innerHTML = '<p style="padding: 20px;">No customer data found</p>';
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Customer</th>
                <th>Transactions</th>
                <th>Total Spent</th>
                <th>Avg Transaction</th>
                <th>Last Visit</th>
            </tr>
        </thead>
        <tbody>`;

    customers.forEach(customer => {
        html += `<tr>
            <td>${customer.customer}</td>
            <td>${customer.transactions}</td>
            <td>${formatCurrency(customer.totalSpent)}</td>
            <td>${formatCurrency(customer.avgTransaction)}</td>
            <td>${formatDate(customer.lastVisit)}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    document.getElementById('topcustomers-table-container').innerHTML = html;
}

/**
 * Render Growth Analysis
 */
function renderGrowthAnalysis() {
    const growth = reportGenerator.generateGrowthAnalysis();

    if (!growth || growth.length === 0) {
        document.getElementById('growth-table-container').innerHTML = '<p style="padding: 20px;">No growth data found</p>';
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Month</th>
                <th>Sales</th>
                <th>Transactions</th>
                <th>Unique Customers</th>
                <th>Growth Amount</th>
                <th>Growth Rate %</th>
            </tr>
        </thead>
        <tbody>`;

    growth.forEach(item => {
        const growthColor = item.growthRate >= 0 ? 'row-success' : 'row-danger';
        html += `<tr class="${item.growthRate !== 0 ? growthColor : ''}">
            <td class="font-bold">${item.month}</td>
            <td>${formatCurrency(item.sales)}</td>
            <td>${item.transactions}</td>
            <td>${item.uniqueCustomers}</td>
            <td>${item.growth !== 0 ? formatCurrency(item.growth) : 'N/A'}</td>
            <td>${item.growthRate !== 0 ? '<span class="badge ' + (item.growthRate >= 0 ? 'badge-success' : 'badge-danger') + '">' + item.growthRate.toFixed(2) + '%</span>' : 'N/A'}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    document.getElementById('growth-table-container').innerHTML = html;
    createGrowthChart();
}

/**
 * Render Road to Target
 */
function renderRoadToTarget() {
    const roadToTarget = reportGenerator.generateRoadToTargetReport();

    if (!roadToTarget || roadToTarget.length === 0) {
        document.getElementById('roadtotarget-table-container').innerHTML = '<p style="padding: 20px;">No road to target data found</p>';
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Month</th>
                <th>Branch</th>
                <th>Sales</th>
                <th>Target</th>
                <th>Remaining</th>
                <th>% Achieved</th>
                <th>Days Recorded</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>`;

    roadToTarget.forEach(item => {
        const statusBadgeColor = item.status === 'Achieved' ? 'badge-success' : (item.status === 'In Progress' ? 'badge-info' : 'badge-warning');
        const targetColor = item.percentage >= 100 ? 'row-success' : (item.percentage >= 75 ? 'row-warning' : 'row-danger');

        html += `<tr class="${targetColor}">
            <td class="font-bold">${item.month}</td>
            <td>${item.branch}</td>
            <td>${formatCurrency(item.sales)}</td>
            <td>${formatCurrency(item.target)}</td>
            <td>${formatCurrency(item.remaining)}</td>
            <td><strong>${item.percentage.toFixed(2)}%</strong></td>
            <td>${item.daysRecorded}/${item.totalDays}</td>
            <td><span class="badge ${statusBadgeColor}">${item.status}</span></td>
        </tr>`;
    });

    html += `</tbody></table>`;
    document.getElementById('roadtotarget-table-container').innerHTML = html;
}

/**
 * Render Dashboard
 */
function renderDashboard() {
    const sales = processor.getFilteredSales();

    if (!sales || sales.length === 0) {
        document.getElementById('kpi-total-sales').textContent = 'KSh 0';
        document.getElementById('kpi-customers').textContent = '0';
        document.getElementById('kpi-margin').textContent = '0%';
        document.getElementById('kpi-target').textContent = '0%';
        return;
    }

    const totalSales = sumBy(sales, 'amount');
    const uniqueInvoices = new Set(sales.map(s => s.invoice_no)).size;
    const margin = reportGenerator.calculateGrossMargin(sales);

    let month = 0, year = 0, dayRange = 1;
    
    for (let sale of sales) {
        if (sale.parsedDate && sale.parsedDate instanceof Date && isValidDate(sale.parsedDate)) {
            const components = getDateComponents(sale.parsedDate);
            month = components.month;
            year = components.year;
            break;
        }
    }

    if (processor.dataRange.minDate && processor.dataRange.maxDate) {
        dayRange = Math.ceil((processor.dataRange.maxDate - processor.dataRange.minDate) / (1000 * 60 * 60 * 24));
    }

    let totalTarget = 0;
    if (month > 0 && year > 0) {
        const monthDays = daysInMonth(year, month);
        ['Katani Pharmacy', 'Pharmacy POS'].forEach(branch => {
            const dailyTarget = getDailyTarget(branch, month);
            totalTarget += dailyTarget * monthDays;
        });
    }

    const targetPercentage = totalTarget > 0 ? roundToTwo((totalSales / totalTarget) * 100) : 0;

    document.getElementById('kpi-total-sales').textContent = formatCurrency(totalSales);
    document.getElementById('kpi-customers').textContent = formatNumber(uniqueInvoices);
    document.getElementById('kpi-margin').textContent = margin.toFixed(2) + '%';
    document.getElementById('kpi-target').textContent = targetPercentage.toFixed(2) + '%';

    createDailySalesChart();
    createBranchComparisonChart();
    createCategoryChartMain();
    createPaymentModeChart();
}

console.log('✅ Reports loaded successfully');