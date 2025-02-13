CREATE TABLE scans (
    id SERIAL PRIMARY KEY,
    scan_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scan_type VARCHAR(50) NOT NULL, -- 'daily' or 'test'
    status VARCHAR(50) NOT NULL -- 'completed', 'failed'
);

CREATE TABLE tokens (
    id SERIAL PRIMARY KEY,
    scan_id INTEGER REFERENCES scans(id),
    address VARCHAR(44) NOT NULL,
    name VARCHAR(100),
    symbol VARCHAR(20),
    current_price DECIMAL,
    price_change_24h DECIMAL,
    volume_24h DECIMAL,
    market_cap DECIMAL,
    fdv DECIMAL,
    liquidity DECIMAL,
    holder_count INTEGER,
    total_score DECIMAL,
    rank INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tokens_scan_id ON tokens(scan_id);
CREATE INDEX idx_tokens_address ON tokens(address); 