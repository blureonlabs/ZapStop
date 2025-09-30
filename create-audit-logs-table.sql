-- Create admin_audit_logs table for tracking manual updates
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL, -- e.g., 'earnings_create', 'expenses_bulk_approve'
    target_type VARCHAR(50) NOT NULL, -- 'earnings' or 'expenses'
    target_id UUID, -- ID of the affected record
    details JSONB, -- Additional details about the action
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type ON admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
