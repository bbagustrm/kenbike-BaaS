-- #57 — Buku alamat: banyak alamat per user, tepat satu alamat utama (default).
-- Aturan dijaga di DB (trigger) agar setiap jalur tulis konsisten:
--   * alamat pertama otomatis menjadi utama;
--   * menjadikan satu alamat utama melepas status utama alamat lain (dalam
--     statement yang sama, jadi unique index satu-default tidak pernah dilanggar);
--   * alamat utama tidak bisa "dilepas" langsung — pilih alamat lain sebagai utama;
--   * menghapus alamat utama mempromosikan alamat terbaru yang tersisa;
--   * maksimal 20 alamat per user.

create function private.addresses_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  -- Serialisasi insert alamat milik user yang sama (hitungan & default konsisten).
  perform 1 from public.profiles where id = new.profile_id for update;

  select count(*) into v_count from public.addresses where profile_id = new.profile_id;
  if v_count >= 20 then
    raise exception 'too_many_addresses' using errcode = 'P0001';
  end if;

  if v_count = 0 then
    new.is_default := true;
  elsif new.is_default then
    update public.addresses set is_default = false
    where profile_id = new.profile_id and is_default;
  end if;
  return new;
end;
$$;

create trigger addresses_before_insert
  before insert on public.addresses
  for each row execute function private.addresses_before_insert();

-- ------------------------------------------------------------

create function private.addresses_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.profile_id is distinct from old.profile_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if new.is_default and not old.is_default then
    update public.addresses set is_default = false
    where profile_id = new.profile_id and is_default and id <> new.id;
  elsif old.is_default and not new.is_default and pg_trigger_depth() = 1 then
    -- Hanya trigger ini sendiri (depth > 1) yang boleh melepas status utama.
    raise exception 'default_address_required' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger addresses_before_update
  before update on public.addresses
  for each row execute function private.addresses_before_update();

-- ------------------------------------------------------------

create function private.addresses_after_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_default then
    update public.addresses set is_default = true
    where id = (
      select id from public.addresses
      where profile_id = old.profile_id
      order by created_at desc, id
      limit 1
    );
  end if;
  return null;
end;
$$;

create trigger addresses_after_delete
  after delete on public.addresses
  for each row execute function private.addresses_after_delete();

-- Fungsi trigger tidak dipanggil langsung oleh siapa pun.
revoke execute on function private.addresses_before_insert() from public;
revoke execute on function private.addresses_before_update() from public;
revoke execute on function private.addresses_after_delete() from public;
