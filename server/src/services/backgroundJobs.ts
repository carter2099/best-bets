import { Pool } from 'pg';
import { JupiterStationAPI } from './jupiterStationAPI';
import { TokenAnalyzer } from './tokenAnalyzer';
import { sleep } from '../utils';
import TokenScanner from './tokenScanner';
import { JupiterToken } from '../types/api';

const MAX_SYMBOL_LENGTH = 50;

export class BackgroundJobService {
    private db: Pool;
    private jupiterAPI: JupiterStationAPI;
    private tokenAnalyzer: TokenAnalyzer;
    private isRunning: boolean = false;

    constructor(db: Pool, jupiterAPI: JupiterStationAPI, tokenAnalyzer: TokenAnalyzer) {
        this.db = db;
        this.jupiterAPI = jupiterAPI;
        this.tokenAnalyzer = tokenAnalyzer;
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;

        // Start background jobs
        this.runBulkTokenSync();
        this.runTokenAnalysis();
        this.runTopTokensUpdate();
    }

    private async runBulkTokenSync() {
        while (this.isRunning) {
            try {
                console.log('Starting bulk token sync...');
                const tokenScanner = new TokenScanner();
                const tokensReceived: JupiterToken[] = await tokenScanner.getNewTokens();
                
                const tokens = tokensReceived;
                console.log(`Processing ${tokens.length} tokens out of ${tokensReceived.length} from Jupiter API`);
                
                let processedCount = 0;
                for (const token of tokens) {
                    // Validate and truncate symbol if necessary
                    const validatedSymbol = token.symbol?.substring(0, MAX_SYMBOL_LENGTH) || '';
                    
                    await this.db.query(
                        `INSERT INTO tokens (address, name, symbol, is_new, needs_analysis) 
                         VALUES ($1, $2, $3, true, true)
                         ON CONFLICT (address) DO NOTHING`,
                        [token.mint, token.name, validatedSymbol]
                    );
                    
                    processedCount++;
                    if (processedCount % 100 === 0) {
                        console.log(`Processed ${processedCount} out of ${tokens.length} tokens`);
                    }
                }

                console.log(`Completed syncing ${tokens.length} tokens to database`);
            } catch (error) {
                console.error('Error in bulk token sync:', error);
            }

            // Wait 12 hours before next sync
            await sleep(12 * 60 * 60 * 1000);
        }
    }

    private async runTokenAnalysis() {
        while (this.isRunning) {
            try {
                // Get tokens that need analysis, prioritized
                const result = await this.db.query(
                    `SELECT * FROM tokens 
                     WHERE needs_analysis = true 
                     ORDER BY 
                        CASE WHEN last_analysis_timestamp IS NULL THEN 1 ELSE 0 END DESC,
                        is_new DESC,
                        total_score DESC NULLS LAST,
                        last_analysis_timestamp ASC NULLS FIRST 
                     LIMIT 1`
                );

                if (result.rows.length === 0) {
                    await sleep(1000); // Wait if no tokens need analysis
                    continue;
                }

                const token = result.rows[0];
                console.log(`Analyzing token: ${token.name} (${token.address})`);
                const analysis = await this.tokenAnalyzer.analyzeToken(token);

                console.log(`Completed analysis for ${token.name}, updating metrics...`);
                // Store current metrics in history
                await this.db.query(
                    `INSERT INTO token_metrics_history 
                     (token_id, price, price_change_24h, volume_24h, market_cap, fdv, liquidity, holder_count, total_score)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [token.id, analysis.price, analysis.priceChange24h, analysis.volume24h, analysis.marketCap,
                     analysis.fdv, analysis.liquidity, analysis.holderCount, analysis.totalScore]
                );

                // Update token
                await this.db.query(
                    `UPDATE tokens 
                     SET current_price = $1, price_change_24h = $2, volume_24h = $3, market_cap = $4,
                         fdv = $5, liquidity = $6, holder_count = $7, total_score = $8,
                         needs_analysis = false, last_analysis_timestamp = NOW(),
                         is_new = false, updated_at = NOW()
                     WHERE id = $9`,
                    [analysis.price, analysis.priceChange24h, analysis.volume24h, analysis.marketCap,
                     analysis.fdv, analysis.liquidity, analysis.holderCount, analysis.totalScore,
                     token.id]
                );

                // Rate limit compliance
                await sleep(2000); // Adjust based on API rate limits
            } catch (error) {
                console.error('Error in token analysis:', error);
                await sleep(5000); // Wait longer on error
            }
        }
    }

    private async runTopTokensUpdate() {
        while (this.isRunning) {
            try {
                // Update ranks for top 20 tokens
                await this.db.query(
                    `WITH RankedTokens AS (
                        SELECT id,
                               ROW_NUMBER() OVER (
                                   ORDER BY total_score DESC NULLS LAST
                               ) as new_rank
                        FROM tokens
                        WHERE total_score IS NOT NULL
                    )
                    UPDATE tokens t
                    SET rank = CASE 
                        WHEN rt.new_rank <= 20 THEN rt.new_rank 
                        ELSE NULL 
                    END
                    FROM RankedTokens rt
                    WHERE t.id = rt.id`
                );

                // Update every minute
                await sleep(60 * 1000);
            } catch (error) {
                console.error('Error updating top tokens:', error);
                await sleep(5000);
            }
        }
    }

    stop() {
        this.isRunning = false;
    }
} 