import axios from 'axios';
import { DexScreenerPair, LiquidityProvider, MoralisResponse, HoldersResponse } from '../types/api';
import { TokenAnalysis } from '../types/token';

// Add Token interface if not already defined
interface Token {
    address: string;
    name: string;
    symbol: string;
}

export class TokenAnalyzer {
    private readonly DEX_SCREENER_BASE_URL = 'https://api.dexscreener.com/token-pairs/v1/solana';
    private readonly MORALIS_BASE_URL = 'https://solana-gateway.moralis.io/token/mainnet';
    private readonly HOLDERS_BASE_URL = 'https://data.solanatracker.io';
    private readonly HOLDERS_API_KEY = process.env.HOLDERS_API_KEY;
    private readonly MORALIS_API_KEY = process.env.MORALIS_API_KEY;
    private readonly liquidityProvider: LiquidityProvider;

    constructor(liquidityProvider: LiquidityProvider = LiquidityProvider.MORALIS) {
        this.liquidityProvider = liquidityProvider;
        
        // Validate required environment variables
        if (!process.env.HOLDERS_API_KEY || !process.env.MORALIS_API_KEY) {
            throw new Error('Missing required API keys in environment variables');
        }
    }

    async analyzeToken(token: Token): Promise<TokenAnalysis> {
        try {
            console.log(`Getting token data for ${token.name}...`);
            // Get all the data in parallel
            const [pairData, liquidity, holderCount] = await Promise.all([
                this.getDexScreenerData(token),
                this.getLiquidityData(token),
                this.getHolderData(token)
            ]);

            if (!pairData) {
                console.log(`No pair data found for ${token.name}`);
                return {
                    price: 0,
                    volume24h: 0,
                    marketCap: 0,
                    liquidity: 0,
                    holderCount: 0,
                    totalScore: 0
                };
            }

            console.log(`Calculating score for ${token.name}...`);
            const totalScore = this.calculateTokenScore(pairData, liquidity, holderCount);

            return {
                price: parseFloat(pairData.priceUsd),
                volume24h: pairData.volume.h24,
                marketCap: pairData.marketCap || 0,
                liquidity,
                holderCount,
                totalScore
            };
        } catch (error) {
            console.error(`Error analyzing token ${token.name} (${token.address}):`, error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }

    private async getDexScreenerData(token: Token): Promise<DexScreenerPair | null> {
        try {
            const response = await axios.get<DexScreenerPair[]>(
                `${this.DEX_SCREENER_BASE_URL}/${token.address}`
            );
            
            if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
                console.log(`No pairs found for ${token.name}`);
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
                return this.getDexScreenerData(token);
            } else if (axios.isAxiosError(error)) {
                console.error(`DexScreener API error for ${token.name}:`, {
                    status: error.response?.status,
                    data: error.response?.data
                });
            } else {
                console.error(`Failed to fetch DEX Screener data for ${token.name}:`, error);
            }
            return null;
        }
    }

    private async getLiquidityData(token: Token): Promise<number> {
        switch (this.liquidityProvider) {
            case LiquidityProvider.MORALIS:
                return this.getMoralisLiquidity(token);
            case LiquidityProvider.SHYFT:
                return this.getShyftLiquidity(token);
            default:
                console.warn(`Unknown liquidity provider ${this.liquidityProvider}, defaulting to Moralis`);
                return this.getMoralisLiquidity(token);
        }
    }

    private async getMoralisLiquidity(token: Token): Promise<number> {
        try {
            const response = await axios.get<MoralisResponse>(
                `${this.MORALIS_BASE_URL}/${token.address}/pairs`,
                {
                    headers: {
                        accept: 'application/json',
                        'X-API-Key': this.MORALIS_API_KEY
                    }
                }
            );

            if (!response.data) {
                console.warn(`No liquidity data received for ${token.name}`);
                return 0;
            }

            const totalLiquidity = response.data.pairs.reduce((sum, pair) => {
                return sum + (pair.liquidityUsd || 0);
            }, 0);
            console.log(`Liquidity for ${token.name}: $${totalLiquidity.toLocaleString()}`);

            return totalLiquidity;
        } catch (error) {
            console.error(`Failed to fetch Moralis liquidity data for ${token.name}:`, error);
            return 0;
        }
    }

    private async getShyftLiquidity(token: Token): Promise<number> {
        // To be implemented
        return 0;
    }

    private async getHolderData(token: Token): Promise<number> {
        try {
            const response = await axios.get<HoldersResponse>(
                `${this.HOLDERS_BASE_URL}/tokens/${token.address}/holders`,
                {
                    headers: {
                        'x-api-key': this.HOLDERS_API_KEY
                    }
                }
            );

            if (!response.data) {
                console.warn(`No holder data received for ${token.name}`);
                return 0;
            }

            console.log(`Holders for ${token.name}: ${response.data.total}`);
            
            // Sleep for 1 second to respect rate limit
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return response.data.total;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error(`Failed to fetch holder data for ${token.name}:`, {
                    status: error.response?.status,
                    data: error.response?.data
                });
            } else {
                console.error(`Failed to fetch holder data for ${token.name}:`, error);
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
        console.log(`Volume Score: ${volumeScore.toFixed(4)} (24h volume: $${(pair.volume.h24 || 0).toLocaleString()})`);

        // Transaction count score
        const txCount = (pair.txns.h24.buys || 0) + (pair.txns.h24.sells || 0);
        const txScore = Math.min(txCount / 1000, 1);
        console.log(`Transaction Score: ${txScore.toFixed(4)} (${txCount} transactions in 24h)`);

        // Price action score
        const priceActionScore = Math.min(Math.abs(pair.priceChange.h24 || 0) / 100, 1);
        console.log(`Price Action Score: ${priceActionScore.toFixed(4)} (${pair.priceChange.h24 || 0}% change)`);

        // FDV score - lower ratio of FDV to market cap is better
        const fdvToMcapRatio = pair.marketCap ? (pair.fdv || 0) / pair.marketCap : Infinity;
        const fdvScore = Math.max(0, 1 - (fdvToMcapRatio - 1));
        console.log(`FDV Score: ${fdvScore.toFixed(4)} (FDV/MCap ratio: ${fdvToMcapRatio.toFixed(2)})`);

        // Liquidity score
        const liquidityScore = Math.min((liquidity || 0) / 100000, 1); // Cap at $100k liquidity
        console.log(`Liquidity Score: ${liquidityScore.toFixed(4)} ($${(liquidity || 0).toLocaleString()})`);

        // Holder score (normalize against a target of 1000 holders)
        const holderScore = Math.min((holderCount || 0) / 1000, 1);
        console.log(`Holder Score: ${holderScore.toFixed(4)} (${(holderCount || 0).toLocaleString()} holders)`);

        const totalScore = (
            volumeScore * volumeWeight +
            fdvScore * fdvWeight +
            liquidityScore * liquidityWeight +
            txScore * txCountWeight +
            holderScore * holderWeight +
            priceActionScore * priceActionWeight
        );

        console.log(`Final Score: ${totalScore.toFixed(4)}`);
        return totalScore;
    }
} 