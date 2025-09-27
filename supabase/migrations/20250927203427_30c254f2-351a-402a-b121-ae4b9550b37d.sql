-- Create Reps table
CREATE TABLE public.reps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  focus_area_id UUID REFERENCES public.focus_areas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced', 'Pro')),
  format TEXT CHECK (format IN ('Text', 'Challenge', 'Video', 'Mixed')),
  estimated_time INTEGER, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.reps ENABLE ROW LEVEL SECURITY;

-- Create policies for reps (readable by everyone, manageable by authenticated users)
CREATE POLICY "Reps are viewable by everyone" 
ON public.reps 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create reps" 
ON public.reps 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update reps" 
ON public.reps 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete reps" 
ON public.reps 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_reps_updated_at
BEFORE UPDATE ON public.reps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance on focus area queries
CREATE INDEX idx_reps_focus_area_id ON public.reps(focus_area_id);