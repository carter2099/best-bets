import React from 'react';
import TokenCard from './TokenCard';
import { Token } from '../types';

interface TokenListProps {
    tokens: Token[];
}

function TokenList({ tokens }: TokenListProps) {
    if (!tokens.length) {
        return <p>No tokens scanned yet</p>;
    }

    return (
        <div className="token-list">
            {tokens.map((token, index) => (
                <TokenCard key={token.address} token={token} rank={index + 1} />
            ))}
        </div>
    );
}

export default TokenList; 