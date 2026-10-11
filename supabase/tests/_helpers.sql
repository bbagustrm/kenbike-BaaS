-- Helper assertion untuk tes database (dipakai scripts/db-test.mjs).
-- Setiap file tes dibungkus BEGIN ... ROLLBACK oleh runner, jadi tidak ada
-- data yang tertinggal di database.
--
-- Hasil dicatat ke temp table _results; runner membaca SELECT terakhir.
-- Helper berada di pg_temp agar bisa dipanggil dari role mana pun dalam sesi.

create temp table _results (
  n serial primary key,
  ok boolean not null,
  name text not null,
  detail text
) on commit drop;

create function pg_temp._rec(p_name text, p_ok boolean, p_detail text default null)
returns void
language sql
security definer
as $$
  insert into _results (ok, name, detail) values (coalesce(p_ok, false), p_name, p_detail)
$$;

create function pg_temp.check(p_name text, p_condition boolean)
returns void
language sql
as $$
  select pg_temp._rec(p_name, p_condition, case when p_condition then null else 'kondisi false/null' end)
$$;

create function pg_temp.eq(p_name text, p_got anyelement, p_expected anyelement)
returns void
language sql
as $$
  select pg_temp._rec(
    p_name,
    p_got is not distinct from p_expected,
    format('dapat %s, harap %s', coalesce(p_got::text, 'NULL'), coalesce(p_expected::text, 'NULL'))
  )
$$;

-- Jalankan SQL sebagai role saat ini; lulus bila error dengan SQLSTATE yang diharapkan.
-- p_message (opsional) dicocokkan sebagai substring dari pesan error.
create function pg_temp.throws(p_name text, p_sql text, p_code text, p_message text default null)
returns void
language plpgsql
as $$
begin
  execute p_sql;
  perform pg_temp._rec(p_name, false, 'tidak ada error');
exception when others then
  perform pg_temp._rec(
    p_name,
    sqlstate = p_code and (p_message is null or position(p_message in sqlerrm) > 0),
    sqlstate || ': ' || sqlerrm
  );
end;
$$;

create function pg_temp.lives(p_name text, p_sql text)
returns void
language plpgsql
as $$
begin
  execute p_sql;
  perform pg_temp._rec(p_name, true);
exception when others then
  perform pg_temp._rec(p_name, false, sqlstate || ': ' || sqlerrm);
end;
$$;

-- Set klaim JWT untuk auth.uid(); null = anon. Ganti role dengan SET LOCAL ROLE.
create function pg_temp.login(p_uid uuid)
returns void
language sql
as $$
  select set_config(
    'request.jwt.claims',
    case when p_uid is null then '{"role":"anon"}'
         else json_build_object('sub', p_uid, 'role', 'authenticated')::text end,
    true
  )
$$;
