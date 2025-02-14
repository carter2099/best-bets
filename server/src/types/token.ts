export interface TokenData {
    address: string;
    name: string;
    symbol: string;
    currentPrice: number;
    priceChange24h: number;
    volume24h: number;
    marketCap: number;
    fdv: number;
    liquidity: number;
    holderCount: number;
    totalScore: number;
    volume: number;
    socialScore: number;
}

export interface TokenAnalysis {
    price: number;
    volume24h: number;
    marketCap: number;
    liquidity: number;
    holderCount: number;
    totalScore: number;
    priceChange24h: number;
    fdv: number;
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