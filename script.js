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
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('registration-form').style.display = 'none';
  document.querySelector('.intro-section').style.display = 'block'; // Show intro section on logout
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

  if (!domain) {
    toastr.error('Please enter a domain');
    return;
  }

  document.getElementById('loading').style.display = 'block';
  document.getElementById('result').innerHTML = '';

  try {
    const response = await fetchWithAuth('/api/query-llm', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });

    if (!response.ok) {
      if (response.status === 504) {
        throw new Error('The request took too long to process. Please try again.');
      }
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
    <h3>Top 20 Keyword Prompts:</h3>
    <table class="table table-striped">
      <thead>
        <tr>
          <th>#</th>
          <th>Prompt</th>
        </tr>
      </thead>
      <tbody>
        ${data.keywordPrompts.map((prompt, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${prompt}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
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
    
    if (historyData.length === 0) {
      console.log('No history data available for this domain.');
      document.querySelector('.chart-container').style.display = 'none';
      return;
    }
    
    renderDomainHistoryChart(historyData, domain);  // Pass domain as the second argument
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

  if (!historyData || historyData.length === 0) {
    console.log('No data to render chart.');
    chartContainer.style.display = 'none';
    return;
  }

  chartContainer.style.display = 'block';

  // Group data by day and calculate averages
  const groupedData = historyData.reduce((acc, entry) => {
    const date = new Date(entry.date).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { rankings: {}, count: 0 };
    }
    entry.rankings.forEach((competitor, index) => {
      if (!acc[date].rankings[competitor]) {
        acc[date].rankings[competitor] = 0;
      }
      acc[date].rankings[competitor] += index + 1;
    });
    acc[date].count++;
    return acc;
  }, {});

  // Calculate averages and prepare data for the chart
  const averagedData = Object.entries(groupedData).map(([date, data]) => ({
    date,
    rankings: Object.fromEntries(
      Object.entries(data.rankings).map(([competitor, sum]) => [competitor, sum / data.count])
    )
  }));

  // Sort by date
  averagedData.sort((a, b) => new Date(a.date) - new Date(b.date));

  const labels = averagedData.map(entry => entry.date);
  const allCompetitors = [...new Set(averagedData.flatMap(entry => Object.keys(entry.rankings)))];

  // Calculate overall average rankings
  const overallAverages = allCompetitors.map(competitor => {
    const sum = averagedData.reduce((acc, entry) => acc + (entry.rankings[competitor] || 0), 0);
    return { competitor, average: sum / averagedData.length };
  });

  // Sort competitors by their overall average ranking
  const sortedCompetitors = overallAverages.sort((a, b) => a.average - b.average);

  // Take top 9 competitors and ensure the current domain is included
  let topCompetitors = sortedCompetitors.slice(0, 9).map(item => item.competitor);
  if (!topCompetitors.includes(currentDomain)) {
    topCompetitors.pop(); // Remove the last competitor
    topCompetitors.unshift(currentDomain); // Add current domain at the beginning
  }

  // Assign integer ranks from 1 to 10 based on the sorted averages
  const rankedCompetitors = topCompetitors.map((competitor, index) => ({
    competitor,
    rank: index + 1 // Rank from 1 to 10
  }));

  const datasets = rankedCompetitors.map((competitor, index) => ({
    label: competitor.competitor,
    data: averagedData.map(entry => {
      const avgRank = entry.rankings[competitor.competitor];
      return avgRank ? competitor.rank : null;
    }),
    borderColor: getColorScheme(index),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    fill: false,
    borderWidth: competitor.competitor === currentDomain ? 3 : 2,
    pointRadius: competitor.competitor === currentDomain ? 5 : 3,
    pointHoverRadius: 8,
    hidden: false, // Make all competitors visible by default
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
            text: 'Rank Position',
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
              return `${label}: ${value === null ? 'Not in top 10' : `Rank ${value}`}`;
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

  createLegendButtons(rankedCompetitors.map(c => c.competitor), window.userHistoryChart);
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
    document.getElementById('registration-form').style.display = 'none';
    document.getElementById('post-login-content').style.display = 'none';
    document.querySelector('.contact-us').style.display = 'none'; // Hide contact us button
    document.querySelector('.intro-section').style.display = 'block'; // Show intro section
  }

  // Initialize tooltips
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
  })
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
    if (response.status === 401) {
      console.log('Authentication token expired or invalid. Redirecting to login.');
      // Clear the token and redirect to login
      localStorage.removeItem('authToken');
      document.getElementById('auth-container').style.display = 'block';
      document.getElementById('post-login-content').style.display = 'none';
      return;
    }
    if (!response.ok) {
      throw new Error('Failed to fetch user history');
    }
    const historyData = await response.json();
    console.log('User history data received:', historyData);
    if (historyData.length > 0) {
      renderDomainHistoryChart(historyData, historyData[0].domain);
    }
    displaySearchHistory(historyData);
  } catch (error) {
    console.error('Error fetching user history:', error);
    toastr.error('Failed to fetch user history');
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
      ${historyData.map(entry => 
        `<tr>
          <td>${new Date(entry.date).toLocaleString()}</td>
          <td>${entry.domain}</td>
          <td>${entry.service}</td>
        </tr>`
      ).join('')}
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
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('registration-form').style.display = 'none';
  document.querySelector('.intro-section').style.display = 'block'; // Show intro section on logout
});

// Modify fetchUserHistory function
async function fetchUserHistory() {
  try {
    const response = await fetchWithAuth('/api/get-history');
    if (response.status === 401) {
      console.log('Authentication token expired or invalid. Redirecting to login.');
      // Clear the token and redirect to login
      localStorage.removeItem('authToken');
      document.getElementById('auth-container').style.display = 'block';
      document.getElementById('post-login-content').style.display = 'none';
      return;
    }
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
      ${historyData.map(entry => 
        `<tr>
          <td>${new Date(entry.date).toLocaleString()}</td>
          <td>${entry.domain}</td>
          <td>${entry.service}</td>
        </tr>`
      ).join('')}
    </tbody>
  `;
  
  historyContent.appendChild(table);
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('seoForm');
    const resultDiv = document.getElementById('result');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const domain = document.getElementById('domain').value;
        resultDiv.innerHTML = 'Processing...';

        try {
            const response = await fetch('/api/query-llm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ domain }),
            });

            const data = await response.json();
            if (response.ok) {
                resultDiv.innerHTML = `
                    <h2>Keyword Prompts for ${data.domain}:</h2>
                    <ul>
                        ${data.keywordPrompts.map(prompt => `<li>${prompt}</li>`).join('')}
                    </ul>
                `;
            } else {
                resultDiv.innerHTML = `Error: ${data.error}`;
            }
        } catch (error) {
            resultDiv.innerHTML = `Error: ${error.message}`;
        }
    });
});