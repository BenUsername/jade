window.sentimentChart = null;

let authToken = null;

// Toastr configuration
toastr.options = {
  closeButton: true,
  progressBar: true,
  positionClass: "toast-top-right",
  timeOut: 5000
};

// Registration
document.getElementById('register-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  document.getElementById('loading').style.display = 'block';  // Show loading spinner

  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value.trim();

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (response.ok) {
      toastr.success('Registration successful! Please log in.');
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

  const MAX_BRANDS = 3; // Set a limit to the number of brands
  if (brands.length > MAX_BRANDS) {
    toastr.error(`Please enter no more than ${MAX_BRANDS} brands at a time.`);
    return;
  }

  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '';  // Clear previous results
  document.getElementById('loading').style.display = 'block';  // Show loading spinner

  try {
    const analyses = [];

    // Fetch analyses for all brands concurrently
    const fetchPromises = brands.map((brand) =>
      fetch('/api/query-llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ brand }),
      }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(`${data.error}\n${data.details || ''}`);
        }
        return data;
      })
    );

    const results = await Promise.all(fetchPromises);

    for (let i = 0; i < results.length; i++) {
      const data = results[i];
      if (data.analysis) {
        analyses.push({ brand: brands[i], analysis: data.analysis });
      } else {
        toastr.error(`Error analyzing ${brands[i]}: ${data.error}\n${data.details || ''}`);
        return;
      }
    }

    // Display comparative analysis
    displayComparativeAnalysis(analyses);

    // Fetch and display history for each brand
    for (const brand of brands) {
      fetchHistory(brand);
    }
  } catch (error) {
    console.error('Error:', error);
    toastr.error(`An unexpected error occurred during analysis: ${error.message}`);
    resultDiv.innerHTML = '<p>An unexpected error occurred.</p>';
  } finally {
    document.getElementById('loading').style.display = 'none';  // Hide loading spinner
  }
});

// Fetch History Function (add Authorization header)
const fetchHistory = async (brand) => {
  document.getElementById('loading').style.display = 'block';  // Show loading spinner

  try {
    const response = await fetch(`/api/get-history?brand=${encodeURIComponent(brand)}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const data = await response.json();

    if (response.ok) {
      displayHistory(data.analyses);
    } else {
      if (response.status === 401) {
        toastr.error('Session expired. Please log in again.');
        authToken = null;
        document.getElementById('registration-form').style.display = 'block';
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('brand-analysis').style.display = 'none';
        document.getElementById('logout-button').style.display = 'none';
      } else {
        toastr.error(`Error fetching history: ${data.error}\n${data.details || ''}`);
        console.error('Error fetching history:', data.error, data.details);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    toastr.error(`An unexpected error occurred while fetching history: ${error.message}`);
  } finally {
    document.getElementById('loading').style.display = 'none';  // Hide loading spinner
  }
};

const displayHistory = (analyses) => {
  const historyDiv = document.getElementById('history');
  historyDiv.innerHTML = '<h2>Historical Analyses:</h2>';
  analyses.forEach((item) => {
    const date = new Date(item.date).toLocaleString();
    const analysis = item.analysis;
    const analysisHTML = `
      <div class="history-item">
        <h3>${date}</h3>
        <p>${JSON.stringify(analysis)}</p>
      </div>
    `;
    historyDiv.innerHTML += analysisHTML;
  });
};

function displayComparativeAnalysis(analyses) {
  const resultDiv = document.getElementById('result');
  // Build HTML content
  let resultHTML = '<h2>Comparative Analysis:</h2>';

  analyses.forEach(({ brand, analysis }) => {
    resultHTML += `<h3>Analysis of "${brand}":</h3>`;
    for (const aspect in analysis) {
      const aspectData = analysis[aspect];
      const aspectTitle = aspect.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      resultHTML += `
        <p><strong>${aspectTitle} Score:</strong> ${aspectData.score}</p>
        <p>${aspectData.explanation}</p>
      `;
    }
  });

  resultDiv.innerHTML = resultHTML;

  // Prepare data for the charts
  const labels = Object.keys(analyses[0].analysis).map((aspect) =>
    aspect.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  );

  const datasets = analyses.map(({ brand, analysis }, index) => {
    const data = Object.values(analysis).map((aspectData) => parseFloat(aspectData.score));
    const color = getColor(index, '0.2');
    return {
      label: brand,
      data: data,
      fill: true,
      backgroundColor: color,
      borderColor: color.replace('0.2', '1'),
      pointBackgroundColor: color.replace('0.2', '1'),
    };
  });

  // Render the comparative radar chart
  renderComparativeChart(labels, datasets);

  // Render the comparison bar chart
  renderComparisonBarChart(labels, datasets);
}

function renderComparativeChart(labels, datasets) {
  const ctx = document.getElementById('sentimentChart').getContext('2d');

  // Destroy existing chart instance if it exists
  if (window.sentimentChart) {
    window.sentimentChart.destroy();
  }

  window.sentimentChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      scales: {
        r: {
          min: -1,
          max: 1,
          ticks: {
            stepSize: 0.5,
          },
        },
      },
      plugins: {
        tooltip: {
          enabled: true,
        },
        legend: {
          display: true,
          onClick: (e, legendItem, legend) => {
            const index = legendItem.datasetIndex;
            const ci = legend.chart;
            const meta = ci.getDatasetMeta(index);

            // Toggle the visibility
            meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
            ci.update();
          },
        },
      },
    },
  });
}

function renderComparisonBarChart(labels, datasets) {
  const ctx = document.getElementById('comparisonChart').getContext('2d');

  // Prepare data
  const data = {
    labels: labels,
    datasets: datasets.map((dataset) => ({
      label: dataset.label,
      data: dataset.data,
      backgroundColor: dataset.backgroundColor,
    })),
  };

  // Destroy existing chart instance if it exists
  if (window.comparisonChart) {
    window.comparisonChart.destroy();
  }

  window.comparisonChart = new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {
      scales: {
        y: {
          min: -1,
          max: 1,
          ticks: {
            stepSize: 0.5,
          },
        },
      },
      plugins: {
        tooltip: {
          enabled: true,
        },
      },
    },
  });
}

function getColor(index, opacity) {
  const colorPalette = [
    'rgba(255, 99, 132, OPACITY)',
    'rgba(54, 162, 235, OPACITY)',
    'rgba(255, 206, 86, OPACITY)',
    'rgba(75, 192, 192, OPACITY)',
    'rgba(153, 102, 255, OPACITY)',
    'rgba(255, 159, 64, OPACITY)',
  ];
  return colorPalette[index % colorPalette.length].replace('OPACITY', opacity);
}
