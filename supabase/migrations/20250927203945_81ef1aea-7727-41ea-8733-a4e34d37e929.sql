-- Update user_profiles table to store focus area IDs instead of strings
ALTER TABLE public.user_profiles 
DROP COLUMN focus_areas;

ALTER TABLE public.user_profiles 
ADD COLUMN focus_area_ids UUID[] DEFAULT '{}';

-- Add some sample focus areas to get started
INSERT INTO public.focus_areas (title, description, example_reps) VALUES
('Fitness', 'Physical health and exercise activities', ARRAY['Do 20 push-ups', '10-minute walk', 'Drink 8 glasses of water']),
('Mindset', 'Mental resilience and positive thinking', ARRAY['Practice 5 minutes of meditation', 'Write 3 gratitudes', 'Read one motivational quote']),
('Relationships', 'Building and maintaining meaningful connections', ARRAY['Call a friend or family member', 'Send a thoughtful message', 'Practice active listening']),
('Career', 'Professional development and growth', ARRAY['Update your LinkedIn profile', 'Learn a new skill for 30 minutes', 'Network with one professional']),
('Faith', 'Spiritual growth and practices', ARRAY['Read scripture for 10 minutes', 'Pray or meditate', 'Attend a service or spiritual gathering']),
('Health', 'Overall wellness and self-care', ARRAY['Get 8 hours of sleep', 'Eat a nutritious meal', 'Take vitamins or supplements']),
('Hobbies', 'Personal interests and creative pursuits', ARRAY['Practice your hobby for 30 minutes', 'Learn something new about your interest', 'Share your hobby with someone']),
('Learning', 'Continuous education and skill development', ARRAY['Read for 20 minutes', 'Watch an educational video', 'Practice a new language']),
('Emotional Wellbeing', 'Mental health and emotional balance', ARRAY['Journal about your day', 'Practice deep breathing', 'Do something that makes you happy']);