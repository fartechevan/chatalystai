ALTER TABLE public.broadcasts
ADD COLUMN segment_id UUID,
ADD CONSTRAINT fk_segment_id
  FOREIGN KEY (segment_id)
  REFERENCES public.segments(id)
  ON DELETE SET NULL;
