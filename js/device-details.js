// Device details functionality
import { supabase } from './config.js'
import { calculateElectricityRate, calculateElectricityCost } from './electricity-rates.js'
import { showPopup } from './utils.js'

// Get device ID from URL
const urlParams = new URLSearchParams(window.location.search);
const deviceId = urlParams.get('id');

// Common utility functions
function formatDate(date) {
    return date ? new Date(date).toLocaleString() : 'N/A';
}

function formatNumber(value, decimals = 2) {
    return value ? parseFloat(value).toFixed(decimals) : '0.00';
}

// Notification popup functions
function showNotification(title, message, callback = null) {
    const popup = document.getElementById('notificationPopup');
    const titleElement = document.getElementById('notificationTitle');
    const messageElement = document.getElementById('notificationMessage');
    
    titleElement.textContent = title;
    messageElement.textContent = message;
    popup.classList.add('active');
    
    const closeButton = document.getElementById('closeNotification');
    
    // Remove any existing event listeners
    const newCloseButton = closeButton.cloneNode(true);
    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
    
    // Add new event listener
    newCloseButton.addEventListener('click', function() {
        hideNotification();
        if (callback && typeof callback === 'function') {
            callback();
        }
    });
}

function hideNotification() {
    const popup = document.getElementById('notificationPopup');
    popup.classList.remove('active');
}

function generateRandomIp() {
    // Create a more realistic IP address
    // Choose between common patterns for IP addresses
    const ipType = Math.floor(Math.random() * 4);
    
    if (ipType === 0) {
        // Private network: 192.168.x.x
        return `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    } else if (ipType === 1) {
        // Private network: 10.x.x.x
        return `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    } else if (ipType === 2) {
        // Private network: 172.16-31.x.x
        return `172.${16 + Math.floor(Math.random() * 16)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    } else {
        // Public IP ranges (avoiding reserved ranges)
        const firstOctet = [1, 2, 3, 5, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223];
        const selectedFirstOctet = firstOctet[Math.floor(Math.random() * firstOctet.length)];
        return `${selectedFirstOctet}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    }
}

// Device deletion functions
function showDeleteConfirmation() {
    const dialog = document.getElementById('deleteConfirmation');
    dialog.classList.add('active');
}

function hideDeleteConfirmation() {
    const dialog = document.getElementById('deleteConfirmation');
    dialog.classList.remove('active');
}

async function confirmDelete() {
    try {
        const { error } = await supabase
            .from('devices')
            .delete()
            .eq('id', deviceId);
            
        if (error) throw error;
        
        showPopup('Device deleted successfully', true);
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    } catch (error) {
        console.error('Error deleting device:', error);
        showPopup('Error deleting device', false);
    }
}

// Function to confirm and delete device
function confirmDeleteDevice() {
    // Show the custom delete confirmation popup
    showDeleteConfirmation();
}

// Device details loading
async function loadDeviceDetails() {
    try {
        // Check if device ID is valid
        if (!deviceId) {
            console.error('Invalid device ID');
            return;
        }
        
        // Check if user is logged in
        const { data, error: userError } = await supabase.auth.getSession();
        
        if (!data.session || userError) {
            console.error('User not logged in or session error');
            return;
        }
        
        const user = data.session.user;

        // Get device data
        const { data: device, error } = await supabase
            .from('devices')
            .select('*')
            .eq('id', deviceId)
            .single();
        
        if (error) {
            console.error('Database error:', error);
            return;
        }
        
        if (!device) {
            console.error('Device not found');
            return;
        }

        // Check if the device belongs to the current user
        if (device.user_id !== user.id) {
            console.error('User does not have permission to view this device');
            return;
        }

        // Update UI with device details
        updateDeviceUI(device);
        
        // Hide loading and show content
        const loadingElement = document.getElementById('loading');
        const deviceContentElement = document.getElementById('deviceContent');
        
        if (loadingElement) loadingElement.style.display = 'none';
        if (deviceContentElement) deviceContentElement.style.display = 'block';

    } catch (error) {
        console.error('Error loading device details:', error);
    }
}

window.loadDeviceDetails = loadDeviceDetails;

function updateDeviceUI(device) {
    console.log("Updating UI with device data:", device);
    
    // Set device name and status
    document.getElementById('deviceName').textContent = device.name;
    document.getElementById('deviceNickname').value = device.name || '';
    document.getElementById('deviceIp').textContent = device.ip_address || 'Not available';
    
    // Set device status
    const statusElement = document.getElementById('deviceStatus');
    const toggleButton = document.getElementById('powerToggle');
    
    if (device.power_status) {
        // Device is ON
        if (statusElement) {
            statusElement.textContent = 'ON';
            statusElement.className = 'status-on';
        }
        
        // Update power toggle button
        if (toggleButton) {
            toggleButton.className = 'power-button on';
            toggleButton.title = 'Turn Off';
        }
    } else {
        // Device is OFF
        if (statusElement) {
            statusElement.textContent = 'OFF';
            statusElement.className = 'status-off';
        }
        
        // Update power toggle button
        if (toggleButton) {
            toggleButton.className = 'power-button off';
            toggleButton.title = 'Turn On';
        }
    }
    
    // Set consumption data
    const currentConsumption = device.current_consumption || 0;
    const dailyUsage = device.daily_usage || 0;
    const monthlyUsage = device.monthly_usage || 0;
    
    console.log(`Consumption data - Current: ${currentConsumption}W, Daily: ${dailyUsage}kWh, Monthly: ${monthlyUsage}kWh`);
    
    // Calculate the appropriate electricity rate based on monthly usage
    const calculatedRate = calculateElectricityRate(monthlyUsage);
    
    // Calculate estimated cost
    const estimatedCost = calculateElectricityCost(monthlyUsage);
    
    // Update UI with consumption data
    document.getElementById('currentConsumption').textContent = `${formatNumber(currentConsumption)} W`;
    document.getElementById('dailyUsage').textContent = `${formatNumber(dailyUsage)} kWh`;
    document.getElementById('monthlyUsage').textContent = `${formatNumber(monthlyUsage)} kWh`;
    
    // Update UI with rate and cost
    document.getElementById('electricityRate').value = formatNumber(calculatedRate);
    document.getElementById('calculatedRate').textContent = `${formatNumber(calculatedRate)} SAR/kWh`;
    document.getElementById('estimatedCost').textContent = `${formatNumber(estimatedCost)} SAR`;
    
    // Display current limits
    if (device.daily_limit) {
        document.getElementById('dailyLimitDisplay').style.display = 'block';
        document.getElementById('dailyLimit').textContent = `${formatNumber(device.daily_limit)} SAR`;
    }
    if (device.weekly_limit) {
        document.getElementById('weeklyLimitDisplay').style.display = 'block';
        document.getElementById('weeklyLimit').textContent = `${formatNumber(device.weekly_limit)} SAR`;
    }
    if (device.monthly_limit) {
        document.getElementById('monthlyLimitDisplay').style.display = 'block';
        document.getElementById('monthlyLimit').textContent = `${formatNumber(device.monthly_limit)} SAR`;
    }
    
    // Set timestamps
    document.getElementById('createdAt').textContent = formatDate(device.created_at);
    document.getElementById('updatedAt').textContent = formatDate(device.updated_at);
}

// Function to update current time
function updateCurrentTime() {
    const currentTimeElement = document.getElementById('currentTime');
    if (currentTimeElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        currentTimeElement.textContent = timeString;
    }
}

// Function to toggle device power
async function toggleDevicePower() {
    try {
        // Check if user is logged in
        const { data, error: userError } = await supabase.auth.getSession();
        
        if (!data.session || userError) {
            window.location.href = 'login.html';
            return;
        }
        
        const user = data.session.user;

        // Get device data
        const { data: device, error } = await supabase
            .from('devices')
            .select('*')
            .eq('id', deviceId)
            .single();
            
        if (error || !device) {
            showPopup('Device not found', false);
            return;
        }
        
        // Check if the device belongs to the current user
        if (device.user_id !== user.id) {
            showPopup('You do not have permission to control this device', false);
            return;
        }
        
        // Toggle power status
        const newStatus = !device.power_status;
        
        // Update in Supabase
        const { error: updateError } = await supabase
            .from('devices')
            .update({
                power_status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', deviceId);
            
        if (updateError) {
            throw updateError;
        }
        
        // Update UI
        const powerStatusText = newStatus ? 'Turn Off' : 'Turn On';
        const powerStatusElement = document.getElementById('powerStatus');
        if (powerStatusElement) {
            powerStatusElement.textContent = powerStatusText;
        }
        
        // Update power toggle button
        const toggleButton = document.getElementById('powerToggle');
        if (toggleButton) {
            toggleButton.className = `power-button ${newStatus ? 'on' : 'off'}`;
            // Update the title attribute for accessibility
            toggleButton.title = powerStatusText;
        }
        
        // Update device status in device information section
        const deviceStatusElement = document.getElementById('deviceStatus');
        if (deviceStatusElement) {
            deviceStatusElement.textContent = newStatus ? 'ON' : 'OFF';
            deviceStatusElement.className = newStatus ? 'status-on' : 'status-off';
        }
        
        showPopup(`Device turned ${newStatus ? 'on' : 'off'}`, true);
        
        // Reload device details to ensure all UI elements are updated consistently
        setTimeout(() => {
            loadDeviceDetails();
        }, 1000);
    } catch (error) {
        console.error('Error toggling device power:', error);
        showPopup('Error toggling device power', false);
    }
}

// Function to save device settings
async function saveDeviceSettings() {
    try {
        // Check if user is logged in
        const { data, error: userError } = await supabase.auth.getSession();
        
        if (!data.session || userError) {
            window.location.href = 'login.html';
            return;
        }
        
        // Get values from form
        const deviceNickname = document.getElementById('deviceNickname').value.trim();
        const costLimit = document.getElementById('costLimit').value;
        
        // Basic validation
        if (costLimit && (isNaN(parseFloat(costLimit)) || parseFloat(costLimit) < 0)) {
            showPopup('Please enter a valid cost limit (must be a positive number)', false);
            return;
        }
        
        // Get current device data to access the monthly usage
        const { data: deviceData, error: deviceError } = await supabase
            .from('devices')
            .select('*')
            .eq('id', deviceId)
            .single();
            
        if (deviceError) throw deviceError;
        
        // Calculate the appropriate electricity rate based on monthly usage
        const monthlyUsage = deviceData.monthly_usage || 0;
        const calculatedRate = calculateElectricityRate(monthlyUsage);
        
        // Calculate estimated cost
        const estimatedCost = calculateElectricityCost(monthlyUsage);
        
        // Prepare update data
        const updateData = {
            updated_at: new Date().toISOString(),
            electricity_rate: calculatedRate // Save the calculated rate to the database
        };
        
        // Only add fields that have values
        if (deviceNickname) updateData.name = deviceNickname;
        
        // Store cost limit directly in consumption_limit field
        if (costLimit && !isNaN(parseFloat(costLimit))) {
            updateData.daily_limit = parseFloat(costLimit);
            // Enable auto cutoff when setting a limit
            updateData.auto_cutoff = true;
            // Set limit period to daily by default
            updateData.limit_period = 'daily';
            
            console.log(`Saving cost limit: ${parseFloat(costLimit)} SAR`);
        }
        
        // Update device in Supabase
        const { error } = await supabase
            .from('devices')
            .update(updateData)
            .eq('id', deviceId);
            
        if (error) {
            console.error('Error updating device:', error);
            throw error;
        }
        
        // Update the UI to show the new limit
        if (costLimit && !isNaN(parseFloat(costLimit))) {
            document.getElementById('dailyLimitDisplay').style.display = 'block';
            document.getElementById('dailyLimit').textContent = `${formatNumber(parseFloat(costLimit))} SAR`;
            document.getElementById('removeCostLimit').style.display = 'inline-block';
        }
        
        showPopup('Device settings updated successfully');
        
        // Reload device details after a short delay
        setTimeout(() => {
            loadDeviceDetails();
        }, 1000);
    } catch (error) {
        console.error('Error saving device settings:', error);
        showPopup('Error saving device settings', false);
    }
}

// Function to save power limits
async function savePowerLimits() {
    try {
        // Check if user is logged in
        const { data, error: userError } = await supabase.auth.getSession();
        
        if (!data.session || userError) {
            window.location.href = 'login.html';
            return;
        }
        
        // Get values from form
        const powerLimit = document.getElementById('powerLimit').value;
        const limitType = document.getElementById('limitType').value;
        
        // Basic validation
        if (!powerLimit || isNaN(parseFloat(powerLimit)) || parseFloat(powerLimit) <= 0) {
            showPopup('Please enter a valid power limit (must be a positive number)', false);
            return;
        }
        
        // Validate limit type
        if (!['daily', 'monthly'].includes(limitType)) {
            showPopup('Please select a valid limit type', false);
            return;
        }
        
        // Get current device data
        const { data: deviceData, error: deviceError } = await supabase
            .from('devices')
            .select('*')
            .eq('id', deviceId)
            .single();
            
        if (deviceError) throw deviceError;
        
        // Calculate the power limit in kWh
        const powerLimitValue = parseFloat(powerLimit);
        
        // Prepare update data
        const updateData = {
            power_limit: powerLimitValue,
            power_limit_type: limitType,
            updated_at: new Date().toISOString()
        };
        
        // Update device in Supabase
        const { error } = await supabase
            .from('devices')
            .update(updateData)
            .eq('id', deviceId);
            
        if (error) throw error;
        
        // Update the UI to show the new limit
        document.getElementById('currentPowerLimit').textContent = `${formatNumber(powerLimitValue)} kW`;
        document.getElementById('removePowerLimit').style.display = 'inline-block';
        
        showPopup(`Power limit of ${formatNumber(powerLimitValue)} kW set successfully`);
        
        // Reload device details after a short delay
        setTimeout(() => {
            loadDeviceDetails();
        }, 1000);
    } catch (error) {
        console.error('Error saving power limit:', error);
        showPopup('Error saving power limit', false);
    }
}

// Function to remove power limit
async function removePowerLimit() {
    try {
        // Check if user is logged in
        const { data, error: userError } = await supabase.auth.getSession();
        
        if (!data.session || userError) {
            window.location.href = 'login.html';
            return;
        }

        // Update data in Supabase
        const { error } = await supabase
            .from('devices')
            .update({
                power_limit: null,
                power_limit_type: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', deviceId);
            
        if (error) {
            throw error;
        }
        
        // Update UI
        document.getElementById('powerLimit').value = '';
        document.getElementById('currentPowerLimit').textContent = 'Not set';
        document.getElementById('removePowerLimit').style.display = 'none';
        
        showPopup('Power limit removed successfully', true);
        
        // Reload device details after a short delay
        setTimeout(() => {
            loadDeviceDetails();
        }, 1000);
    } catch (error) {
        console.error('Error removing power limit:', error);
        showPopup('Error removing power limit', false);
    }
}

// Function to remove cost limit
async function removeCostLimit() {
    try {
        // Check if user is logged in
        const { data, error: userError } = await supabase.auth.getSession();
        
        if (!data.session || userError) {
            window.location.href = 'login.html';
            return;
        }

        // Update data in Supabase
        const { error } = await supabase
            .from('devices')
            .update({
                daily_limit: null,
                weekly_limit: null,
                monthly_limit: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', deviceId);
            
        if (error) {
            console.error('Error removing cost limit:', error);
            throw error;
        }
        
        // Update UI
        document.getElementById('costLimit').value = '';
        document.getElementById('dailyLimitDisplay').style.display = 'none';
        document.getElementById('weeklyLimitDisplay').style.display = 'none';
        document.getElementById('monthlyLimitDisplay').style.display = 'none';
        document.getElementById('removeCostLimit').style.display = 'none';
        
        showPopup('Cost limit removed successfully');
        
        // Reload device details after a short delay
        setTimeout(() => {
            loadDeviceDetails();
        }, 1000);
    } catch (error) {
        console.error('Error removing cost limit:', error);
        showPopup('Error removing cost limit', false);
    }
}

// Simple function to save cost limit
async function saveCostLimit() {
    try {
        // Get values
        const costLimit = parseFloat(document.getElementById('costLimit').value);
        const limitPeriod = document.getElementById('limitPeriod').value;
        
        // Validate
        if (isNaN(costLimit) || costLimit <= 0) {
            showPopup('Please enter a valid cost limit (must be a positive number)', false);
            return;
        }
        
        // Create simple update object
        const updateObj = {};
        updateObj[`${limitPeriod}_limit`] = costLimit;
        
        // Update database
        const { error } = await supabase
            .from('devices')
            .update(updateObj)
            .eq('id', deviceId);
        
        if (error) throw error;
        
        // Update UI
        document.getElementById(`${limitPeriod}LimitDisplay`).style.display = 'block';
        document.getElementById(`${limitPeriod}Limit`).textContent = `${costLimit} SAR`;
        
        // Show success message
        showPopup(`${limitPeriod.charAt(0).toUpperCase() + limitPeriod.slice(1)} limit set to ${costLimit} SAR`, true);
        
        // Clear input
        document.getElementById('costLimit').value = '';
    } catch (err) {
        console.error('Error saving limit:', err);
        showPopup('Failed to save limit. Error: ' + err.message, false);
    }
}

// Simple function to show limits
function showLimits(period, value) {
    if (period === 'daily') {
        document.getElementById('dailyLimitDisplay').style.display = 'block';
        document.getElementById('dailyLimit').textContent = `${formatNumber(value)} SAR`;
    } else if (period === 'weekly') {
        document.getElementById('weeklyLimitDisplay').style.display = 'block';
        document.getElementById('weeklyLimit').textContent = `${formatNumber(value)} SAR`;
    } else if (period === 'monthly') {
        document.getElementById('monthlyLimitDisplay').style.display = 'block';
        document.getElementById('monthlyLimit').textContent = `${formatNumber(value)} SAR`;
    }
}

// Function to reset selected limit
async function resetLimit() {
    const resetType = document.getElementById('resetLimitType').value;
    
    try {
        // Create update object based on reset type
        const updateObj = {
            updated_at: new Date().toISOString()
        };
        
        if (resetType === 'all' || resetType === 'daily') {
            updateObj.daily_limit = null;
        }
        
        if (resetType === 'all' || resetType === 'weekly') {
            updateObj.weekly_limit = null;
        }
        
        if (resetType === 'all' || resetType === 'monthly') {
            updateObj.monthly_limit = null;
        }
        
        // Update the database
        const { error } = await supabase
            .from('devices')
            .update(updateObj)
            .eq('id', deviceId);
            
        if (error) throw error;
        
        // Update the UI
        if (resetType === 'all' || resetType === 'daily') {
            document.getElementById('dailyLimit').textContent = 'Not set';
            document.getElementById('dailyLimitDisplay').style.display = 'none';
        }
        
        if (resetType === 'all' || resetType === 'weekly') {
            document.getElementById('weeklyLimit').textContent = 'Not set';
            document.getElementById('weeklyLimitDisplay').style.display = 'none';
        }
        
        if (resetType === 'all' || resetType === 'monthly') {
            document.getElementById('monthlyLimit').textContent = 'Not set';
            document.getElementById('monthlyLimitDisplay').style.display = 'none';
        }
        
        // Show confirmation
        showPopup('Limit Reset', `${resetType === 'all' ? 'All limits' : resetType.charAt(0).toUpperCase() + resetType.slice(1) + ' limit'} reset successfully`, true);
        
    } catch (error) {
        console.error('Error resetting limit:', error);
        showPopup('Error resetting limit', false);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Load device details once at startup
    loadDeviceDetails();
    
    // Update time display
    setInterval(updateCurrentTime, 1000);

    // Direct update for testing - increases consumption values every 5 seconds
    setInterval(async function() {
        if (!deviceId) return;
        
        try {
            // Get current device data
            const { data: device, error } = await supabase
                .from('devices')
                .select('*')
                .eq('id', deviceId)
                .single();
                
            if (error || !device) {
                console.error('Error fetching device for direct update:', error);
                return;
            }
            
            // Only update consumption if device is ON - use strict comparison
            if (device.power_status !== true) {
                console.log('Device is OFF, not updating consumption values');
                return;
            }
            
            console.log('Device is ON, updating consumption values');
            
            // Use device_type from database if available, otherwise fallback to name detection
            let consumptionRate = 0.05; // Default rate
            
            if (device.device_type) {
                // Set consumption rate based on stored device type
                switch (device.device_type) {
                    case 'heater':
                        consumptionRate = 0.25; // Water heaters consume a lot
                        break;
                    case 'fridge':
                        consumptionRate = 0.15; // Fridges consume moderately
                        break;
                    case 'tv':
                        consumptionRate = 0.08; // TVs consume less
                        break;
                    case 'light':
                        consumptionRate = 0.02; // Lights consume very little
                        break;
                    case 'computer':
                        consumptionRate = 0.10; // Computers consume moderately
                        break;
                    default:
                        consumptionRate = 0.05; // Default for other devices
                }
            } else {
                // Fallback to name-based detection for older devices
                const deviceName = device.name.toLowerCase();
                
                // Set consumption rate based on device type
                if (deviceName.includes('heater') || deviceName.includes('boiler')) {
                    consumptionRate = 0.25; // Water heaters consume a lot
                } else if (deviceName.includes('fridge') || deviceName.includes('refrigerator')) {
                    consumptionRate = 0.15; // Fridges consume moderately
                } else if (deviceName.includes('tv') || deviceName.includes('television')) {
                    consumptionRate = 0.08; // TVs consume less
                } else if (deviceName.includes('light') || deviceName.includes('lamp')) {
                    consumptionRate = 0.02; // Lights consume very little
                } else if (deviceName.includes('pc') || deviceName.includes('computer')) {
                    consumptionRate = 0.10; // Computers consume moderately
                }
            }
            
            // Calculate new consumption values with type-specific increases
            const dailyUsage = (device.daily_usage || 0) + consumptionRate;
            const monthlyUsage = (device.monthly_usage || 0) + consumptionRate;
            
            console.log(`Device type: ${device.device_type || 'unknown'}, Consumption rate: ${consumptionRate} kWh`);
            
            // Calculate cost
            const estimatedCost = calculateElectricityCost(monthlyUsage);
            const dailyCost = calculateElectricityCost(dailyUsage);
            const weeklyCost = calculateElectricityCost(dailyUsage * 7); // Approximate weekly cost
            
            // Check daily limit
            if (device.daily_limit && dailyCost >= device.daily_limit) {
                await turnOffDevice(device, dailyUsage, monthlyUsage, 'daily', device.daily_limit);
                return;
            }
            
            // Check weekly limit
            if (device.weekly_limit && weeklyCost >= device.weekly_limit) {
                await turnOffDevice(device, dailyUsage, monthlyUsage, 'weekly', device.weekly_limit);
                return;
            }
            
            // Check monthly limit
            if (device.monthly_limit && estimatedCost >= device.monthly_limit) {
                await turnOffDevice(device, dailyUsage, monthlyUsage, 'monthly', device.monthly_limit);
                return;
            }
            
            // Helper function to turn off device
            async function turnOffDevice(device, dailyUsage, monthlyUsage, period, limit) {
                // Create update object with power status and usage data
                const updateData = {
                    power_status: false,
                    daily_usage: dailyUsage,
                    monthly_usage: monthlyUsage,
                    updated_at: new Date().toISOString()
                };
                
                // Reset the specific limit that was met
                updateData[`${period}_limit`] = null;
                
                // Update the device in the database
                await supabase
                    .from('devices')
                    .update(updateData)
                    .eq('id', deviceId);
                
                // Update the UI to show device is turned off
                const statusElement = document.getElementById('deviceStatus');
                const toggleButton = document.getElementById('powerToggle');
                
                // Update status indicator
                if (statusElement) {
                    statusElement.textContent = 'OFF';
                    statusElement.className = 'status-off';
                }
                
                // Update power toggle button
                if (toggleButton) {
                    toggleButton.className = 'power-button off';
                    toggleButton.title = 'Turn On';
                }
                
                // Hide the limit display for the reset limit
                const limitDisplayElement = document.getElementById(`${period}LimitDisplay`);
                if (limitDisplayElement) {
                    limitDisplayElement.style.display = 'none';
                }
                
                showPopup(`Device turned off: ${period.charAt(0).toUpperCase() + period.slice(1)} cost limit of ${limit} SAR reached and has been reset`, true);
            }
            
            // Update the device with new values
            const { error: updateError } = await supabase
                .from('devices')
                .update({
                    daily_usage: dailyUsage,
                    monthly_usage: monthlyUsage,
                    updated_at: new Date().toISOString()
                })
                .eq('id', deviceId);
                
            if (updateError) {
                console.error('Error updating consumption values:', updateError);
            } else {
                console.log(`Direct update: Daily usage = ${dailyUsage.toFixed(2)} kWh, Monthly usage = ${monthlyUsage.toFixed(2)} kWh`);
            }
        } catch (err) {
            console.error('Error in direct update:', err);
        }
    }, 5000);

    // Power toggle
    const toggleButton = document.getElementById('powerToggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleDevicePower);
    }
    
    // Delete device button
    const deleteDeviceBtn = document.getElementById('deleteDevice');
    if (deleteDeviceBtn) {
        deleteDeviceBtn.addEventListener('click', confirmDeleteDevice);
    }
    
    // Confirmation popup buttons
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDelete);
    }
    
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', hideDeleteConfirmation);
    }
    
    // Cost limit button
    const saveCostLimitBtn = document.getElementById('saveCostLimit');
    if (saveCostLimitBtn) {
        saveCostLimitBtn.addEventListener('click', saveCostLimit);
    }
    
    // Reset limit button
    const resetLimitBtn = document.getElementById('resetLimit');
    if (resetLimitBtn) {
        resetLimitBtn.addEventListener('click', resetLimit);
    }
});