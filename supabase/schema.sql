create extension if not exists pgcrypto;

-- Identidad por correo: una fila representa al usuario dueño de sus transacciones.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  state text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Registro persistente de cada transacción y del resultado de validar su hash.
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  id_txn text not null unique,
  user_id uuid not null references public.users(id),
  value numeric(14, 2) not null check (value >= 0),
  transaction_date timestamptz not null,
  payment_method text not null,
  state text not null default 'received',
  ip text,
  hash text not null,
  hash_valid boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, transaction_date);
create index if not exists transactions_date_idx
  on public.transactions (transaction_date);

-- Casos detectados; el tipo evita duplicar el mismo caso para una transacción.
create table if not exists public.anomalies (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id),
  type text not null default 'POSIBLE_FRAUDE',
  level text not null default 'medium'
    check (level in ('low', 'medium', 'high', 'critical')),
  transaction_count integer not null,
  window_seconds integer not null,
  window_size integer,
  status text not null default 'open'
    check (status in ('open', 'reviewed', 'discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (transaction_id, type)
);

alter table public.anomalies
  add column if not exists window_size integer;

create index if not exists anomalies_created_at_idx
  on public.anomalies (created_at desc);
create index if not exists anomalies_status_idx
  on public.anomalies (status);

insert into public.anomalies (
  transaction_id, type, level, transaction_count, window_seconds, window_size
)
select
  id, 'HASH_INVALIDO', 'medium', 1, 3, 3
from public.transactions
where not hash_valid
on conflict (transaction_id, type) do nothing;

alter table public.users enable row level security;
alter table public.transactions enable row level security;
alter table public.anomalies enable row level security;

drop function if exists public.process_transaction(
  text, text, timestamptz, numeric, text, text, boolean, text, text, integer, integer
);

-- Guarda una transacción, marca hashes inválidos y detecta exceso de velocidad por usuario.
create or replace function public.process_transaction(
  p_id_txn text,
  p_user_email text,
  p_date timestamptz,
  p_value numeric,
  p_payment_method text,
  p_hash text,
  p_hash_valid boolean,
  p_ip text,
  p_state text,
  p_window_seconds integer,
  p_threshold integer,
  p_window_size integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_transaction_id uuid;
  v_window_count integer;
  v_anomaly_id uuid;
  v_hash_anomaly_id uuid;
  v_level text;
begin
  -- Verifica parámetros incluso si la llamada no provino del endpoint esperado.
  if p_window_seconds < 1 or p_threshold < 2 or p_window_size < 1 then
    raise exception 'La duración, el umbral y el tamaño de ventana deben ser válidos.';
  end if;
  if p_window_size < p_threshold then
    raise exception 'El tamaño de ventana no puede ser menor que el umbral.';
  end if;

  -- Serializa el procesamiento por correo para evitar carreras en la misma ventana.
  perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_user_email)), 0));

  -- Normaliza el correo y obtiene/crea el usuario al que pertenecerá la transacción.
  insert into public.users (email)
  values (lower(trim(p_user_email)))
  on conflict (email) do update
    set updated_at = now()
  returning id into v_user_id;

  -- Inserta una vez por id_txn; el conflicto identifica una transacción duplicada.
  insert into public.transactions (
    id_txn, user_id, value, transaction_date, payment_method, state, ip, hash, hash_valid
  )
  values (
    p_id_txn, v_user_id, p_value, p_date, p_payment_method,
    coalesce(nullif(p_state, ''), 'received'), p_ip, p_hash, p_hash_valid
  )
  on conflict (id_txn) do nothing
  returning id into v_transaction_id;

  if v_transaction_id is null then
    return jsonb_build_object(
      'duplicate', true,
      'idTxn', p_id_txn,
      'hashValid', p_hash_valid,
      'windowCount', 0,
      'windowSize', p_window_size,
      'anomaly', false
    );
  end if;

  -- Si el HMAC no coincide, conserva la transacción y crea HASH_INVALIDO nivel medium;
  -- esta condición no rechaza el registro, pero su hash_valid=false lo excluye del conteo de velocidad.
  if not p_hash_valid then
    insert into public.anomalies (
      transaction_id, type, level, transaction_count, window_seconds, window_size
    )
    values (
      v_transaction_id, 'HASH_INVALIDO', 'medium', 1, p_window_seconds, p_window_size
    )
    on conflict (transaction_id, type) do nothing
    returning id into v_hash_anomaly_id;
  end if;

  -- Cuenta para este usuario únicamente hashes válidos: primero toma las p_window_size
  -- más recientes hasta p_date y luego conserva las que caen dentro de p_window_seconds.
  select count(*)::integer
  into v_window_count
  from (
    select t.transaction_date
    from public.transactions t
    where t.user_id = v_user_id
      and t.hash_valid
      and t.transaction_date <= p_date
    order by t.transaction_date desc, t.created_at desc, t.id desc
    limit p_window_size
  ) recent_transactions
  where recent_transactions.transaction_date >=
      p_date - make_interval(secs => p_window_seconds);

  -- Solo un hash válido puede generar POSIBLE_FRAUDE por velocidad, al alcanzar el umbral.
  if p_hash_valid and v_window_count >= p_threshold then
    -- El nivel depende del conteo: 3x umbral = critical; 2x = high; umbral = medium.
    v_level := case
      when v_window_count >= p_threshold * 3 then 'critical'
      when v_window_count >= p_threshold * 2 then 'high'
      else 'medium'
    end;

    insert into public.anomalies (
      transaction_id, type, level, transaction_count, window_seconds, window_size
    )
    values (
      v_transaction_id, 'POSIBLE_FRAUDE', v_level, v_window_count,
      p_window_seconds, p_window_size
    )
    on conflict (transaction_id, type) do nothing
    returning id into v_anomaly_id;
  end if;

  -- Informa si se creó anomalía, sus tipos e ID; también devuelve el conteo evaluado.
  return jsonb_build_object(
    'duplicate', false,
    'idTxn', p_id_txn,
    'transactionId', v_transaction_id,
    'hashValid', p_hash_valid,
    'windowCount', v_window_count,
    'windowSize', p_window_size,
    'anomaly', (v_anomaly_id is not null or v_hash_anomaly_id is not null),
    'anomalyTypes', to_jsonb(array_remove(array[
      case when v_hash_anomaly_id is not null then 'HASH_INVALIDO' end,
      case when v_anomaly_id is not null then 'POSIBLE_FRAUDE' end
    ]::text[], null::text)),
    'anomalyId', coalesce(v_anomaly_id, v_hash_anomaly_id),
    'type', case
      when v_hash_anomaly_id is not null then 'HASH_INVALIDO'
      when v_anomaly_id is not null then 'POSIBLE_FRAUDE'
      else null
    end
  );
end;
$$;

-- Calcula las métricas y series agregadas que devuelve GET /api/dashboard.
create or replace function public.get_transaction_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_count bigint;
  v_today_value numeric;
  v_week_count bigint;
  v_week_value numeric;
  v_month_count bigint;
  v_month_value numeric;
  v_total_count bigint;
  v_total_anomalies bigint;
  v_invalid_hashes bigint;
  v_affected_users bigint;
  v_suspicious_value numeric;
  v_user_count bigint;
  v_open_count bigint;
  v_reviewed_count bigint;
  v_discarded_count bigint;
  v_hourly jsonb;
  v_weekly jsonb;
  v_payment_methods jsonb;
  v_recurrent_users jsonb;
  v_recent_anomalies jsonb;
begin
  -- Agrega conteos y montos para hoy, esta semana y este mes.
  select count(*), coalesce(sum(value), 0)
  into v_today_count, v_today_value
  from public.transactions
  where transaction_date >= current_date;

  select count(*), coalesce(sum(value), 0)
  into v_week_count, v_week_value
  from public.transactions
  where transaction_date >= date_trunc('week', now());

  select count(*), coalesce(sum(value), 0)
  into v_month_count, v_month_value
  from public.transactions
  where transaction_date >= date_trunc('month', now());

  select count(*), count(distinct user_id)
  into v_total_count, v_user_count
  from public.transactions;

  -- Cuenta por separado los hashes inválidos para mostrarlos como métrica.
  select count(*)
  into v_invalid_hashes
  from public.transactions
  where not hash_valid;

  -- Resume casos por estado, usuarios afectados y valor asociado a transacciones anómalas.
  select
    count(*),
    count(*) filter (where a.status = 'open'),
    count(*) filter (where a.status = 'reviewed'),
    count(*) filter (where a.status = 'discarded'),
    count(distinct t.user_id),
    coalesce(sum(t.value), 0)
  into
    v_total_anomalies, v_open_count, v_reviewed_count, v_discarded_count,
    v_affected_users, v_suspicious_value
  from public.anomalies a
  join public.transactions t on t.id = a.transaction_id;

  -- Agrupa las anomalías por hora para la gráfica de las últimas 24 horas.
  select coalesce(
    jsonb_agg(jsonb_build_object('hour', bucket, 'count', anomaly_count) order by bucket),
    '[]'::jsonb
  )
  into v_hourly
  from (
    select date_trunc('hour', created_at) as bucket, count(*) as anomaly_count
    from public.anomalies
    where created_at >= now() - interval '24 hours'
    group by 1
  ) hours;

  -- Construye la serie diaria de transacciones y anomalías de los últimos siete días.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', days.day::date,
        'transactions', coalesce(txn.count, 0),
        'anomalies', coalesce(anom.count, 0)
      ) order by days.day
    ),
    '[]'::jsonb
  )
  into v_weekly
  from generate_series(current_date - 6, current_date, interval '1 day') days(day)
  left join lateral (
    select count(*) as count
    from public.transactions t
    where t.transaction_date >= days.day
      and t.transaction_date < days.day + interval '1 day'
  ) txn on true
  left join lateral (
    select count(*) as count
    from public.anomalies a
    where a.created_at >= days.day
      and a.created_at < days.day + interval '1 day'
  ) anom on true;

  -- Cuenta los ocho métodos de pago más utilizados.
  select coalesce(
    jsonb_agg(jsonb_build_object('method', method, 'count', count) order by count desc),
    '[]'::jsonb
  )
  into v_payment_methods
  from (
    select payment_method as method, count(*) as count
    from public.transactions
    group by payment_method
    order by count desc
    limit 8
  ) methods;

  -- Devuelve los ocho usuarios con más de una transacción.
  select coalesce(
    jsonb_agg(jsonb_build_object('email', email, 'count', count) order by count desc),
    '[]'::jsonb
  )
  into v_recurrent_users
  from (
    select u.email, count(*) as count
    from public.transactions t
    join public.users u on u.id = t.user_id
    group by u.email
    having count(*) > 1
    order by count(*) desc
    limit 8
  ) recurrent;

  -- Construye los casos recientes con los datos de su transacción y usuario.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'type', a.type,
        'level', a.level,
        'count', a.transaction_count,
        'windowSeconds', a.window_seconds,
        'windowSize', a.window_size,
        'status', a.status,
        'createdAt', a.created_at,
        'idTxn', t.id_txn,
        'email', u.email,
        'value', t.value,
        'paymentMethod', t.payment_method,
        'transactionDate', t.transaction_date
      ) order by a.created_at desc
    ),
    '[]'::jsonb
  )
  into v_recent_anomalies
  from (
    select *
    from public.anomalies
    order by created_at desc
  ) a
  join public.transactions t on t.id = a.transaction_id
  join public.users u on u.id = t.user_id;

  -- Agrupa todos los indicadores en el JSON que consume GET /api/dashboard.
  return jsonb_build_object(
    'periods', jsonb_build_object(
      'today', jsonb_build_object('transactions', v_today_count, 'value', v_today_value),
      'week', jsonb_build_object('transactions', v_week_count, 'value', v_week_value),
      'month', jsonb_build_object('transactions', v_month_count, 'value', v_month_value)
    ),
    'totals', jsonb_build_object(
      'transactions', v_total_count,
      'invalidHashes', v_invalid_hashes,
      'anomalies', v_total_anomalies,
      'anomalyPercentage', case
        when v_total_count = 0 then 0
        else round(v_total_anomalies::numeric * 100 / v_total_count, 2)
      end,
      'affectedUsers', v_affected_users,
      'suspiciousValue', v_suspicious_value,
      'averagePerUser', case
        when v_user_count = 0 then 0
        else round(v_total_count::numeric / v_user_count, 2)
      end,
      'newAnomalies', v_open_count
    ),
    'statuses', jsonb_build_object(
      'open', v_open_count,
      'reviewed', v_reviewed_count,
      'discarded', v_discarded_count
    ),
    'hourly', v_hourly,
    'weekly', v_weekly,
    'paymentMethods', v_payment_methods,
    'recurrentUsers', v_recurrent_users,
    'recentAnomalies', v_recent_anomalies
  );
end;
$$;

-- Cambia el estado de gestión de una anomalía y actualiza su marca de tiempo.
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
  -- Solo se permiten los tres estados que reconoce la interfaz.
  if p_status not in ('open', 'reviewed', 'discarded') then
    raise exception 'El estado de la anomalía no es válido.';
  end if;

  -- Guarda el nuevo estado y la fecha de modificación del caso.
  update public.anomalies
  set status = p_status,
      updated_at = now()
  where id = p_anomaly_id
  returning jsonb_build_object('id', id, 'status', status)
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.process_transaction(
  text, text, timestamptz, numeric, text, text, boolean, text, text, integer, integer, integer
) from public, anon, authenticated;
revoke all on function public.get_transaction_dashboard() from public, anon, authenticated;
revoke all on function public.update_anomaly_status(uuid, text) from public, anon, authenticated;
grant execute on function public.process_transaction(
  text, text, timestamptz, numeric, text, text, boolean, text, text, integer, integer, integer
) to service_role;
grant execute on function public.get_transaction_dashboard() to service_role;
grant execute on function public.update_anomaly_status(uuid, text) to service_role;
