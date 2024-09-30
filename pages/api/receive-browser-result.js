import { receiveBrowserResult } from '../../api/query-llm';

export default async function handler(req, res) {
  return receiveBrowserResult(req, res);
}