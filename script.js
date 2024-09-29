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
  const token = authToken;
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

  const brand = document.getElementById('brand-input').value.trim();
  if (!brand) return;

  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = ''; // Clear previous results
  document.getElementById('loading').style.display = 'block'; // Show loading spinner

  try {
    // Call the API endpoint
    const response = await fetchWithAuth('/api/query-llm', {
      method: 'POST',
      body: JSON.stringify({ brand }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      toastr.error(`Error: ${errorText}`);
      console.log('API error:', errorText);
      return;
    }

    const data = await response.json();

    // Display the service and rankings
    displayServiceAndRankings(data.service, data.rankings);

    // Fetch and display history
    await fetchUserHistory();

  } catch (error) {
    console.error('Error:', error);
    toastr.error(`An unexpected error occurred: ${error.message}`);
    resultDiv.innerHTML = '<p>An unexpected error occurred.</p>';
  } finally {
    document.getElementById('loading').style.display = 'none'; // Hide loading spinner
  }
});

// New function to display service and rankings
function displayServiceAndRankings(service, rankings) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    <h2>Service: ${service}</h2>
    <h3>Top Websites:</h3>
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

// Add event listener for the search form
document.getElementById('search-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const brand = document.getElementById('search-input').value.trim();

  if (!brand) {
    toastr.error('Please enter a brand or domain.');
    return;
  }

  document.getElementById('loading').style.display = 'block';  // Show loading spinner

  try {
    const response = await fetchWithAuth('/api/determine-service', {
      method: 'POST',
      body: JSON.stringify({ brand }),
    });

    const data = await response.json();

    if (response.ok) {
      // Display the rankings in a table
      const rankingsTable = document.getElementById('rankings-table');
      rankingsTable.innerHTML = '';

      data.rankings.forEach((rank, index) => {
        const row = rankingsTable.insertRow();
        const cellRank = row.insertCell(0);
        const cellBrand = row.insertCell(1);

        cellRank.textContent = index + 1;
        cellBrand.textContent = rank;
      });
    } else {
      toastr.error(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error:', error);
    toastr.error('An unexpected error occurred.');
  } finally {
    document.getElementById('loading').style.display = 'none';  // Hide loading spinner
  }
});

// Add a new function to display the ranking table
function displayRankingTable(rankings) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '<h2>Ranking Results:</h2>';
  
  let tableHTML = '<table class="table"><thead><tr><th>Rank</th><th>Brand</th></tr></thead><tbody>';
  
  rankings.forEach((brand, index) => {
    tableHTML += `<tr><td>${index + 1}</td><td>${brand}</td></tr>`;
  });
  
  tableHTML += '</tbody></table>';
  
  resultDiv.innerHTML += tableHTML;
}

// Modify fetchUserHistory to handle non-JSON responses
async function fetchUserHistory() {
  try {
    const response = await fetchWithAuth('/api/get-history');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching history:', errorText);
      toastr.error('Failed to fetch history.');
      return;
    }

    const historyData = await response.json();
    console.log('History data received:', historyData);
    renderHistoryChart(historyData);
  } catch (error) {
    console.error('Error fetching history:', error);
    toastr.error('An unexpected error occurred while fetching history.');
  }
}

// Update renderHistoryChart to display ranking history
function renderHistoryChart(historyData) {
  const ctx = document.getElementById('historyChart').getContext('2d');

  // Prepare data for the chart
  const labels = historyData.map(entry => new Date(entry.date).toLocaleDateString());
  const datasets = [];

  // Assuming each entry contains rankings
  const brands = [...new Set(historyData.flatMap(entry => entry.rankings))];

  brands.forEach((brand, index) => {
    const data = historyData.map(entry => {
      const rank = entry.rankings.indexOf(brand);
      return rank !== -1 ? rank + 1 : null; // Rank positions start from 1
    });

    datasets.push({
      label: brand,
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

// Remove or comment out functions related to sentiment analysis and comparative charts
// For example, remove displayComparativeAnalysis, renderBrandMentionsChart, etc.

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