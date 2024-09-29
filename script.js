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
  if (!domain) return;

  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = ''; // Clear previous results
  document.getElementById('loading').style.display = 'block'; // Show loading spinner

  try {
    // Call the API endpoint
    const response = await fetchWithAuth('/api/query-llm', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Handle unauthorized error
        localStorage.removeItem('authToken');
        window.location.reload(); // Reload the page to show login form
        return;
      }
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const data = await response.json();

    // Display the service and rankings
    displayServiceAndRankings(data.domain, data.service, data.rankings);

    // Fetch and display history for this domain
    await fetchDomainHistory(data.domain);

  } catch (error) {
    console.error('Error:', error);
    toastr.error(`An unexpected error occurred: ${error.message}`);
    resultDiv.innerHTML = '<p>An unexpected error occurred.</p>';
  } finally {
    document.getElementById('loading').style.display = 'none'; // Hide loading spinner
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