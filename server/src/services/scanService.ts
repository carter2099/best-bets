import { TokenData } from '../types/token';
import { db, ScanRecord } from '../db';

export class ScanService {
    async createScan(type: 'daily' | 'test'): Promise<number> {
        return await db.createScan(type);
    }

    async saveTokens(scanId: number, tokens: TokenData[]): Promise<void> {
        await db.saveTokens(scanId, tokens);
    }

    async getScans(): Promise<ScanRecord[]> {
        return await db.getScans();
    }

    async getScanTokens(scanId: number): Promise<TokenData[]> {
        return await db.getTokensByScanId(scanId);
    }

    async clearTestScans(): Promise<void> {
        await db.clearTestScans();
    }
} 