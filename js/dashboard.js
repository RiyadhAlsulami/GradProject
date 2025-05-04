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
      devicesList.innerHTML = `
        <p>No devices found. Add your first device!</p>
        <button class="primary-button" onclick="window.location.href='addDevice.html'">Add Device</button>
      `;
      return;
    }
  
    devices.forEach(device => {
      const deviceElement = document.createElement('div');
      deviceElement.className = 'device-card';
      deviceElement.innerHTML = `
        <h3>${device.name}</h3>
        <p>IP Address: ${device.ip_address}</p>
        <p>Device ID: ${device.id}</p>
        <p>Added on: ${formatDate(device.created_at)}</p>
        <div class="device-actions">
          <button onclick="viewDeviceDetails('${device.id}')" class="view-button">View More</button>
        </div>
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