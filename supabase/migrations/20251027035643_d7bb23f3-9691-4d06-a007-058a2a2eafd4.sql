-- Add subscription tracking fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscribed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_product_id text,
ADD COLUMN IF NOT EXISTS subscription_end timestamp with time zone;