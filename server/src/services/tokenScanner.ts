import axios from 'axios';
import { TokenScanError, APIError } from '../types/errors';
import { TokenData, RawTokenTransaction, TokenMetrics } from '../types/token';
import { Connection, PublicKey } from '@solana/web3.js';

interface TwitterMetrics {
    mentionCount: number;
    sentiment: number;
}

class TokenScanner {
    private heliusUrl: string;
    private connection: Connection;
    private readonly HOURS_24 = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    constructor(heliusUrl: string) {
        this.heliusUrl = heliusUrl;
        this.connection = new Connection(heliusUrl);
    }

    async scanRecentTokens(): Promise<TokenData[]> {
        try {
            const rawTransactions = await this.getRecentTokenTransactions();
            const tokenMetrics = this.processTransactions(rawTransactions);
            const enrichedTokens = await this.enrichTokenData(tokenMetrics);
            
            return this.sortAndFilterTokens(enrichedTokens);
        } catch (error) {
            throw new TokenScanError(`Failed to scan tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async getRecentTokenTransactions(): Promise<RawTokenTransaction[]> {
        try {
            // Get transactions from the last 24 hours
            const currentTime = Date.now();
            const response = await axios.post(this.heliusUrl, {
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'searchAssets',
                params: {
                    ownerAddress: null,
                    grouping: ['collection'],
                    page: 1,
                    limit: 1000,
                    before: currentTime,
                    after: currentTime - this.HOURS_24
                },
            });

            if (!response.data?.result) {
                throw new APIError('Invalid response from Helius API');
            }

            return this.parseTransactions(response.data.result);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new APIError(
                    `Helius API request failed: ${error.message}`,
                    error.response?.status || 500
                );
            }
            throw error;
        }
    }

    private parseTransactions(rawData: any[]): RawTokenTransaction[] {
        return rawData
            .filter(tx => tx.tokenTransfers && tx.tokenTransfers.length > 0)
            .map(tx => ({
                signature: tx.signature,
                timestamp: tx.timestamp,
                tokenAddress: tx.tokenTransfers[0].mint,
                amount: parseFloat(tx.tokenTransfers[0].amount),
                price: tx.tokenTransfers[0].price || 0
            }));
    }

    private processTransactions(transactions: RawTokenTransaction[]): Map<string, TokenMetrics> {
        const tokenMap = new Map<string, TokenMetrics>();
        const now = Date.now();

        transactions.forEach(tx => {
            const metrics: TokenMetrics = tokenMap.get(tx.tokenAddress) || {
                volume24h: 0,
                transactions24h: 0,
                uniqueWallets24h: 0,
                priceChange24h: 0,
                currentPrice: 0
            };

            if (now - tx.timestamp <= this.HOURS_24) {
                metrics.volume24h += tx.amount * tx.price;
                metrics.transactions24h += 1;
                metrics.currentPrice = tx.price; // Most recent price
            }

            tokenMap.set(tx.tokenAddress, metrics);
        });

        return tokenMap;
    }

    private async enrichTokenData(tokenMetrics: Map<string, TokenMetrics>): Promise<TokenData[]> {
        const enrichedTokens: TokenData[] = [];

        for (const [address, metrics] of tokenMetrics) {
            try {
                const [liquidity, socialScore] = await Promise.all([
                    this.getRaydiumLiquidity(address),
                    this.getTwitterMetrics(address)
                ]);

                const holderCount = await this.getHolderCount(address);

                const tokenData: TokenData = {
                    address,
                    name: '', // Will be populated from token metadata
                    symbol: '', // Will be populated from token metadata
                    volume24h: metrics.volume24h,
                    volume: metrics.volume24h, // Using volume24h as volume
                    holderCount,
                    liquidity,
                    socialScore: socialScore.mentionCount * socialScore.sentiment,
                    totalScore: 0, // Will be calculated
                    priceChange24h: metrics.priceChange24h,
                    currentPrice: metrics.currentPrice
                };

                tokenData.totalScore = this.calculateScore(tokenData);
                enrichedTokens.push(tokenData);
            } catch (error) {
                console.error(`Failed to enrich token ${address}:`, error);
                continue;
            }
        }

        return enrichedTokens;
    }

    private async getHolderCount(tokenAddress: string): Promise<number> {
        try {
            const tokenKey = new PublicKey(tokenAddress);
            const accounts = await this.connection.getTokenLargestAccounts(tokenKey);
            return accounts.value.length;
        } catch (error) {
            console.error(`Failed to get holder count for ${tokenAddress}:`, error);
            return 0;
        }
    }

    private sortAndFilterTokens(tokens: TokenData[]): TokenData[] {
        return tokens
            .filter(token => 
                token.volume24h > 0 && 
                token.liquidity > 0 && 
                token.holderCount > 10
            )
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 10); // Return top 10 tokens
    }

    async getRaydiumLiquidity(tokenAddress: string): Promise<number> {
        try {
            // Implement Raydium API call
            return 0;
        } catch (error) {
            throw new APIError(
                `Failed to get Raydium liquidity: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getJupiterPrice(tokenAddress: string): Promise<number> {
        try {
            // Implement Jupiter API call
            return 0;
        } catch (error) {
            throw new APIError(
                `Failed to get Jupiter price: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getTwitterMetrics(tokenSymbol: string): Promise<TwitterMetrics> {
        try {
            // Implement Twitter API call
            return {
                mentionCount: 0,
                sentiment: 0
            };
        } catch (error) {
            throw new APIError(
                `Failed to get Twitter metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    private calculateScore(data: TokenData): number {
        const {
            volume24h,
            liquidity,
            holderCount,
            socialScore
        } = data;

        const onChainScore = (volume24h * 0.4 + liquidity * 0.2 + holderCount * 0.1);
        const totalScore = (onChainScore * 0.7) + (socialScore * 0.3);

        return totalScore;
    }
}

export default TokenScanner; 