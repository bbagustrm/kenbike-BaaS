-- #113 — description_doc: backfill dari teks lama, validasi bentuk, RPC admin menyimpan dokumen.

select pg_temp.check('produk berdeskripsi punya description_doc hasil backfill',
  not exists (select 1 from public.products
              where description is not null and trim(description) <> '' and description_doc is null));

select pg_temp.throws('dokumen yang bukan doc ditolak',
  $$ update public.products set description_doc = '{"type":"paragraph"}' where id = (select id from public.products limit 1) $$,
  '23514');

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000d7', 'dadmin@test.local', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000d7';

create temp table _ctx (key text primary key, id uuid) on commit drop;
grant all on _ctx to public;
create function pg_temp.ctx(p_key text) returns uuid language sql as $$ select id from _ctx where key = p_key $$;

-- Produk tanpa opsi, satu varian (cukup untuk sync_product_variants).
create function pg_temp.payload(p_extra jsonb) returns jsonb language sql as $$
  select jsonb_build_object(
    'category_id', (select id from public.categories where slug = 'aksesoris'),
    'name', 'Botol Uji Deskripsi',
    'slug', 'botol-uji-deskripsi',
    'description', 'Spesifikasi lengkap',
    'options', '[]'::jsonb,
    'variants', jsonb_build_array(jsonb_build_object(
      'sku', 'UJI-DESC-1', 'price', 50000, 'weight_gram', 100,
      'length_cm', 10, 'width_cm', 10, 'height_cm', 25, 'options', '{}'::jsonb))
  ) || p_extra
$$;
create function pg_temp.doc() returns jsonb language sql security definer as $$
  select description_doc from public.products where id = pg_temp.ctx('p')
$$;

select pg_temp.login('00000000-0000-0000-0000-0000000000d7');
set local role authenticated;
insert into _ctx select 'p', public.admin_create_product(pg_temp.payload(jsonb_build_object(
  'description_doc', '{"type":"doc","content":[{"type":"table","content":[]}]}'::jsonb)));
reset role;
select pg_temp.eq('create: dokumen tersimpan', pg_temp.doc() -> 'content' -> 0 ->> 'type', 'table');

-- Varian yang sudah ada perlu id-nya agar tidak dianggap varian baru.
create function pg_temp.update_payload(p_extra jsonb) returns jsonb language sql security definer as $$
  select pg_temp.payload(p_extra) || jsonb_build_object('variants', jsonb_build_array(jsonb_build_object(
    'id', v.id, 'sku', 'UJI-DESC-1', 'price', 50000, 'weight_gram', 100,
    'length_cm', 10, 'width_cm', 10, 'height_cm', 25, 'options', '{}'::jsonb)))
  from public.product_variants v where v.product_id = pg_temp.ctx('p')
$$;

set local role authenticated;
select pg_temp.lives('update tanpa description_doc',
  format($$ select public.admin_update_product(%L, %L) $$, pg_temp.ctx('p'), pg_temp.update_payload('{}')));
reset role;
select pg_temp.eq('update tanpa kunci: dokumen dipertahankan', pg_temp.doc() -> 'content' -> 0 ->> 'type', 'table');

set local role authenticated;
select pg_temp.lives('update dengan description_doc null',
  format($$ select public.admin_update_product(%L, %L) $$, pg_temp.ctx('p'),
         pg_temp.update_payload('{"description_doc": null}')));
reset role;
select pg_temp.check('update dengan null: dokumen dikosongkan', pg_temp.doc() is null);
