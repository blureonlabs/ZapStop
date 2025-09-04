-- Add new columns to driver_earnings table for ride tracking
ALTER TABLE driver_earnings 
ADD COLUMN IF NOT EXISTS uber_rides_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bolt_rides_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS individual_rides_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS individual_rides_cash DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS individual_rides_account DECIMAL(10,2) DEFAULT 0.00;

-- Update the total calculation to include individual rides
-- Note: The total will now be calculated as: uber_cash + uber_account + bolt_cash + bolt_account + individual_rides_cash + individual_rides_account

-- Create index for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_driver_earnings_ride_counts ON driver_earnings(uber_rides_count, bolt_rides_count, individual_rides_count);
