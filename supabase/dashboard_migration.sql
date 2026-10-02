create or replace function public.update_anomaly_status(
  p_anomaly_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if p_status not in ('open', 'reviewed', 'discarded') then
    raise exception 'El estado de la anomalía no es válido.';
  end if;

  update public.anomalies
  set status = p_status,
      updated_at = now()
  where id = p_anomaly_id
  returning jsonb_build_object('id', id, 'status', status)
  into v_result;

  return v_result;
end;
$$;

alter function public.process_transaction(
  text, text, timestamptz, numeric, text, text, boolean, text, text, integer, integer
) security definer;
alter function public.process_transaction(
  text, text, timestamptz, numeric, text, text, boolean, text, text, integer, integer
) set search_path = public;
alter function public.get_transaction_dashboard() security definer;
alter function public.get_transaction_dashboard() set search_path = public;
alter function public.update_anomaly_status(uuid, text) security definer;
alter function public.update_anomaly_status(uuid, text) set search_path = public;

revoke all on function public.process_transaction(
  text, text, timestamptz, numeric, text, text, boolean, text, text, integer, integer
) from public, anon, authenticated;
revoke all on function public.get_transaction_dashboard()
  from public, anon, authenticated;
revoke all on function public.update_anomaly_status(uuid, text)
  from public, anon, authenticated;

grant usage on schema public to service_role;
grant execute on function public.process_transaction(
  text, text, timestamptz, numeric, text, text, boolean, text, text, integer, integer
) to service_role;
grant execute on function public.get_transaction_dashboard()
  to service_role;
grant execute on function public.update_anomaly_status(uuid, text)
  to service_role;

with qualifying_transactions as (
  select id, transaction_count
  from (
    select
      id,
      count(*) over (
        partition by user_id
        order by transaction_date
        range between interval '3 seconds' preceding and current row
      )::integer as transaction_count
    from public.transactions
    where hash_valid
  ) transaction_windows
  where transaction_count >= 3
)
insert into public.anomalies (
  transaction_id,
  type,
  level,
  transaction_count,
  window_seconds
)
select
  id,
  'POSIBLE_FRAUDE',
  case
    when transaction_count >= 9 then 'critical'
    when transaction_count >= 6 then 'high'
    else 'medium'
  end,
  transaction_count,
  3
from qualifying_transactions
on conflict (transaction_id, type) do nothing;
