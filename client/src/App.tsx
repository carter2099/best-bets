import React, { useState } from 'react';
import './App.css';
import TokenList from './components/TokenList';
import ScanButton from './components/ScanButton';
import AdminPanel from './components/AdminPanel';
import { Token } from './types';
import { APIError, isAPIError } from './types/errors';

function App() {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isAdminMode, setIsAdminMode] = useState(false);

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

    // Secret key combination to toggle admin mode (Ctrl + Shift + A)
    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'A') {
            setIsAdminMode(prev => !prev);
        }
    };

    React.useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, []);

    return (
        <div className="App">
            <header className="App-header">
                <h1>The Boys in the Trenches™</h1>
                {isAdminMode ? (
                    <AdminPanel />
                ) : (
                    <div>
                        <ScanButton onClick={handleScan} isLoading={isLoading} />
                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}
                        <TokenList tokens={tokens} />
                    </div>
                )}
            </header>
        </div>
    );
}

export default App; 