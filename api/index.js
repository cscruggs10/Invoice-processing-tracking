// Vercel serverless function handler
export default async function handler(req, res) {
  // Lazy load the Express app
  const { default: app } = await import('../dist/index.js');
  
  // Handle the request with Express
  return new Promise((resolve, reject) => {
    app(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}