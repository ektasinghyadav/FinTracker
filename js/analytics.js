// Analytics page: category chart and daily spending chart for this month.

let categoryChart = null;
let timeChart = null;

// Initialize charts using Chart.js
function initCharts() {
    console.log('Initializing charts...');

    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    const timeCtx = document.getElementById('timeChart').getContext('2d');

    // Create pie chart for categories
    categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            // taller chart on a phone, so the legend (up to 8 names) has room
            aspectRatio: window.innerWidth < 600 ? 0.8 : 1,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 14,
                        padding: 10,
                        font: {
                            size: 12,
                            family: 'DM Sans'
                        }
                    }
                }
            }
        }
    });

    // Create bar chart for daily spending
    timeChart = new Chart(timeCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Daily Spending',
                data: [],
                backgroundColor: '#0A2342',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatMoney(value);
                        }
                    }
                }
            }
        }
    });

    updateCharts();
}

// Update chart data
function updateCharts() {
    if (!categoryChart || !timeChart) return;

    const filtered = expenses; // this month only

    // Update category chart - shows budget breakdown
    const categoryData = {};

    // Calculate spending per category
    for (let i = 0; i < filtered.length; i++) {
        const exp = filtered[i];
        if (!categoryData[exp.category]) {
            categoryData[exp.category] = 0;
        }
        categoryData[exp.category] += exp.amount;
    }

    // If budget is set, show remaining budget as well
    if (budget > 0) {
        const labels = [];
        const data = [];
        const colors = [];

        for (let category in categoryData) {
            labels.push(category);
            data.push(categoryData[category]);
            colors.push(categoryColors[category]);
        }

        const totalSpent = data.reduce((sum, val) => sum + val, 0);
        const remaining = budget - totalSpent;

        if (remaining > 0) {
            labels.push('Remaining Budget');
            data.push(remaining);
            colors.push('#D1D5DB');
        }

        categoryChart.data.labels = labels;
        categoryChart.data.datasets[0].data = data;
        categoryChart.data.datasets[0].backgroundColor = colors;
    } else {
        categoryChart.data.labels = Object.keys(categoryData);
        categoryChart.data.datasets[0].data = Object.values(categoryData);
        categoryChart.data.datasets[0].backgroundColor = Object.keys(categoryData).map(cat => categoryColors[cat]);
    }

    categoryChart.update();

    // Update bar chart - one bar for every day of the current month
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const monthPrefix = currentMonth() + '-';

    const dayLabels = [];
    const dailyData = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const dateText = monthPrefix + String(day).padStart(2, '0');
        dayLabels.push(String(day));
        dailyData.push(
            filtered
                .filter(exp => exp.date === dateText)
                .reduce((sum, exp) => sum + exp.amount, 0)
        );
    }

    timeChart.data.labels = dayLabels;
    timeChart.data.datasets[0].data = dailyData;
    timeChart.update();

    console.log('Charts updated');
}

async function initAnalytics() {
    await loadMonthData();
    initCharts();
}

startPage('analytics', initAnalytics);
