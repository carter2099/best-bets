export interface TokenData {
    name: string;
    symbol: string;
    address: string;
    volume24h: number;
    volume: number;
    fdv: number;
    liquidity: number;
    marketCap: number;
    holderCount: number;
    socialScore: number;
    totalScore: number;
    priceChange24h: number;
    currentPrice: number;
}

export interface RawTokenTransaction {
    signature: string;
    timestamp: number;
    tokenAddress: string;
    amount: number;
    price: number;
}

export interface TokenMetrics {
    volume24h: number;
    transactions24h: number;
    uniqueWallets24h: number;
    priceChange24h: number;
    currentPrice: number;
} 