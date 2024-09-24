window.sentimentChart = null;

let authToken = null;

// Registration
document.getElementById('register-form').addEventListener('submit', async function (e) {
  e.preventDefault();

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
      alert('Registration successful! Please log in.');
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An unexpected error occurred during registration.');
  }
});

// Login
document.getElementById('login-form-element').addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (response.ok) {
      authToken = data.token;
      document.getElementById('registration-form').style.display = 'none';
      document.getElementById('login-form').style.display = 'none';
      document.getElementById('brand-analysis').style.display = 'block';
      document.getElementById('logout-button').style.display = 'block';
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An unexpected error occurred during login.');
  }
});

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
    alert('Please enter at least one brand name.');
    return;
  }

  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = 'Analyzing...';

  try {
    const analyses = await Promise.all(
      brands.map(async (brand) => {
        const response = await fetch('/api/query-llm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ brand }),
        });

        const data = await response.json();
        if (response.ok) {
          return { brand, analysis: data.analysis };
        } else {
          throw new Error(data.error);
        }
      })
    );

    // After fetching analyses, call the appropriate function to render the chart
    if (brands.length === 1) {
      // Single brand analysis
      const analysisData = analyses[0].analysis;
      const labels = Object.keys(analysisData).map((aspect) =>
        aspect.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
      );
      const data = Object.values(analysisData).map((item) => parseFloat(item.score));

      renderSentimentChart(labels, data);
    } else {
      // Comparative analysis
      displayComparativeAnalysis(analyses);
    }

    // Fetch and display history for each brand
    for (const brand of brands) {
      fetchHistory(brand);
    }
  } catch (error) {
    console.error('Error:', error);
    resultDiv.innerHTML = '<p>An unexpected error occurred.</p>';
  }
});

// Fetch History Function (add Authorization header)
const fetchHistory = async (brand) => {
  try {
    const response = await fetch(`/api/get-history?brand=${encodeURIComponent(brand)}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const data = await response.json();

    if (response.ok) {
      displayHistory(data.analyses);
    } else {
      if (response.status === 401) {
        alert('Session expired. Please log in again.');
        authToken = null;
        document.getElementById('registration-form').style.display = 'block';
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('brand-analysis').style.display = 'none';
        document.getElementById('logout-button').style.display = 'none';
      } else {
        console.error('Error fetching history:', data.error);
      }
    }
  } catch (error) {
    console.error('Error:', error);
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

function renderSentimentChart(labels, data) {
  const ctx = document.getElementById('sentimentChart').getContext('2d');

  // Log the current value of window.sentimentChart
  console.log('window.sentimentChart before destroy:', window.sentimentChart);

  // Destroy existing chart instance if it exists
  if (window.sentimentChart && typeof window.sentimentChart.destroy === 'function') {
    window.sentimentChart.destroy();
  }

  window.sentimentChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Sentiment Scores',
          data: data,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        },
      ],
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
    },
  });
}

function displayComparativeAnalysis(analyses) {
  const labels = Object.keys(analyses[0].analysis).map((aspect) =>
    aspect.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  );

  const datasets = analyses.map((item) => ({
    label: item.brand,
    data: Object.values(item.analysis).map((aspect) => parseFloat(aspect.score)),
    backgroundColor: 'rgba(54, 162, 235, 0.2)',
    borderColor: 'rgba(54, 162, 235, 1)',
    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
  }));

  const ctx = document.getElementById('sentimentChart').getContext('2d');

  // Log the current value of window.sentimentChart
  console.log('window.sentimentChart before destroy:', window.sentimentChart);

  // Destroy existing chart instance if it exists
  if (window.sentimentChart && typeof window.sentimentChart.destroy === 'function') {
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
    },
  });
}
