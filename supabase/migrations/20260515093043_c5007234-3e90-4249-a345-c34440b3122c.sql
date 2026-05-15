ALTER TABLE public.panel_logs ALTER COLUMN source SET DEFAULT 'tigerhost_panel';
UPDATE public.panel_logs SET source = 'tigerhost_panel' WHERE source = 'hvm_panel';