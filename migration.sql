-- Tambahkan kolom email_signup dan password ke tabel users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_signup VARCHAR(255),
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Tambahkan unique constraint ke kolom email_signup
ALTER TABLE users
ADD CONSTRAINT users_email_signup_key UNIQUE (email_signup); 