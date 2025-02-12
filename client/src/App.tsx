import React, { useState } from 'react';
import './App.css';
import TokenList from './components/TokenList';
import ScanButton from './components/ScanButton';
import { Token } from './types';

function App() {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleScan = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/scan', {
                method: 'POST'
            });
            const data = await response.json();
            setTokens(data);
        } catch (error) {
            console.error('Scan failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>Solana Meme Token Scanner</h1>
                <ScanButton onClick={handleScan} isLoading={isLoading} />
                <TokenList tokens={tokens} />
            </header>
        </div>
    );
}

export default App; 