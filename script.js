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
        resultDiv.innerHTML = `<h2>Analysis of "${brand}":</h2><p>${data.analysis}</p>`;
      } else {
        resultDiv.innerHTML = `<p>Error: ${data.error}</p>`;
      }
    } catch (error) {
      console.error('Error:', error);
      resultDiv.innerHTML = '<p>An unexpected error occurred.</p>';
    }
  });
  