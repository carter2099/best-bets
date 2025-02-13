import React from 'react';
import { Token } from '../types';

interface TokenCardProps {
    token: Token;
    rank: number;
}

function TokenCard({ token, rank }: TokenCardProps) {
    const [copyConfirm, setCopyConfirm] = React.useState(false);

    const formatNumber = (num: number | null) => {
        if (num == null) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };

    const formatPercentage = (num: number | null) => {
        if (num == null) return '0.00%';
        return `${(num * 100).toFixed(2)}%`;
    };

    const formatPrice = (price: number | null) => {
        if (price == null) return '$0.00';
        if (price < 0.01) {
            // For very small numbers, show up to 8 decimal places
            return `$${price.toFixed(8)}`;
        }
        return formatNumber(price);
    };

    const formatAddress = (address: string) => {
        if (!address) return '';
        const start = address.slice(0, 8);
        const end = address.slice(-8);
        return `${start}...${end}`;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopyConfirm(true);
        setTimeout(() => setCopyConfirm(false), 1500); // Reset after 1.5 seconds
    };

    return (
        <div className="token-card">
            <div className="rank">#{rank}</div>
            <h3>{token.name || 'Unknown'} ({token.symbol || '???'})</h3>
            <div className="metrics">
                <div>
                    Address:{" "}
                    <span className="address">{formatAddress(token.address)}</span>
                    <button 
                        className={`copy-button ${copyConfirm ? 'copied' : ''}`}
                        onClick={() => copyToClipboard(token.address)}
                        title={copyConfirm ? 'Copied!' : 'Copy full address'}
                    >
                        {copyConfirm ? '✓' : '📋'}
                    </button>
                </div>
                <div>Price: {formatPrice(token.currentPrice)}</div>
                <div>24h Change: {formatPercentage(token.priceChange24h)}</div>
                <div>24h Volume: {formatNumber(token.volume24h)}</div>
                <div>Market Cap: {formatNumber(token.marketCap)}</div>
                <div>FDV: {formatNumber(token.fdv)}</div>
                <div>Holders: {(token.holderCount || 0).toLocaleString()}</div>
                <div>Liquidity: {formatNumber(token.liquidity)}</div>
                {/* <div>Social Score: {token.socialScore.toFixed(2)}</div> */}
                <div>Total Score: {(token.totalScore || 0).toFixed(2)}</div>
            </div>
        </div>
    );
}

export default TokenCard; 