import express, { Request, Response } from 'express';
import cors from 'cors';
import { Connection } from '@solana/web3.js';
import axios from 'axios';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const HELIUS_URL = 'https://mainnet.helius-rpc.com/?api-key=b68aa492-c795-4c51-ba9f-70eb323cbf34';
const connection = new Connection(HELIUS_URL);

app.post('/api/scan', async (_req: Request, res: Response) => {
    try {
        const results = await scanMemeTokens();
        res.json(results);
    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ error: 'Scan failed' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

async function scanMemeTokens(): Promise<any[]> {
    // Placeholder for scanning logic
    return [];
} 