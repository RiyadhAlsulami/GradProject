// Device details functionality
import { supabase } from './config.js'
import { calculateElectricityRate, calculateElectricityCost } from './electricity-rates.js'
import { showPopup } from './utils.js'

// Get device ID from URL
const urlParams = new URLSearchParams(window.location.search);
const deviceId = urlParams.get('id');

// Common utility functions
function formatDate(date) { return date ? new Date(date).toLocaleString() : 'N/A'; }
function formatNumber(value, decimals = 2) { return value ? parseFloat(value).toFixed(decimals) : '0.00'; }

// Device deletion functions
function showDeleteConfirmation() { document.getElementById('deleteConfirmation').classList.add('active'); }
function hideDeleteConfirmation() { document.getElementById('deleteConfirmation').classList.remove('active'); }

async function confirmDelete() {
    try {
        const { error } = await supabase.from('devices').delete().eq('id', deviceId);
        if (error) throw error;
        
        showPopup('Device deleted successfully', true);
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
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
    ['daily', 'weekly', 'monthly'].forEach(period => {
        const limitValue = device[`${period}_limit`];
        document.getElementById(`${period}LimitDisplay`).style.display = 'block';
        document.getElementById(`${period}Limit`).textContent = limitValue ? 
            `${formatNumber(limitValue)} SAR` : 'No limit';
    });
    
    // Set timestamps
    document.getElementById('createdAt').textContent = formatDate(device.created_at);
    document.getElementById('updatedAt').textContent = formatDate(device.updated_at);
}

// Function to update current time
function updateCurrentTime() {
    const currentTimeElement = document.getElementById('currentTime');
    if (currentTimeElement) {
        currentTimeElement.textContent = new Date().toLocaleTimeString();
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
            
        if (updateError) throw updateError;
        
        // Update UI elements
        const powerStatusText = newStatus ? 'Turn Off' : 'Turn On';
        
        // Update power status element
        const powerStatusElement = document.getElementById('powerStatus');
        if (powerStatusElement) powerStatusElement.textContent = powerStatusText;
        
        // Update power toggle button
        const toggleButton = document.getElementById('powerToggle');
        if (toggleButton) {
            toggleButton.className = `power-button ${newStatus ? 'on' : 'off'}`;
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
        setTimeout(loadDeviceDetails, 1000);
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
        
        // Basic validation
        if (!deviceNickname) {
            showPopup('Please enter a valid device name', false);
            return;
        }
        
        // Update the device with new values
        const { error: updateError } = await supabase
            .from('devices')
            .update({
                name: deviceNickname,
                updated_at: new Date().toISOString()
            })
            .eq('id', deviceId);
            
        if (updateError) throw updateError;
        
        // Show success message
        showPopup('Device settings saved successfully', true);
        
        // Update the device name in the UI
        document.getElementById('deviceName').textContent = deviceNickname;
    } catch (error) {
        console.error('Error saving device settings:', error);
        showPopup('Error saving device settings', false);
    }
}

// Function to save cost limit
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
    if (['daily', 'weekly', 'monthly'].includes(period)) {
        document.getElementById(`${period}LimitDisplay`).style.display = 'block';
        document.getElementById(`${period}Limit`).textContent = `${formatNumber(value)} SAR`;
    }
}

// Function to reset selected limit
async function resetLimit() {
    const resetType = document.getElementById('resetLimitType').value;
    
    try {
        // Create update object based on reset type
        const updateObj = { updated_at: new Date().toISOString() };
        const periodsToReset = resetType === 'all' ? ['daily', 'weekly', 'monthly'] : [resetType];
        
        // Set limits to null for selected periods
        periodsToReset.forEach(period => {
            updateObj[`${period}_limit`] = null;
        });
        
        // Update the database
        const { error } = await supabase
            .from('devices')
            .update(updateObj)
            .eq('id', deviceId);
            
        if (error) throw error;
        
        // Update the UI for each reset period
        periodsToReset.forEach(period => {
            document.getElementById(`${period}Limit`).textContent = 'Not set';
            document.getElementById(`${period}LimitDisplay`).style.display = 'none';
        });
        
        // Show confirmation
        const resetMsg = resetType === 'all' ? 'All limits' : 
            `${resetType.charAt(0).toUpperCase() + resetType.slice(1)} limit`;
        showPopup('Limit Reset', `${resetMsg} reset successfully`, true);
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
                const ratesByType = {
                    'heater': 0.25,   // Water heaters consume a lot
                    'fridge': 0.15,   // Fridges consume moderately
                    'tv': 0.08,       // TVs consume less
                    'light': 0.02,    // Lights consume very little
                    'computer': 0.10  // Computers consume moderately
                };
                consumptionRate = ratesByType[device.device_type] || 0.05;
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
            
            // Check limits and turn off device if needed
            if ((device.daily_limit && dailyCost >= device.daily_limit) ||
                (device.weekly_limit && weeklyCost >= device.weekly_limit) ||
                (device.monthly_limit && estimatedCost >= device.monthly_limit)) {
                
                // Determine which limit was reached
                let period, limit;
                if (device.daily_limit && dailyCost >= device.daily_limit) {
                    period = 'daily';
                    limit = device.daily_limit;
                } else if (device.weekly_limit && weeklyCost >= device.weekly_limit) {
                    period = 'weekly';
                    limit = device.weekly_limit;
                } else {
                    period = 'monthly';
                    limit = device.monthly_limit;
                }
                
                await turnOffDevice(device, dailyUsage, monthlyUsage, period, limit);
                return;
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

    // Set up event listeners for UI elements
    const elements = {
        'powerToggle': toggleDevicePower,
        'deleteDevice': confirmDeleteDevice,
        'confirmDelete': confirmDelete,
        'cancelDelete': hideDeleteConfirmation,
        'saveCostLimit': saveCostLimit,
        'resetLimit': resetLimit,
        'saveDeviceSettings': saveDeviceSettings
    };
    
    // Add event listeners to all elements
    Object.entries(elements).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) element.addEventListener('click', handler);
    });
});