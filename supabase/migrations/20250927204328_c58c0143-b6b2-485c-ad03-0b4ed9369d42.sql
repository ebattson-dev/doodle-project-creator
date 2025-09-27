-- Create table to track daily rep assignments
CREATE TABLE public.daily_rep_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rep_id UUID NOT NULL REFERENCES public.reps(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one rep per user per day
  UNIQUE(user_id, assigned_date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_rep_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for daily rep assignments
CREATE POLICY "Users can view their own assignments" 
ON public.daily_rep_assignments 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own assignments" 
ON public.daily_rep_assignments 
FOR UPDATE 
USING (auth.uid()::text = user_id::text);

-- Only the system can create assignments (edge function)
CREATE POLICY "System can create assignments" 
ON public.daily_rep_assignments 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_rep_assignments_updated_at
BEFORE UPDATE ON public.daily_rep_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_daily_rep_assignments_user_date ON public.daily_rep_assignments(user_id, assigned_date);
CREATE INDEX idx_daily_rep_assignments_date ON public.daily_rep_assignments(assigned_date);

-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;