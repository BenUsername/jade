// script.js
document.getElementById('brand-form').addEventListener('submit', async function(e) {
    e.preventDefault();
  
    const brand = document.getElementById('brand-input').value.trim();
    if (!brand) return;
  
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = 'Analyzing...';
  
    try {
      const response = await fetch('/api/query-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand }),
      });
  
      const data = await response.json();
      if (response.ok) {
        const analysisData = data.analysis;

        // Build HTML content
        const resultHTML = `
          <h2>Analysis of "${brand}":</h2>
          <h3>Mention Frequency</h3>
          <p>${analysisData.mention_frequency}</p>
          <h3>Contextual Relevance</h3>
          <p>${analysisData.contextual_relevance}</p>
          <h3>Sentiment</h3>
          <p>${analysisData.sentiment}</p>
          <h3>Associations</h3>
          <p>${analysisData.associations}</p>
        `;

        resultDiv.innerHTML = resultHTML;

        // Parse sentiment score
        const sentimentScore = parseFloat(analysisData.sentiment);

        // Prepare data for the chart
        const ctx = document.getElementById('sentimentChart').getContext('2d');

        // Create a chart
        const sentimentChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Sentiment Score'],
            datasets: [
              {
                label: 'Sentiment',
                data: [sentimentScore],
                backgroundColor: sentimentScore >= 0 ? 'green' : 'red',
              },
            ],
          },
          options: {
            scales: {
              y: {
                min: -1,
                max: 1,
              },
            },
          },
        });

        // Fetch and display history
        fetchHistory(brand);
      } else {
        resultDiv.innerHTML = `<p>Error: ${data.error}</p>`;
      }
    } catch (error) {
      console.error('Error:', error);
      resultDiv.innerHTML = '<p>An unexpected error occurred.</p>';
    }
  });

const fetchHistory = async (brand) => {
  try {
    const response = await fetch(`/api/get-history?brand=${encodeURIComponent(brand)}`);
    const data = await response.json();

    if (response.ok) {
      displayHistory(data.analyses);
    } else {
      console.error('Error fetching history:', data.error);
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
