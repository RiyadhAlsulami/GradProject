// Device details functionality
import { supabase } from './config.js'
import { calculateElectricityRate, calculateElectricityCost } from './electricity-rates.js'

// Get device ID from URL
const urlParams = new URLSearchParams(window.location.search);
const deviceId = urlParams.get('id');

// Common utility functions
function showPopup(message, isSuccess = true) {
    const popup = document.createElement('div');
    popup.className = `popup ${isSuccess ? 'success' : 'error'}`;
    popup.textContent = message;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => {
            document.body.removeChild(popup);
        }, 500);
    }, 3000);
}

function formatDate(date) {
    return date ? new Date(date).toLocaleString() : 'N/A';
}

function formatNumber(value, decimals = 2) {
    return value ? parseFloat(value).toFixed(decimals) : '0.00';
}

function generateRandomIp() {
    const ipParts = [];
    for (let i = 0; i < 4; i++) {
        ipParts.push(Math.floor(Math.random() * 256));
    }
    return ipParts.join('.');
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

// Device details loading
async function loadDeviceDetails() {
    try {
        // Check if device ID is valid
        if (!deviceId) {
            showPopup('Invalid device ID', false);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            return;
        }
        
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
        
        if (error) {
            console.error('Database error:', error);
            showPopup('Error loading device: ' + error.message, false);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            return;
        }
        
        if (!device) {
            showPopup('Device not found', false);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            return;
        }

        // Check if the device belongs to the current user
        if (device.user_id !== user.id) {
            showPopup('You do not have permission to view this device', false);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
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
        showPopup('Error loading device details: ' + (error.message || 'Unknown error'), false);
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 3000);
    }
}

window.loadDeviceDetails = loadDeviceDetails;

function updateDeviceUI(device) {
    // Set device name and status
    document.getElementById('deviceName').textContent = device.name;
    document.getElementById('deviceNickname').value = device.name || '';
    document.getElementById('deviceIp').textContent = device.ip_address || 'Not available';
    
    // Set device status
    const statusElement = document.getElementById('deviceStatus');
    
    if (device.power_status) {
        statusElement.textContent = 'ON';
        statusElement.className = 'status-on';
    } else {
        statusElement.textContent = 'OFF';
        statusElement.className = 'status-off';
    }
    
    // Set consumption data
    const currentConsumption = device.current_consumption || 0;
    const dailyUsage = device.daily_usage || 0;
    const monthlyUsage = device.monthly_usage || 0;
    
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
    
    // Set cost limit if available
    if (device.consumption_limit) {
        document.getElementById('costLimit').value = device.consumption_limit;
        document.getElementById('currentCostLimit').textContent = `${formatNumber(device.consumption_limit)} SAR`;
        document.getElementById('removeCostLimit').style.display = 'inline-block';
    } else {
        document.getElementById('costLimit').value = '';
        document.getElementById('currentCostLimit').textContent = 'Not set';
        document.getElementById('removeCostLimit').style.display = 'none';
    }
    
    // Set power limit if available
    if (device.power_limit) {
        document.getElementById('powerLimit').value = device.power_limit;
        document.getElementById('currentPowerLimit').textContent = `${formatNumber(device.power_limit)} kW`;
        document.getElementById('removePowerLimit').style.display = 'inline-block';
        
        // Set limit type
        if (device.power_limit_type) {
            document.getElementById('limitType').value = device.power_limit_type;
        }
    } else {
        document.getElementById('powerLimit').value = '';
        document.getElementById('currentPowerLimit').textContent = 'Not set';
        document.getElementById('removePowerLimit').style.display = 'none';
    }
    
    // Update timestamps
    document.getElementById('createdAt').textContent = formatDate(device.created_at);
    document.getElementById('updatedAt').textContent = formatDate(device.updated_at);
    
    // Check if any limits are exceeded
    checkAndEnforceLimits(device);
}

// Check and enforce power and cost limits
async function checkAndEnforceLimits(device) {
    if (!device.power_status) {
        return; // Don't check limits if device is off
    }
    
    const costLimit = device.consumption_limit; // Cost limit is stored in consumption_limit
    const limitPeriod = device.limit_period || 'daily';
    const autoCutoff = device.auto_cutoff || false;
    
    if (!costLimit || !autoCutoff) {
        // No limits set or auto cutoff disabled
        return;
    }
    
    const currentConsumption = device.current_consumption || 0;
    const dailyUsage = device.daily_usage || 0;
    const monthlyUsage = device.monthly_usage || 0;
    const electricityRate = device.electricity_rate || 0.18;
    
    // Calculate current cost
    const dailyCost = dailyUsage * electricityRate;
    const monthlyCost = monthlyUsage * electricityRate;
    
    let limitExceeded = false;
    let limitMessage = '';
    
    // Check cost limit
    if (limitPeriod === 'daily' && dailyCost >= costLimit) {
        limitExceeded = true;
        limitMessage = `Daily cost limit of ${formatNumber(costLimit)} SAR has been reached`;
    } else if (limitPeriod === 'monthly' && monthlyCost >= costLimit) {
        limitExceeded = true;
        limitMessage = `Monthly cost limit of ${formatNumber(costLimit)} SAR has been reached`;
    }
    
    // If limit exceeded and auto cutoff is enabled, turn off the device
    if (limitExceeded && autoCutoff) {
        try {
            // Update in Supabase
            const { error } = await supabase
                .from('devices')
                .update({
                    power_status: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', deviceId);
                
            if (error) {
                throw error;
            }
            
            // Update UI
            const powerStatusElement = document.getElementById('powerStatus');
            powerStatusElement.textContent = 'Turn On';
            
            const toggleButton = document.getElementById('powerToggle');
            toggleButton.className = 'power-button off';
            
            showPopup(`Device turned off automatically: ${limitMessage}`, true);
            
            // Add an alert to the UI
            document.getElementById('limitWarning').style.display = 'flex';
            document.getElementById('warningMessage').textContent = limitMessage;
            
        } catch (error) {
            console.error('Error enforcing device limits:', error);
            showPopup('Error enforcing device limits', false);
        }
    }
}

// Power limits functions
function updatePowerLimits(device) {
    const powerLimit = device.consumption_limit || null;
    const costLimit = device.expected_consumption ? device.expected_consumption * device.electricity_rate : null;
    const limitPeriod = device.limit_period || null;

    document.getElementById('currentPowerLimit').textContent = 
        powerLimit ? `${formatNumber(powerLimit)} kW` : 'Not set';
    document.getElementById('currentCostLimit').textContent = 
        costLimit ? `${formatNumber(costLimit)} SAR` : 'Not set';
    document.getElementById('currentLimitPeriod').textContent = 
        limitPeriod ? limitPeriod.charAt(0).toUpperCase() + limitPeriod.slice(1) : 'Not set';

    // Update form fields
    document.getElementById('powerLimit').value = powerLimit || '';
    document.getElementById('costLimit').value = costLimit ? (costLimit / device.electricity_rate) : '';
    document.getElementById('limitPeriod').value = limitPeriod || 'daily';
    
    // Update button visibility
    document.getElementById('removePowerLimit').style.display = powerLimit ? 'block' : 'none';
    document.getElementById('removeCostLimit').style.display = costLimit ? 'block' : 'none';
}

// Function to update current time
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('currentTime').textContent = timeString;
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
        powerStatusElement.textContent = powerStatusText;
        
        // Update power toggle button
        const toggleButton = document.getElementById('powerToggle');
        toggleButton.className = `power-button ${newStatus ? 'on' : 'off'}`;
        
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
        
        // Prepare update data
        const updateData = {
            updated_at: new Date().toISOString(),
            electricity_rate: calculatedRate // Save the calculated rate to the database
        };
        
        // Only add fields that have values
        if (deviceNickname) updateData.name = deviceNickname;
        
        // Store cost limit directly in consumption_limit field
        if (costLimit && !isNaN(parseFloat(costLimit))) {
            updateData.consumption_limit = parseFloat(costLimit);
            // Enable auto cutoff when setting a limit
            updateData.auto_cutoff = true;
        }
        
        // Update device in Supabase
        const { error } = await supabase
            .from('devices')
            .update(updateData)
            .eq('id', deviceId);
            
        if (error) throw error;
        
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

// Function to confirm and delete device
async function confirmDeleteDevice() {
    if (confirm('Are you sure you want to delete this device? This action cannot be undone.')) {
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
            updated_at: new Date().toISOString(),
            auto_cutoff: true // Enable auto cutoff when setting a limit
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
                consumption_limit: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', deviceId);
            
        if (error) {
            throw error;
        }
        
        // Update UI
        document.getElementById('costLimit').value = '';
        document.getElementById('currentCostLimit').textContent = 'Not set';
        document.getElementById('removeCostLimit').style.display = 'none';
        
        showPopup('Cost limit removed successfully', true);
        
        // Reload device details after a short delay
        setTimeout(() => {
            loadDeviceDetails();
        }, 1000);
    } catch (error) {
        console.error('Error removing cost limit:', error);
        showPopup('Error removing cost limit', false);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Load device details
    loadDeviceDetails();
    
    // Update time display
    setInterval(updateCurrentTime, 1000);

    // Power toggle
    const toggleButton = document.getElementById('powerToggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleDevicePower);
    }
    
    // Save settings button
    const saveSettingsButton = document.getElementById('saveSettings');
    if (saveSettingsButton) {
        saveSettingsButton.addEventListener('click', saveDeviceSettings);
    }
    
    // Delete device button
    const deleteDeviceBtn = document.getElementById('deleteDevice');
    if (deleteDeviceBtn) {
        deleteDeviceBtn.addEventListener('click', confirmDeleteDevice);
    }
    
    // Power limit controls
    const savePowerLimitsButton = document.getElementById('savePowerLimits');
    if (savePowerLimitsButton) {
        savePowerLimitsButton.addEventListener('click', savePowerLimits);
    }
    
    const removePowerLimitButton = document.getElementById('removePowerLimit');
    if (removePowerLimitButton) {
        removePowerLimitButton.addEventListener('click', removePowerLimit);
    }
    
    const removeCostLimitButton = document.getElementById('removeCostLimit');
    if (removeCostLimitButton) {
        removeCostLimitButton.addEventListener('click', removeCostLimit);
    }
});