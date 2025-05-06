// Add Device functionality
import { supabase } from './config.js'

// Unified error/success popup
function showPopup(message, isSuccess = true) {
    const popup = document.createElement('div');
    popup.className = 'popup ' + (isSuccess ? 'success' : 'error');
    popup.textContent = message;
    document.body.appendChild(popup);

    setTimeout(() => {
        popup.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => {
            document.body.removeChild(popup);
        }, 500);
    }, 3000);
}

// Generate a random IP address
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

// Show tab function
function showTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Deactivate all buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabId).style.display = 'block';
    
    // Activate the button
    document.querySelector(`.tab-button[onclick="showTab('${tabId}')"]`).classList.add('active');
}

// Select a demo device
function selectDemoDevice(deviceType, location) {
    const deviceName = `${location} ${deviceType}`;
    const statusElement = document.getElementById('status');
    statusElement.innerHTML = `<div class="spinner"></div> Setting up ${deviceName}...`;
    
    // Generate a random serial number for demo devices
    const demoSerial = `${Math.floor(100000 + Math.random() * 900000)}`;
    addVirtualDevice(deviceName, demoSerial);
}

// Add a virtual device
async function addVirtualDevice(deviceName, serialNumber = null) {
    const statusElement = document.getElementById('status');
    
    try {
        // Check if user is logged in
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
            statusElement.textContent = "You must be logged in to add a device";
            statusElement.style.color = "red";
            showPopup("You must be logged in to add a device", false);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return;
        }
        
        const user = sessionData.session.user;
        console.log("User authenticated:", user.id);
        
        // Generate a serial number if one wasn't provided
        const deviceSerialNumber = serialNumber || `${Math.floor(100000 + Math.random() * 900000)}`;
        
        // Get the device type from the dropdown if available
        const deviceTypeSelect = document.getElementById('deviceType');
        const deviceType = deviceTypeSelect ? deviceTypeSelect.value : 'other';
        
        console.log("Attempting to insert device into database");
        // Create device in Supabase with 0 initial values
        const { data, error } = await supabase
            .from('devices')
            .insert([{
                user_id: user.id,
                name: deviceName,
                serial_number: parseInt(deviceSerialNumber),
                ip_address: generateRandomIp(),
                power_status: true, // Start powered on
                current_consumption: 0, // Start with 0 consumption
                daily_usage: 0,     // Start with 0 daily usage
                monthly_usage: 0,   // Start with 0 monthly usage
                electricity_rate: 0.18,
                device_type: deviceType, // Save the device type
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
        
        // Redirect to dashboard after a small delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    } catch (error) {
        console.error('Error adding device:', error);
        statusElement.textContent = "Error: " + (error.message || "Unknown error");
        statusElement.style.color = "red";
        showPopup('Error adding device: ' + (error.message || 'Unknown error'), false);
    }
}

// Main initialization function
document.addEventListener('DOMContentLoaded', () => {
    console.log("AddDevice script loaded");
    
    // Expose functions to window object for HTML access
    window.showTab = showTab;
    window.selectDemoDevice = selectDemoDevice;
    
    // Check if user is logged in
    supabase.auth.getSession().then(({ data, error }) => {
        if (error || !data.session) {
            console.error("Not logged in, redirecting to login page");
            window.location.href = 'login.html';
            return;
        }
        
        const user = data.session.user;
        console.log("User authenticated:", user.id);
        
        // Set up the device code form
        const deviceCodeForm = document.getElementById('deviceCodeForm');
        if (deviceCodeForm) {
            deviceCodeForm.addEventListener('submit', function(event) {
                event.preventDefault();
                const deviceName = document.getElementById('deviceName').value;
                const deviceCode = document.getElementById('deviceCode').value;
                
                if (!deviceCode || deviceCode.length !== 6) {
                    showPopup("Please enter a valid 6-digit device code", false);
                    return;
                }
                
                const statusElement = document.getElementById('status');
                statusElement.innerHTML = `<div class="spinner"></div> Pairing with device ${deviceCode}...`;
                
                // Simulate connection process
                setTimeout(() => {
                    // Use the device name if provided, otherwise generate one based on the code
                    const finalDeviceName = deviceName || `Smart Device ${deviceCode}`;
                    addVirtualDevice(finalDeviceName, deviceCode);
                }, 2000);
            });
        }
        
        // Set up the addDeviceForm if it exists
        const deviceForm = document.getElementById('addDeviceForm');
        if (deviceForm) {
            console.log("Device form found:", deviceForm);
            deviceForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log("Form submitted");
                
                const deviceName = document.getElementById('deviceName').value;
                const deviceSerialNumber = document.getElementById('deviceSerialNumber').value;
                
                console.log("Input values:", { deviceName, deviceSerialNumber });

                const serialNumberRegex = /^\d{6}$/;
                if (!serialNumberRegex.test(deviceSerialNumber)) {
                    showPopup("Invalid serial number format. Please enter a 6-digit number", false);
                    return;
                }

                try {
                    console.log("Attempting to insert device into database");
                    // Create device in Supabase
                    const { data, error } = await supabase
                        .from('devices')
                        .insert([{
                            user_id: user.id,
                            name: deviceName,
                            serial_number: parseInt(deviceSerialNumber),
                            ip_address: generateRandomIp(),
                            power_status: false,
                            current_consumption: 0,
                            daily_usage: 0,
                            monthly_usage: 0,
                            electricity_rate: 0.18,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }])
                        .select();  // Add this to get the returned data

                    if (error) {
                        console.error('Supabase insertion error:', error);
                        throw error;
                    }

                    console.log("Device added successfully:", data);
                    showPopup('Device added successfully!', true);
                    deviceForm.reset();
                    
                    // Redirect to dashboard after a small delay
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } catch (error) {
                    console.error('Error adding device:', error);
                    showPopup('Error adding device: ' + (error.message || 'Unknown error'), false);
                }
            });
        }
    });
});
