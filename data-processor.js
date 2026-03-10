/**
 * =====================================================
 * DATA PROCESSOR
 * =====================================================
 */

class DataProcessor {
    constructor() {
        this.originalData = {
            sales: [],
            bc: []
        };
        this.filteredData = {
            sales: [],
            bc: []
        };
        this.filters = {
            branch: 'all',
            startDate: null,
            endDate: null
        };
        this.dataRange = {
            minDate: null,
            maxDate: null
        };
        this.bcCache = {};
    }

    /**
     * Process uploaded sales file
     */
    async processSalesFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    const validServicePoints = ['Katani Pharmacy', 'Pharmacy POS'];
                    const processedData = jsonData
                        .filter(row => {
                            return validServicePoints.includes(String(row.service_point).trim());
                        })
                        .map((row, index) => {
                            const parsedDate = parseDate(row.date);
                            return {
                                ...row,
                                id: `sales_${Date.now()}_${index}`,
                                parsedDate: parsedDate,
                                qty: parseFloat(row.qty) || 0,
                                amount: parseFloat(row.amount) || 0,
                                price: parseFloat(row.price) || 0,
                                unit_cost: parseFloat(row.unit_cost) || 0,
                                service_point: String(row.service_point).trim()
                            };
                        })
                        .filter(row => row.parsedDate !== null && row.amount > 0);

                    console.log(`Processed ${processedData.length} sales records`);
                    console.log('Service points found:', [...new Set(processedData.map(r => r.service_point))]);
                    
                    resolve(processedData);
                } catch (error) {
                    console.error('Error processing sales file:', error);
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(reader.error);
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Process uploaded BC file
     */
    async processBCFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    const processedData = jsonData.map((row, index) => {
                        const description = String(row.Description || row.description || '').trim();
                        const lastDirectCost = parseFloat(
                            row['Last Direct Cost'] || 
                            row['last_direct_cost'] || 
                            row['LastDirectCost'] || 
                            0
                        ) || 0;
                        const unitPrice = parseFloat(
                            row['Unit Price'] || 
                            row['unit_price'] || 
                            row['UnitPrice'] || 
                            0
                        ) || 0;
                        const vatPostingGroup = String(row['VAT Prod. Posting Group'] || 
                                              row['vat_posting_group'] || 
                                              'STD').trim();

                        return {
                            ...row,
                            id: `bc_${Date.now()}_${index}`,
                            'Description': description,
                            'Last Direct Cost': lastDirectCost,
                            'Unit Price': unitPrice,
                            'VAT Prod. Posting Group': vatPostingGroup,
                            'Profit %': parseFloat(row['Profit %'] || row['profit'] || 0) || 0,
                            'Inventory': parseFloat(row['Inventory'] || row['inventory'] || 0) || 0
                        };
                    });

                    console.log(`Processed ${processedData.length} BC records`);
                    resolve(processedData);
                } catch (error) {
                    console.error('Error processing BC file:', error);
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(reader.error);
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Load data from IndexedDB
     */
    async loadOrInitializeData() {
        try {
            const savedSalesData = await db.getAllSalesData();
            const savedBCData = await db.getAllBCData();

            this.originalData.sales = savedSalesData || [];
            this.originalData.bc = savedBCData || [];

            if (this.originalData.sales.length > 0) {
                this.originalData.sales = this.originalData.sales.map(sale => ({
                    ...sale,
                    parsedDate: sale.parsedDate instanceof Date ? sale.parsedDate : parseDate(sale.parsedDate),
                    service_point: String(sale.service_point).trim()
                }));
                this.updateDataRange();
            }

            this.buildBCCache();

            console.log('Data loaded from IndexedDB');
        } catch (error) {
            console.error('Error loading data from IndexedDB:', error);
            this.originalData = { sales: [], bc: [] };
        }
    }

    /**
     * Build BC cache for efficient lookups
     */
    buildBCCache() {
        this.bcCache = {};
        this.originalData.bc.forEach(bc => {
            const description = (bc.Description || '').toLowerCase().trim();
            if (description) {
                this.bcCache[description] = {
                    'Last Direct Cost': bc['Last Direct Cost'] || 0,
                    'VAT Prod. Posting Group': bc['VAT Prod. Posting Group'] || 'STD',
                    'Unit Price': bc['Unit Price'] || 0,
                    'Profit %': bc['Profit %'] || 0
                };
            }
        });
        console.log(`Built BC cache with ${Object.keys(this.bcCache).length} items`);
    }

    /**
     * Append new sales data to existing data
     */
    async appendSalesData(newSalesData) {
        try {
            const existingInvoices = new Set(
                this.originalData.sales.map(s => `${String(s.invoice_no).trim()}_${s.parsedDate.getTime()}`)
            );

            const uniqueNewData = newSalesData.filter(item => {
                const key = `${String(item.invoice_no).trim()}_${item.parsedDate.getTime()}`;
                return !existingInvoices.has(key);
            });

            if (uniqueNewData.length > 0) {
                this.originalData.sales.push(...uniqueNewData);
                await db.addSalesData(uniqueNewData);
                this.updateDataRange();
                console.log(`Appended ${uniqueNewData.length} new sales records`);
            } else {
                console.log('No new unique sales records to append');
            }

            this.applyFilters();
        } catch (error) {
            console.error('Error appending sales data:', error);
            throw error;
        }
    }

    /**
     * Set BC data
     */
    async setBCData(newBCData) {
        try {
            this.originalData.bc = newBCData;
            await db.addBCData(newBCData);
            this.buildBCCache();
            console.log('BC data set');
            this.applyFilters();
        } catch (error) {
            console.error('Error setting BC data:', error);
            throw error;
        }
    }

    /**
     * Update data range
     */
    updateDataRange() {
        if (this.originalData.sales.length === 0) {
            this.dataRange = { minDate: null, maxDate: null };
            return;
        }

        const dates = this.originalData.sales
            .map(s => s.parsedDate)
            .filter(d => d !== null && d instanceof Date && isValidDate(d))
            .sort((a, b) => a - b);

        if (dates.length === 0) {
            this.dataRange = { minDate: null, maxDate: null };
            return;
        }

        this.dataRange = {
            minDate: dates[0],
            maxDate: dates[dates.length - 1]
        };

        console.log(`Data range: ${formatDate(this.dataRange.minDate)} to ${formatDate(this.dataRange.maxDate)}`);
    }

    /**
     * Apply filters to original data
     */
    applyFilters() {
        let filtered = [...this.originalData.sales];

        if (this.filters.branch !== 'all') {
            const branchFilter = String(this.filters.branch).trim();
            filtered = filtered.filter(s => String(s.service_point).trim() === branchFilter);
            console.log(`Filtered by branch "${branchFilter}": ${filtered.length} records`);
        }

        if (this.filters.startDate) {
            filtered = filtered.filter(s => s.parsedDate >= this.filters.startDate);
        }

        if (this.filters.endDate) {
            const endOfDay = new Date(this.filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            filtered = filtered.filter(s => s.parsedDate <= endOfDay);
        }

        this.filteredData.sales = filtered;
        this.filteredData.bc = this.originalData.bc;

        console.log(`Total filtered sales: ${formatCurrency(sumBy(filtered, 'amount'))}`);
    }

    /**
     * Set filters
     */
    setFilters(filters) {
        this.filters = {
            branch: filters.branch !== undefined ? filters.branch : this.filters.branch,
            startDate: filters.startDate !== undefined ? filters.startDate : this.filters.startDate,
            endDate: filters.endDate !== undefined ? filters.endDate : this.filters.endDate
        };
        this.applyFilters();
    }

    /**
     * Reset filters
     */
    resetFilters() {
        this.filters = {
            branch: 'all',
            startDate: null,
            endDate: null
        };
        this.applyFilters();
    }

    /**
     * Get BC data for product by name
     */
    getBCDataByProductName(productName) {
        if (!productName) return null;
        
        const nameToMatch = String(productName).toLowerCase().trim();
        
        if (this.bcCache[nameToMatch]) {
            return this.bcCache[nameToMatch];
        }

        for (const [cachedName, cachedData] of Object.entries(this.bcCache)) {
            if (cachedName.includes(nameToMatch) || nameToMatch.includes(cachedName)) {
                return cachedData;
            }
        }

        return null;
    }

    /**
     * Calculate cost including VAT
     */
    calculateCostWithVAT(baseCost, vatCategory) {
        if (!baseCost || baseCost === 0) return 0;
        
        if (vatCategory) {
            const vatUpper = String(vatCategory).toUpperCase().trim();
            if (vatUpper === 'STD' || vatUpper.includes('STANDARD') || vatUpper.includes('16%')) {
                return roundToTwo(baseCost * 1.16);
            }
        }
        
        return roundToTwo(baseCost);
    }

    /**
     * Calculate accurate margin for a sale
     */
    calculateSaleMargin(sale) {
        const sellingPrice = sale.amount || 0;
        const bcItem = this.getBCDataByProductName(sale.product);
        
        if (!bcItem || !bcItem['Last Direct Cost']) {
            return {
                sellingPrice: sellingPrice,
                costPrice: 0,
                margin: sellingPrice,
                marginPercentage: 0,
                isEstimated: true
            };
        }

        const costWithVAT = this.calculateCostWithVAT(
            bcItem['Last Direct Cost'],
            bcItem['VAT Prod. Posting Group']
        );

        const qty = sale.qty || 1;
        const unitCostPrice = costWithVAT;
        const totalCostPrice = unitCostPrice * qty;

        const margin = sellingPrice - totalCostPrice;
        const marginPercentage = sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;

        return {
            sellingPrice: roundToTwo(sellingPrice),
            costPrice: roundToTwo(totalCostPrice),
            unitCostPrice: roundToTwo(unitCostPrice),
            margin: roundToTwo(margin),
            marginPercentage: roundToTwo(marginPercentage),
            isEstimated: false
        };
    }

    /**
     * Get filtered sales for analysis
     */
    getFilteredSales() {
        return this.filteredData.sales;
    }

    /**
     * Get filtered BC data
     */
    getFilteredBC() {
        return this.filteredData.bc;
    }

    /**
     * Get unfiltered total sales
     */
    getTotalSalesUnfiltered() {
        return sumBy(this.originalData.sales, 'amount');
    }

    /**
     * Get branch totals
     */
    getBranchTotals() {
        const katani = this.originalData.sales.filter(s => String(s.service_point).trim() === 'Katani Pharmacy');
        const syokimau = this.originalData.sales.filter(s => String(s.service_point).trim() === 'Pharmacy POS');
        
        return {
            'Katani Pharmacy': sumBy(katani, 'amount'),
            'Pharmacy POS': sumBy(syokimau, 'amount'),
            'Total': sumBy(this.originalData.sales, 'amount')
        };
    }

    /**
     * Clear all data
     */
    async clearAllData() {
        try {
            await db.clearAllData();
            this.originalData = { sales: [], bc: [] };
            this.filteredData = { sales: [], bc: [] };
            this.filters = { branch: 'all', startDate: null, endDate: null };
            this.dataRange = { minDate: null, maxDate: null };
            this.bcCache = {};
            console.log('All data cleared');
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    }
}

const processor = new DataProcessor();