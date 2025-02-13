import React, { useState } from 'react';
import TokenList from './TokenList';
import ScanButton from './ScanButton';
import { Token } from '../types';
import { APIError, isAPIError } from '../types/errors';

function AdminPanel() {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

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
        } catch (error) {
            console.error('Test scan failed:', error);
            setError(error instanceof Error ? error.message : 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-panel">
            <h2>Admin Panel</h2>
            <div className="admin-controls">
                <ScanButton onClick={handleTestScan} isLoading={isLoading} text="Run Test Scan" />
                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}
                <TokenList tokens={tokens} />
            </div>
        </div>
    );
}

export default AdminPanel; 