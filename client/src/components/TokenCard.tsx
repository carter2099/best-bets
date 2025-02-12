import React from 'react';
import { Token } from '../types';

interface TokenCardProps {
    token: Token;
    rank: number;
}

function TokenCard({ token, rank }: TokenCardProps) {
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };

    const formatPercentage = (num: number) => {
        return `${(num * 100).toFixed(2)}%`;
    };

    return (
        <div className="token-card">
            <div className="rank">#{rank}</div>
            <h3>{token.name || 'Unknown'} ({token.symbol || '???'})</h3>
            <div className="metrics">
                <div>Price: {formatNumber(token.currentPrice)}</div>
                <div>24h Change: {formatPercentage(token.priceChange24h)}</div>
                <div>24h Volume: {formatNumber(token.volume24h)}</div>
                <div>Holders: {token.holderCount.toLocaleString()}</div>
                <div>Liquidity: {formatNumber(token.liquidity)}</div>
                <div>Social Score: {token.socialScore.toFixed(2)}</div>
                <div>Total Score: {token.totalScore.toFixed(2)}</div>
            </div>
        </div>
    );
}

export default TokenCard; 