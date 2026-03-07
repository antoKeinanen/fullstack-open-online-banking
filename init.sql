CREATE SCHEMA IF NOT EXISTS banking;

CREATE TABLE banking.users (
    user_id VARCHAR(32) PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    address VARCHAR(500),
    birth_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_phone_verification TIMESTAMP WITH TIME ZONE,

    stripe_customer_id VARCHAR(255),
    stripe_account_id VARCHAR(255),

    CONSTRAINT unique_phone_number UNIQUE (phone_number),
    CONSTRAINT unique_stripe_customer_id UNIQUE (stripe_customer_id),
    CONSTRAINT unique_stripe_account_id UNIQUE (stripe_account_id)
);
CREATE INDEX idx_users_phone_number ON banking.users (phone_number);
CREATE INDEX idx_users_stripe_customer_id ON banking.users (stripe_customer_id);
CREATE INDEX idx_users_stripe_account_id ON banking.users (stripe_account_id);
CREATE INDEX idx_users_created_at ON banking.users (created_at);

CREATE TABLE banking.one_time_passcodes (
    user_id VARCHAR(32) PRIMARY KEY REFERENCES banking.users(user_id) ON DELETE CASCADE,
    one_time_passcode_hash VARCHAR(255) NOT NULL,
    expires TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX idx_otp_expires ON banking.one_time_passcodes (expires);

CREATE TABLE banking.sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES banking.users(user_id) ON DELETE CASCADE,
    expires TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    device VARCHAR(500),
    application VARCHAR(100),
    ip_address INET
);
CREATE INDEX idx_sessions_user_id ON banking.sessions (user_id);
CREATE INDEX idx_sessions_expires ON banking.sessions (expires);
CREATE INDEX idx_sessions_user_expires ON banking.sessions (user_id, expires);

CREATE TABLE banking.transfers (
    transfer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tigerbeetle_transfer_id VARCHAR(32) NOT NULL,
    from_user_id VARCHAR(32) NOT NULL REFERENCES banking.users(user_id),
    to_user_id VARCHAR(32) NOT NULL REFERENCES banking.users(user_id),
    amount DECIMAL(39, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT check_different_users CHECK (from_user_id != to_user_id),
    CONSTRAINT unique_tigerbeetle_transfer UNIQUE (tigerbeetle_transfer_id)
);
CREATE INDEX idx_transfers_from_user ON banking.transfers (from_user_id);
CREATE INDEX idx_transfers_to_user ON banking.transfers (to_user_id);
CREATE INDEX idx_transfers_created_at ON banking.transfers (created_at DESC);
CREATE INDEX idx_transfers_from_user_created ON banking.transfers (from_user_id, created_at DESC);
CREATE INDEX idx_transfers_to_user_created ON banking.transfers (to_user_id, created_at DESC);

CREATE TABLE banking.deposits (
    deposit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_payment_intent_id VARCHAR(255) NOT NULL,
    tigerbeetle_transfer_id VARCHAR(32) NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(32) NOT NULL REFERENCES banking.users(user_id),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    posted_at TIMESTAMP WITH TIME ZONE,
    voided_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT check_valid_status CHECK (payment_status IN ('pending', 'posted', 'voided')),
    CONSTRAINT unique_stripe_payment_intent UNIQUE (stripe_payment_intent_id),
    CONSTRAINT unique_deposit_tb_transfer UNIQUE (tigerbeetle_transfer_id)
);
CREATE INDEX idx_deposits_user_id ON banking.deposits (user_id);
CREATE INDEX idx_deposits_stripe_customer ON banking.deposits (stripe_customer_id);
CREATE INDEX idx_deposits_payment_status ON banking.deposits (payment_status);
CREATE INDEX idx_deposits_created_at ON banking.deposits (created_at DESC);
CREATE INDEX idx_deposits_pending ON banking.deposits (stripe_payment_intent_id)
    WHERE payment_status = 'pending';

CREATE TABLE banking.payouts (
    payout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tigerbeetle_transfer_id VARCHAR(32) NOT NULL,
    stripe_payout_id VARCHAR(255),
    stripe_account_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(32) NOT NULL REFERENCES banking.users(user_id),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    posted_at TIMESTAMP WITH TIME ZONE,
    voided_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT check_valid_payout_status CHECK (payment_status IN ('pending', 'posted', 'voided')),
    CONSTRAINT unique_payout_tb_transfer UNIQUE (tigerbeetle_transfer_id),
    CONSTRAINT unique_stripe_payout UNIQUE (stripe_payout_id)
);
CREATE INDEX idx_payouts_user_id ON banking.payouts (user_id);
CREATE INDEX idx_payouts_stripe_account ON banking.payouts (stripe_account_id);
CREATE INDEX idx_payouts_payment_status ON banking.payouts (payment_status);
CREATE INDEX idx_payouts_created_at ON banking.payouts (created_at DESC);
CREATE INDEX idx_payouts_stripe_payout ON banking.payouts (stripe_payout_id)
    WHERE stripe_payout_id IS NOT NULL;
CREATE INDEX idx_payouts_pending ON banking.payouts (stripe_payout_id)
    WHERE payment_status = 'pending';