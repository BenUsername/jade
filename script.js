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

  const brandInput = document.getElementById('brand-input').value.trim();
  if (!brandInput) return;

  // We only need one brand or domain now
  const brand = brandInput;

  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = ''; // Clear previous results
  document.getElementById('loading').style.display = 'block'; // Show loading spinner

  try {
    // Step 2: Determine the service provided by the brand
    const serviceResponse = await fetch('/api/determine-service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ brand }),
    });

    const serviceData = await serviceResponse.json();

    if (!serviceResponse.ok) {
      toastr.error(`Error determining service: ${serviceData.error}`);
      console.log('Service error:', serviceData.error);
      return;
    }

    const service = serviceData.service;

    // Step 3: Get the best brands for that service
    const rankingResponse = await fetch('/api/get-best-brands', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ service }),
    });

    const rankingData = await rankingResponse.json();

    if (!rankingResponse.ok) {
      toastr.error(`Error getting rankings: ${rankingData.error}`);
      console.log('Ranking error:', rankingData.error);
      return;
    }

    // Step 4 & 5: Display the rankings and save to database
    displayRankingTable(rankingData.rankings);

    // Fetch and display history
    fetchUserHistory();

  } catch (error) {
    console.error('Error:', error);
    toastr.error(`An unexpected error occurred: ${error.message}`);
    resultDiv.innerHTML = '<p>An unexpected error occurred.</p>';
  } finally {
    document.getElementById('loading').style.display = 'none'; // Hide loading spinner
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

// Modify fetchUserHistory to display rankings history in a chart
async function fetchUserHistory() {
  try {
    const response = await fetch('/api/get-history', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    const historyData = await response.json();

    if (response.ok) {
      console.log('History data received:', historyData);
      renderHistoryChart(historyData);
    } else {
      console.error('Error fetching history:', historyData.error);
    }
  } catch (error) {
    console.error('Error fetching history:', error);
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
  fetchUserHistory();
});