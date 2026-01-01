-- Add amenities and vessel size constraints to berths table
-- Run this in Supabase SQL Editor

-- Add water connection column
ALTER TABLE berths ADD COLUMN IF NOT EXISTS has_water BOOLEAN DEFAULT false;

-- Add electricity connection column
ALTER TABLE berths ADD COLUMN IF NOT EXISTS has_electricity BOOLEAN DEFAULT false;

-- Add maximum vessel dimensions this berth can accommodate
ALTER TABLE berths ADD COLUMN IF NOT EXISTS max_vessel_length DECIMAL(5,2);
ALTER TABLE berths ADD COLUMN IF NOT EXISTS max_vessel_width DECIMAL(5,2);

-- Add comments for documentation
COMMENT ON COLUMN berths.has_water IS 'Whether the berth has a water connection';
COMMENT ON COLUMN berths.has_electricity IS 'Whether the berth has an electricity connection';
COMMENT ON COLUMN berths.max_vessel_length IS 'Maximum vessel length (m) this berth can accommodate';
COMMENT ON COLUMN berths.max_vessel_width IS 'Maximum vessel width/beam (m) this berth can accommodate';

-- Update existing berths with default values based on their size
-- Larger berths (>12m) typically have both amenities
UPDATE berths
SET
  has_water = CASE WHEN length >= 12 THEN true ELSE false END,
  has_electricity = CASE WHEN length >= 10 THEN true ELSE false END,
  max_vessel_length = CASE WHEN length IS NOT NULL THEN length - 0.5 ELSE NULL END,
  max_vessel_width = CASE WHEN width IS NOT NULL THEN width - 0.3 ELSE NULL END
WHERE has_water IS NULL OR has_electricity IS NULL;
