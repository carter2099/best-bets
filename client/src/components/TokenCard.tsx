import React from 'react';
import { Token } from '../types';

interface TokenCardProps {
    token: Token;
    rank: number;
}

function TokenCard({ token, rank }: TokenCardProps) {
    return (
        <div className="token-card">
            <div className="rank">#{rank}</div>
            <h3>{token.name} ({token.symbol})</h3>
            <div className="metrics">
                <div>24h Volume: {token.volume}</div>
                <div>Holders: {token.holderCount}</div>
                <div>Liquidity: {token.liquidity}</div>
                <div>Social Score: {token.socialScore}</div>
                <div>Total Score: {token.totalScore}</div>
            </div>
        </div>
    );
}

export default TokenCard; 