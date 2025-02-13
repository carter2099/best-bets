export interface JupiterToken {
    mint: string;
    created_at: string;
    metadata_updated_at: number;
    name: string;
    symbol: string;
    decimals: number;
    logo_uri: string;
    known_markets: string[];
    mint_authority: string | null;
    freeze_authority: string | null;
}

export interface DexScreenerPair {
    chainId: string;
    dexId: string;
    url: string;
    pairAddress: string;
    baseToken: {
        address: string;
        name: string;
        symbol: string;
    };
    quoteToken: {
        address: string;
        name: string;
        symbol: string;
    };
    priceNative: string;
    priceUsd: string;
    txns: {
        m5: { buys: number; sells: number; };
        h1: { buys: number; sells: number; };
        h6: { buys: number; sells: number; };
        h24: { buys: number; sells: number; };
    };
    volume: {
        h24: number;
        h6: number;
        h1: number;
        m5: number;
    };
    priceChange: {
        h1: number;
        h6: number;
        h24: number;
    };
    fdv: number;
    marketCap: number;
    pairCreatedAt: number;
}

// Add new interface for Moralis API response
export interface MoralisPair {
    exchangeAddress: string;
    exchangeName: string;
    exchangeLogo: string;
    pairLabel: string;
    pairAddress: string;
    usdPrice: number;
    usdPrice24hrPercentChange: number;
    usdPrice24hrUsdChange: number;
    liquidityUsd: number;
    baseToken: string;
    quoteToken: string;
    pair: {
        tokenAddress: string;
        tokenName: string;
        tokenSymbol: string;
        tokenLogo: string;
        tokenDecimals: string;
        pairTokenType: string;
        liquidityUsd: number;
    }[];
}

export interface MoralisResponse {
    cursor: string;
    pageSize: number;
    page: number;
    pairs: MoralisPair[];
}

// Add enum for liquidity providers
export enum LiquidityProvider {
    MORALIS = 'moralis',
    SHYFT = 'shyft'
}

// Add interface for Shyft API response (to be filled in later)
export interface ShyftResponse {
    // TBD: Add Shyft response type
}

export interface HolderAccount {
    wallet: string;
    amount: number;
    value: {
        quote: number;
        usd: number;
    };
    percentage: number;
}

export interface HoldersResponse {
    total: number;
    accounts: HolderAccount[];
} 