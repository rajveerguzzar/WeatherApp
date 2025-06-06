const cityInput = document.querySelector('.city-input');
const searchBtn = document.querySelector('.search-btn');
const localWeatherBtn = document.querySelector('.local-weather-btn');

const searchCitySection = document.querySelector('.search-city');
const weatherInfoSection = document.querySelector('.weather-info');
const notFoundSection = document.querySelector('.not-found');
const apiErrorSection = document.querySelector('.api-error');
const geolocationDeniedSection = document.querySelector('.geolocation-denied');
const locationUnavailableSection = document.querySelector('.location-unavailable');
const geolocationNotSupportedSection = document.querySelector('.geolocation-not-supported');
const loadingScreen = document.querySelector('.loading-screen');

const countryTxt = document.querySelector('.country-txt');
const tempTxt = document.querySelector('.temp-txt');
const conditionTxt = document.querySelector('.condition-txt');
const humidityValueText = document.querySelector('.humidity-value-txt');
const windValueText = document.querySelector('.wind-value-txt');
const weatherSummaryImg = document.querySelector('.weather-summary-img');
const currentDateTxt = document.querySelector('.current-date-txt');
const forecastItemsContainer = document.querySelector('.forecast-items-container');

const suggestionsList = document.querySelector('.suggestions-list');

const openWeatherApiKey = '009ed316a4f93f7c813aabca8e5b6fcc';
const geoNamesUsername = 'rajveergurjar';

let debounceTimer;

searchBtn.addEventListener('click', () => {
    if (cityInput.value.trim() !== '') {
        updateWeatherInfo(cityInput.value);
        cityInput.value = '';
        cityInput.blur();
        hideSuggestions();
    }
});

cityInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && cityInput.value.trim() !== '') {
        updateWeatherInfo(cityInput.value);
        cityInput.value = '';
        cityInput.blur();
        hideSuggestions();
    }
});

localWeatherBtn.addEventListener('click', getLocalWeather);

cityInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = cityInput.value.trim();

    if (query.length >= 3) {
        debounceTimer = setTimeout(() => {
            fetchCitySuggestions(query);
        }, 300);
    } else {
        hideSuggestions();
    }
});

cityInput.addEventListener('blur', () => {
    setTimeout(() => {
        hideSuggestions();
    }, 150);
});

async function getOpenWeatherData(endPoint, query) {
    let apiUrl;
    if (typeof query === 'string') {
        apiUrl = `https://api.openweathermap.org/data/2.5/${endPoint}?q=${query}&appid=${openWeatherApiKey}&units=metric`;
    } else if (typeof query === 'object' && query.lat && query.lon) {
        apiUrl = `https://api.openweathermap.org/data/2.5/${endPoint}?lat=${query.lat}&lon=${query.lon}&appid=${openWeatherApiKey}&units=metric`;
    } else {
        throw new Error("Invalid query provided for OpenWeatherMap API.");
    }

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            if (response.status === 404 && typeof query === 'string') {
                throw new Error("City Not Found");
            } else if (response.status === 401) {
                throw new Error("Invalid API Key");
            } else {
                const errorData = await response.json();
                throw new Error(`API Error: ${errorData.message || 'Unknown error for HTTP status ' + response.status}`);
            }
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching OpenWeatherMap data:", error);
        throw error;
    }
}

async function fetchCitySuggestions(query) {
    const geoNamesApiUrl = `http://api.geonames.org/searchJSON?q=${query}&maxRows=10&featureClass=P&username=${geoNamesUsername}`;

    try {
        const response = await fetch(geoNamesApiUrl);
        if (!response.ok) {
            throw new Error(`GeoNames API Error: HTTP status ${response.status}`);
        }
        const data = await response.json();

        if (data.geonames && data.geonames.length > 0) {
            displaySuggestions(data.geonames);
        } else {
            hideSuggestions();
        }
    } catch (error) {
        console.error("Error fetching city suggestions:", error);
        hideSuggestions();
    }
}

function displaySuggestions(geonames) {
    suggestionsList.innerHTML = '';
    suggestionsList.style.display = 'block';

    geonames.forEach(city => {
        const listItem = document.createElement('li');
        const displayName = `${city.name}${city.adminCode1 ? ', ' + city.adminCode1 : ''}, ${city.countryName}`;
        listItem.textContent = displayName;
        listItem.dataset.cityName = city.name;

        listItem.addEventListener('mousedown', (event) => {
            event.preventDefault();
            cityInput.value = listItem.dataset.cityName;
            updateWeatherInfo(listItem.dataset.cityName);
            hideSuggestions();
        });
        suggestionsList.appendChild(listItem);
    });
}

function hideSuggestions() {
    suggestionsList.innerHTML = '';
    suggestionsList.style.display = 'none';
}

function getLocalWeatherIcon(iconCode) {
    switch (iconCode) {
        case "01d": return "clear-day.svg";
        case "01n": return "clear-night.svg";
        case "02d": return "few-clouds-day.svg";
        case "02n": return "few-clouds-night.svg";
        case "03d":
        case "03n": return "scattered-clouds.svg";
        case "04d":
        case "04n": return "broken-clouds.svg";
        case "09d":
        case "09n": return "shower-rain.svg";
        case "10d": return "rain-day.svg";
        case "10n": return "rain-night.svg";
        case "11d":
        case "11n": return "thunderstorm.svg";
        case "13d":
        case "13n": return "snow.svg";
        case "50d":
        case "50n": return "mist.svg";
        default: return "default.svg";
    }
}

function getCurrentDate() {
    const currentDate = new Date();
    const options = {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
    };
    return currentDate.toLocaleDateString('en-GB', options);
}

function groupForecastByDay(list) {
    const dailyForecasts = {};
    const today = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });

    list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });

        if (dateKey === today && date.getHours() < new Date().getHours()) {
            return;
        }

        if (!dailyForecasts[dateKey]) {
            dailyForecasts[dateKey] = {
                date: date,
                minTemp: item.main.temp,
                maxTemp: item.main.temp,
                icon: item.weather[0].icon,
                description: item.weather[0].description,
            };
        } else {
            dailyForecasts[dateKey].minTemp = Math.min(dailyForecasts[dateKey].minTemp, item.main.temp);
            dailyForecasts[dateKey].maxTemp = Math.max(dailyForecasts[dateKey].maxTemp, item.main.temp);
        }
    });

    const sortedDailyForecasts = Object.values(dailyForecasts).sort((a, b) => a.date - b.date);
    return sortedDailyForecasts.slice(0, 5);
}

function createForecastItemElement(data) {
    const forecastItem = document.createElement('div');
    forecastItem.classList.add('forecast-item');

    const dateElement = document.createElement('h5');
    dateElement.classList.add('forecast-item-date', 'regular-txt');
    dateElement.textContent = data.date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });

    const imgElement = document.createElement('img');
    imgElement.classList.add('forecast-item-img');
    imgElement.src = `assets/weather/${getLocalWeatherIcon(data.icon)}`;
    imgElement.alt = data.description;

    const tempElement = document.createElement('h5');
    tempElement.classList.add('forecast-item-temp');
    tempElement.textContent = `${Math.round(data.maxTemp)}°C / ${Math.round(data.minTemp)}°C`;

    forecastItem.append(dateElement, imgElement, tempElement);
    return forecastItem;
}

function displayWeather(weatherData, forecastData) {
    const {
        name: cityName,
        main: { temp, humidity },
        weather: [{ description, icon }],
        wind: { speed },
        sys: { country: countryCode }
    } = weatherData;

    countryTxt.textContent = `${cityName}, ${countryCode}`;
    tempTxt.textContent = `${Math.round(temp)}°C`;
    conditionTxt.textContent = description.charAt(0).toUpperCase() + description.slice(1);
    humidityValueText.textContent = `${humidity}%`;
    windValueText.textContent = `${speed} M/s`;
    currentDateTxt.textContent = getCurrentDate();
    weatherSummaryImg.src = `assets/weather/${getLocalWeatherIcon(icon)}`;
    weatherSummaryImg.alt = description;

    const dailyForecasts = groupForecastByDay(forecastData.list);
    forecastItemsContainer.innerHTML = '';
    dailyForecasts.forEach(dayForecast => {
        const forecastItemElement = createForecastItemElement(dayForecast);
        forecastItemsContainer.appendChild(forecastItemElement);
    });

    showDisplaySection(weatherInfoSection);
}

// Helper function to handle minimum display time for the loader
async function handleLoaderDisplay(promiseFunc, successCallback, errorCallback) {
    showDisplaySection(loadingScreen);
    cityInput.disabled = true;
    searchBtn.disabled = true;
    localWeatherBtn.disabled = true;

    const minLoadTime = 2000; // Minimum 2 seconds for the loader to show (in milliseconds)
    const startTime = Date.now();

    try {
        const data = await promiseFunc(); // Execute the actual data fetching promise

        const elapsedTime = Date.now() - startTime;
        const remainingTime = minLoadTime - elapsedTime;

        if (remainingTime > 0) {
            setTimeout(() => {
                successCallback(data);
                // Re-enable inputs here after delay
                cityInput.value = '';
                cityInput.disabled = false;
                searchBtn.disabled = false;
                localWeatherBtn.disabled = false;
            }, remainingTime);
        } else {
            successCallback(data);
            // Re-enable inputs immediately
            cityInput.value = '';
            cityInput.disabled = false;
            searchBtn.disabled = false;
            localWeatherBtn.disabled = false;
        }
    } catch (error) {
        console.error("Operation failed:", error);
        const elapsedTime = Date.now() - startTime;
        const remainingTime = minLoadTime - elapsedTime;

        if (remainingTime > 0) {
            setTimeout(() => {
                errorCallback(error);
                // Re-enable inputs here after delay
                cityInput.value = '';
                cityInput.disabled = false;
                searchBtn.disabled = false;
                localWeatherBtn.disabled = false;
            }, remainingTime);
        } else {
            errorCallback(error);
            // Re-enable inputs immediately
            cityInput.value = '';
            cityInput.disabled = false;
            searchBtn.disabled = false;
            localWeatherBtn.disabled = false;
        }
    }
}


async function updateWeatherInfo(city) {
    handleLoaderDisplay(
        async () => {
            return Promise.all([
                getOpenWeatherData('weather', city),
                getOpenWeatherData('forecast', city)
            ]);
        },
        ([weatherData, forecastData]) => {
            displayWeather(weatherData, forecastData);
        },
        (error) => {
            if (error.message === "City Not Found") {
                showDisplaySection(notFoundSection);
            } else if (error.message === "Invalid API Key" || error.message.includes("API Error:")) {
                showDisplaySection(apiErrorSection);
            } else {
                showDisplaySection(apiErrorSection);
            }
        }
    );
}

function getLocalWeather() {
    cityInput.value = 'Fetching local weather...'; // Show immediate feedback in input field

    if (navigator.geolocation) {
        handleLoaderDisplay(
            async () => {
                return new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            try {
                                const [weatherData, forecastData] = await Promise.all([
                                    getOpenWeatherData('weather', { lat: position.coords.latitude, lon: position.coords.longitude }),
                                    getOpenWeatherData('forecast', { lat: position.coords.latitude, lon: position.coords.longitude })
                                ]);
                                resolve([weatherData, forecastData]);
                            } catch (e) {
                                reject(e);
                            }
                        },
                        (error) => {
                            reject(error); // Reject the promise on geolocation error
                        }
                    );
                });
            },
            ([weatherData, forecastData]) => {
                displayWeather(weatherData, forecastData);
            },
            (error) => {
                if (error.code) { // Check for Geolocation error codes
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            showDisplaySection(geolocationDeniedSection);
                            break;
                        case error.POSITION_UNAVAILABLE:
                            showDisplaySection(locationUnavailableSection);
                            break;
                        case error.TIMEOUT:
                            showDisplaySection(locationUnavailableSection);
                            break;
                        default:
                            showDisplaySection(locationUnavailableSection);
                            break;
                    }
                } else if (error.message === "Invalid API Key" || error.message.includes("API Error:")) {
                    showDisplaySection(apiErrorSection);
                } else {
                    showDisplaySection(notFoundSection); // Fallback for other API errors
                }
            }
        );
    } else {
        // Handle geolocation not supported case immediately as no promise is involved
        showDisplaySection(geolocationNotSupportedSection);
        cityInput.value = '';
        cityInput.disabled = false;
        searchBtn.disabled = false;
        localWeatherBtn.disabled = false;
    }
}


function showDisplaySection(section) {
    [
        weatherInfoSection,
        searchCitySection,
        notFoundSection,
        apiErrorSection,
        geolocationDeniedSection,
        locationUnavailableSection,
        geolocationNotSupportedSection,
        loadingScreen
    ].forEach(sec => sec.style.display = 'none');

    section.style.display = 'flex';
}

showDisplaySection(searchCitySection);