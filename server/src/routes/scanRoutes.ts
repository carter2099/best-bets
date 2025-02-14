import { Router } from 'express';
import { ScanController } from '../controllers/scanController';

export function createScanRoutes(scanController: ScanController): Router {
    const router = Router();

    router.post('/test-scan', scanController.createTestScan);
    router.get('/scans', scanController.getScans);
    router.get('/scans/:scanId/tokens', scanController.getScanTokens);
    router.delete('/scans/test', scanController.clearTestScans);

    return router;
} 