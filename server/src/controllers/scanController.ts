import { Request, Response, NextFunction } from 'express';
import { ScanService } from '../services/scanService';
import { TokenService } from '../services/tokenService';

export class ScanController {
    constructor(
        private scanService: ScanService,
        private tokenService: TokenService
    ) {}

    createTestScan = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const scanId = await this.scanService.createScan('test');
            const results = await this.tokenService.scanRecentTokens();
            await this.scanService.saveTokens(scanId, results);
            res.json(results);
        } catch (error) {
            next(error);
        }
    };

    getScans = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const scans = await this.scanService.getScans();
            res.json(scans);
        } catch (error) {
            next(error);
        }
    };

    getScanTokens = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tokens = await this.scanService.getScanTokens(parseInt(req.params.scanId));
            res.json(tokens);
        } catch (error) {
            next(error);
        }
    };

    clearTestScans = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.scanService.clearTestScans();
            res.json({ message: 'Test scans cleared successfully' });
        } catch (error) {
            next(error);
        }
    };

    // ... other controller methods
} 