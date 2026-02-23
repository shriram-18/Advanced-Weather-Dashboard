# 🌤️ Advanced Weather Dashboard

A beautiful, modern, and highly interactive Weather Dashboard built with vanilla HTML, CSS, and JavaScript. It utilizes the free tier of the **OpenWeather API** to fetch comprehensive realtime weather data and multi-day forecasts.

![Dashboard Preview](https://via.placeholder.com/800x400.png?text=Weather+Dashboard+Preview)

---

## ✨ Key Features
- **🌍 Current Weather**: Real-time conditions including temperature, humidity, and wind speed.
- **📅 5-Day Interactive Forecast**: View daily highs and lows. Clicking a day loads its specific timeline!
- **🕒 24-Hour Forecast**: Scrollable horizontal view of weather in 3-hour increments.
- **📈 Trend Charts (Chart.js)**: Interactive graphs visualizing Temperature, Humidity, and Wind trends.
- **📍 Geolocation**: Instantly fetch weather for your current physical location.
- **🌗 Auto/Light/Dark Themes**: Toggle manually or let the app automatically switch based on the searched city's actual time / sunset.
- **🌡️ Unit Toggling**: Seamlessly switch between Celsius (°C) and Fahrenheit (°F).
- **📝 History & Analytics**: View a 7-day bar chart of your local temperature searches and see monthly averages.
- **🏙️ Multiple City Comparison**: Save your favorite cities to a quick-access comparison list.
- **⚠️ Weather Alerts**: Dynamic notification banners for extreme temperatures or severe weather conditions.

## 🛠️ Built With
- **HTML5**: Semantic and accessible structure.
- **CSS3 Grid & Flexbox**: Fully responsive layout featuring sleek, modern glassmorphism (frosted glass) UI panels.
- **Vanilla JavaScript**: Robust ES6+ logic handling asynchronous API calls, DOM manipulation, and `localStorage` state management without frameworks.
- **OpenWeather API**: Data provider for current weather and `/forecast` endpoints.
- **Chart.js**: Rendering the interactive data visualizations.

---

## 🚀 Getting Started

### Prerequisites
You will need your own free API key from [OpenWeatherMap](https://openweathermap.org/api).

### Installation
1. Clone the repository:
```bash
git clone https://github.com/shriram-18/Advanced-Weather-Dashboard.git
```
2. Navigate into the folder:
```bash
cd Advanced-Weather-Dashboard
```
3. Open `script.js` in your code editor and find line 1:
```javascript
const API_KEY = 'YOUR_API_KEY_HERE';
```
Replace the placeholder with your actual OpenWeather API key.

4. Open `index.html` in your web browser! No local server is strictly required, though using Live Server is recommended.

---

## 💡 Usage Highlights
- Click the **Target** icon in the search bar to detect your current location.
- Use the **Settings** gear at the top right to switch between Metric and Imperial units.
- Click on any **5-Day Forecast Card** (e.g., "Tomorrow") to immediately update the Hourly Forecast scroll-bar and the Charts with data just for that day!
- Add cities using the **+ Add to Comparison** button to track multiple locations at once.

## 📄 License
This project is open source.