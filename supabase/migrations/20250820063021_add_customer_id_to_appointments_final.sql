ALTER TABLE public.appointments
ADD COLUMN customer_id UUID REFERENCES public.customers(id);
