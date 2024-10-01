import jwt from 'jsonwebtoken';

export default function authenticate(handler) {
  return async (req, res) => {
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}