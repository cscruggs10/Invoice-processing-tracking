import { storage } from '../dist/storage.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const invoices = await storage.getInvoices();
      return res.status(200).json(invoices);
    }

    if (req.method === 'POST') {
      const invoice = await storage.createInvoice(req.body);
      return res.status(201).json(invoice);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Invoices API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
}