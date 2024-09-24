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
      } else {
        resultDiv.innerHTML = `<p>Error: ${data.error}</p>`;
      }
    } catch (error) {
      console.error('Error:', error);
      resultDiv.innerHTML = '<p>An unexpected error occurred.</p>';
    }
  });
