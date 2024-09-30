// Add this at the beginning of the file
if (window.userHistoryChart !== undefined) {
  console.warn('window.userHistoryChart is already defined. This may cause conflicts.');
}

window.sentimentChart = null;
window.userHistoryChart = null;
window.comparisonChart = null;

let authToken = null;

// Toastr configuration
toastr.options = {
  closeButton: true,
  progressBar: true,
  positionClass: "toast-top-right",
  timeOut: 5000
};

// Color palette function
function getColor(index, opacity) {
  const colorPalette = [
    `rgba(255, 99, 132, ${opacity})`,    // Red
    `rgba(54, 162, 235, ${opacity})`,    // Blue
    `rgba(255, 206, 86, ${opacity})`,    // Yellow
    `rgba(75, 192, 192, ${opacity})`,    // Green
    `rgba(153, 102, 255, ${opacity})`,   // Purple
    `rgba(255, 159, 64, ${opacity})`,    // Orange
  ];
  return colorPalette[index % colorPalette.length];
}

// Ensure headers include the token for authentication
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// Registration
document.getElementById('register-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  document.getElementById('loading').style.display = 'block';  // Show loading spinner

  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value.trim();

  try {
    console.log('Sending registration request...');
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();
    console.log('Registration response:', data);

    if (response.ok) {
      toastr.success(data.message || 'Registration successful! You can now log in.');
      // Clear the form
      document.getElementById('register-form').reset();
    } else {
      toastr.error(`Error: ${data.error}`);
      if (data.details) {
        console.error('Error details:', data.details);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    toastr.error('An unexpected error occurred during registration.');
  } finally {
    document.getElementById('loading').style.display = 'none';  // Hide loading spinner
  }
});

// Login
console.log('Attempting to find login form element');
const loginForm = document.getElementById('login-form-element');
console.log('Login form element:', loginForm);

if (loginForm) {
  loginForm.addEventListener('submit', async function (e) {
    console.log('Login form submit event triggered');
    e.preventDefault();

    document.getElementById('loading').style.display = 'block';  // Show loading spinner

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    console.log('Username and password retrieved');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log('Login response received:', data);

      if (response.ok) {
        toastr.success('Login successful!');
        authToken = data.token;
        localStorage.setItem('authToken', data.token);
        updateUIForLoggedInUser();
      } else {
        toastr.error(`Error: ${data.error}`);
        console.log('Login error:', data.error);
      }
    } catch (error) {
      console.error('Error during login:', error);
      toastr.error('An unexpected error occurred during login.');
    } finally {
      document.getElementById('loading').style.display = 'none';  // Hide loading spinner
    }
  });
} else {
  console.error('Login form element not found');
}

// Logout
document.getElementById('logout-button').addEventListener('click', function () {
  authToken = null;
  localStorage.removeItem('authToken');
  document.getElementById('auth-container').style.display = 'block';
  document.getElementById('post-login-content').style.display = 'none';
  document.querySelector('.contact-us').style.display = 'none'; // Hide contact us button
});

// Expandable sections
document.querySelectorAll('.expandable-section').forEach(section => {
  section.addEventListener('click', function() {
    const content = this.nextElementSibling;
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
  });
});

// Modify the Brand Analysis Form Submission
document.getElementById('brand-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const domain = document.getElementById('domain-input').value.trim();
  const userDescription = document.getElementById('user-description-input').value.trim();

  if (!domain || !userDescription) {
    toastr.error('Please fill in both fields');
    return;
  }

  document.getElementById('loading').style.display = 'block';
  document.getElementById('result').innerHTML = '';

  try {
    const response = await fetchWithAuth('/api/query-llm', {
      method: 'POST',
      body: JSON.stringify({ domain, userDescription }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();
    displayResults(data);
    // Fetch and display history for this specific domain
    await fetchDomainHistory(domain);
  } catch (error) {
    console.error('Error:', error);
    toastr.error(`An unexpected error occurred: ${error.message}`);
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
});

function displayResults(data) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    <h2>Results for ${data.domain}</h2>
    <p>Your description: ${data.userDescription}</p>
    <p>Identified Service: ${data.service}</p>
    <h3>Top Competitors:</h3>
    <ol>
      ${data.rankings.map(rank => `<li>${rank}${rank === data.domain ? ' (You)' : ''}</li>`).join('')}
    </ol>
  `;
}

async function fetchDomainHistory(domain) {
  try {
    const response = await fetchWithAuth(`/api/get-history?domain=${encodeURIComponent(domain)}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching domain history:', errorText);
      toastr.error('Failed to fetch domain history.');
      return;
    }

    const historyData = await response.json();
    console.log('Domain history data received:', historyData);
    
    if (historyData.length === 0) {
      console.log('No history data available for this domain.');
      document.querySelector('.chart-container').style.display = 'none';
      return;
    }
    
    renderDomainHistoryChart(historyData, domain);
    displaySearchHistory(historyData);
  } catch (error) {
    console.error('Error fetching domain history:', error);
    toastr.error('An unexpected error occurred while fetching domain history.');
  }
}

function getColorScheme(index) {
  const colorSchemes = [
    'rgb(255, 99, 132)',   // Red
    'rgb(54, 162, 235)',   // Blue
    'rgb(255, 206, 86)',   // Yellow
    'rgb(75, 192, 192)',   // Green
    'rgb(153, 102, 255)',  // Purple
    'rgb(255, 159, 64)',   // Orange
    'rgb(199, 199, 199)',  // Gray
    'rgb(83, 102, 255)',   // Indigo
    'rgb(255, 99, 255)',   // Pink
    'rgb(159, 159, 64)'    // Olive
  ];
  return colorSchemes[index % colorSchemes.length];
}

function createLegendButtons(competitors, chart) {
  const legendContainer = document.getElementById('legend-container');
  legendContainer.innerHTML = '';
  competitors.forEach((competitor, index) => {
    const button = document.createElement('button');
    button.classList.add('btn', 'btn-sm', 'm-1', 'chart-legend-item');
    button.style.backgroundColor = getColorScheme(index);
    button.style.color = 'white';
    button.textContent = competitor;
    button.onclick = () => {
      const datasetIndex = chart.data.datasets.findIndex(d => d.label === competitor);
      chart.setDatasetVisibility(datasetIndex, !chart.isDatasetVisible(datasetIndex));
      chart.update();
      button.classList.toggle('hidden');
    };
    legendContainer.appendChild(button);
  });
}

function renderDomainHistoryChart(historyData, currentDomain) {
  console.log('Attempting to render chart for domain:', currentDomain);
  const chartContainer = document.querySelector('.chart-container');
  const canvas = document.getElementById('historyChart');
  
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }
  
  const ctx = canvas.getContext('2d');

  if (!historyData || historyData.length === 0 || historyData[0].domain !== currentDomain) {
    console.log('No data to render chart or data is not for the current domain.');
    chartContainer.style.display = 'none';
    return;
  }

  chartContainer.style.display = 'block';

  // Group and average data by date
  const groupedData = {};
  historyData.forEach(entry => {
    const date = new Date(entry.date).toLocaleDateString();
    if (!groupedData[date]) {
      groupedData[date] = { rankings: {}, count: 0 };
    }
    entry.rankings.forEach((competitor, index) => {
      if (!groupedData[date].rankings[competitor]) {
        groupedData[date].rankings[competitor] = 0;
      }
      groupedData[date].rankings[competitor] += index + 1;
    });
    groupedData[date].count++;
  });

  // Calculate averages
  const averagedData = Object.entries(groupedData).map(([date, data]) => ({
    date,
    rankings: Object.fromEntries(
      Object.entries(data.rankings).map(([competitor, sum]) => [competitor, sum / data.count])
    )
  }));

  // Sort by date
  averagedData.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Prepare data for the chart
  const labels = averagedData.map(entry => entry.date);
  const allCompetitors = [...new Set(averagedData.flatMap(entry => Object.keys(entry.rankings)))];

  // Sort competitors by their average ranking
  const sortedCompetitors = allCompetitors.sort((a, b) => {
    const avgRankA = averagedData.reduce((sum, entry) => sum + (entry.rankings[a] || 11), 0) / averagedData.length;
    const avgRankB = averagedData.reduce((sum, entry) => sum + (entry.rankings[b] || 11), 0) / averagedData.length;
    return avgRankA - avgRankB;
  });

  // Take top 10 competitors and the current domain
  const topCompetitors = sortedCompetitors.slice(0, 9);
  if (!topCompetitors.includes(currentDomain)) {
    topCompetitors.unshift(currentDomain);
  }

  const datasets = topCompetitors.map((competitor, index) => ({
    label: competitor,
    data: averagedData.map(entry => entry.rankings[competitor] || null),
    borderColor: getColorScheme(index),
    backgroundColor: getColorScheme(index) + '20',
    fill: false,
    borderWidth: competitor === currentDomain ? 3 : 2,
    pointRadius: competitor === currentDomain ? 5 : 3,
    pointHoverRadius: 8,
    hidden: index >= 5 && competitor !== currentDomain, // Hide datasets beyond top 5 initially
  }));

  // Destroy existing chart if it exists
  if (window.userHistoryChart) {
    window.userHistoryChart.destroy();
  }

  // Create new chart
  window.userHistoryChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          reverse: true,
          min: 1,
          max: 10,
          ticks: {
            stepSize: 1,
            callback: function(value) {
              return value > 10 ? '' : value.toString();
            }
          },
          title: {
            display: true,
            text: 'Average Rank Position',
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: function(tooltipItems) {
              return `Date: ${tooltipItems[0].label}`;
            },
            label: function(context) {
              const label = context.dataset.label;
              const value = context.parsed.y;
              return `${label}: ${value === null ? 'Not in top 10' : `Avg Rank ${value.toFixed(2)}`}`;
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      hover: {
        mode: 'nearest',
        intersect: true
      },
    },
  });

  createLegendButtons(topCompetitors, window.userHistoryChart);
}

// Add CSV export functionality
document.getElementById('exportCsv').addEventListener('click', function() {
  if (window.userHistoryChart) {
    const csvData = [
      ['Date', ...window.userHistoryChart.data.datasets.map(ds => ds.label)]
    ];

    window.userHistoryChart.data.labels.forEach((label, index) => {
      const row = [label];
      window.userHistoryChart.data.datasets.forEach(ds => {
        row.push(ds.data[index]);
      });
      csvData.push(row);
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'ranking_history.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
});

// Update other functions to use 'domain' instead of 'brand'
function displayServiceAndRankings(domain, service, rankings) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    <h2>Domain: ${domain}</h2>
    <h3>Service: ${service}</h3>
    <h4>Top Competitors:</h4>
    <table class="table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Website</th>
        </tr>
      </thead>
      <tbody>
        ${rankings.map((website, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${website}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Update fetchBrandHistory to fetchDomainHistory
async function fetchDomainHistory(domain) {
  try {
    const response = await fetchWithAuth(`/api/get-history?domain=${encodeURIComponent(domain)}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching domain history:', errorText);
      toastr.error('Failed to fetch domain history.');
      return;
    }

    const historyData = await response.json();
    console.log('Domain history data received:', historyData);
    renderDomainHistoryChart(historyData);
    displaySearchHistory(historyData);
  } catch (error) {
    console.error('Error fetching domain history:', error);
    toastr.error('An unexpected error occurred while fetching domain history.');
  }
}

// Update other functions accordingly

// Initialize UI on page load
document.addEventListener('DOMContentLoaded', () => {
  authToken = localStorage.getItem('authToken');
  if (authToken) {
    updateUIForLoggedInUser();
  } else {
    document.getElementById('auth-container').style.display = 'block';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('post-login-content').style.display = 'none';
    document.querySelector('.contact-us').style.display = 'none'; // Hide contact us button
  }
});

// Function to validate domain
function isValidDomain(domain) {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

// Add this function to fetch user history
async function fetchUserHistory() {
  try {
    const response = await fetchWithAuth('/api/get-history');
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching user history:', errorText);
      toastr.error('Failed to fetch user history.');
      return;
    }
    const historyData = await response.json();
    console.log('User history data received:', historyData);
    if (historyData.length > 0) {
      renderDomainHistoryChart(historyData, historyData[0].domain);
    }
    displaySearchHistory(historyData);
  } catch (error) {
    console.error('Error fetching user history:', error);
    toastr.error('An unexpected error occurred while fetching user history.');
  }
}

// Update fetchDomainHistory function
async function fetchDomainHistory(domain) {
  try {
    const response = await fetchWithAuth(`/api/get-history?domain=${encodeURIComponent(domain)}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching domain history:', errorText);
      toastr.error('Failed to fetch domain history.');
      return;
    }

    const historyData = await response.json();
    console.log('Domain history data received:', historyData);
    renderDomainHistoryChart(historyData);
    displaySearchHistory(historyData);
  } catch (error) {
    console.error('Error fetching domain history:', error);
    toastr.error('An unexpected error occurred while fetching domain history.');
  }
}

// Add this function to render domain history chart
function renderDomainHistoryChart(historyData) {
  const ctx = document.getElementById('historyChart').getContext('2d');

  // Prepare data for the chart
  const labels = historyData.map(entry => new Date(entry.date).toLocaleDateString());
  const datasets = [];

  // Get all unique competitors across all entries
  const allCompetitors = [...new Set(historyData.flatMap(entry => entry.rankings))];

  // Sort competitors by their average ranking
  const sortedCompetitors = allCompetitors.sort((a, b) => {
    const avgRankA = historyData.reduce((sum, entry) => sum + (entry.rankings.indexOf(a) + 1 || 11), 0) / historyData.length;
    const avgRankB = historyData.reduce((sum, entry) => sum + (entry.rankings.indexOf(b) + 1 || 11), 0) / historyData.length;
    return avgRankA - avgRankB;
  });

  // Take top 10 competitors
  const topCompetitors = sortedCompetitors.slice(0, 10);

  topCompetitors.forEach((competitor, index) => {
    const data = historyData.map(entry => {
      const rank = entry.rankings.indexOf(competitor);
      return rank !== -1 ? rank + 1 : null; // Rank positions start from 1
    });

    const isUserDomain = competitor === historyData[0].domain;

    datasets.push({
      label: competitor,
      data: data,
      borderColor: getColor(index, isUserDomain ? '1' : '0.7'),
      backgroundColor: getColor(index, isUserDomain ? '0.2' : '0'),
      fill: isUserDomain,
      borderWidth: isUserDomain ? 3 : 1,
      pointRadius: isUserDomain ? 5 : 3,
    });
  });

  // Destroy existing chart if it exists
  if (window.userHistoryChart) {
    window.userHistoryChart.destroy();
  }

  // Create new chart
  window.userHistoryChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      scales: {
        y: {
          reverse: true,
          min: 1,
          max: 10,
          ticks: {
            stepSize: 1,
            callback: function(value) {
              return value > 10 ? '' : value.toString();
            }
          },
          title: {
            display: true,
            text: 'Rank Position',
          },
        },
      },
      plugins: {
        legend: {
          position: 'right',
        },
        tooltip: {
          callbacks: {
            title: function(tooltipItems) {
              return `Date: ${tooltipItems[0].label}`;
            },
            label: function(context) {
              const label = context.dataset.label;
              const value = context.parsed.y;
              return `${label}: ${value === null ? 'Not in top 10' : `Rank ${value}`}`;
            }
          }
        }
      }
    },
  });
}

// Add this function to handle collapsible elements
function setupCollapsible() {
  var coll = document.getElementsByClassName("collapsible");
  for (var i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function() {
      this.classList.toggle("active");
      var content = this.nextElementSibling;
      if (content.style.display === "block") {
        content.style.display = "none";
      } else {
        content.style.display = "block";
      }
    });
  }
}

// Modify the displaySearchHistory function
function displaySearchHistory(historyData) {
  const historyContent = document.querySelector('#search-history .content');
  historyContent.innerHTML = ''; // Clear existing content
  
  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Domain</th>
        <th>Service</th>
      </tr>
    </thead>
    <tbody>
      ${historyData.map(entry => `
        <tr>
          <td>${new Date(entry.date).toLocaleString()}</td>
          <td>${entry.domain}</td>
          <td>${entry.service}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  
  historyContent.appendChild(table);
}

// Modify or add this function to ensure proper display on page load
function updateUIForLoggedInUser() {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('post-login-content').style.display = 'block';
  document.querySelector('.contact-us').style.display = 'block'; // Show contact us button
  showSection('brand-analysis');
  fetchUserHistory();
  setupCollapsible();
}

// Add these lines near the top of your script.js file
document.getElementById('show-register').addEventListener('click', function(e) {
  e.preventDefault();
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('registration-form').style.display = 'block';
});

document.getElementById('show-login').addEventListener('click', function(e) {
  e.preventDefault();
  document.getElementById('registration-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
});

// Function to switch between content sections
function showSection(sectionId) {
  document.querySelectorAll('.content-section').forEach(section => {
    section.style.display = 'none';
  });
  document.getElementById(sectionId).style.display = 'block';
}

// Add event listeners for menu items
document.getElementById('brand-analysis-link').addEventListener('click', (e) => {
  e.preventDefault();
  showSection('brand-analysis');
});

document.getElementById('ranking-history-link').addEventListener('click', (e) => {
  e.preventDefault();
  showSection('ranking-history');
  fetchUserHistory();
});

document.getElementById('search-history-link').addEventListener('click', (e) => {
  e.preventDefault();
  showSection('search-history');
  fetchSearchHistory();
});

// Modify updateUIForLoggedInUser function
function updateUIForLoggedInUser() {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('post-login-content').style.display = 'block';
  document.querySelector('.contact-us').style.display = 'block'; // Show contact us button
  showSection('brand-analysis');
  fetchUserHistory();
}

// Modify logout button event listener
document.getElementById('logout-button').addEventListener('click', function () {
  authToken = null;
  localStorage.removeItem('authToken');
  document.getElementById('auth-container').style.display = 'block';
  document.getElementById('post-login-content').style.display = 'none';
  document.querySelector('.contact-us').style.display = 'none'; // Hide contact us button
});

// Modify fetchUserHistory function
async function fetchUserHistory() {
  try {
    const response = await fetchWithAuth('/api/get-history');
    if (!response.ok) {
      throw new Error('Failed to fetch user history');
    }
    const historyData = await response.json();
    displaySearchHistory(historyData);
  } catch (error) {
    console.error('Error fetching user history:', error);
    toastr.error('Failed to fetch user history');
  }
}

// Add fetchSearchHistory function
async function fetchSearchHistory() {
  try {
    const response = await fetchWithAuth('/api/get-history');
    if (!response.ok) {
      throw new Error('Failed to fetch search history');
    }
    const historyData = await response.json();
    displaySearchHistory(historyData);
  } catch (error) {
    console.error('Error fetching search history:', error);
    toastr.error('Failed to fetch search history');
  }
}

// Modify displaySearchHistory function
function displaySearchHistory(historyData) {
  const historyContent = document.getElementById('search-history-content');
  historyContent.innerHTML = ''; // Clear existing content
  
  const table = document.createElement('table');
  table.className = 'table table-striped';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Domain</th>
        <th>Service</th>
      </tr>
    </thead>
    <tbody>
      ${historyData.map(entry => `
        <tr>
          <td>${new Date(entry.date).toLocaleString()}</td>
          <td>${entry.domain}</td>
          <td>${entry.service}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  
  historyContent.appendChild(table);
}