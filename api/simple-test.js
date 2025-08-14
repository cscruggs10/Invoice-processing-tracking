export default function handler(req, res) {
  res.status(200).json({ 
    message: 'Simple API works!',
    method: req.method,
    timestamp: new Date().toISOString()
  });
}