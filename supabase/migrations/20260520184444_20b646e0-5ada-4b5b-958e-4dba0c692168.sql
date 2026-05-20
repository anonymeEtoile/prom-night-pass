
ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.scan_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_settings;
