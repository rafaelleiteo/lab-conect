-- Grant permissions on order_claims to service_role and postgres
GRANT ALL ON TABLE public.order_claims TO service_role;
GRANT ALL ON TABLE public.order_claims TO postgres;
