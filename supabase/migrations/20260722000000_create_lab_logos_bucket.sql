-- Create public storage bucket for lab logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-logos', 'lab-logos', true)
ON CONFLICT (id) DO NOTHING;
