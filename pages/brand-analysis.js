import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import BrandRankingChart from '../components/BrandRankingChart';

const BrandAnalysisPage = () => {
  const router = useRouter();
  const { brand, industry } = router.query;
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!brand || !industry) return;

      try {
        setLoading(true);
        const response = await axios.get('/api/get-analysis', {
          params: { brand, industry }
        });
        setAnalysis(response.data.analysis);
      } catch (err) {
        console.error('Error fetching analysis:', err);
        setError('Failed to fetch analysis. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [brand, industry]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!analysis) return <div>No analysis found for this brand and industry.</div>;

  return (
    <div>
      <h1>Analysis for {brand}</h1>
      <p>{analysis}</p>
      
      <BrandRankingChart industry={industry} brand={brand} />
    </div>
  );
};

export default BrandAnalysisPage;