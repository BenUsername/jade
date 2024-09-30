import { testComparison } from '../../api/query-llm';

export default async function handler(req, res) {
  return testComparison(req, res);
}