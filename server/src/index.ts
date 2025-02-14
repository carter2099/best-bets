import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Connection } from '@solana/web3.js';
import { AppError, TokenScanError } from './types/errors';
import TokenScanner from './services/tokenScanner';
import { LiquidityProvider } from './types/api';
import dotenv from 'dotenv';
import { db } from './db';
import { BackgroundJobService } from './services/backgroundJobs';
import { JupiterStationAPI } from './services/jupiterStationAPI';
import { TokenAnalyzer } from './services/tokenAnalyzer';

dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const HELIUS_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
const connection = new Connection(HELIUS_URL);
const tokenScanner = new TokenScanner(LiquidityProvider.MORALIS);

// Initialize background services
const jupiterAPI = new JupiterStationAPI(process.env.JUPITER_API_KEY || '');
const tokenAnalyzer = new TokenAnalyzer(LiquidityProvider.MORALIS);
const backgroundJobs = new BackgroundJobService(db.pool, jupiterAPI, tokenAnalyzer);

// Start background jobs when server starts
backgroundJobs.start().catch(error => {
    console.error('Failed to start background jobs:', error);
});

// Endpoint to get top tokens
app.get('/api/top-tokens', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const topTokens = await db.query(`
            SELECT 
                address,
                name,
                symbol,
                COALESCE(current_price, 0) as current_price,
                COALESCE(price_change_24h, 0) as price_change_24h,
                COALESCE(volume_24h, 0) as volume_24h,
                COALESCE(market_cap, 0) as market_cap,
                COALESCE(fdv, 0) as fdv,
                COALESCE(liquidity, 0) as liquidity,
                COALESCE(holder_count, 0) as holder_count,
                COALESCE(total_score, 0) as total_score
            FROM tokens 
            WHERE rank IS NOT NULL 
            ORDER BY rank ASC`
        );

        // Convert decimal strings to numbers in the response
        const formattedTokens = topTokens.rows.map(token => ({
            name: token.name,
            symbol: token.symbol,
            address: token.address,
            currentPrice: parseFloat(token.current_price),
            priceChange24h: parseFloat(token.price_change_24h),
            volume24h: parseFloat(token.volume_24h),
            marketCap: parseFloat(token.market_cap),
            fdv: parseFloat(token.fdv),
            liquidity: parseFloat(token.liquidity),
            holderCount: parseInt(token.holder_count),
            totalScore: parseFloat(token.total_score)
        }));

        res.json(formattedTokens);
    } catch (error) {
        next(error);
    }
});

app.post('/api/dev/test-scan', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        // Create scan record
        const scanId = await db.createScan('test');
        
        // Run the scan
        const results = await scanMemeTokens();
        
        // Save results
        await db.saveTokens(scanId, results);
        
        res.json(results);
    } catch (error) {
        next(error);
    }
});

app.post('/api/scan', async (_req: Request, res: Response, next: NextFunction) => {
    res.status(501).json({ message: 'Production scan not yet implemented' });
});

// Add new endpoint to get scan history
app.get('/api/dev/scans', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const scans = await db.getScans();
        console.log('Fetched scans:', scans);
        res.json(scans);
    } catch (error) {
        console.error('Error fetching scans:', error);
        next(error);
    }
});

// Add endpoint to get tokens for a specific scan
app.get('/api/dev/scans/:scanId/tokens', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tokens = await db.getTokensByScanId(parseInt(req.params.scanId));
        res.json(tokens);
    } catch (error) {
        next(error);
    }
});

// Add endpoint to clear test scans
app.delete('/api/dev/scans/test', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        await db.clearTestScans();
        res.json({ message: 'Test scans cleared successfully' });
    } catch (error) {
        next(error);
    }
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    
    if (err instanceof AppError || err instanceof TokenScanError) {
        res.status(err.statusCode).json({
            message: err.message
        });
    } else {
        res.status(500).json({
            message: 'An unexpected error occurred'
        });
    }
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Stopping background jobs...');
    backgroundJobs.stop();
    process.exit(0);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

async function scanMemeTokens() {
    try {
        return await tokenScanner.scanRecentTokens();
    } catch (error) {
        throw new TokenScanError(`Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
} 