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

// Handle update usage button click
function setupUpdateButton() {
  const updateBtn = document.getElementById('updateUsageBtn');
  const updateIcon = document.getElementById('updateIcon');
  
  if (updateBtn && updateIcon) {
    updateBtn.addEventListener('click', async function() {
      // Add spinning animation
      updateIcon.classList.add('icon-spin');
      updateBtn.disabled = true;
      
      try {
        // Check if PowerSimulation is available
        if (window.PowerSimulation && typeof window.PowerSimulation.forceUpdate === 'function') {
          await window.PowerSimulation.forceUpdate();
        } else {
          // Fallback: manually trigger a refresh
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData && sessionData.session) {
            const user = sessionData.session.user;
            await loadDevices(user.id);
          }
          
          // Wait a bit to show the spinning animation
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Error updating device usage:', error);
        showLocalPopup('Error updating device usage. Please try again.', false);
      } finally {
        // Remove spinning animation
        updateIcon.classList.remove('icon-spin');
        updateBtn.disabled = false;
      }
    });
    
    console.log('Update usage button initialized');
  }
}
  
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
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        console.log("Profile data:", profileData); // Debug log
        console.log("Profile error:", profileError); // Debug log

        if (profileError || !profileData) {
          console.error("Error fetching user profile:", profileError);
          
          // Create a new profile if one doesn't exist
          const now = new Date().toISOString();
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{
              id: user.id,
              full_name: user.email.split('@')[0] || 'User',
              phone: '',
              created_at: now,
              updated_at: now
            }])
            .select()
            .maybeSingle();
            
          if (!createError && newProfile) {
            profileData = newProfile;
            console.log("Created new profile:", newProfile);
          } else {
            console.error("Error creating profile:", createError);
            document.getElementById("welcomeUser").innerText = `Welcome, ${user.email}!`;
            showLocalPopup('Could not load user profile data.', false);
          }
        }
        
        if (profileData) {
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
        setupUpdateButton();
      } else {
        window.location.href = 'login.html';
      }
    } catch (error) {
      console.error("Error initializing dashboard:", error);
      showLocalPopup('Error loading dashboard. Please try again later.', false);
    }
});