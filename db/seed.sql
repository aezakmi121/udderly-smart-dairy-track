-- Database seed file for Dairy Farm Manager
-- This file contains initial data setup for the application

-- 1. Create an admin user role
-- IMPORTANT: Replace <AUTH_UUID> with the actual UUID of your authenticated user
-- You can find this in the Supabase Auth dashboard after your first login

-- Example:
-- insert into public.user_roles (user_id, role) 
-- values ('12345678-1234-1234-1234-123456789abc', 'admin') 
-- on conflict (user_id, role) do nothing;

insert into public.user_roles (user_id, role) 
values ('<AUTH_UUID>', 'admin') 
on conflict (user_id, role) do nothing;

-- 2. Optional: Add sample data for testing
-- Uncomment and modify as needed

-- Sample cow statuses and breeds (if not already defined)
-- insert into public.cow_breeds (name) values 
--   ('Holstein'), 
--   ('Jersey'), 
--   ('Gir'), 
--   ('Sahiwal')
-- on conflict do nothing;

-- Sample cows (uncomment and modify as needed)
-- insert into public.cows (cow_number, breed, date_of_arrival, status) values
--   ('001', 'Holstein', '2024-01-15', 'active'),
--   ('002', 'Jersey', '2024-01-20', 'active'),
--   ('003', 'Gir', '2024-02-01', 'pregnant')
-- on conflict do nothing;

-- Note: Run this file via the Supabase SQL Editor
-- Dashboard -> SQL Editor -> New Query -> Paste contents -> Run