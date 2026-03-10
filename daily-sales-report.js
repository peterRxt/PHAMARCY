/**
 * =====================================================
 * DAILY SALES REPORT
 * =====================================================
 */

class DailySalesReport {
    /**
     * Generate daily sales report
     */
    static generateDailySalesReport(branchFilter = 'all') {
        let sales = processor.getFilteredSales();

        if (!sales || sales.length === 0) return [];

        if (branchFilter !== 'all') {
            sales = sales.filter(s => String(s.service_point).trim() === branchFilter);
        }

        const dailyData = {};
        
        sales.forEach(sale => {
            if (!sale.parsedDate || !(sale.parsedDate instanceof Date) || !isValidDate(sale.parsedDate)) {
                console.warn('Invalid date for sale:', sale.date, sale.parsedDate);
                return;
            }

            const dateKey = formatDateISO(sale.parsedDate);
            
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                    date: sale.parsedDate,
                    dateKey: dateKey,
                    dayName: getDayName(sale.parsedDate),
                    totalSales: 0,
                    totalQuantity: 0,
                    transactions: 0,
                    invoices: new Set(),
                    branch: branchFilter === 'all' ? sale.service_point : branchFilter
                };
            }

            dailyData[dateKey].totalSales += sale.amount || 0;
            dailyData[dateKey].totalQuantity += sale.qty || 0;
            dailyData[dateKey].transactions += 1;
            dailyData[dateKey].invoices.add(sale.invoice_no);
        });

        const result = Object.values(dailyData)
            .map(item => ({
                date: item.date,
                dateKey: item.dateKey,
                dayName: item.dayName,
                dateFormatted: formatDateFull(item.date),
                totalSales: roundToTwo(item.totalSales),
                totalQuantity: item.totalQuantity,
                transactions: item.transactions,
                uniqueInvoices: item.invoices.size,
                avgSalePerTransaction: roundToTwo(item.totalSales / item.transactions),
                branch: item.branch
            }))
            .sort((a, b) => new Date(a.dateKey) - new Date(b.dateKey));

        return result;
    }

    /**
     * Generate daily sales by branch
     */
    static generateDailySalesByBranch() {
        const sales = processor.getFilteredSales();

        if (!sales || sales.length === 0) return [];

        const dailyData = {};
        
        sales.forEach(sale => {
            if (!sale.parsedDate || !(sale.parsedDate instanceof Date) || !isValidDate(sale.parsedDate)) {
                return;
            }

            const dateKey = formatDateISO(sale.parsedDate);
            const branchKey = String(sale.service_point).trim();
            const key = `${dateKey}_${branchKey}`;

            if (!dailyData[key]) {
                dailyData[key] = {
                    date: sale.parsedDate,
                    dateKey: dateKey,
                    dayName: getDayName(sale.parsedDate),
                    branch: branchKey,
                    totalSales: 0,
                    transactions: 0,
                    invoices: new Set()
                };
            }

            dailyData[key].totalSales += sale.amount || 0;
            dailyData[key].transactions += 1;
            dailyData[key].invoices.add(sale.invoice_no);
        });

        const result = Object.values(dailyData)
            .map(item => ({
                date: item.date,
                dateKey: item.dateKey,
                dayName: item.dayName,
                dateFormatted: formatDateFull(item.date),
                branch: item.branch,
                totalSales: roundToTwo(item.totalSales),
                uniqueInvoices: item.invoices.size,
                transactions: item.transactions
            }))
            .sort((a, b) => {
                const dateCompare = new Date(a.dateKey) - new Date(b.dateKey);
                if (dateCompare !== 0) return dateCompare;
                return a.branch.localeCompare(b.branch);
            });

        return result;
    }
}

/**
 * Render daily sales report
 */
function renderDailySalesReport(branchFilter = 'all') {
    const dailySales = DailySalesReport.generateDailySalesReport(branchFilter);

    if (!dailySales || dailySales.length === 0) {
        document.getElementById('dailysales-table-container').innerHTML = '<p style="padding: 20px;">No daily sales data found</p>';
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Total Sales</th>
                <th>Quantity Sold</th>
                <th>Transactions</th>
                <th>Unique Invoices</th>
                <th>Avg Sale/Transaction</th>
            </tr>
        </thead>
        <tbody>`;

    dailySales.forEach((daily, idx) => {
        const rowColor = idx % 2 === 0 ? 'row-alternate' : '';
        html += `<tr class="${rowColor}">
            <td class="font-bold">${daily.dateFormatted}</td>
            <td>${daily.dayName}</td>
            <td>${formatCurrency(daily.totalSales)}</td>
            <td>${formatNumber(daily.totalQuantity)}</td>
            <td>${daily.transactions}</td>
            <td>${daily.uniqueInvoices}</td>
            <td>${formatCurrency(daily.avgSalePerTransaction)}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    document.getElementById('dailysales-table-container').innerHTML = html;
}

console.log('✅ Daily Sales Report loaded');