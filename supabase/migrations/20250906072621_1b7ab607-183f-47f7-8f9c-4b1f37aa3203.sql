-- Enable password strength and leaked password protection
UPDATE auth.config 
SET password_min_length = 8, 
    password_require_uppercase = true, 
    password_require_lowercase = true, 
    password_require_numbers = true,
    enable_password_leak_protection = true;