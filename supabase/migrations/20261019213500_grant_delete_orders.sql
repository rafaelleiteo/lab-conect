-- Grant delete on orders to authenticated so dentists can delete their draft orders per policy "Dentist deletes draft orders"
GRANT DELETE ON public.orders TO authenticated;
