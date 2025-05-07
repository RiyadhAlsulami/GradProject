// Add Device functionality
import { supabase } from './config.js'
import { showPopup } from './utils.js'

// Generate a random IP address
function generateRandomIp() {
    const ipType = Math.floor(Math.random() * 4);
    
    if (ipType === 0) return `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    else if (ipType === 1) return `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    else if (ipType === 2) return `172.${16 + Math.floor(Math.random() * 16)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    else {
        const firstOctet = [1, 2, 3, 5, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223];
        const selectedFirstOctet = firstOctet[Math.floor(Math.random() * firstOctet.length)];
        return `${selectedFirstOctet}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    }
}

// Show tab function
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    document.querySelector(`.tab-button[onclick="showTab('${tabId}')"]`).classList.add('active');
}

// Select a demo device
function selectDemoDevice(deviceType, location) {
    const deviceName = `${location} ${deviceType}`;
    const statusElement = document.getElementById('status');
    statusElement.innerHTML = `<div class="spinner"></div> Setting up ${deviceName}...`;
    const demoSerial = `${Math.floor(100000 + Math.random() * 900000)}`;
    addVirtualDevice(deviceName, demoSerial);
}

// Add a virtual device
async function addVirtualDevice(deviceName, serialNumber = null) {
    const statusElement = document.getElementById('status');
    
    try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
            statusElement.textContent = "You must be logged in to add a device";
            statusElement.style.color = "red";
            showPopup("You must be logged in to add a device", false);
            setTimeout(() => window.location.href = 'login.html', 1500);
            return;
        }
        
        const user = sessionData.session.user;
        console.log("User authenticated:", user.id);
        
        const deviceSerialNumber = serialNumber || `${Math.floor(100000 + Math.random() * 900000)}`;
        const deviceTypeSelect = document.getElementById('deviceType');
        const deviceType = deviceTypeSelect ? deviceTypeSelect.value : 'other';
        
        console.log("Attempting to insert device into database");
        const { data, error } = await supabase
            .from('devices')
            .insert([{
                user_id: user.id,
                name: deviceName,
                serial_number: parseInt(deviceSerialNumber),
                ip_address: generateRandomIp(),
                power_status: true, 
                current_consumption: 0, 
                daily_usage: 0,     
                monthly_usage: 0,   
                electricity_rate: 0.18,
                device_type: deviceType, 
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select();
        
        if (error) {
            console.error('Supabase insertion error:', error);
            statusElement.textContent = "Error: " + error.message;
            statusElement.style.color = "red";
            showPopup('Error adding device: ' + error.message, false);
            return;
        }
        
        console.log("Device added successfully:", data);
        statusElement.textContent = `${deviceName} connected successfully!`;
        statusElement.style.color = "green";
        showPopup(`${deviceName} connected successfully! Consumption will start at 0 and increase naturally over time.`, true);
        
        try {
            import('./power-simulation.js')
                .then(module => {
                    if (module && module.simulateConsumption) {
                        console.log('Triggering initial consumption simulation for new device');
                        module.simulateConsumption();
                    }
                })
                .catch(err => console.error('Error importing power simulation module:', err));
            
            if (window.PowerSimulation && window.PowerSimulation.forceUpdate) {
                console.log('Forcing immediate update via global PowerSimulation');
                window.PowerSimulation.forceUpdate();
            }
        } catch (simError) {
            console.warn('Could not trigger immediate consumption update:', simError);
        }
        
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
    } catch (error) {
        console.error('Error adding device:', error);
        statusElement.textContent = "Error: " + (error.message || "Unknown error");
        statusElement.style.color = "red";
        showPopup('Error adding device: ' + (error.message || 'Unknown error'), false);
    }
}

// Function to update device information based on selected device type
function updateDeviceTypeInfo(selectElement) {
    const deviceType = selectElement.value;
    const infoContainer = document.getElementById('deviceTypeInfo');
    
    if (!infoContainer) {
        const formGroup = selectElement.closest('.form-group');
        const newInfoContainer = document.createElement('div');
        newInfoContainer.id = 'deviceTypeInfo';
        newInfoContainer.className = 'device-type-info';
        formGroup.appendChild(newInfoContainer);
    }
    
    const container = document.getElementById('deviceTypeInfo');
    
    const deviceInfo = {
        'light': {
            icon: '💡',
            avgWattage: '60W',
            description: 'Lighting devices typically consume between 5-100W depending on type and brightness.'
        },
        'tv': {
            icon: '📺',
            avgWattage: '120W',
            description: 'TVs consume between 80-400W depending on screen size and technology.'
        },
        'ac': {
            icon: '❄️',
            avgWattage: '1500W',
            description: 'Air conditioners are high-consumption devices using 1000-3500W depending on size and efficiency.'
        },
        'refrigerator': {
            icon: '🧊',
            avgWattage: '150W',
            description: 'Refrigerators use 100-400W depending on size and age, running in cycles throughout the day.'
        },
        'other': {
            icon: '🔌',
            avgWattage: 'Varies',
            description: 'Select this for any device not in the list. You can monitor its consumption regardless of type.'
        }
    };
    
    container.innerHTML = '';
    
    if (deviceType && deviceInfo[deviceType]) {
        const info = deviceInfo[deviceType];
        container.innerHTML = `
            <div class="device-icon">${info.icon}</div>
            <div class="device-details">
                <div class="device-wattage"><strong>Avg. Power:</strong> ${info.avgWattage}</div>
                <div class="device-description">${info.description}</div>
            </div>
        `;
        container.style.display = 'flex';
    } else {
        container.style.display = 'none';
    }
}

// Main initialization function
document.addEventListener('DOMContentLoaded', () => {
    console.log("AddDevice script loaded");
    
    window.showTab = showTab;
    window.selectDemoDevice = selectDemoDevice;
    window.updateDeviceTypeInfo = updateDeviceTypeInfo;
    
    supabase.auth.getSession().then(({ data, error }) => {
        if (error || !data.session) {
            console.error("Not logged in, redirecting to login page");
            window.location.href = 'login.html';
            return;
        }
        
        const user = data.session.user;
        console.log("User authenticated:", user.id);
        
        const deviceForm = document.getElementById('deviceForm');
        if (deviceForm) {
            deviceForm.addEventListener('submit', function(event) {
                event.preventDefault();
                const deviceName = document.getElementById('deviceName').value;
                const deviceCode = document.getElementById('deviceCode').value;
                
                if (!deviceCode || deviceCode.length !== 5) {
                    showPopup("Please enter a valid 5-digit device code", false);
                    return;
                }
                
                const statusElement = document.getElementById('status') || document.createElement('div');
                if (!statusElement.id) {
                    statusElement.id = 'status';
                    deviceForm.appendChild(statusElement);
                }
                
                statusElement.innerHTML = `<div class="spinner"></div> Pairing with device ${deviceCode}...`;
                
                addVirtualDevice(deviceName);
            });
        }
        
        const deviceTypeSelect = document.getElementById('deviceType');
        if (deviceTypeSelect && deviceTypeSelect.value) {
            updateDeviceTypeInfo(deviceTypeSelect);
        }
    });
});
