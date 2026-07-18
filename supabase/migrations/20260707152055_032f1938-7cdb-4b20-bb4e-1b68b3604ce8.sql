
-- Public read (needed for directory and store hero)
CREATE POLICY "Public read lab-logos"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'lab-logos');

-- Lab members can upload/update/delete their own lab's logo.
-- Path convention: "{lab_id}.png" or "{lab_id}/..."
CREATE POLICY "Lab members write own logo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lab-logos'
    AND (split_part(name, '.', 1))::uuid IN (
      SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Lab members update own logo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'lab-logos'
    AND (split_part(name, '.', 1))::uuid IN (
      SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Lab members delete own logo"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'lab-logos'
    AND (split_part(name, '.', 1))::uuid IN (
      SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid()
    )
  );
