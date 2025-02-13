import axios from 'axios';
import { TokenScanError, APIError } from '../types/errors';
import { TokenData } from '../types/token';
import { JupiterToken, DexScreenerPair, MoralisResponse, HoldersResponse } from '../types/api';
import { LiquidityProvider } from '../types/api';

class TokenScanner {
    private readonly JUPITER_NEW_TOKENS_URL = 'https://api.jup.ag/tokens/v1/new';
    private readonly DEX_SCREENER_BASE_URL = 'https://api.dexscreener.com/token-pairs/v1/solana';
    private readonly MORALIS_BASE_URL = 'https://solana-gateway.moralis.io/token/mainnet';
    private readonly HOLDERS_BASE_URL = 'https://data.solanatracker.io';
    private readonly HOLDERS_API_KEY = '27bad8cd-841f-4875-aa95-0a09a01c974d';
    //private readonly MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjYzNjRiNGUxLWMwNTItNDM2My1iZDIwLWFjNjRkYjMzZjczOSIsIm9yZ0lkIjoiNDMxMDg2IiwidXNlcklkIjoiNDQzNDM0IiwidHlwZUlkIjoiOGFiZDY3YjItOTU2MS00MzJlLTkyNzEtZmY2ZmZhNmU3Mjg2IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3Mzk0MTQ3NzEsImV4cCI6NDg5NTE3NDc3MX0.0JJFHiaD5ZVM9lenSUT4h8eIP8w7Hls0gKSG5Vmj6u0';
    private readonly MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjM0ODVlODg2LTE0MTgtNGIzNy05MGNhLWVhYTcwZGZlMzIxYyIsIm9yZ0lkIjoiNDMxMDkwIiwidXNlcklkIjoiNDQzNDM4IiwidHlwZUlkIjoiNTI0MjRmMzUtZTU1OC00YzhmLTg4NTktMDY5NGQyYWMwZDc5IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3Mzk0MTkwOTMsImV4cCI6NDg5NTE3OTA5M30.kSV2aPT9d8sZ7bvbhvGzL8JrEmDFBEkGKVHgGV9PNsM';
    private readonly liquidityProvider: LiquidityProvider;

    constructor(liquidityProvider: LiquidityProvider = LiquidityProvider.MORALIS) {
        this.liquidityProvider = liquidityProvider;
    }

    async scanRecentTokens(): Promise<TokenData[]> {
        try {
            // Get new tokens from Jupiter
            const newTokens = await this.getNewTokens();
            
            // Process tokens and maintain top 10
            const topTokens = await this.processTokens(newTokens);
            
            return this.sortAndFilterTokens(topTokens);
        } catch (error) {
            throw new TokenScanError(`Failed to scan tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async getNewTokens(): Promise<JupiterToken[]> {
        try {
            const response = await axios.get<JupiterToken[]>(this.JUPITER_NEW_TOKENS_URL);
            return response.data;
        } catch (error) {
            throw new APIError(
                `Failed to fetch new tokens from Jupiter: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    private async getDexScreenerData(tokenAddress: string): Promise<DexScreenerPair | null> {
        try {
            const response = await axios.get<DexScreenerPair[]>(
                `${this.DEX_SCREENER_BASE_URL}/${tokenAddress}`
            );
            
            // Add response validation
            if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
                console.log(`No pairs found for token ${tokenAddress}`);
                return null;
            }

            // Get the pair with the highest liquidity
            const sortedPairs = response.data
                .filter(pair => 
                    pair.quoteToken.address === 'So11111111111111111111111111111111111111112' || // SOL pairs
                    pair.quoteToken.symbol === 'USDC' || 
                    pair.quoteToken.symbol === 'USDT'
                )
                .sort((a, b) => b.volume.h24 - a.volume.h24);

            return sortedPairs[0] || null;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 429) {
                console.log('Rate limit hit, waiting 60 seconds...');
                await new Promise(resolve => setTimeout(resolve, 60000));
                // Retry the request after waiting
                return this.getDexScreenerData(tokenAddress);
            } else if (axios.isAxiosError(error)) {
                console.error(`DexScreener API error for ${tokenAddress}:`, {
                    status: error.response?.status,
                    data: error.response?.data
                });
            } else {
                console.error(`Failed to fetch DEX Screener data for ${tokenAddress}:`, error);
            }
            return null;
        }
    }

    private async getLiquidityData(tokenAddress: string): Promise<number> {
        switch (this.liquidityProvider) {
            case LiquidityProvider.MORALIS:
                return this.getMoralisLiquidity(tokenAddress);
            case LiquidityProvider.SHYFT:
                return this.getShyftLiquidity(tokenAddress);
            default:
                console.warn(`Unknown liquidity provider ${this.liquidityProvider}, defaulting to Moralis`);
                return this.getMoralisLiquidity(tokenAddress);
        }
    }

    private async getMoralisLiquidity(tokenAddress: string): Promise<number> {
        try {
            const response = await axios.get<MoralisResponse>(
                `${this.MORALIS_BASE_URL}/${tokenAddress}/pairs`,
                {
                    headers: {
                        accept: 'application/json',
                        'X-API-Key': this.MORALIS_API_KEY
                    }
                }
            );

            if (!response.data) {
                console.warn(`No liquidity data received for token ${tokenAddress}`);
                return 0;
            }

            console.log(response.data.pairs);
            const totalLiquidity = response.data.pairs.reduce((sum, pair) => {
                return sum + (pair.liquidityUsd || 0);
            }, 0);
            console.log(`Liquidity for ${tokenAddress}: $${totalLiquidity.toLocaleString()}`);

            return totalLiquidity;
        } catch (error) {
            console.error(`Failed to fetch Moralis liquidity data for ${tokenAddress}:`, error);
            return 0;
        }
    }

    private async getShyftLiquidity(tokenAddress: string): Promise<number> {
        // To be implemented
        return 0;
    }

    private async getHolderData(tokenAddress: string): Promise<number> {
        try {
            const response = await axios.get<HoldersResponse>(
                `${this.HOLDERS_BASE_URL}/tokens/${tokenAddress}/holders`,
                {
                    headers: {
                        'x-api-key': this.HOLDERS_API_KEY
                    }
                }
            );

            if (!response.data) {
                console.warn(`No holder data received for token ${tokenAddress}`);
                return 0;
            }

            console.log(`Holders for ${tokenAddress}: ${response.data.total}`);
            
            // Sleep for 1 second to respect rate limit
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return response.data.total;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error(`Failed to fetch holder data for ${tokenAddress}:`, {
                    status: error.response?.status,
                    data: error.response?.data
                });
            } else {
                console.error(`Failed to fetch holder data for ${tokenAddress}:`, error);
            }
            return 0;
        }
    }

    private calculateTokenScore(pair: DexScreenerPair, liquidity: number, holderCount: number): number {
        // Update scoring to include holder count
        const volumeWeight = 0.30;
        const fdvWeight = 0.20;
        const liquidityWeight = 0.20;
        const txCountWeight = 0.15;
        const holderWeight = 0.10;
        const priceActionWeight = 0.05;

        // Volume score (normalized by market cap to avoid manipulation)
        const volumeScore = pair.volume.h24 / (pair.marketCap || 1);

        // Transaction count score
        const txCount = pair.txns.h24.buys + pair.txns.h24.sells;
        const txScore = Math.min(txCount / 1000, 1);

        // Price action score
        const priceActionScore = Math.min(Math.abs(pair.priceChange.h24) / 100, 1);

        // FDV score
        const fdvScore = Math.min(pair.fdv / 1000000, 1);

        // Liquidity score
        const liquidityScore = Math.min(liquidity / 100000, 1); // Cap at $100k liquidity

        // Holder score (normalize against a target of 1000 holders)
        const holderScore = Math.min(holderCount / 1000, 1);

        return (
            volumeScore * volumeWeight +
            fdvScore * fdvWeight +
            liquidityScore * liquidityWeight +
            txScore * txCountWeight +
            holderScore * holderWeight +
            priceActionScore * priceActionWeight
        );
    }

    private async processTokens(tokens: JupiterToken[]): Promise<TokenData[]> {
        const processedTokens: TokenData[] = [];
        let processedCount = 0;
        const TOKEN_LIMIT = 10;

        const limitedTokens = tokens.slice(tokens.length - TOKEN_LIMIT, tokens.length);
        console.log(`Processing first ${TOKEN_LIMIT} tokens out of ${tokens.length} total`);

        for (const token of limitedTokens) {
            try {
                processedCount++;
                if (processedCount % 10 === 0) {
                    console.log(`Processing token ${processedCount}/${TOKEN_LIMIT}`);
                }

                const [pairData, liquidity, holderCount] = await Promise.all([
                    this.getDexScreenerData(token.mint),
                    this.getLiquidityData(token.mint),
                    this.getHolderData(token.mint)
                ]);
                
                if (!pairData) {
                    console.log(`Skipping token ${token.name} (${token.mint}): No valid pair data`);
                    continue;
                }

                if (!pairData.volume?.h24 || !pairData.fdv || !pairData.priceChange?.h24 || !pairData.priceUsd) {
                    console.log(`Skipping token ${token.name}: Missing required metrics`);
                    continue;
                }

                const tokenData: TokenData = {
                    address: token.mint,
                    name: token.name,
                    symbol: token.symbol,
                    volume24h: pairData.volume.h24,
                    volume: pairData.volume.h24,
                    fdv: pairData.fdv,
                    liquidity,
                    holderCount,
                    socialScore: 0,
                    totalScore: this.calculateTokenScore(pairData, liquidity, holderCount),
                    priceChange24h: pairData.priceChange.h24 / 100,
                    currentPrice: parseFloat(pairData.priceUsd)
                };

                processedTokens.push(tokenData);
            } catch (error) {
                console.error(`Failed to process token ${token.mint}:`, error);
                continue;
            }
        }

        console.log(`Successfully processed ${processedTokens.length} tokens out of ${TOKEN_LIMIT} attempted`);
        return processedTokens;
    }

    private sortAndFilterTokens(tokens: TokenData[]): TokenData[] {
        return tokens
            .filter(token => 
                token.volume24h > 0 && 
                token.fdv > 0
            )
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 10);
    }
}

export default TokenScanner; 