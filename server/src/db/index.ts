import { Pool } from 'pg';
import { TokenData } from '../types/token';

interface TokenRow {
    address: string;
    name: string;
    symbol: string;
    current_price: number;
    price_change_24h: number;
    volume_24h: number;
    market_cap: number;
    fdv: number;
    liquidity: number;
    holder_count: number;
    total_score: number;
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

export interface ScanRecord {
    id: number;
    scan_date: Date;
    scan_type: 'daily' | 'test';
    status: 'completed' | 'failed';
}

export class Database {
    async createScan(type: 'daily' | 'test'): Promise<number> {
        const result = await pool.query(
            'INSERT INTO scans (scan_type, status) VALUES ($1, $2) RETURNING id',
            [type, 'completed']
        );
        return result.rows[0].id;
    }

    async saveTokens(scanId: number, tokens: TokenData[]): Promise<void> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                await client.query(
                    `INSERT INTO tokens (
                        scan_id, address, name, symbol, current_price,
                        price_change_24h, volume_24h, market_cap, fdv,
                        liquidity, holder_count, total_score, rank
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                    [
                        scanId, token.address, token.name, token.symbol,
                        token.currentPrice, token.priceChange24h, token.volume24h,
                        token.marketCap, token.fdv, token.liquidity,
                        token.holderCount, token.totalScore, i + 1
                    ]
                );
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getLatestScan(): Promise<ScanRecord | null> {
        const result = await pool.query(
            'SELECT * FROM scans ORDER BY scan_date DESC LIMIT 1'
        );
        return result.rows[0] || null;
    }

    async getTokensByScanId(scanId: number): Promise<TokenData[]> {
        const result = await pool.query<TokenRow>(
            'SELECT * FROM tokens WHERE scan_id = $1 ORDER BY rank',
            [scanId]
        );
        return result.rows.map((row: TokenRow) => ({
            address: row.address,
            name: row.name,
            symbol: row.symbol,
            currentPrice: row.current_price,
            priceChange24h: row.price_change_24h,
            volume24h: row.volume_24h,
            marketCap: row.market_cap,
            fdv: row.fdv,
            liquidity: row.liquidity,
            holderCount: row.holder_count,
            totalScore: row.total_score,
            volume: row.volume_24h,
            socialScore: 0
        }));
    }
}

export const db = new Database(); 