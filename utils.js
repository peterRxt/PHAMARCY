/**
 * =====================================================
 * UTILITY FUNCTIONS
 * =====================================================
 */

// ===== DATE & TIME UTILITIES =====

/**
 * Get number of days in month (must be defined first!)
 */
function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

/**
 * Parse date string in multiple formats with strict validation
 */
function parseDate(dateString) {
    if (!dateString) return null;
    
    try {
        const dateStr = String(dateString).trim();
        let date = null;
        
        // Format 1: MM/DD/YYYY HH:MM or M/D/YYYY HH:MM
        const regex1 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/;
        const match1 = dateStr.match(regex1);
        if (match1) {
            const [, month, day, year, hour, minute] = match1;
            date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), 0);
            if (isValidDate(date)) return date;
        }
        
        // Format 2: YYYY-MM-DD HH:MM:SS
        const regex2 = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/;
        const match2 = dateStr.match(regex2);
        if (match2) {
            const [, year, month, day, hour, minute, second] = match2;
            date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
            if (isValidDate(date)) return date;
        }
        
        // Format 3: MM/DD/YYYY
        const regex3 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        const match3 = dateStr.match(regex3);
        if (match3) {
            const [, month, day, year] = match3;
            date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0);
            if (isValidDate(date)) return date;
        }
        
        // Format 4: YYYY-MM-DD
        const regex4 = /^(\d{4})-(\d{2})-(\d{2})$/;
        const match4 = dateStr.match(regex4);
        if (match4) {
            const [, year, month, day] = match4;
            date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0);
            if (isValidDate(date)) return date;
        }
        
        // Fallback: Try native Date constructor
        date = new Date(dateStr);
        if (isValidDate(date)) return date;
        
        console.warn(`Could not parse date: "${dateString}"`);
        return null;
    } catch (error) {
        console.error('Error parsing date:', dateString, error);
        return null;
    }
}

/**
 * Validate if date is valid and within reasonable range
 */
function isValidDate(date) {
    if (!(date instanceof Date)) {
        return false;
    }
    if (isNaN(date.getTime())) {
        return false;
    }
    const year = date.getFullYear();
    if (year < 2000 || year > 2099) {
        return false;
    }
    return true;
}

/**
 * Format currency value to KSh format
 */
function formatCurrency(value) {
    if (typeof value !== 'number') value = parseFloat(value) || 0;
    
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value);
}

/**
 * Format number with commas
 */
function formatNumber(value) {
    if (typeof value !== 'number') value = parseFloat(value) || 0;
    
    return new Intl.NumberFormat('en-KE').format(value);
}

/**
 * Format date to readable format
 */
function formatDate(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    if (!isValidDate(date)) return 'Invalid Date';
    
    return new Intl.DateTimeFormat('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

/**
 * Format date to full readable format with day name
 */
function formatDateFull(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    if (!isValidDate(date)) return 'Invalid Date';
    
    return new Intl.DateTimeFormat('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

/**
 * Format date to YYYY-MM-DD format
 */
function formatDateISO(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    if (!isValidDate(date)) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get date components
 */
function getDateComponents(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    if (!isValidDate(date)) {
        return { year: 0, month: 0, day: 0, date: null };
    }
    
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        date: date
    };
}

/**
 * Get month name
 */
function getMonthName(month) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
}

/**
 * Get day name
 */
function getDayName(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}

/**
 * Get date range string
 */
function getDateRangeString(startDate, endDate) {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    return `${start} to ${end}`;
}

// ===== CUSTOMER UTILITIES =====

/**
 * Check if customer is walk-in
 */
function isWalkInCustomer(customerName) {
    if (!customerName || typeof customerName !== 'string') {
        return true;
    }
    const lowerName = customerName.toLowerCase().trim();
    return lowerName.includes('walkin') || lowerName.includes('walking');
}

// ===== TARGET UTILITIES =====

/**
 * Get daily target for a branch and month
 */
function getDailyTarget(branch, month) {
    const targets = {
        'Katani Pharmacy': {
            1: 10000, 2: 12000, 3: 15000, 4: 20000,
            5: 22000, 6: 28000, 7: 35000, 8: 42000,
            9: 50000, 10: 50000, 11: 55000, 12: 65000
        },
        'Pharmacy POS': {
            1: 25574, 2: 25997, 3: 28587, 4: 33923,
            5: 39102, 6: 40733, 7: 45829, 8: 52196,
            9: 52833, 10: 59408, 11: 66121, 12: 72972
        }
    };

    if (!targets[branch]) return 0;
    if (!targets[branch][month]) return 0;
    
    return targets[branch][month];
}

// ===== MATH & CALCULATION UTILITIES =====

/**
 * Round to 2 decimal places
 */
function roundToTwo(value) {
    if (typeof value !== 'number') value = parseFloat(value) || 0;
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate percentage
 */
function calculatePercentage(value, total) {
    if (!total || total === 0) return 0;
    return roundToTwo((value / total) * 100);
}

/**
 * Get color based on percentage
 */
function getPercentageColor(percentage) {
    if (percentage >= 100) return '--success-color';
    if (percentage >= 75) return '--warning-color';
    return '--danger-color';
}

// ===== ARRAY & OBJECT UTILITIES =====

/**
 * Clone object
 */
function deepClone(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (error) {
        console.error('Error cloning object:', error);
        return obj;
    }
}

/**
 * Group array by key
 */
function groupBy(array, key) {
    return array.reduce((result, item) => {
        const group = item[key];
        if (!result[group]) {
            result[group] = [];
        }
        result[group].push(item);
        return result;
    }, {});
}

/**
 * Sum array by key
 */
function sumBy(array, key) {
    if (!Array.isArray(array)) return 0;
    return array.reduce((sum, item) => {
        const value = parseFloat(item[key]) || 0;
        return sum + value;
    }, 0);
}

/**
 * Get unique values from array
 */
function getUnique(array, key) {
    const seen = new Set();
    return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
}

/**
 * Sort array by multiple keys (use '-' prefix for descending)
 */
function sortBy(array, ...keys) {
    if (!Array.isArray(array)) return [];
    
    return [...array].sort((a, b) => {
        for (let key of keys) {
            const isDescending = key.startsWith('-');
            const actualKey = isDescending ? key.slice(1) : key;
            
            const aVal = a[actualKey];
            const bVal = b[actualKey];
            
            if (aVal == null && bVal == null) continue;
            if (aVal == null) return isDescending ? 1 : -1;
            if (bVal == null) return isDescending ? -1 : 1;
            
            if (aVal < bVal) return isDescending ? 1 : -1;
            if (aVal > bVal) return isDescending ? -1 : 1;
        }
        return 0;
    });
}

/**
 * Parse Excel date (serial number)
 */
function parseExcelDate(excelDate) {
    if (typeof excelDate === 'number') {
        const daysOffset = excelDate - 1;
        const date = new Date(1900, 0, daysOffset);
        if (isValidDate(date)) return date;
    }
    return parseDate(excelDate);
}

// ===== DOM & UI UTILITIES =====

/**
 * Create hyperlink element
 */
function createHyperlink(text, targetPage) {
    const link = document.createElement('a');
    link.href = `#${targetPage}`;
    link.textContent = text;
    link.style.color = 'var(--primary-color)';
    link.style.fontWeight = '600';
    link.style.textDecoration = 'underline';
    link.style.cursor = 'pointer';
    return link;
}

/**
 * Sanitize input for Excel compatibility
 */
function sanitizeForExcel(value) {
    if (typeof value === 'string') {
        return value.replace(/[\n\r]/g, ' ');
    }
    return value;
}

// ===== VALIDATION UTILITIES =====

/**
 * Validate if value is a valid number
 */
function isValidNumber(value) {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
}

console.log('✅ Utils loaded - all utility functions initialized');