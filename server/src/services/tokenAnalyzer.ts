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
            
            // Get DEX Screener data first
            const pairData = await this.getDexScreenerData(token);

            if (!pairData) {
                console.log(`No pair data found for ${token.name}`);
                return {
                    price: 0,
                    volume24h: 0,
                    marketCap: 0,
                    liquidity: 0,
                    holderCount: 0,
                    totalScore: 0,
                    priceChange24h: 0,
                    fdv: 0
                };
            }

            // Check thresholds before proceeding
            if (pairData.marketCap < 10000 || pairData.volume.h24 < 2000) {
                console.log(`Token ${token.name} doesn't meet minimum thresholds:
                    Market Cap: $${pairData.marketCap}
                    24h Volume: $${pairData.volume.h24}`);
                return {
                    price: parseFloat(pairData.priceUsd),
                    volume24h: pairData.volume.h24,
                    marketCap: pairData.marketCap || 0,
                    liquidity: 0,
                    holderCount: 0,
                    totalScore: 0,
                    priceChange24h: pairData.priceChange.h24 || 0,
                    fdv: pairData.fdv || 0
                };
            }

            // If thresholds are met, get additional data in parallel
            console.log(`Token ${token.name} meets thresholds, fetching additional data...`);
            const [liquidity, holderCount] = await Promise.all([
                this.getLiquidityData(token),
                this.getHolderData(token)
            ]);

            console.log(`Calculating score for ${token.name}...`);
            const totalScore = this.calculateTokenScore(pairData, liquidity, holderCount);

            return {
                price: parseFloat(pairData.priceUsd),
                volume24h: pairData.volume.h24,
                marketCap: pairData.marketCap || 0,
                liquidity,
                holderCount,
                totalScore,
                priceChange24h: pairData.priceChange.h24 || 0,
                fdv: pairData.fdv || 0
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
        const volumeWeight = 0.20;
        const liquidityWeight = 0.35;
        const holderWeight = 0.15;
        const txCountWeight = 0.15;
        const priceActionWeight = 0.05; 

        // Volume score - Compare 24h volume to liquidity (healthy ratio is around 0.1-3x)
        const volumeToLiquidityRatio = liquidity > 0 ? pair.volume.h24 / liquidity : 0;
        const volumeScore = Math.min(Math.max(volumeToLiquidityRatio / 3, 0), 1);
        console.log(`Volume Score: ${volumeScore.toFixed(4)} (Volume/Liquidity ratio: ${volumeToLiquidityRatio.toFixed(2)})`);

        // Liquidity score - Much stricter requirements
        // Now requires $1M for 1.0 score, $100k for 0.5 score
        const liquidityScore = liquidity > 0 ? 
            Math.min(Math.log10(liquidity) / Math.log10(1000000), 1) : 0;
        console.log(`Liquidity Score: ${liquidityScore.toFixed(4)} ($${(liquidity || 0).toLocaleString()})`);

        // Holder score - Require more holders for good score
        // Now requires 1000 holders for 1.0 score, 100 for 0.5 score
        const holderScore = holderCount > 0 ? 
            Math.min(Math.log10(holderCount) / Math.log10(1000), 1) : 0;
        console.log(`Holder Score: ${holderScore.toFixed(4)} (${(holderCount || 0).toLocaleString()} holders)`);

        // Transaction count score
        const txCount = (pair.txns.h24.buys || 0) + (pair.txns.h24.sells || 0);
        const txScore = txCount > 0 ? 
            Math.min(Math.log10(txCount) / Math.log10(1000), 1) : 0;
        console.log(`Transaction Score: ${txScore.toFixed(4)} (${txCount} transactions in 24h)`);

        // Price action scoring with normalized values and more favorable positive movements
        const priceChange = pair.priceChange.h24 || 0;
        let priceActionScore = 0;

        if (priceChange > 0) {
            // Positive price movement - more generous scoring for gains
            if (priceChange <= 50) {
                // Linear increase up to 50%, reaching score of 1.0
                priceActionScore = Math.min(priceChange / 50, 1);
            } else {
                // Gradual decrease for gains above 50%, but maintain higher minimum
                priceActionScore = Math.max(0.5, 1 - ((priceChange - 50) / 150));
            }
        } else {
            // Negative price movement - normalized penalties
            const normalizedDrop = Math.abs(priceChange);
            
            if (normalizedDrop <= 10) {
                // Linear reduction up to 10% drop
                priceActionScore = Math.max(0, 1 - (normalizedDrop / 10));
            } else {
                // Smooth decay for larger drops, ensuring score stays between 0 and 1
                priceActionScore = Math.max(0, Math.exp(-0.15 * (normalizedDrop - 10)) * 0.5);
            }
        }

        console.log(`Price Action Score: ${priceActionScore.toFixed(4)} (${priceChange}% change)`);

        // Calculate initial score
        let totalScore = (
            volumeScore * volumeWeight +
            liquidityScore * liquidityWeight +
            holderScore * holderWeight +
            txScore * txCountWeight +
            priceActionScore * priceActionWeight
        );

        // Apply harsh penalties based on price drops
        if (priceChange < 0) {
            const dropPenaltyFactor = Math.abs(priceChange) / 100;
            // Exponential penalty that gets worse as the drop increases
            const penaltyMultiplier = Math.exp(-dropPenaltyFactor * 2);
            totalScore *= penaltyMultiplier;

            // Additional severe penalties for bigger drops
            if (priceChange < -10) totalScore *= 0.7;
            if (priceChange < -20) totalScore *= 0.5;
            if (priceChange < -30) totalScore *= 0.3;
            if (priceChange < -50) totalScore *= 0.1;
            if (priceChange < -70) totalScore *= 0.01;
        }

        // Multiply by 100 to make it more readable
        const finalScore = totalScore * 100;

        // Add detailed logging for price-related penalties
        console.log(`Price Details:
            Base Price Score: ${priceActionScore.toFixed(4)}
            Price Change: ${priceChange}%
            Final Score After Penalties: ${finalScore.toFixed(2)}
        `);

        return finalScore;
    }
} 