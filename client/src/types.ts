export interface Token {
    name: string;
    symbol: string;
    address: string;
    currentPrice: number;
    priceChange24h: number;
    volume24h: number;
    volume: number;
    holderCount: number;
    fdv: number;
    liquidity: number;
    marketCap: number;
    socialScore: number;
    totalScore: number;
} 