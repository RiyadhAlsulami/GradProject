// Dashboard functionality
import { supabase } from './config.js'
import { showPopup, formatDate } from './utils.js'

// Keep the original showPopup function as a fallback
function _showPopup(message, isSuccess = true) {
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

// Use the imported showPopup by default, but fall back to the original if needed
function showLocalPopup(message, isSuccess = true) {
    try {
        showPopup(message, isSuccess);
    } catch (error) {
        console.warn('Error using utility showPopup, falling back to local implementation', error);
        _showPopup(message, isSuccess);
    }
}

function displayDevices(devices) {
    const devicesList = document.getElementById('devicesList');
    devicesList.innerHTML = '';
  
    if (devices.length === 0) {
      // Use the empty state template
      const emptyTemplate = document.getElementById('emptyDevicesTemplate');
      if (emptyTemplate) {
        const emptyContent = emptyTemplate.content.cloneNode(true);
        devicesList.appendChild(emptyContent);
      } else {
        // Fallback if template doesn't exist
        devicesList.innerHTML = `
          <div class="empty-devices">
            <div class="empty-devices-text">No devices found. Add your first device!</div>
            <a href="addDevice.html" class="add-device-btn">Add Device</a>
          </div>
        `;
      }
      return;
    }
  
    devices.forEach(device => {
      const deviceElement = document.createElement('div');
      deviceElement.className = 'device-card';
      deviceElement.onclick = () => viewDeviceDetails(device.id);
      
      // Format the consumption values
      const monthlyUsage = parseFloat(device.monthly_usage || 0).toFixed(2);
      const dailyUsage = parseFloat(device.daily_usage || 0).toFixed(2);
      
      // Display IP address or fallback
      const ipAddress = device.ip_address || "Not available";
      
      // Simplified device card structure
      deviceElement.innerHTML = `
        <div class="device-status ${device.power_status ? 'status-on' : 'status-off'}"></div>
        <h3 class="device-name">${device.name || 'Unnamed Device'}</h3>
        <table class="device-info-table">
          <tr>
            <td><span class="detail-label">Daily Usage</span></td>
            <td><span class="detail-value">${dailyUsage} kWh</span></td>
          </tr>
          <tr>
            <td><span class="detail-label">Monthly Usage</span></td>
            <td><span class="detail-value">${monthlyUsage} kWh</span></td>
          </tr>
          <tr>
            <td><span class="detail-label">IP Address</span></td>
            <td><span class="detail-value">${ipAddress}</span></td>
          </tr>
          <tr>
            <td><span class="detail-label">Status</span></td>
            <td><span class="detail-value ${device.power_status ? 'status-on' : 'status-off'}">${device.power_status ? 'On' : 'Off'}</span></td>
          </tr>
        </table>
      `;
      
      devicesList.appendChild(deviceElement);
    });
}

function showNoDevicesMessage() {
    const devicesList = document.getElementById('devicesList');
    devicesList.innerHTML = `
        <p>No devices found. Add your first device!</p>
        <button class="primary-button" onclick="window.location.href='addDevice.html'">Add Device</button>
    `;
}

async function loadDevices(userId) {
    try {
      const { data: devices, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        throw error;
      }
  
      if (!devices || devices.length === 0) {
        showNoDevicesMessage();
      } else {
        displayDevices(devices);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      showLocalPopup('Error loading devices. Please try again later.', false);
    }
}
  
function viewDeviceDetails(deviceId) {
    window.location.href = `device-details.html?id=${deviceId}`;
}

// Make viewDeviceDetails global so it can be used in inline onclick handlers
window.viewDeviceDetails = viewDeviceDetails;
// Make loadDevices global so it can be called from power-simulation.js
window.loadDevices = loadDevices;
  
document.addEventListener('DOMContentLoaded', async () => {
    try {
      // Check if user is logged in
      const { data, error } = await supabase.auth.getSession();
      
      if (data.session) {
        const user = data.session.user;
        console.log("User data:", user); // Debug log
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('userContent').style.display = 'block';
        
        // Fetch user profile from the profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        console.log("Profile data:", profileData); // Debug log
        console.log("Profile error:", profileError); // Debug log

        if (profileError) {
          console.error("Error fetching user profile:", profileError);
          document.getElementById("welcomeUser").innerText = `Welcome, ${user.email}!`;
          showLocalPopup('Could not load user profile data.', false);
        } else if (profileData) {
          // Try to get the user's name from different possible fields
          const userName = profileData.full_name || profileData.name || profileData.username || profileData.display_name;
          
          if (userName) {
            console.log("User name found:", userName);
            document.getElementById("welcomeUser").innerText = `Welcome, ${userName}!`;
          } else {
            console.log("No name found in profile data, using email");
            document.getElementById("welcomeUser").innerText = `Welcome, ${user.email}!`;
          }
        } else {
          console.log("No profile data found, using email");
          document.getElementById("welcomeUser").innerText = `Welcome, ${user.email}!`;
        }
        
        loadDevices(user.id);
      } else {
        window.location.href = 'login.html';
      }
    } catch (error) {
      console.error("Error initializing dashboard:", error);
      showLocalPopup('Error loading dashboard. Please try again later.', false);
    }
});