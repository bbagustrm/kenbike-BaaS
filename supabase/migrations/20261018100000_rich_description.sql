-- #113 — Deskripsi produk rich text (Tiptap/ProseMirror JSON).
-- `description_doc` = dokumen editor (dirender server dari daftar node yang diizinkan);
-- `description` tetap teks polos untuk meta description, JSON-LD, dan pencarian.

alter table public.products
  add column description_doc jsonb
    check (
      description_doc is null
      or (jsonb_typeof(description_doc) = 'object'
          and description_doc ->> 'type' = 'doc'
          and pg_column_size(description_doc) <= 262144)
    );

-- Deskripsi lama (teks polos): setiap baris tidak kosong → satu paragraf.
update public.products p
set description_doc = jsonb_build_object(
  'type', 'doc',
  'content', coalesce((
    select jsonb_agg(
             jsonb_build_object(
               'type', 'paragraph',
               'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', line))
             )
             order by n)
    from unnest(string_to_array(replace(p.description, E'\r', ''), E'\n')) with ordinality as t(line, n)
    where trim(line) <> ''
  ), '[]'::jsonb)
)
where p.description is not null and trim(p.description) <> '' and p.description_doc is null;

-- RPC admin: simpan dokumen bila dikirim (payload tanpa description_doc tidak mengubahnya).
create or replace function public.admin_create_product(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid;
begin
  perform private.assert_admin();

  insert into public.products
    (category_id, name, slug, description, description_doc, is_active, is_preorder, preorder_days)
  values (
    (payload ->> 'category_id')::uuid,
    trim(payload ->> 'name'),
    trim(payload ->> 'slug'),
    payload ->> 'description',
    nullif(payload -> 'description_doc', 'null'::jsonb),
    coalesce((payload ->> 'is_active')::boolean, true),
    coalesce((payload ->> 'is_preorder')::boolean, false),
    (payload ->> 'preorder_days')::int
  )
  returning id into v_product_id;

  perform private.sync_product_variants(v_product_id, payload);
  return v_product_id;
end;
$$;

create or replace function public.admin_update_product(p_product_id uuid, payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();

  update public.products
  set category_id = (payload ->> 'category_id')::uuid,
      name = trim(payload ->> 'name'),
      slug = trim(payload ->> 'slug'),
      description = payload ->> 'description',
      description_doc = case
        when payload ? 'description_doc' then nullif(payload -> 'description_doc', 'null'::jsonb)
        else description_doc
      end,
      is_active = coalesce((payload ->> 'is_active')::boolean, true),
      is_preorder = coalesce((payload ->> 'is_preorder')::boolean, false),
      preorder_days = (payload ->> 'preorder_days')::int
  where id = p_product_id;
  if not found then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  perform private.sync_product_variants(p_product_id, payload);
end;
$$;
