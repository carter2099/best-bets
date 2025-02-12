import React, { useState } from 'react';
import './App.css';
import TokenList from './components/TokenList';
import ScanButton from './components/ScanButton';
import { Token } from './types';
import { APIError, isAPIError } from './types/errors';

function App() {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleScan = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:3001/api/scan', {
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
            console.error('Scan failed:', error);
            setError(error instanceof Error ? error.message : 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>Solana Meme Token Scanner</h1>
                <ScanButton onClick={handleScan} isLoading={isLoading} />
                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}
                <TokenList tokens={tokens} />
            </header>
        </div>
    );
}

export default App; 