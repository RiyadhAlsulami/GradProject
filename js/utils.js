/**
 * Plug&Save Utilities
 * 
 * This file contains common utility functions used throughout the application.
 * It's designed to reduce code duplication and improve maintainability.
 * 
 * IMPORTANT: This is an experimental implementation. To revert to the original
 * implementation, simply stop importing from this file and use the original
 * function implementations in each component.
 */

/**
 * Shows a popup notification to the user
 * @param {string} message - The message to display
 * @param {boolean} isSuccess - Whether this is a success or error message
 */
export function showPopup(message, isSuccess = true) {
    // Create popup element if it doesn't exist
    let popup = document.getElementById('notification-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'notification-popup';
        popup.className = 'popup';
        document.body.appendChild(popup);
    }

    // Set popup content and style
    popup.textContent = message;
    popup.className = 'popup ' + (isSuccess ? 'success' : 'error');
    popup.style.display = 'block';

    // Hide popup after 3 seconds
    setTimeout(() => {
        popup.style.animation = 'fadeOut 0.5s ease-in-out';
        setTimeout(() => {
            popup.style.display = 'none';
            popup.style.animation = '';
        }, 500);
    }, 3000);
}

/**
 * Formats a date for display
 * @param {string|Date} date - The date to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
    if (!date) return 'N/A';
    
    const defaultOptions = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
        const dateObj = date instanceof Date ? date : new Date(date);
        return dateObj.toLocaleString(undefined, mergedOptions);
    } catch (error) {
        console.error('Error formatting date:', error);
        return String(date);
    }
}

/**
 * Formats a number with specified decimal places
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
export function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined) return '0.00';
    
    try {
        return parseFloat(value).toFixed(decimals);
    } catch (error) {
        console.error('Error formatting number:', error);
        return '0.00';
    }
}

/**
 * Formats a currency value
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: SAR)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'SAR') {
    if (amount === null || amount === undefined) return '0.00 ' + currency;
    
    try {
        return `${formatNumber(amount)} ${currency}`;
    } catch (error) {
        console.error('Error formatting currency:', error);
        return '0.00 ' + currency;
    }
}

/**
 * Formats power values (kWh)
 * @param {number} kWh - Power value in kilowatt-hours
 * @returns {string} Formatted power string
 */
export function formatPower(kWh) {
    return `${formatNumber(kWh)} kWh`;
}

/**
 * Signs out the current user
 * @returns {Promise<void>}
 */
export async function logout() {
    try {
        // Import supabase dynamically to avoid circular dependencies
        const { supabase } = await import('./config.js');
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        showPopup('Logged out successfully!');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    } catch (error) {
        console.error('Error during logout:', error);
        showPopup('Error during logout. Please try again.', false);
    }
}

/**
 * Gets a user-friendly error message
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error) {
    const errorMessage = error.message || 'An error occurred';
    
    // Map common error messages to user-friendly versions
    if (errorMessage.includes('Invalid login credentials')) {
        return 'Invalid email or password.';
    } else if (errorMessage.includes('Email not confirmed')) {
        return 'Please confirm your email before logging in.';
    } else if (errorMessage.includes('User already registered')) {
        return 'This email is already registered.';
    } else if (errorMessage.includes('network')) {
        return 'Network error. Please check your connection.';
    }
    
    return errorMessage;
}

/**
 * Validation utilities
 */

/**
 * Validates that a value is a valid number within specified constraints
 * @param {any} value - The value to validate
 * @param {object} options - Validation options
 * @param {number} [options.min] - Minimum allowed value
 * @param {number} [options.max] - Maximum allowed value
 * @param {boolean} [options.allowEmpty=false] - Whether empty values are considered valid
 * @returns {object} Validation result { isValid, message }
 */
export function validateNumber(value, options = {}) {
    const { min, max, allowEmpty = false } = options;
    
    // Handle empty values
    if ((value === '' || value === null || value === undefined) && allowEmpty) {
        return { isValid: true, message: '' };
    }
    
    // Convert to number and check if it's a valid number
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
        return { isValid: false, message: 'Please enter a valid number' };
    }
    
    // Check minimum value if specified
    if (min !== undefined && numValue < min) {
        return { isValid: false, message: `Value must be at least ${min}` };
    }
    
    // Check maximum value if specified
    if (max !== undefined && numValue > max) {
        return { isValid: false, message: `Value must be no more than ${max}` };
    }
    
    return { isValid: true, message: '' };
}

/**
 * Validates that a string meets specified constraints
 * @param {string} value - The string to validate
 * @param {object} options - Validation options
 * @param {number} [options.minLength] - Minimum allowed length
 * @param {number} [options.maxLength] - Maximum allowed length
 * @param {RegExp} [options.pattern] - Regular expression pattern to match
 * @param {boolean} [options.allowEmpty=false] - Whether empty strings are considered valid
 * @returns {object} Validation result { isValid, message }
 */
export function validateString(value, options = {}) {
    const { minLength, maxLength, pattern, allowEmpty = false } = options;
    
    // Handle empty values
    if ((value === '' || value === null || value === undefined) && allowEmpty) {
        return { isValid: true, message: '' };
    }
    
    // Ensure value is a string
    const strValue = String(value || '');
    
    // Check minimum length if specified
    if (minLength !== undefined && strValue.length < minLength) {
        return { isValid: false, message: `Must be at least ${minLength} characters` };
    }
    
    // Check maximum length if specified
    if (maxLength !== undefined && strValue.length > maxLength) {
        return { isValid: false, message: `Must be no more than ${maxLength} characters` };
    }
    
    // Check pattern if specified
    if (pattern && !pattern.test(strValue)) {
        return { isValid: false, message: 'Invalid format' };
    }
    
    return { isValid: true, message: '' };
}

/**
 * Validates an email address
 * @param {string} email - The email to validate
 * @param {boolean} [allowEmpty=false] - Whether empty emails are considered valid
 * @returns {object} Validation result { isValid, message }
 */
export function validateEmail(email, allowEmpty = false) {
    // Handle empty values
    if ((email === '' || email === null || email === undefined) && allowEmpty) {
        return { isValid: true, message: '' };
    }
    
    // Basic email pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailPattern.test(String(email || ''))) {
        return { isValid: false, message: 'Please enter a valid email address' };
    }
    
    return { isValid: true, message: '' };
}

/**
 * Validates an IP address
 * @param {string} ip - The IP address to validate
 * @param {boolean} [allowEmpty=false] - Whether empty values are considered valid
 * @returns {object} Validation result { isValid, message }
 */
export function validateIpAddress(ip, allowEmpty = false) {
    // Handle empty values
    if ((ip === '' || ip === null || ip === undefined) && allowEmpty) {
        return { isValid: true, message: '' };
    }
    
    // IPv4 pattern
    const ipv4Pattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    if (!ipv4Pattern.test(String(ip || ''))) {
        return { isValid: false, message: 'Please enter a valid IP address' };
    }
    
    return { isValid: true, message: '' };
}

// Export an object that can be used to revert to original implementations
export const originalImplementations = {
    // This object can be used to store original function implementations
    // if needed for reverting changes
    enabled: false,
    
    // Enable original implementations
    enable() {
        this.enabled = true;
        console.log('Reverted to original function implementations');
    },
    
    // Disable original implementations
    disable() {
        this.enabled = false;
        console.log('Using centralized utility functions');
    }
};
