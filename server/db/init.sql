CREATE TABLE scans (
    id SERIAL PRIMARY KEY,
    scan_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scan_type VARCHAR(50) NOT NULL, -- 'daily' or 'test'
    status VARCHAR(50) NOT NULL -- 'completed', 'failed'
);

CREATE TABLE tokens (
    id SERIAL PRIMARY KEY,
    address VARCHAR(44) NOT NULL UNIQUE,
    name VARCHAR(100),
    symbol VARCHAR(50),
    current_price DECIMAL,
    price_change_24h DECIMAL,
    volume_24h DECIMAL,
    market_cap DECIMAL,
    fdv DECIMAL,
    liquidity DECIMAL,
    holder_count INTEGER,
    total_score DECIMAL,
    rank INTEGER,
    needs_analysis BOOLEAN DEFAULT true,
    last_analysis_timestamp TIMESTAMP,
    is_new BOOLEAN DEFAULT true,
    first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE token_metrics_history (
    id SERIAL PRIMARY KEY,
    token_id INTEGER REFERENCES tokens(id),
    price DECIMAL,
    price_change_24h DECIMAL,
    volume_24h DECIMAL,
    market_cap DECIMAL,
    fdv DECIMAL,
    liquidity DECIMAL,
    holder_count INTEGER,
    total_score DECIMAL,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tokens_address ON tokens(address);
CREATE INDEX idx_tokens_needs_analysis ON tokens(needs_analysis) WHERE needs_analysis = true;
CREATE INDEX idx_tokens_rank ON tokens(rank) WHERE rank IS NOT NULL;
CREATE INDEX idx_token_metrics_history_token_id ON token_metrics_history(token_id);
CREATE INDEX idx_token_metrics_history_recorded_at ON token_metrics_history(recorded_at); 