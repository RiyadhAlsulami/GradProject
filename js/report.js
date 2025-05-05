// Report functionality
import { supabase } from './config.js'

// Unified popup message
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

let consumptionChart = null;
let deviceComparisonChart = null;

// Function to switch tabs
function switchTab(period) {
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(button => button.classList.remove('active'));
    event.target.classList.add('active');
    updateConsumptionChart(period);
}

async function initCharts() {
    const consumptionCtx = document.getElementById('consumptionChart');
    const deviceCtx = document.getElementById('deviceComparisonChart');
    
    // Hide canvas elements initially
    if (consumptionCtx) consumptionCtx.style.display = 'none';
    if (deviceCtx) deviceCtx.style.display = 'none';
    
    // Show no data messages initially
    showNoDataMessages();
    
    if (consumptionCtx) {
        consumptionChart = new Chart(consumptionCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Energy Consumption (kW)',
                    data: [],
                    borderColor: '#4CAF50',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    if (deviceCtx) {
        deviceComparisonChart = new Chart(deviceCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Energy Usage (kW)',
                    data: [],
                    backgroundColor: '#2196F3'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    // Load initial data
    await updateConsumptionChart('daily');
    await updateDeviceComparisonChart();
}

async function updateConsumptionChart(period) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data: devices, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', session.user.id);
    
    if (error || !devices || devices.length === 0 || !devices.some(d => d.monthly_usage > 0)) {
        // Hide chart and show message if no data
        const chartElement = document.getElementById('consumptionChart');
        if (chartElement) chartElement.style.display = 'none';
        
        const noDataMessage = document.getElementById('noDataMessage');
        if (noDataMessage) noDataMessage.style.display = 'block';
        return;
    }
    
    // Show chart and hide message
    const chartElement = document.getElementById('consumptionChart');
    if (chartElement) chartElement.style.display = 'block';
    
    const noDataMessage = document.getElementById('noDataMessage');
    if (noDataMessage) noDataMessage.style.display = 'none';
    
    let labels = [];
    const now = new Date();
    
    switch(period) {
        case 'daily':
            for(let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            }
            break;
        case 'weekly':
            for(let i = 3; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - (i * 7));
                labels.push(`Week ${4-i}`);
            }
            break;
        case 'monthly':
            for(let i = 5; i >= 0; i--) {
                const date = new Date(now);
                date.setMonth(date.getMonth() - i);
                labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
            }
            break;
    }
    
    // Generate data based on actual device consumption
    const data = labels.map(() => {
        const totalUsage = devices.reduce((sum, device) => {
            return sum + (device.monthly_usage || 0) / labels.length;
        }, 0);
        return totalUsage;
    });
    
    if (consumptionChart) {
        consumptionChart.data.labels = labels;
        consumptionChart.data.datasets[0].data = data;
        consumptionChart.update();
    }
}

async function updateDeviceComparisonChart() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data: devices, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', session.user.id);
    
    if (error || !devices || devices.length === 0 || !devices.some(d => d.monthly_usage > 0)) {
        // Hide chart and show message if no data
        const chartElement = document.getElementById('deviceComparisonChart');
        if (chartElement) chartElement.style.display = 'none';
        
        const noDeviceDataMessage = document.getElementById('noDeviceDataMessage');
        if (noDeviceDataMessage) noDeviceDataMessage.style.display = 'block';
        return;
    }
    
    // Show chart and hide message
    const chartElement = document.getElementById('deviceComparisonChart');
    if (chartElement) chartElement.style.display = 'block';
    
    const noDeviceDataMessage = document.getElementById('noDeviceDataMessage');
    if (noDeviceDataMessage) noDeviceDataMessage.style.display = 'none';
    
    const deviceNames = devices.filter(d => d.monthly_usage > 0).map(d => d.name);
    const deviceUsage = devices.filter(d => d.monthly_usage > 0).map(d => d.monthly_usage);
    
    if (deviceComparisonChart) {
        deviceComparisonChart.data.labels = deviceNames;
        deviceComparisonChart.data.datasets[0].data = deviceUsage;
        deviceComparisonChart.update();
    }
}

async function loadReportData() {
    try {
        // Check if user is logged in
        const { data, error: userError } = await supabase.auth.getSession();
        
        if (!data.session || userError) {
            window.location.href = 'login.html';
            return;
        }
        
        const user = data.session.user;

        // Update generation time
        const now = new Date();
        const reportGenerationTime = document.getElementById('reportGenerationTime');
        if (reportGenerationTime) {
            reportGenerationTime.textContent = now.toLocaleString();
        }
  
        // Get devices from Supabase
        const { data: devices, error } = await supabase
            .from('devices')
            .select('*')
            .eq('user_id', user.id);
  
        if (error) {
            console.error('Error fetching devices:', error);
            showPopup('Error loading report data', false);
            return;
        }
        
        if (!devices || devices.length === 0) {
            // Update summary with zeros
            updateSummaryWithNoDevices();
            // Show no data messages
            showNoDataMessages();
            return;
        }

        // Calculate summary statistics
        const totalDevices = devices.length;
        const activeDevices = devices.filter(d => d.power_status).length;
        let totalMonthlyUsage = 0;
        let totalMonthlyCost = 0;

        // Update summary section
        const totalDevicesElement = document.getElementById('totalDevices');
        const activeDevicesElement = document.getElementById('activeDevices');
        const totalMonthlyUsageElement = document.getElementById('totalMonthlyUsage');
        const totalMonthlyCostElement = document.getElementById('totalMonthlyCost');

        if (totalDevicesElement) totalDevicesElement.textContent = totalDevices;
        if (activeDevicesElement) activeDevicesElement.textContent = activeDevices;

        // Generate device breakdown table
        const tbody = document.getElementById('deviceBreakdownBody');
        if (tbody) {
            tbody.innerHTML = '';

            devices.forEach(device => {
                const monthlyUsage = device.monthly_usage || 0;
                const monthlyCost = monthlyUsage * 0.18; // Using rate of 0.18 SAR per kW
                const savings = monthlyCost * 0.15; // Assuming 15% savings
                
                totalMonthlyUsage += monthlyUsage;
                totalMonthlyCost += monthlyCost;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${device.name}</td>
                    <td>${device.power_status ? 'Active' : 'Inactive'}</td>
                    <td>${monthlyUsage.toFixed(2)} kW</td>
                    <td>${monthlyCost.toFixed(2)} SAR</td>
                    <td>${savings.toFixed(2)} SAR</td>
                `;
                tbody.appendChild(row);
            });
        }

        // Update total usage and cost
        if (totalMonthlyUsageElement) {
            totalMonthlyUsageElement.textContent = `${totalMonthlyUsage.toFixed(2)} kW`;
        }
        if (totalMonthlyCostElement) {
            totalMonthlyCostElement.textContent = `${totalMonthlyCost.toFixed(2)} SAR`;
        }

        // Hide no data messages if we have data
        hideNoDataMessages();

    } catch (error) {
        console.error('Error loading report data:', error);
        showPopup('Error loading report data', false);
    }
}

function updateSummaryWithNoDevices() {
    const elements = {
        totalDevices: document.getElementById('totalDevices'),
        activeDevices: document.getElementById('activeDevices'),
        totalMonthlyUsage: document.getElementById('totalMonthlyUsage'),
        totalMonthlyCost: document.getElementById('totalMonthlyCost')
    };

    if (elements.totalDevices) elements.totalDevices.textContent = '0';
    if (elements.activeDevices) elements.activeDevices.textContent = '0';
    if (elements.totalMonthlyUsage) elements.totalMonthlyUsage.textContent = '0.00 kW';
    if (elements.totalMonthlyCost) elements.totalMonthlyCost.textContent = '0.00 SAR';

    const tbody = document.getElementById('deviceBreakdownBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No devices found</td></tr>';
    }
}

function showNoDataMessages() {
    const noDataMessage = document.getElementById('noDataMessage');
    const noDeviceDataMessage = document.getElementById('noDeviceDataMessage');
    
    if (noDataMessage) noDataMessage.style.display = 'block';
    if (noDeviceDataMessage) noDeviceDataMessage.style.display = 'block';
}

function hideNoDataMessages() {
    const noDataMessage = document.getElementById('noDataMessage');
    const noDeviceDataMessage = document.getElementById('noDeviceDataMessage');
    
    if (noDataMessage) noDataMessage.style.display = 'none';
    if (noDeviceDataMessage) noDeviceDataMessage.style.display = 'none';
}

// Initialize report when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make switchTab function available globally
    window.switchTab = switchTab;
    
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
        
        // Load report data and initialize charts
        loadReportData();
        initCharts();
    });
});