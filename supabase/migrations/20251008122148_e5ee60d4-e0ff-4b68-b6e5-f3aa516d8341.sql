-- Make expense-receipts bucket public so receipt images can be viewed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'expense-receipts';