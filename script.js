const API_KEY = 'YOUR_API_KEY_HERE'; // DO NOT commit real API keys to GitHub!
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// State Management
let currentUnit = localStorage.getItem('weatherUnit') || 'metric'; // 'metric' or 'imperial'
let currentTheme = localStorage.getItem('weatherTheme') || 'auto'; // 'auto', 'light', 'dark'
let comparisonCities = JSON.parse(localStorage.getItem('comparisonCities')) || [];
let tempHistory = JSON.parse(localStorage.getItem('tempHistory')) || []; // [{date: 'YYYY-MM-DD', temp: 25}]
let currentForecastData = null; // Store for charts tab switching
let forecastChartInstance = null;
let historyChartInstance = null;

// DOM Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const btnLocation = document.getElementById('btn-location');
const errorMessage = document.getElementById('error-message');
const loadingSpinner = document.getElementById('loading-spinner');
const dashboardGrid = document.getElementById('dashboard-grid');

// Theme & Unit Controls
const btnTheme = document.getElementById('btn-theme');
const themeDropdown = document.getElementById('theme-dropdown');
const themeOptions = document.querySelectorAll('.theme-option');
const btnUnit = document.getElementById('btn-unit');
const unitLabel = document.getElementById('unit-label');

// Alert Banner
const alertsBanner = document.getElementById('alerts-banner');
const alertText = document.getElementById('alert-text');

// Init application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initUnitToggle();
    updateClock();
    setInterval(updateClock, 60000); // update every minute

    const lastSearchedCity = localStorage.getItem('lastSearchedCity') || 'London';
    fetchWeatherByCity(lastSearchedCity);
    renderComparisonList();
    renderLocalHistory();
});

/* ====================================
   THEME & UNIT LOGIC
==================================== */
function initTheme() {
    applyTheme(currentTheme);

    // Toggle dropdown
    btnTheme.addEventListener('click', () => themeDropdown.classList.toggle('hidden'));

    // Handle option click
    themeOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            currentTheme = e.currentTarget.dataset.theme;
            localStorage.setItem('weatherTheme', currentTheme);
            applyTheme(currentTheme);
            themeDropdown.classList.add('hidden');
        });
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!btnTheme.contains(e.target) && !themeDropdown.contains(e.target)) {
            themeDropdown.classList.add('hidden');
        }
    });
}

function applyTheme(theme) {
    document.body.className = `theme-${theme}`; // e.g., 'theme-light'

    // Update active state in dropdown
    themeOptions.forEach(opt => opt.classList.remove('active'));
    const activeOpt = document.querySelector(`.theme-option[data-theme="${theme}"]`);
    if (activeOpt) activeOpt.classList.add('active');

    // Update button text
    const themeSpan = btnTheme.querySelector('span');
    themeSpan.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);

    // If auto, calculate based on daylight (basic check based on typical local hours 6am-6pm)
    // Precise calculation handled dynamically per city search in renderCurrentWeather
    if (theme === 'auto') {
        const hour = new Date().getHours();
        if (hour < 6 || hour > 18) {
            document.body.classList.add('theme-dark');
        }
    }
}

function initUnitToggle() {
    updateUnitUI();
    btnUnit.addEventListener('click', () => {
        currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
        localStorage.setItem('weatherUnit', currentUnit);
        updateUnitUI();

        // Refetch current city with new unit
        const currentCity = document.getElementById('city-name').textContent.split(',')[0];
        if (currentCity !== '--') {
            fetchWeatherByCity(currentCity);
        }
    });
}

function updateUnitUI() {
    unitLabel.textContent = currentUnit === 'metric' ? '°C' : '°F';
}

function getSpeedUnit() {
    return currentUnit === 'metric' ? 'm/s' : 'mph';
}

/* ====================================
   FETCH LOGIC
==================================== */
searchBtn.addEventListener('click', () => handleSearch());
cityInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });
btnLocation.addEventListener('click', () => fetchWeatherByLocation());

function handleSearch() {
    const city = cityInput.value.trim();
    if (city) fetchWeatherByCity(city);
}

async function fetchWeatherByCity(city) {
    showLoading();
    try {
        const [currentRes, forecastRes] = await Promise.all([
            fetch(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=${currentUnit}`),
            fetch(`${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=${currentUnit}`)
        ]);

        if (!currentRes.ok || !forecastRes.ok) throw new Error('City not found');

        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();

        processAllData(currentData, forecastData);

        localStorage.setItem('lastSearchedCity', currentData.name);
        cityInput.value = '';
    } catch (error) {
        showError(error.message);
    }
}

async function fetchWeatherByLocation() {
    if (!navigator.geolocation) return alert('Geolocation not supported by browser.');

    showLoading();
    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
            const [currentRes, forecastRes] = await Promise.all([
                fetch(`${BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${currentUnit}`),
                fetch(`${BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${currentUnit}`)
            ]);

            if (!currentRes.ok || !forecastRes.ok) throw new Error('Location data not found');

            const currentData = await currentRes.json();
            const forecastData = await forecastRes.json();

            processAllData(currentData, forecastData);
            localStorage.setItem('lastSearchedCity', currentData.name);
        } catch (error) {
            showError(error.message);
        }
    }, () => {
        showError('Location access denied');
    });
}

function processAllData(currentData, forecastData) {
    hideError();
    currentForecastData = forecastData; // store globally for charts

    renderCurrentWeather(currentData);
    renderAlerts(currentData.weather[0].id, currentData.main.temp);
    renderHourlyForecast(forecastData);
    renderDailyForecast(forecastData);
    initCharts(forecastData, 'temp');
    saveTemperatureHistory(currentData);

    loadingSpinner.classList.add('hidden');
    dashboardGrid.classList.remove('hidden');
}

/* ====================================
   RENDER LOGIC
==================================== */
function renderCurrentWeather(data) {
    document.getElementById('city-name').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('temperature').textContent = Math.round(data.main.temp);

    document.querySelectorAll('.display-unit').forEach(el => el.textContent = currentUnit === 'metric' ? '°C' : '°F');
    document.getElementById('weather-condition').textContent = data.weather[0].description;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('wind-speed').textContent = `${data.wind.speed} ${getSpeedUnit()}`;
    document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;

    // Handle Auto Theme based on current City time
    if (currentTheme === 'auto') {
        const isDaytime = (data.dt > data.sys.sunrise && data.dt < data.sys.sunset);
        document.body.className = isDaytime ? 'theme-light' : 'theme-dark';
    }

    // Setup 'Add to Compare'
    const btnCompare = document.getElementById('btn-add-compare');
    btnCompare.onclick = () => addToComparison(data.name);
}

function renderAlerts(weatherId, temp) {
    // Basic alert logic based on OpenWeather Conditions Codes
    let alertMsg = null;
    if (weatherId >= 200 && weatherId < 300) alertMsg = "Warning: Thunderstorm conditions detected.";
    else if (weatherId >= 600 && weatherId < 603) alertMsg = "Advisory: Snow expected.";
    else if (weatherId === 781) alertMsg = "DANGER: Tornado detected in area.";
    else if (currentUnit === 'metric' && temp > 38) alertMsg = "Warning: Extreme High Temperature.";
    else if (currentUnit === 'imperial' && temp > 100) alertMsg = "Warning: Extreme High Temperature.";

    if (alertMsg) {
        alertText.textContent = alertMsg;
        alertsBanner.classList.remove('hidden');
    } else {
        alertsBanner.classList.add('hidden');
    }
}

function renderHourlyForecast(data, filterDateString = null) {
    const container = document.getElementById('hourly-container');
    container.innerHTML = '';

    let filteredData;

    if (filterDateString) {
        // If a specific date is clicked, filter all 3-hour blocks belonging to that YYYY-MM-DD
        filteredData = data.list.filter(item => item.dt_txt.startsWith(filterDateString));
        // Update Panel Title to show the selected date
        const dateObj = new Date(filterDateString);
        const displayDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        document.querySelector('.hourly-forecast .panel-title').innerHTML = `<i class="fa-regular fa-clock"></i> Forecast for ${displayDate}`;
    } else {
        // Default: Show next 8 items (24 hours from right now)
        filteredData = data.list.slice(0, 8);
        document.querySelector('.hourly-forecast .panel-title').innerHTML = `<i class="fa-regular fa-clock"></i> 24-Hour Forecast`;
    }

    filteredData.forEach(item => {
        const time = new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const temp = Math.round(item.main.temp);
        const icon = item.weather[0].icon;

        container.innerHTML += `
            <div class="hourly-item">
                <span class="hourly-time">${time}</span>
                <img src="https://openweathermap.org/img/wn/${icon}.png" alt="icon">
                <span class="hourly-temp">${temp}°</span>
            </div>
        `;
    });
}

function renderDailyForecast(data) {
    const container = document.getElementById('daily-container');
    container.innerHTML = '';

    // Filter list to get one reading per day (around 12:00 PM) for the cards
    const dailyData = data.list.filter(item => item.dt_txt.includes("12:00:00"));

    dailyData.forEach((item, index) => {
        const date = new Date(item.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const maxTemp = Math.round(item.main.temp_max);
        const minTemp = Math.round(item.main.temp_min);
        const icon = item.weather[0].icon;
        const desc = item.weather[0].description;
        // Extract "YYYY-MM-DD" prefix for grouping
        const dateString = item.dt_txt.split(' ')[0];

        // The first card defaults to active
        const activeClass = index === 0 ? 'active' : '';

        // Added data-date string and cursor:pointer
        container.innerHTML += `
            <div class="daily-item ${activeClass}" data-date="${dateString}" style="cursor: pointer; transition: all 0.3s ease;">
                <span class="daily-day">${dayName}</span>
                <img src="https://openweathermap.org/img/wn/${icon}.png" alt="icon">
                <div class="daily-temps">
                    <span class="daily-max">${maxTemp}°</span>
                    <span class="daily-min">${minTemp}°</span>
                </div>
                <span class="daily-desc">${desc}</span>
            </div>
        `;
    });

    // Add click event listeners to the generated cards
    const dailyCards = document.querySelectorAll('.daily-item');
    dailyCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // Remove active style from all cards
            dailyCards.forEach(c => {
                c.classList.remove('active');
                c.style.boxShadow = 'none';
                c.style.transform = 'scale(1)';
            });

            // Add active style to clicked card
            const clickedCard = e.currentTarget;
            clickedCard.classList.add('active');
            clickedCard.style.boxShadow = '0 0 15px rgba(255,255,255,0.3)';
            clickedCard.style.transform = 'scale(1.05)';

            // Fetch specific date string and re-render hourly view
            const selectedDateString = clickedCard.dataset.date;
            renderHourlyForecast(currentForecastData, selectedDateString);
        });
    });
}

/* ====================================
   CHARTS LOGIC (Chart.js)
==================================== */
// Chart Default Settings
Chart.defaults.color = 'rgba(255, 255, 255, 0.7)';
Chart.defaults.font.family = "'Outfit', sans-serif";

function initCharts(data, chartType) {
    const ctx = document.getElementById('forecastChart').getContext('2d');

    // Extract labels (time) and data (based on type)
    const labels = data.list.slice(0, 8).map(item => new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit' }));
    let chartData = [];
    let labelText = '';
    let borderColor = '';

    if (chartType === 'temp') {
        chartData = data.list.slice(0, 8).map(item => item.main.temp);
        labelText = `Temperature (${currentUnit === 'metric' ? '°C' : '°F'})`;
        borderColor = '#ff9a9e';
    } else if (chartType === 'humid') {
        chartData = data.list.slice(0, 8).map(item => item.main.humidity);
        labelText = 'Humidity (%)';
        borderColor = '#89f7fe';
    } else if (chartType === 'wind') {
        chartData = data.list.slice(0, 8).map(item => item.wind.speed);
        labelText = `Wind Speed (${getSpeedUnit()})`;
        borderColor = '#f6d365';
    }

    if (forecastChartInstance) forecastChartInstance.destroy();

    forecastChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: labelText,
                data: chartData,
                borderColor: borderColor,
                tension: 0.4,
                fill: true,
                backgroundColor: `${borderColor}33`, // Add alpha for fill
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { grid: { color: 'rgba(255,255,255,0.1)' } }
            }
        }
    });

    // Handle Tab Clicks
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.onclick = (e) => {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            initCharts(currentForecastData, e.target.dataset.chart);
        };
    });
}

function renderLocalHistory() {
    const ctx = document.getElementById('historyChart').getContext('2d');

    if (tempHistory.length === 0) return; // No history to show

    // Calculate Analytics
    const temps = tempHistory.map(h => h.temp);
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    const max = Math.max(...temps);

    document.getElementById('stat-avg-temp').textContent = `${Math.round(avg)}°`;
    document.getElementById('stat-hottest').textContent = `${Math.round(max)}°`;
    // Dummy logic for rainy days, as we only save temp history currently
    document.getElementById('stat-rainy').textContent = tempHistory.filter(h => h.rainy).length || 0;

    // Draw History Chart
    if (historyChartInstance) historyChartInstance.destroy();

    historyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: tempHistory.map(h => h.date),
            datasets: [{
                label: 'Stored Temp',
                data: temps,
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { display: false } }
        }
    });
}

function saveTemperatureHistory(data) {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const currentTemp = Math.round(data.main.temp); // Crucial: store as rounded integer
    const isRainy = data.weather[0].main === 'Rain';

    // check if today already exists
    const existingIndex = tempHistory.findIndex(h => h.date === today);
    if (existingIndex > -1) {
        tempHistory[existingIndex] = { date: today, temp: currentTemp, rainy: isRainy };
    } else {
        tempHistory.push({ date: today, temp: currentTemp, rainy: isRainy });
    }

    // Keep only last 7 items sorted by date inherently as they are pushed daily
    if (tempHistory.length > 7) tempHistory.shift();

    localStorage.setItem('tempHistory', JSON.stringify(tempHistory));

    // We must wait slightly for the DOM container to be fully visible 
    // before Chart.js attempts to measure and draw it inside the grid.
    setTimeout(() => {
        renderLocalHistory();
    }, 100);
}

/* ====================================
   CITY COMPARISON LOGIC
==================================== */
async function addToComparison(city) {
    if (comparisonCities.includes(city)) return;

    comparisonCities.push(city);
    localStorage.setItem('comparisonCities', JSON.stringify(comparisonCities));
    renderComparisonList();
}

function removeFromComparison(city) {
    comparisonCities = comparisonCities.filter(c => c !== city);
    localStorage.setItem('comparisonCities', JSON.stringify(comparisonCities));
    renderComparisonList();
}

async function renderComparisonList() {
    const container = document.getElementById('comparison-container');
    container.innerHTML = '';

    if (comparisonCities.length === 0) {
        container.innerHTML = '<p class="empty-msg">No cities added to comparison yet.</p>';
        return;
    }

    for (const city of comparisonCities) {
        try {
            const res = await fetch(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=${currentUnit}`);
            if (!res.ok) continue;
            const data = await res.json();

            const temp = Math.round(data.main.temp);
            const icon = data.weather[0].icon;

            container.innerHTML += `
                <div class="compare-card" data-city="${city}">
                    <div class="compare-info">
                        <img src="https://openweathermap.org/img/wn/${icon}.png" alt="icon">
                        <span class="compare-city">${data.name}</span>
                    </div>
                    <div style="display:flex; align-items:center;">
                        <span class="compare-temp">${temp}°</span>
                        <button class="btn-remove-compare" onclick="removeFromComparison('${city}')">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
            `;
        } catch (error) { console.error("Comparison fetch error:", error); }
    }
}

/* ====================================
   UTILITIES
==================================== */
function updateClock() {
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
    document.getElementById('current-time').textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function showLoading() {
    dashboardGrid.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');
}

function showError(msg) {
    loadingSpinner.classList.add('hidden');
    document.getElementById('error-text').textContent = msg;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}
