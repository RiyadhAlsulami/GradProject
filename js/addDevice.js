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
    const ipParts = [];
    for (let i = 0; i < 4; i++) {
        ipParts.push(Math.floor(Math.random() * 256));
    }
    return ipParts.join('.');
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

// Simulate QR code scanning
async function simulateScan() {
    const statusElement = document.getElementById('status');
    statusElement.innerHTML = '<div class="spinner"></div> Scanning QR code...';
    
    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a random device type
    const deviceTypes = ['Smart TV', 'Refrigerator', 'Air Conditioner', 'Lamp', 'Computer'];
    const randomType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
    
    // Generate a random room
    const rooms = ['Living Room', 'Kitchen', 'Bedroom', 'Office', 'Dining Room'];
    const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
    
    // Generate a random serial number
    const randomSerial = `${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Show success and create the device
    statusElement.textContent = `QR code detected: ${randomType} in ${randomRoom}`;
    addVirtualDevice(`${randomRoom} ${randomType}`, randomSerial);
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
    window.simulateScan = simulateScan;
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
