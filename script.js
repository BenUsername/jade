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

// Brand Analysis Form Submission
document.getElementById('brand-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const brandInput = document.getElementById('brand-input').value.trim();
  if (!brandInput) return;

  const brands = brandInput.split(',').map((b) => b.trim()).filter((b) => b);

  if (brands.length === 0) {
    toastr.error('Please enter at least one brand name.');
    return;
  }

  const MAX_BRANDS = 5; // Adjust as needed
  if (brands.length > MAX_BRANDS) {
    toastr.error(`Please enter no more than ${MAX_BRANDS} brands at a time.`);
    return;
  }

  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = ''; // Clear previous results
  document.getElementById('loading').style.display = 'block'; // Show loading spinner

  try {
    const response = await fetch('/api/query-llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ brands }),
    });

    const data = await response.json();
    if (response.ok) {
      // Display comparative analysis
      displayComparativeAnalysis(data.analyses);
      // Fetch and display user history
      fetchUserHistory();
    } else {
      toastr.error(`Error: ${data.error}`);
      console.log('Analysis error:', data.error);
    }
  } catch (error) {
    console.error('Error:', error);
    toastr.error(`An unexpected error occurred during analysis: ${error.message}`);
    resultDiv.innerHTML = '<p>An unexpected error occurred.</p>';
  } finally {
    document.getElementById('loading').style.display = 'none'; // Hide loading spinner
  }
});

// Rename fetchHistory to fetchUserHistory
const fetchUserHistory = async () => {
  document.getElementById('loading').style.display = 'block';  // Show loading spinner

  try {
    const response = await fetch('/api/history', {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const data = await response.json();

    console.log('Raw response from /api/history:', data);

    if (response.ok) {
      if (Array.isArray(data.history)) {
        console.log('History data received:', data.history);
        displayUserHistory(data.history);
      } else {
        console.error('Unexpected history data structure:', data);
        toastr.error('Received unexpected data structure from server.');
      }
    } else {
      if (response.status === 401) {
        toastr.error('Session expired. Please log in again.');
        authToken = null;
        document.getElementById('registration-form').style.display = 'block';
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('brand-analysis').style.display = 'none';
        document.getElementById('logout-button').style.display = 'none';
      } else {
        toastr.error(`Error fetching history: ${data.error}`);
        console.error('Error fetching history:', data.error);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    toastr.error(`An unexpected error occurred while fetching history: ${error.message}`);
  } finally {
    document.getElementById('loading').style.display = 'none';  // Hide loading spinner
  }
};

// New displayUserHistory function
function displayUserHistory(history) {
  try {
    console.log('Received history data:', history);

    const historySection = document.getElementById('history-section');
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = ''; // Clear previous history

    if (!history || history.length === 0) {
      historyList.innerHTML = '<p>No history available.</p>';
      return;
    }

    historySection.style.display = 'block'; // Ensure the section is visible

    history.forEach((entry) => {
      console.log('Processing history entry:', entry);

      const date = new Date(entry.date).toLocaleString();
      let brands;

      if (Array.isArray(entry.brands)) {
        brands = entry.brands.join(', ');
      } else if (typeof entry.brand === 'string') {
        brands = entry.brand;
      } else {
        brands = 'Unknown Brand';
        console.warn('Unexpected brand data structure:', entry.brand || entry.brands);
      }

      const entryElement = document.createElement('div');
      entryElement.className = 'history-entry';
      entryElement.innerHTML = `
        <h4>${date}</h4>
        <p><strong>Brands:</strong> ${brands}</p>
        <p><strong>Analysis:</strong></p>
        <pre>${JSON.stringify(entry.analysis, null, 2)}</pre>
      `;
      historyList.appendChild(entryElement);
    });

    // Render the history chart
    renderHistoryChart(history);
  } catch (error) {
    console.error('Error displaying history:', error);
    toastr.error('An error occurred while displaying history.');
  }
}

function displayComparativeAnalysis(analysesData) {
  const resultDiv = document.getElementById('result');
  // Build HTML content
  let resultHTML = '<h2>Comparative Analysis:</h2>';

  analysesData.forEach((analysis) => {
    resultHTML += `<div class="mb-4">
      <h3>${analysis.brand} (${analysis.industry})</h3>
      <p><strong>Analysis:</strong></p>
      <p>${analysis.analysis}</p>
    </div>`;
  });

  resultDiv.innerHTML = resultHTML;

  // Prepare data for the chart
  const labels = analysesData.map(analysis => analysis.brand);
  const dataValues = analysesData.map(analysis => {
    // Here you might want to implement a sentiment scoring function
    // For now, we'll use a random score between -1 and 1
    return Math.random() * 2 - 1;
  });

  // Render the comparison bar chart
  renderBrandMentionsChart(labels, dataValues);
}

function renderBrandMentionsChart(labels, dataValues) {
  const ctx = document.getElementById('comparisonChart').getContext('2d');

  // Destroy existing chart instance if it exists
  if (window.comparisonChart instanceof Chart) {
    window.comparisonChart.destroy();
  }

  window.comparisonChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Brand Sentiment',
        data: dataValues,
        backgroundColor: labels.map((_, index) => getColor(index, '0.6')),
        borderColor: labels.map((_, index) => getColor(index, '1')),
        borderWidth: 1,
      }],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          min: -1,
          max: 1,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
        },
      },
    },
  });
}

function renderHistoryChart(history) {
  const ctx = document.getElementById('historyChart').getContext('2d');

  // Prepare data for the chart
  const labels = history.map((entry) => new Date(entry.date).toLocaleDateString());
  const datasets = []; // Build datasets based on the analyses

  // Assuming each entry contains scores for various aspects
  const aspects = Object.keys(history[0].analysis);
  aspects.forEach((aspect, index) => {
    const data = history.map((entry) => entry.analysis[aspect].score);
    datasets.push({
      label: aspect.replace('_', ' ').toUpperCase(),
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
          beginAtZero: true,
          min: -1,
          max: 1,
          ticks: {
            stepSize: 0.5,
          },
        },
      },
    },
  });
}
