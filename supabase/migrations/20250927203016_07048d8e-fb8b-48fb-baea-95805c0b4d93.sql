-- Create FocusAreas table
CREATE TABLE public.focus_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  example_reps TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.focus_areas ENABLE ROW LEVEL SECURITY;

-- Create policies for focus areas (readable by everyone, manageable by authenticated users)
CREATE POLICY "Focus areas are viewable by everyone" 
ON public.focus_areas 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create focus areas" 
ON public.focus_areas 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update focus areas" 
ON public.focus_areas 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete focus areas" 
ON public.focus_areas 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_focus_areas_updated_at
BEFORE UPDATE ON public.focus_areas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();