// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful');
            })
            .catch((err) => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Utility functions for Plug&Save
import { supabase } from './config.js'

// Navigation functions
function navigateToLogin() {
    console.log("Navigating to login page");
    window.location.href = "login.html";
}

function navigateToSignup() {
    console.log("Navigating to signup page");
    window.location.href = "signup.html";
}

function navigateToDashboard() {
    console.log("Navigating to dashboard page");
    window.location.href = "dashboard.html";
}

function navigateToAddDevice() {
    console.log("Navigating to add device page");
    window.location.href = "addDevice.html";
}

function navigateToReports() {
    console.log("Navigating to reports page");
    window.location.href = "report.html";
}

// Logout function using Supabase
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during logout:', error);
            return;
        }
        console.log('User logged out successfully');
        
        // Redirect to login page
        window.location.href = "login.html";
    } catch (error) {
        console.error('Unexpected error during logout:', error);
    }
}

// Utility function to get current user
async function getCurrentUser() {
    try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error getting session:', error.message);
            return null;
        }
        
        return data.session?.user || null;
    } catch (error) {
        console.error('Unexpected error getting user:', error);
        return null;
    }
}

// Function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Function to format power in kWh
function formatPower(kWh) {
    return `${parseFloat(kWh).toFixed(2)} kWh`;
}

// Function to format dates
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Make navigation functions available globally
window.navigateToLogin = navigateToLogin;
window.navigateToSignup = navigateToSignup;
window.navigateToDashboard = navigateToDashboard;
window.navigateToAddDevice = navigateToAddDevice;
window.navigateToReports = navigateToReports;
window.logout = logout;

// Set up event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded - setting up button listeners");
    
    // Set up logout buttons
    const logoutButtons = document.querySelectorAll('.logout-btn');
    if (logoutButtons) {
        logoutButtons.forEach(button => {
            button.addEventListener('click', logout);
        });
    }
    
    // Set up navigation buttons
    const dashboardButtons = document.querySelectorAll('.dashboard-btn');
    if (dashboardButtons) {
        dashboardButtons.forEach(button => {
            console.log("Adding dashboard button listener", button);
            button.addEventListener('click', navigateToDashboard);
        });
    }
    
    const addDeviceButtons = document.querySelectorAll('.add-device-btn');
    if (addDeviceButtons) {
        addDeviceButtons.forEach(button => {
            button.addEventListener('click', navigateToAddDevice);
        });
    }
    
    const reportsButtons = document.querySelectorAll('.reports-btn');
    if (reportsButtons) {
        reportsButtons.forEach(button => {
            button.addEventListener('click', navigateToReports);
        });
    }
    
    // Home page navigation buttons
    const loginNavButtons = document.querySelectorAll('.login-nav-btn');
    if (loginNavButtons) {
        loginNavButtons.forEach(button => {
            button.addEventListener('click', navigateToLogin);
        });
    }
    
    const signupNavButtons = document.querySelectorAll('.signup-nav-btn');
    if (signupNavButtons) {
        signupNavButtons.forEach(button => {
            button.addEventListener('click', navigateToSignup);
        });
    }
    
    const passwordInput = document.getElementById('signupPassword');
    if (passwordInput) {
        // Policy items for password validation
        const policyItems = {
            lengthCheck: /.{8,}/,
            uppercaseCheck: /[A-Z]/,
            lowercaseCheck: /[a-z]/,
            numberCheck: /[0-9]/
        };
    
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            
            Object.entries(policyItems).forEach(([id, regex]) => {
                const element = document.getElementById(id);
                if (element) {
                    const icon = element.querySelector('.policy-icon');
                    
                    if (regex.test(password)) {
                        element.classList.add('valid');
                        element.classList.remove('invalid');
                        if (icon) {
                            icon.textContent = '✓';
                            icon.style.color = '#28a745';
                        }
                    } else {
                        element.classList.add('invalid');
                        element.classList.remove('valid');
                        if (icon) {
                            icon.textContent = '❌';
                            icon.style.color = '#dc3545';
                        }
                    }
                }
            });
        });
    }
});