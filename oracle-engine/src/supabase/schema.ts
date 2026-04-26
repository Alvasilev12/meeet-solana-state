/**
 * Supabase Database Schema
 * SQL migrations for the Oracle Prediction Engine
 */

export const SUPABASE_SCHEMA = `
-- ============================================================
-- MEEET Oracle Prediction Engine - Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Predictions Table
-- Stores prediction questions and their outcomes
-- ============================================================
CREATE TABLE IF NOT EXISTS oracle_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    description TEXT,
    options JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'resolved', 'cancelled')),
    resolved_outcome VARCHAR(100),
    confidence DECIMAL(5,4) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
    source_data JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolution_date TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oracle_predictions_status ON oracle_predictions(status);
CREATE INDEX idx_oracle_predictions_category ON oracle_predictions(category);
CREATE INDEX idx_oracle_predictions_market ON oracle_predictions(market);
CREATE INDEX idx_oracle_predictions_created ON oracle_predictions(created_at);
CREATE INDEX idx_oracle_predictions_resolution ON oracle_predictions(resolution_date);

-- ============================================================
-- Agent Votes Table
-- Stores individual agent votes for predictions
-- ============================================================
CREATE TABLE IF NOT EXISTS oracle_agent_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(100) NOT NULL,
    prediction_id UUID NOT NULL REFERENCES oracle_predictions(id) ON DELETE CASCADE,
    selected_option VARCHAR(100) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    reasoning TEXT NOT NULL DEFAULT '',
    weight DECIMAL(5,4) NOT NULL DEFAULT 1.0 CHECK (weight >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(agent_id, prediction_id)
);

CREATE INDEX idx_oracle_agent_votes_agent ON oracle_agent_votes(agent_id);
CREATE INDEX idx_oracle_agent_votes_prediction ON oracle_agent_votes(prediction_id);
CREATE INDEX idx_oracle_agent_votes_created ON oracle_agent_votes(created_at);

-- ============================================================
-- Agent Profiles Table
-- Stores agent performance metrics and profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS oracle_agent_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    specialties TEXT[] NOT NULL DEFAULT '{}',
    total_predictions INTEGER NOT NULL DEFAULT 0,
    correct_predictions INTEGER NOT NULL DEFAULT 0,
    accuracy DECIMAL(5,4) NOT NULL DEFAULT 0 CHECK (accuracy >= 0 AND accuracy <= 1),
    streak INTEGER NOT NULL DEFAULT 0,
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reputation INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oracle_agent_profiles_accuracy ON oracle_agent_profiles(accuracy DESC);
CREATE INDEX idx_oracle_agent_profiles_reputation ON oracle_agent_profiles(reputation DESC);

-- ============================================================
-- Prediction Records Table
-- Stores resolved prediction outcomes for accuracy tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS oracle_prediction_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID NOT NULL REFERENCES oracle_predictions(id) ON DELETE CASCADE,
    predicted_outcome VARCHAR(100) NOT NULL,
    actual_outcome VARCHAR(100) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    is_correct BOOLEAN NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oracle_prediction_records_category ON oracle_prediction_records(category);
CREATE INDEX idx_oracle_prediction_records_correct ON oracle_prediction_records(is_correct);
CREATE INDEX idx_oracle_prediction_records_resolved ON oracle_prediction_records(resolved_at);

-- ============================================================
-- Source Data Cache Table
-- Caches API responses for efficiency
-- ============================================================
CREATE TABLE IF NOT EXISTS oracle_source_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL,
    query_key VARCHAR(200) NOT NULL,
    response_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(source, query_key)
);

CREATE INDEX idx_oracle_source_cache_expires ON oracle_source_cache(expires_at);
CREATE INDEX idx_oracle_source_cache_source ON oracle_source_cache(source);

-- ============================================================
-- Accuracy Metrics Table
-- Stores pre-computed accuracy metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS oracle_accuracy_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    total_predictions INTEGER NOT NULL DEFAULT 0,
    correct_predictions INTEGER NOT NULL DEFAULT 0,
    accuracy DECIMAL(5,4) NOT NULL DEFAULT 0,
    avg_confidence DECIMAL(5,4) NOT NULL DEFAULT 0,
    brier_score DECIMAL(5,4) NOT NULL DEFAULT 1,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(metric_type, entity_id)
);

CREATE INDEX idx_oracle_accuracy_metrics_type ON oracle_accuracy_metrics(metric_type);
CREATE INDEX idx_oracle_accuracy_metrics_accuracy ON oracle_accuracy_metrics(accuracy DESC);

-- ============================================================
-- Views
-- ============================================================

-- Active predictions view
CREATE OR REPLACE VIEW oracle_active_predictions AS
SELECT * FROM oracle_predictions
WHERE status = 'active' AND resolution_date > NOW();

-- Pending predictions view
CREATE OR REPLACE VIEW oracle_pending_predictions AS
SELECT * FROM oracle_predictions
WHERE status = 'pending' AND resolution_date > NOW();

-- Resolved predictions with accuracy
CREATE OR REPLACE VIEW oracle_resolved_with_accuracy AS
SELECT
    p.*,
    r.predicted_outcome,
    r.actual_outcome,
    r.is_correct,
    r.resolved_at
FROM oracle_predictions p
LEFT JOIN oracle_prediction_records r ON p.id = r.prediction_id
WHERE p.status = 'resolved';

-- Agent leaderboard
CREATE OR REPLACE VIEW oracle_agent_leaderboard AS
SELECT
    agent_id,
    name,
    total_predictions,
    correct_predictions,
    accuracy,
    streak,
    reputation,
    last_active
FROM oracle_agent_profiles
WHERE total_predictions > 0
ORDER BY accuracy DESC, total_predictions DESC;

-- ============================================================
-- Functions
-- ============================================================

-- Update agent accuracy after a prediction is resolved
CREATE OR REPLACE FUNCTION update_agent_accuracy()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE oracle_agent_profiles
    SET
        total_predictions = total_predictions + 1,
        correct_predictions = correct_predictions + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
        accuracy = CASE
            WHEN total_predictions = 0 THEN CASE WHEN NEW.is_correct THEN 1.0 ELSE 0.0 END
            ELSE (correct_predictions + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END)::DECIMAL / (total_predictions + 1)
        END,
        streak = CASE
            WHEN NEW.is_correct THEN streak + 1
            ELSE 0
        END,
        last_active = NOW(),
        updated_at = NOW()
    WHERE agent_id = (
        SELECT DISTINCT agent_id
        FROM oracle_agent_votes
        WHERE prediction_id = NEW.prediction_id
        LIMIT 1
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for accuracy updates
DROP TRIGGER IF EXISTS on_prediction_resolved ON oracle_prediction_records;
CREATE TRIGGER on_prediction_resolved
    AFTER INSERT ON oracle_prediction_records
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_accuracy();

-- Update prediction status
CREATE OR REPLACE FUNCTION update_prediction_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE oracle_predictions
    SET
        status = 'resolved',
        resolved_outcome = NEW.actual_outcome,
        updated_at = NOW()
    WHERE id = NEW.prediction_id AND status != 'resolved';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_prediction_record_created ON oracle_prediction_records;
CREATE TRIGGER on_prediction_record_created
    AFTER INSERT ON oracle_prediction_records
    FOR EACH ROW
    EXECUTE FUNCTION update_prediction_status();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE oracle_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_agent_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_prediction_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_source_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_accuracy_metrics ENABLE ROW LEVEL SECURITY;

-- Predictions: anyone can read, only authenticated users can write
CREATE POLICY "Predictions are viewable by everyone"
    ON oracle_predictions FOR SELECT
    USING (true);

CREATE POLICY "Predictions can be inserted by authenticated users"
    ON oracle_predictions FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Predictions can be updated by authenticated users"
    ON oracle_predictions FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- Agent votes: anyone can read, only the agent can vote
CREATE POLICY "Agent votes are viewable by everyone"
    ON oracle_agent_votes FOR SELECT
    USING (true);

CREATE POLICY "Agents can vote"
    ON oracle_agent_votes FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Agent profiles: anyone can read
CREATE POLICY "Agent profiles are viewable by everyone"
    ON oracle_agent_profiles FOR SELECT
    USING (true);

-- Prediction records: anyone can read
CREATE POLICY "Prediction records are viewable by everyone"
    ON oracle_prediction_records FOR SELECT
    USING (true);

-- Source cache: service role only
CREATE POLICY "Source cache is viewable by service role"
    ON oracle_source_cache FOR SELECT
    USING (auth.jwt()->>'role' = 'service_role');

-- Accuracy metrics: anyone can read
CREATE POLICY "Accuracy metrics are viewable by everyone"
    ON oracle_accuracy_metrics FOR SELECT
    USING (true);
`;

/**
 * Seed data for testing
 */
export const SEED_DATA = `
-- Insert test agents
INSERT INTO oracle_agent_profiles (agent_id, name, specialties, total_predictions, correct_predictions, accuracy, streak, reputation)
VALUES
    ('agent_crypto_pro', 'CryptoPro Agent', ARRAY['crypto'], 150, 120, 0.80, 8, 850),
    ('agent_sports_expert', 'SportsExpert Agent', ARRAY['sports'], 120, 96, 0.80, 5, 720),
    ('agent_news_analyst', 'NewsAnalyst Agent', ARRAY['news', 'economics'], 100, 78, 0.78, 3, 650),
    ('agent_quantum', 'Quantum Agent', ARRAY['crypto', 'news'], 80, 64, 0.80, 4, 580),
    ('agent_biotech', 'Biotech Agent', ARRAY['news'], 60, 45, 0.75, 2, 420)
ON CONFLICT (agent_id) DO NOTHING;

-- Insert sample prediction
INSERT INTO oracle_predictions (id, market, category, question, description, options, status, confidence, source_data, resolution_date)
VALUES
    (
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'crypto_price',
        'crypto',
        'Will Bitcoin be above $100,000 by end of month?',
        'Prediction for BTC price movement based on market analysis',
        ''[{"value":"yes","label":"Yes - Above $100K","probability":0.65},{"value":"no","label":"No - Below $100K","probability":0.35}]''::jsonb,
        'active',
        0.65,
        ''{"coingecko":{"price":95000,"trend":"up"},"coinmarketcap":{"price":95200,"trend":"up"}}''::jsonb,
        NOW() + INTERVAL '30 days'
    )
ON CONFLICT (id) DO NOTHING;
`;
