-- Migration to add description column to driver_expenses table
-- Run this in your Supabase SQL editor

ALTER TABLE driver_expenses 
ADD COLUMN IF NOT EXISTS description TEXT;
