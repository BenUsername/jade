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
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();
    if (response.ok) {
      toastr.success('Registration successful! You can now log in.');
    } else {
      toastr.error(`Error: ${data.error}`);
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
        localStorage.setItem('authToken', data.token); // Store the token in localStorage
        document.getElementById('registration-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('brand-analysis').style.display = 'block';
        document.getElementById('logout-button').style.display = 'block';
        console.log('Login successful, UI updated');
        fetchUserHistory();  // Fetch user history after successful login
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
  document.getElementById('registration-form').style.display = 'block';
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('brand-analysis').style.display = 'none';
  document.getElementById('logout-button').style.display = 'none';
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
      ${data.rankings.map(rank => `<li>${rank}</li>`).join('')}
    </ol>
  `;
}

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

// Initialize fetching user history on page load
document.addEventListener('DOMContentLoaded', () => {
  authToken = localStorage.getItem('authToken');
  if (authToken) {
    // User is already logged in
    document.getElementById('registration-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('brand-analysis').style.display = 'block';
    document.getElementById('logout-button').style.display = 'block';
    fetchUserHistory();
  } else {
    // User is not logged in
    document.getElementById('registration-form').style.display = 'block';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('brand-analysis').style.display = 'none';
    document.getElementById('logout-button').style.display = 'none';
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
    // You can add logic here to display overall user history if needed
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

  // Assuming each entry contains rankings
  const competitors = [...new Set(historyData.flatMap(entry => entry.rankings))];

  competitors.forEach((competitor, index) => {
    const data = historyData.map(entry => {
      const rank = entry.rankings.indexOf(competitor);
      return rank !== -1 ? rank + 1 : null; // Rank positions start from 1
    });

    datasets.push({
      label: competitor,
      data: data,
      borderColor: getColor(index, '1'),
      fill: false,
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
          ticks: {
            stepSize: 1,
            precision: 0,
          },
          title: {
            display: true,
            text: 'Rank Position',
          },
        },
      },
    },
  });
}

// Add this function to display search history
function displaySearchHistory(historyData) {
  const historyDiv = document.getElementById('search-history');
  historyDiv.innerHTML = '<h3>Search History</h3>';
  
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
  
  historyDiv.appendChild(table);
}