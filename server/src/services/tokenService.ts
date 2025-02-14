import { LiquidityService } from './liquidityService';
import { HolderService } from './holderService';
import { PriceService } from './priceService';
import { TokenData } from '../types/token';

interface TokenInfo {
    address: string;
    name: string;
    symbol: string;
}

export class TokenService {
    constructor(
        private liquidityService: LiquidityService,
        private holderService: HolderService,
        private priceService: PriceService
    ) {}

    async scanRecentTokens(): Promise<TokenData[]> {
        const recentTokens = await this.liquidityService.getRecentTokens();
        
        const tokensWithData = await Promise.all(
            recentTokens.map(async (token: TokenInfo) => {
                const [liquidity, holders, price] = await Promise.all([
                    this.liquidityService.getLiquidity(token.address),
                    this.holderService.getHolderCount(token.address),
                    this.priceService.getPrice(token.address)
                ]);

                return this.calculateTokenMetrics(token, liquidity, holders, price);
            })
        );

        return this.rankTokens(tokensWithData);
    }

    private calculateTokenMetrics(
        token: TokenInfo, 
        liquidity: number, 
        holders: number, 
        price: any
    ): TokenData {
        return {
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            currentPrice: price.currentPrice,
            priceChange24h: price.priceChange24h,
            volume24h: price.volume24h,
            marketCap: price.marketCap,
            fdv: price.fdv,
            liquidity,
            holderCount: holders,
            totalScore: 0, // Implement scoring logic
            volume: price.volume24h,
            socialScore: 0
        };
    }

    private rankTokens(tokens: TokenData[]): TokenData[] {
        return tokens.sort((a, b) => b.totalScore - a.totalScore);
    }
} 