// Power Consumption Simulation
import { supabase } from './config.js';

// Simulation settings
const SIMULATION_INTERVAL = 10000; // Update every 10 seconds (reduced from 30 seconds)
let SIMULATION_ENABLED = true;   // Global toggle for simulation
let simulationRunning = false;   // Flag to prevent multiple simulation loops

// Consumption rates per device type (in kW per hour)
// These represent typical values for each type of device
const CONSUMPTION_RATES = {
    'default': { min: 0.05, max: 0.2 },
    'tv': { min: 0.1, max: 0.3 },
    'refrigerator': { min: 0.05, max: 0.15 },
    'air conditioner': { min: 0.8, max: 1.5 },
    'computer': { min: 0.1, max: 0.4 },
    'lamp': { min: 0.01, max: 0.06 },
    'washing machine': { min: 0.4, max: 0.8 },
    'heater': { min: 1.0, max: 2.0 },
    'water heater': { min: 1.0, max: 1.5 },
    'fan': { min: 0.03, max: 0.07 },
    'kitchen': { min: 0.2, max: 0.5 }
};

// Helper function to determine device type from name
function determineDeviceType(deviceName) {
    const nameLower = deviceName.toLowerCase();
    
    for (const type in CONSUMPTION_RATES) {
        if (type !== 'default' && nameLower.includes(type)) {
            return type;
        }
    }
    
    return 'default';
}

// Generate a random consumption value based on device type
function generateConsumptionValue(deviceName) {
    const deviceType = determineDeviceType(deviceName);
    const { min, max } = CONSUMPTION_RATES[deviceType] || CONSUMPTION_RATES.default;
    
    // Base hourly rate
    const baseHourlyRate = min + Math.random() * (max - min);
    
    // Add some randomness (±20%)
    const randomFactor = 0.8 + (Math.random() * 0.4);
    
    // Calculate per-interval rate (convert from hourly)
    // Increased base rate for more noticeable changes
    const intervalRate = (baseHourlyRate * randomFactor) / (3600 * 1000 / SIMULATION_INTERVAL) * 3;
    
    // Round to 3 decimal places
    return Math.round(intervalRate * 1000) / 1000;
}

// Function to update a device's consumption
async function updateDeviceConsumption(device) {
    if (!device.power_status) {
        // Device is off, no consumption update needed
        return;
    }
    
    try {
        // Generate new consumption value for the increment (make it larger for demonstration)
        let consumptionIncrement;
        
        // Check if this is a new device (has very low or zero consumption history)
        const isNewDevice = (device.daily_usage || 0) < 0.01 && (device.monthly_usage || 0) < 0.01;
        
        if (isNewDevice) {
            // For new devices, start with small but visible increments
            const deviceType = determineDeviceType(device.name);
            const { min } = CONSUMPTION_RATES[deviceType] || CONSUMPTION_RATES.default;
            
            // Start with 15-20% of minimum value to ensure it's visible in the UI
            // Multiplied by 5 to make changes more noticeable for demonstration
            consumptionIncrement = (min * (0.15 + Math.random() * 0.05)) / (3600 * 1000 / SIMULATION_INTERVAL) * 5;
            console.log(`New device detected (${device.name}): Starting with initial consumption`);
        } else {
            // Normal consumption generation for established devices
            consumptionIncrement = generateConsumptionValue(device.name);
        }
        
        // Round to 3 decimal places
        consumptionIncrement = Math.round(consumptionIncrement * 1000) / 1000;
        
        // For current_consumption, use a higher value that will be visible in the UI
        // This represents the instantaneous power draw of the device
        const deviceType = determineDeviceType(device.name);
        const { min, max } = CONSUMPTION_RATES[deviceType] || CONSUMPTION_RATES.default;
        
        // Set current_consumption to a realistic value based on device type
        // Start between 20-40% of the device's typical range for new devices
        // Or 40-80% for established devices
        let currentConsumption;
        if (isNewDevice) {
            currentConsumption = min + (max - min) * (0.2 + Math.random() * 0.2);
        } else {
            currentConsumption = min + (max - min) * (0.4 + Math.random() * 0.4);
        }
        
        // Round current consumption to 2 decimal places to match UI
        currentConsumption = Math.round(currentConsumption * 100) / 100;
        
        // Update accumulated usage totals - ensure values are numbers
        const dailyUsage = typeof device.daily_usage === 'number' ? device.daily_usage : 0;
        const monthlyUsage = typeof device.monthly_usage === 'number' ? device.monthly_usage : 0;
        
        const newDailyTotal = dailyUsage + consumptionIncrement;
        const newMonthlyTotal = monthlyUsage + consumptionIncrement;
        
        // Update in Supabase
        const { error } = await supabase
            .from('devices')
            .update({
                current_consumption: currentConsumption, // Visible, realistic instantaneous consumption
                daily_usage: newDailyTotal,              // Incrementally increasing total
                monthly_usage: newMonthlyTotal,          // Incrementally increasing total
                updated_at: new Date().toISOString()
            })
            .eq('id', device.id);
        
        if (error) {
            console.error('Error updating device consumption:', error);
        } else {
            console.log(`Updated ${device.name}: Current: ${currentConsumption.toFixed(2)} kW, +${consumptionIncrement.toFixed(3)} kW (Daily: ${newDailyTotal.toFixed(3)}, Monthly: ${newMonthlyTotal.toFixed(3)})`);
            
            // Check if device details page is open for this device
            if (window.location.pathname.includes('device-details.html') && 
                window.location.search.includes(device.id)) {
                // If we're on the device details page, refresh the data
                if (typeof window.loadDeviceDetails === 'function') {
                    window.loadDeviceDetails();
                }
            }
        }
    } catch (error) {
        console.error('Error in consumption simulation:', error);
    }
}

// Main function to update all devices
async function simulateConsumption() {
    if (!SIMULATION_ENABLED || simulationRunning) return;
    
    // Set flag to prevent multiple concurrent simulations
    simulationRunning = true;
    
    try {
        console.log("Running consumption simulation cycle...");
        
        // Get current user
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
            console.log("No active session, skipping simulation");
            return;
        }
        
        const user = sessionData.session.user;
        
        // Get all devices for this user
        const { data: devices, error } = await supabase
            .from('devices')
            .select('*')
            .eq('user_id', user.id);
        
        if (error) {
            console.error('Error fetching devices:', error);
            return;
        }
        
        if (!devices || devices.length === 0) {
            console.log("No devices found for simulation");
            return;
        }
        
        console.log(`Simulating consumption for ${devices.length} devices`);
        
        // Update each device
        for (const device of devices) {
            await updateDeviceConsumption(device);
        }
        
    } catch (error) {
        console.error('Error in consumption simulation:', error);
    } finally {
        // Reset the flag
        simulationRunning = false;
        
        // Schedule next update
        if (SIMULATION_ENABLED) {
            setTimeout(simulateConsumption, SIMULATION_INTERVAL);
        }
    }
}

// Initialize the simulator
function initSimulation() {
    console.log('%c⚡ SIMULATION MODE ⚡ - Power consumption is being simulated', 
        'background: #FFC107; color: #000; padding: 4px; border-radius: 4px; font-weight: bold');
    
    // Force a simulation run right away
    simulateConsumption();
}

// Start simulation when the script loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Starting power consumption simulation...');
    
    // Start the simulation after a short delay
    setTimeout(initSimulation, 2000);
});

// Make simulation controls available globally
window.PowerSimulation = {
    start: () => {
        if (!SIMULATION_ENABLED) {
            SIMULATION_ENABLED = true;
            simulateConsumption();
            console.log('Simulation started');
            return "Simulation started";
        }
        return "Simulation already running";
    },
    stop: () => {
        SIMULATION_ENABLED = false;
        console.log('Simulation stopped');
        return "Simulation stopped";
    },
    getStatus: () => ({ 
        enabled: SIMULATION_ENABLED, 
        running: simulationRunning,
        interval: SIMULATION_INTERVAL
    }),
    forceUpdate: () => {
        if (!simulationRunning) {
            simulateConsumption();
            return "Forced update initiated";
        }
        return "Simulation already in progress";
    }
};

// Export for use in other modules
export { simulateConsumption };
