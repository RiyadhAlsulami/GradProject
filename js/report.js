// Report functionality
import { supabase } from './config.js'
import { showPopup } from './utils.js'

let consumptionChart = null, deviceComparisonChart = null, usageComparisonChart = null;

// Function to switch tabs
function switchTab(period) {
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    event.target.classList.add('active');
    window.demoConsumptionData ? updateChartWithDemoData(period) : updateConsumptionChart(period);
}

async function initCharts() {
    const consumptionCtx = document.getElementById('consumptionChart');
    const deviceCtx = document.getElementById('deviceComparisonChart');
    const comparisonCtx = document.getElementById('comparisonChart');
    
    // Hide canvas elements initially
    [consumptionCtx, deviceCtx, comparisonCtx].forEach(ctx => { if (ctx) ctx.style.display = 'none'; });
    
    // Show no data messages initially
    showNoDataMessages();
    
    if (consumptionCtx) {
        consumptionChart = new Chart(consumptionCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Energy Consumption (kWh)',
                    data: [],
                    borderColor: '#4CAF50',
                    tension: 0.1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    if (deviceCtx) {
        deviceComparisonChart = new Chart(deviceCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Energy Usage (kWh)',
                    data: [],
                    backgroundColor: '#2196F3'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    if (comparisonCtx) {
        usageComparisonChart = new Chart(comparisonCtx, {
            type: 'bar',
            data: {
                labels: ['Previous', 'Current'],
                datasets: [
                    {
                        label: 'Daily Average',
                        data: [0, 0],
                        backgroundColor: '#4CAF50',
                        borderWidth: 1
                    },
                    {
                        label: 'Weekly Average',
                        data: [0, 0],
                        backgroundColor: '#2196F3',
                        borderWidth: 1
                    },
                    {
                        label: 'Monthly Average',
                        data: [0, 0],
                        backgroundColor: '#FFC107',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Energy Consumption (kWh)' }
                    },
                    x: {
                        title: { display: true, text: 'Time Period' }
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.raw.toFixed(2) + ' kWh';
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Load initial data
    await Promise.all([
        updateConsumptionChart('daily'),
        updateDeviceComparisonChart(),
        updateUsageComparison()
    ]);
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
        const noDataMessage = document.getElementById('noDataMessage');
        if (chartElement) chartElement.style.display = 'none';
        if (noDataMessage) noDataMessage.style.display = 'block';
        return;
    }
    
    // Show chart and hide message
    const chartElement = document.getElementById('consumptionChart');
    const noDataMessage = document.getElementById('noDataMessage');
    if (chartElement) chartElement.style.display = 'block';
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
        return devices.reduce((sum, device) => sum + (device.monthly_usage || 0) / labels.length, 0);
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
        const noDeviceDataMessage = document.getElementById('noDeviceDataMessage');
        if (chartElement) chartElement.style.display = 'none';
        if (noDeviceDataMessage) noDeviceDataMessage.style.display = 'block';
        return;
    }
    
    // Show chart and hide message
    const chartElement = document.getElementById('deviceComparisonChart');
    const noDeviceDataMessage = document.getElementById('noDeviceDataMessage');
    if (chartElement) chartElement.style.display = 'block';
    if (noDeviceDataMessage) noDeviceDataMessage.style.display = 'none';
    
    const filteredDevices = devices.filter(d => d.monthly_usage > 0);
    const deviceNames = filteredDevices.map(d => d.name);
    const deviceUsage = filteredDevices.map(d => d.monthly_usage);
    
    if (deviceComparisonChart) {
        deviceComparisonChart.data.labels = deviceNames;
        deviceComparisonChart.data.datasets[0].data = deviceUsage;
        deviceComparisonChart.update();
    }
}

async function loadReportData() {
    try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            console.log('No active session, redirecting to login');
            window.location.href = 'login.html';
            return;
        }
        
        // Update report generation time
        const reportTimeElement = document.getElementById('reportGenerationTime');
        if (reportTimeElement) reportTimeElement.textContent = new Date().toLocaleString();
        
        // Fetch devices for this user
        const { data: devices, error } = await supabase
            .from('devices')
            .select('*')
            .eq('user_id', session.user.id);
        
        if (error) {
            console.error('Error fetching devices:', error);
            showPopup('Error loading report data', false);
            return;
        }
        
        if (!devices || devices.length === 0) {
            console.log('No devices found for this user');
            updateSummaryWithNoDevices();
            return;
        }
        
        // Calculate totals
        const totalDevices = devices.length;
        const activeDevices = devices.filter(d => d.power_status).length;
        const totalMonthlyUsage = devices.reduce((sum, device) => sum + (parseFloat(device.monthly_usage) || 0), 0);
        
        // Use average electricity rate from devices, or default to 0.15 if not available
        const avgElectricityRate = devices.reduce((sum, device) => sum + (parseFloat(device.electricity_rate) || 0), 0) / 
            devices.filter(d => d.electricity_rate).length || 0.15;
        
        const totalMonthlyCost = totalMonthlyUsage * avgElectricityRate;
        
        // Update summary section
        document.getElementById('totalDevices').textContent = totalDevices;
        document.getElementById('activeDevices').textContent = activeDevices;
        document.getElementById('totalMonthlyUsage').textContent = `${totalMonthlyUsage.toFixed(2)} kWh`;
        document.getElementById('totalMonthlyCost').textContent = `$${totalMonthlyCost.toFixed(2)}`;
        
        // Update device breakdown table
        const tableBody = document.getElementById('deviceBreakdownBody');
        if (tableBody) {
            tableBody.innerHTML = '';
            devices.forEach(device => {
                const monthlyUsage = parseFloat(device.monthly_usage) || 0;
                const electricityRate = parseFloat(device.electricity_rate) || avgElectricityRate;
                const monthlyCost = monthlyUsage * electricityRate;
                const potentialSavings = monthlyCost * 0.2;
                
                tableBody.appendChild(createTableRow(device, monthlyUsage, monthlyCost, potentialSavings));
            });
        }
        
        // Update savings analysis
        updateSavingsAnalysis(devices, avgElectricityRate);
        
        // Initialize charts
        initCharts();
    } catch (error) {
        console.error('Error loading report data:', error);
        showPopup('Error loading report data', false);
    }
}

// Helper function to create table row
function createTableRow(device, monthlyUsage, monthlyCost, potentialSavings) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${device.name || 'Unnamed Device'}</td>
        <td><span class="status-indicator ${device.power_status ? 'active' : 'inactive'}">${device.power_status ? 'Active' : 'Inactive'}</span></td>
        <td>${monthlyUsage.toFixed(2)} kWh</td>
        <td>$${monthlyCost.toFixed(2)}</td>
        <td>$${potentialSavings.toFixed(2)}</td>
    `;
    return row;
}

// Calculate and update savings analysis
function updateSavingsAnalysis(devices, avgElectricityRate) {
    try {
        const totalMonthlyUsage = devices.reduce((sum, device) => sum + (parseFloat(device.monthly_usage) || 0), 0);
        const potentialSavingsPercentage = 0.15;
        const potentialMonthlySavingsKwh = totalMonthlyUsage * potentialSavingsPercentage;
        const monthlySavingsCost = potentialMonthlySavingsKwh * avgElectricityRate;
        const annualSavingsCost = monthlySavingsCost * 12;
        
        const currentMonthSavingsElement = document.getElementById('currentMonthSavings');
        const projectedAnnualSavingsElement = document.getElementById('projectedAnnualSavings');
        
        if (currentMonthSavingsElement) currentMonthSavingsElement.textContent = `$${monthlySavingsCost.toFixed(2)}`;
        if (projectedAnnualSavingsElement) projectedAnnualSavingsElement.textContent = `$${annualSavingsCost.toFixed(2)}`;
    } catch (error) {
        console.error('Error updating savings analysis:', error);
    }
}

async function updateUsageComparison() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        // Fetch device data to get total monthly usage
        const { data: devices, error: deviceError } = await supabase
            .from('devices')
            .select('*')
            .eq('user_id', session.user.id);
        
        if (deviceError || !devices || devices.length === 0) {
            // Hide chart and show message if no data
            const chartElement = document.getElementById('comparisonChart');
            const noDataMessage = document.getElementById('noComparisonDataMessage');
            if (chartElement) chartElement.style.display = 'none';
            if (noDataMessage) noDataMessage.style.display = 'block';
            
            // Reset stat cards to zero
            updateStatCard('dailyAverage', 'dailyTrend', 0, 0);
            updateStatCard('weeklyAverage', 'weeklyTrend', 0, 0);
            updateStatCard('monthlyAverage', 'monthlyTrend', 0, 0);
            return;
        }
        
        // Fetch usage data from the database
        const { data: usageData, error: usageError } = await supabase
            .from('usage_data')
            .select('*')
            .eq('user_id', session.user.id)
            .order('date', { ascending: false })
            .limit(30); // Get last 30 days of data
        
        if (usageError) {
            console.error('Error fetching usage data:', usageError);
            // Fall back to calculated values if we can't get usage data
            const totalMonthlyUsage = devices.reduce((sum, device) => sum + (parseFloat(device.monthly_usage) || 0), 0);
            updateComparisonChart(totalMonthlyUsage / 30, totalMonthlyUsage / 4.3, totalMonthlyUsage);
            return;
        }
        
        // If we have usage data, calculate actual averages
        if (usageData && usageData.length > 0) {
            // Calculate daily average from actual daily records
            const dailyTotal = usageData.reduce((sum, record) => sum + (parseFloat(record.daily_usage) || 0), 0);
            const currentDailyAvg = dailyTotal / usageData.length;
            
            // Calculate weekly average from actual weekly records
            // Group by week and calculate average
            const weeklyData = {};
            usageData.forEach(record => {
                const weekNumber = getWeekNumber(new Date(record.date));
                if (!weeklyData[weekNumber]) weeklyData[weekNumber] = { total: 0, count: 0 };
                weeklyData[weekNumber].total += parseFloat(record.daily_usage) || 0;
                weeklyData[weekNumber].count++;
            });
            
            const weeklyAverages = Object.values(weeklyData).map(week => week.total);
            const currentWeeklyAvg = weeklyAverages.length > 0 ? 
                weeklyAverages.reduce((sum, val) => sum + val, 0) / weeklyAverages.length : 0;
            
            // Calculate monthly total from actual monthly records
            // Group by month and calculate total
            const monthlyData = {};
            usageData.forEach(record => {
                const month = new Date(record.date).getMonth();
                if (!monthlyData[month]) monthlyData[month] = 0;
                monthlyData[month] += parseFloat(record.daily_usage) || 0;
            });
            
            const currentMonthlyAvg = Object.values(monthlyData)[0] || 0; // Most recent month
            
            updateComparisonChart(currentDailyAvg, currentWeeklyAvg, currentMonthlyAvg);
        } else {
            // If no usage data records, fall back to device monthly usage
            const totalMonthlyUsage = devices.reduce((sum, device) => sum + (parseFloat(device.monthly_usage) || 0), 0);
            updateComparisonChart(totalMonthlyUsage / 30, totalMonthlyUsage / 4.3, totalMonthlyUsage);
        }
    } catch (error) {
        console.error('Error updating usage comparison:', error);
    }
}

// Helper function to get week number from date
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Helper function to update comparison chart and stats
function updateComparisonChart(currentDailyAvg, currentWeeklyAvg, currentMonthlyAvg) {
    if (usageComparisonChart) {
        // Update the chart with real current data and zeros for previous
        usageComparisonChart.data.datasets[0].data = [0, currentDailyAvg];
        usageComparisonChart.data.datasets[1].data = [0, currentWeeklyAvg];
        usageComparisonChart.data.datasets[2].data = [0, currentMonthlyAvg];
        usageComparisonChart.update();
        
        // Show chart and hide message
        const chartElement = document.getElementById('comparisonChart');
        const noDataMessage = document.getElementById('noComparisonDataMessage');
        if (chartElement) chartElement.style.display = 'block';
        if (noDataMessage) noDataMessage.style.display = 'none';
    }
    
    // Update the stats cards with real values but no trend (since we don't have historical data)
    updateStatCard('dailyAverage', 'dailyTrend', currentDailyAvg, 0);
    updateStatCard('weeklyAverage', 'weeklyTrend', currentWeeklyAvg, 0);
    updateStatCard('monthlyAverage', 'monthlyTrend', currentMonthlyAvg, 0);
}

// Load demo data for both charts
function loadDemoData() {
    try {
        // Store the real total monthly usage before changing to demo data
        const realTotalMonthlyUsage = document.getElementById('totalMonthlyUsage').textContent;
        const realTotalMonthlyCost = document.getElementById('totalMonthlyCost').textContent;
        const realTotalDevices = document.getElementById('totalDevices').textContent;
        const realActiveDevices = document.getElementById('activeDevices').textContent;
        
        // Generate random data for the consumption chart
        const periods = {
            daily: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                data: Array.from({ length: 7 }, () => Math.random() * 3 + 1) // 1-4 kWh per day
            },
            weekly: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                data: Array.from({ length: 4 }, () => Math.random() * 15 + 5) // 5-20 kWh per week
            },
            monthly: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                data: Array.from({ length: 6 }, () => Math.random() * 60 + 40) // 40-100 kWh per month
            }
        };
        
        // Save the demo data for use in other functions
        window.demoConsumptionData = periods;
        
        // Update the consumption chart with the daily data by default
        if (consumptionChart) {
            consumptionChart.data.labels = periods.daily.labels;
            consumptionChart.data.datasets[0].data = periods.daily.data;
            consumptionChart.update();
            
            // Show chart and hide message
            const chartElement = document.getElementById('consumptionChart');
            const noDataMessage = document.getElementById('noDataMessage');
            if (chartElement) chartElement.style.display = 'block';
            if (noDataMessage) noDataMessage.style.display = 'none';
        }
        
        // Calculate averages for the comparison chart
        const totalDemoMonthlyUsage = periods.monthly.data.reduce((sum, val) => sum + val, 0);
        const currentDailyAvg = periods.daily.data.reduce((sum, val) => sum + val, 0) / periods.daily.data.length;
        const currentWeeklyAvg = periods.weekly.data.reduce((sum, val) => sum + val, 0) / periods.weekly.data.length;
        const currentMonthlyAvg = totalDemoMonthlyUsage / periods.monthly.data.length;
        
        // Generate previous values (15% higher than current)
        const previousDailyAvg = currentDailyAvg * 1.15;
        const previousWeeklyAvg = currentWeeklyAvg * 1.15;
        const previousMonthlyAvg = currentMonthlyAvg * 1.15;
        
        // Calculate trends (negative means improvement/reduction)
        const dailyTrendPercentage = ((currentDailyAvg - previousDailyAvg) / previousDailyAvg) * 100;
        const weeklyTrendPercentage = ((currentWeeklyAvg - previousWeeklyAvg) / previousWeeklyAvg) * 100;
        const monthlyTrendPercentage = ((currentMonthlyAvg - previousMonthlyAvg) / previousMonthlyAvg) * 100;
        
        // Update the comparison chart
        if (usageComparisonChart) {
            usageComparisonChart.data.datasets[0].data = [previousDailyAvg, currentDailyAvg];
            usageComparisonChart.data.datasets[1].data = [previousWeeklyAvg, currentWeeklyAvg];
            usageComparisonChart.data.datasets[2].data = [previousMonthlyAvg, currentMonthlyAvg];
            usageComparisonChart.update();
            
            // Show chart and hide message
            const chartElement = document.getElementById('comparisonChart');
            const noDataMessage = document.getElementById('noComparisonDataMessage');
            if (chartElement) chartElement.style.display = 'block';
            if (noDataMessage) noDataMessage.style.display = 'none';
        }
        
        // Update the stats cards
        updateStatCard('dailyAverage', 'dailyTrend', currentDailyAvg, dailyTrendPercentage);
        updateStatCard('weeklyAverage', 'weeklyTrend', currentWeeklyAvg, weeklyTrendPercentage);
        updateStatCard('monthlyAverage', 'monthlyTrend', currentMonthlyAvg, monthlyTrendPercentage);
        
        // Update savings analysis with the demo data
        const avgElectricityRate = 0.15; // Default rate
        const potentialSavingsPercentage = 0.15;
        const potentialMonthlySavingsKwh = currentMonthlyAvg * potentialSavingsPercentage;
        const monthlySavingsCost = potentialMonthlySavingsKwh * avgElectricityRate;
        const annualSavingsCost = monthlySavingsCost * 12;
        
        // Update the savings UI
        const currentMonthSavingsElement = document.getElementById('currentMonthSavings');
        const projectedAnnualSavingsElement = document.getElementById('projectedAnnualSavings');
        
        if (currentMonthSavingsElement) currentMonthSavingsElement.textContent = `$${monthlySavingsCost.toFixed(2)}`;
        if (projectedAnnualSavingsElement) projectedAnnualSavingsElement.textContent = `$${annualSavingsCost.toFixed(2)}`;
        
        // Restore the real summary data
        document.getElementById('totalDevices').textContent = realTotalDevices;
        document.getElementById('activeDevices').textContent = realActiveDevices;
        document.getElementById('totalMonthlyUsage').textContent = realTotalMonthlyUsage;
        document.getElementById('totalMonthlyCost').textContent = realTotalMonthlyCost;
        
        // Show success message
        showPopup('Demo data loaded successfully!', true);
    } catch (error) {
        console.error('Error loading demo data:', error);
        showPopup('Failed to load demo data', false);
    }
}

// Update chart with demo data
function updateChartWithDemoData(period) {
    if (!window.demoConsumptionData || !consumptionChart) return;
    
    const data = window.demoConsumptionData[period];
    
    consumptionChart.data.labels = data.labels;
    consumptionChart.data.datasets[0].data = data.data;
    consumptionChart.update();
    
    // Show chart and hide message
    const chartElement = document.getElementById('consumptionChart');
    const noDataMessage = document.getElementById('noDataMessage');
    if (chartElement) chartElement.style.display = 'block';
    if (noDataMessage) noDataMessage.style.display = 'none';
}

// Helper function to update a stat card
function updateStatCard(valueId, trendId, value, trendPercentage) {
    const valueElement = document.getElementById(valueId);
    const trendElement = document.getElementById(trendId);
    
    if (valueElement) valueElement.textContent = `${value.toFixed(2)} kWh`;
    
    if (trendElement) {
        if (trendPercentage === 0) {
            // No trend data available
            trendElement.innerHTML = `<i class="fas fa-minus"></i> 0%`;
            trendElement.className = 'stat-trend';
        } else {
            const isNegative = trendPercentage < 0;
            const absPercentage = Math.abs(trendPercentage).toFixed(1);
            
            trendElement.innerHTML = isNegative 
                ? `<i class="fas fa-arrow-down"></i> ${absPercentage}%` 
                : `<i class="fas fa-arrow-up"></i> ${absPercentage}%`;
            
            trendElement.className = isNegative ? 'stat-trend' : 'stat-trend negative';
        }
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
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="no-data">No devices found</td></tr>';
}

function showNoDataMessages() {
    const noDataMessage = document.getElementById('noDataMessage');
    const noDeviceDataMessage = document.getElementById('noDeviceDataMessage');
    const noComparisonDataMessage = document.getElementById('noComparisonDataMessage');
    
    if (noDataMessage) noDataMessage.style.display = 'block';
    if (noDeviceDataMessage) noDeviceDataMessage.style.display = 'block';
    if (noComparisonDataMessage) noComparisonDataMessage.style.display = 'block';
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
        
        // Setup demo data button
        setupDemoButton();
    });
});

// Setup demo data button
function setupDemoButton() {
    const demoButton = document.getElementById('loadDemoDataBtn');
    if (demoButton) demoButton.addEventListener('click', loadDemoData);
}
