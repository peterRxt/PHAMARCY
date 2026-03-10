/**
 * =====================================================
 * CHARTS MANAGEMENT
 * =====================================================
 */

const chartInstances = {};

function createDailySalesChart() {
    const sales = processor.getFilteredSales();
    
    if (sales.length === 0) {
        document.getElementById('dailySalesChart').style.display = 'none';
        return;
    }

    document.getElementById('dailySalesChart').style.display = 'block';

    const dailySales = {};
    sales.forEach(sale => {
        const dateKey = formatDateISO(sale.parsedDate);
        if (!dailySales[dateKey]) {
            dailySales[dateKey] = 0;
        }
        dailySales[dateKey] += sale.amount || 0;
    });

    const sortedDates = Object.keys(dailySales).sort();
    const labels = sortedDates.map(date => formatDate(new Date(date)));
    const data = sortedDates.map(date => dailySales[date]);

    if (chartInstances.dailySalesChart) {
        chartInstances.dailySalesChart.destroy();
    }

    const ctx = document.getElementById('dailySalesChart').getContext('2d');
    chartInstances.dailySalesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Daily Sales (KSh)',
                data: data,
                borderColor: 'var(--primary-color)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: 'var(--primary-color)',
                pointBorderColor: 'white',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'KSh ' + formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

function createBranchComparisonChart() {
    const sales = processor.getFilteredSales();
    
    if (sales.length === 0) {
        document.getElementById('branchComparisonChart').style.display = 'none';
        return;
    }

    document.getElementById('branchComparisonChart').style.display = 'block';

    const kataniTotal = sumBy(sales.filter(s => String(s.service_point).trim() === 'Katani Pharmacy'), 'amount');
    const syokimauTotal = sumBy(sales.filter(s => String(s.service_point).trim() === 'Pharmacy POS'), 'amount');

    if (chartInstances.branchComparisonChart) {
        chartInstances.branchComparisonChart.destroy();
    }

    const ctx = document.getElementById('branchComparisonChart').getContext('2d');
    chartInstances.branchComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Katani Pharmacy', 'Syokimau Pharmacy'],
            datasets: [{
                label: 'Total Sales (KSh)',
                data: [kataniTotal, syokimauTotal],
                backgroundColor: [
                    'var(--primary-color)',
                    'var(--secondary-color)'
                ],
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'KSh ' + formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

function createCategoryChartMain() {
    const sales = processor.getFilteredSales();
    
    if (sales.length === 0) {
        document.getElementById('categoryChartMain').style.display = 'none';
        return;
    }

    document.getElementById('categoryChartMain').style.display = 'block';

    const categoryTotals = {};
    sales.forEach(sale => {
        const cat = sale.category || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (sale.amount || 0);
    });

    const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    if (chartInstances.categoryChartMain) {
        chartInstances.categoryChartMain.destroy();
    }

    const ctx = document.getElementById('categoryChartMain').getContext('2d');
    chartInstances.categoryChartMain = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sortedCategories.map(c => c[0]),
            datasets: [{
                data: sortedCategories.map(c => c[1]),
                backgroundColor: [
                    '#2563eb', '#7c3aed', '#059669', '#f59e0b', '#dc2626',
                    '#0891b2', '#db2777', '#ea580c', '#8b5cf6', '#06b6d4'
                ],
                borderColor: 'white',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createPaymentModeChart() {
    const sales = processor.getFilteredSales();
    
    if (sales.length === 0) {
        document.getElementById('paymentModeChart').style.display = 'none';
        return;
    }

    document.getElementById('paymentModeChart').style.display = 'block';

    const paymentTotals = {};
    sales.forEach(sale => {
        const mode = sale.payment_mode || 'Unknown';
        paymentTotals[mode] = (paymentTotals[mode] || 0) + (sale.amount || 0);
    });

    if (chartInstances.paymentModeChart) {
        chartInstances.paymentModeChart.destroy();
    }

    const ctx = document.getElementById('paymentModeChart').getContext('2d');
    chartInstances.paymentModeChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(paymentTotals),
            datasets: [{
                data: Object.values(paymentTotals),
                backgroundColor: [
                    '#2563eb', '#7c3aed', '#059669', '#f59e0b', '#dc2626'
                ],
                borderColor: 'white',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createCategoryDetailChart() {
    const sales = processor.getFilteredSales();
    
    if (sales.length === 0) {
        document.getElementById('categoryDetailChart').style.display = 'none';
        return;
    }

    document.getElementById('categoryDetailChart').style.display = 'block';

    const categoryData = {};
    sales.forEach(sale => {
        const cat = sale.category || 'Uncategorized';
        if (!categoryData[cat]) {
            categoryData[cat] = { quantity: 0, amount: 0 };
        }
        categoryData[cat].quantity += sale.qty || 0;
        categoryData[cat].amount += sale.amount || 0;
    });

    const sortedCategories = Object.entries(categoryData)
        .sort((a, b) => b[1].amount - a[1].amount);

    if (chartInstances.categoryDetailChart) {
        chartInstances.categoryDetailChart.destroy();
    }

    const ctx = document.getElementById('categoryDetailChart').getContext('2d');
    chartInstances.categoryDetailChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedCategories.map(c => c[0]),
            datasets: [{
                label: 'Sales Amount (KSh)',
                data: sortedCategories.map(c => c[1].amount),
                backgroundColor: 'var(--primary-color)',
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'KSh ' + formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

function createGrowthChart() {
    const sales = processor.getFilteredSales();
    
    if (sales.length === 0) {
        document.getElementById('growthChart').style.display = 'none';
        return;
    }

    document.getElementById('growthChart').style.display = 'block';

    const monthlyData = {};
    sales.forEach(sale => {
        const components = getDateComponents(sale.parsedDate);
        const monthKey = `${components.year}-${String(components.month).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = 0;
        }
        monthlyData[monthKey] += sale.amount || 0;
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(m => {
        const [year, month] = m.split('-');
        return `${getMonthName(parseInt(month))} ${year}`;
    });

    const data = sortedMonths.map(m => monthlyData[m]);
    
    const growthRates = [];
    for (let i = 1; i < data.length; i++) {
        const growth = ((data[i] - data[i - 1]) / data[i - 1]) * 100;
        growthRates.push(roundToTwo(growth));
    }

    if (chartInstances.growthChart) {
        chartInstances.growthChart.destroy();
    }

    const ctx = document.getElementById('growthChart').getContext('2d');
    chartInstances.growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sales Amount (KSh)',
                data: data,
                borderColor: 'var(--primary-color)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                yAxisID: 'y'
            }, {
                label: 'Growth Rate (%)',
                data: [null, ...growthRates],
                borderColor: 'var(--success-color)',
                backgroundColor: 'rgba(5, 150, 105, 0.1)',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        callback: function(value) {
                            return 'KSh ' + formatNumber(value);
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

console.log('✅ Charts loaded successfully');