import React, { useState, useEffect } from 'react';
import TokenList from './TokenList';
import ScanButton from './ScanButton';
import { Token } from '../types';
import { APIError, isAPIError } from '../types/errors';

interface Scan {
    id: number;
    scan_date: string;
    scan_type: 'daily' | 'test';
    status: 'completed' | 'failed';
}

function AdminPanel() {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [scans, setScans] = useState<Scan[]>([]);
    const [selectedScanId, setSelectedScanId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isClearing, setIsClearing] = useState(false);

    // Fetch scan history
    useEffect(() => {
        fetchScans();
    }, []);

    const fetchScans = async () => {
        try {
            console.log('Fetching scans...');
            const response = await fetch('http://localhost:3001/api/admin/scans');
            const data = await response.json();
            console.log('Received scans:', data);
            setScans(data);
        } catch (error) {
            console.error('Failed to fetch scans:', error);
        }
    };

    const handleTestScan = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:3001/api/admin/test-scan', {
                method: 'POST'
            });

            const data = await response.json();

            if (!response.ok) {
                if (isAPIError(data)) {
                    throw new Error(data.message);
                }
                throw new Error('Failed to scan tokens');
            }

            setTokens(data);
            // Refresh scan history after new scan
            fetchScans();
        } catch (error) {
            console.error('Test scan failed:', error);
            setError(error instanceof Error ? error.message : 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleScanSelect = async (scanId: number) => {
        try {
            const response = await fetch(`http://localhost:3001/api/admin/scans/${scanId}/tokens`);
            const data = await response.json();
            setTokens(data);
            setSelectedScanId(scanId);
        } catch (error) {
            console.error('Failed to fetch scan tokens:', error);
        }
    };

    const handleClearTestScans = async () => {
        if (!window.confirm('Are you sure you want to clear all test scans?')) {
            return;
        }

        setIsClearing(true);
        try {
            const response = await fetch('http://localhost:3001/api/admin/scans/test', {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to clear test scans');
            }

            // Clear local state
            setTokens([]);
            setSelectedScanId(null);
            await fetchScans(); // Refresh scan list
        } catch (error) {
            console.error('Failed to clear test scans:', error);
            setError(error instanceof Error ? error.message : 'Failed to clear test scans');
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <div className="admin-panel">
            <h2>Admin Panel</h2>
            <div className="admin-controls">
                <div className="scan-controls">
                    <div className="button-group">
                        <ScanButton 
                            onClick={handleTestScan} 
                            isLoading={isLoading} 
                            text="Run Test Scan" 
                        />
                        <button
                            className="clear-button"
                            onClick={handleClearTestScans}
                            disabled={isClearing || scans.length === 0}
                        >
                            {isClearing ? 'Clearing...' : 'Clear Scan History'}
                        </button>
                    </div>
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}
                </div>

                <div className="scan-history">
                    <h3>Scan History</h3>
                    <div className="scan-list">
                        {scans.length === 0 ? (
                            <p className="no-scans">No scans found. Run a test scan to get started.</p>
                        ) : (
                            scans.map(scan => (
                                <button
                                    key={scan.id}
                                    className={`scan-item ${selectedScanId === scan.id ? 'selected' : ''}`}
                                    onClick={() => handleScanSelect(scan.id)}
                                >
                                    <span className="scan-date">
                                        {new Date(scan.scan_date).toLocaleString()}
                                    </span>
                                    <span className="scan-type">
                                        {scan.scan_type}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <TokenList tokens={tokens} />
            </div>
        </div>
    );
}

export default AdminPanel; 