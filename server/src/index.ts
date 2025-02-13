import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Connection } from '@solana/web3.js';
import { AppError, TokenScanError } from './types/errors';
import TokenScanner from './services/tokenScanner';
import { LiquidityProvider } from './types/api';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const HELIUS_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
const connection = new Connection(HELIUS_URL);
const tokenScanner = new TokenScanner(LiquidityProvider.MORALIS);

app.post('/api/admin/test-scan', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const results = await scanMemeTokens();
        res.json(results);
    } catch (error) {
        next(error);
    }
});

app.post('/api/scan', async (_req: Request, res: Response, next: NextFunction) => {
    res.status(501).json({ message: 'Production scan not yet implemented' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message
        });
    }

    // Handle unexpected errors
    return res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred'
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

async function scanMemeTokens() {
    try {
        return await tokenScanner.scanRecentTokens();
    } catch (error) {
        throw new TokenScanError(`Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
} 