// script.js
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

  const brand = document.getElementById('brand-input').value.trim();
  if (!brand) return;

  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = 'Analyzing...';

  try {
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
      const analysisData = data.analysis;

      // Build HTML content
      let resultHTML = `<h2>Analysis of "${brand}":</h2>`;

      for (const aspect in analysisData) {
        const aspectData = analysisData[aspect];
        const aspectTitle = aspect.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        resultHTML += `
          <h3>${aspectTitle}</h3>
          <p><strong>Score:</strong> ${aspectData.score}</p>
          <p>${aspectData.explanation}</p>
        `;
      }

      resultDiv.innerHTML = resultHTML;

      // Visualize the sentiment scores
      const sentimentScores = Object.values(analysisData).map((item) => parseFloat(item.score));
      const labels = Object.keys(analysisData).map((aspect) =>
        aspect.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
      );

      // Render the chart
      renderSentimentChart(labels, sentimentScores);

      // Fetch and display history
      fetchHistory(brand);
    } else {
      if (response.status === 401) {
        alert('Session expired. Please log in again.');
        authToken = null;
        document.getElementById('registration-form').style.display = 'block';
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('brand-analysis').style.display = 'none';
        document.getElementById('logout-button').style.display = 'none';
      } else {
        resultDiv.innerHTML = `<p>Error: ${data.error}</p>`;
      }
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

  // Destroy existing chart instance if it exists
  if (window.sentimentChart) {
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
