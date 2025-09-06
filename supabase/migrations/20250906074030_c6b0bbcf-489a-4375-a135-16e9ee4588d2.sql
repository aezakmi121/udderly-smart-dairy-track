-- Enable password strength and leaked password protection for security
UPDATE auth.config SET password_min_length = 8;