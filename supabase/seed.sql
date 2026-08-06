-- Seed data for the meal dashboard.
-- Run AFTER supabase/schema.sql in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- Re-running is safe: meals with the same name for the same user are skipped.

-- ── 1. Ensure the dev user exists ─────────────────────────────────────────
-- Matches the auto-provisioned user in src/lib/supabase.ts (email
-- me@meal-dashboard.local), so the seeded rows belong to the same user the
-- app resolves. Change the email/password here if you overrode
-- VITE_DEV_USER_EMAIL / VITE_DEV_USER_PASSWORD in .env.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'me@meal-dashboard.local',
  crypt('local-dev-password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '', '', '', ''
)
on conflict do nothing;

-- ── 2. Seed meals + ingredients ───────────────────────────────────────────
with dev as (
  select id from auth.users where email = 'me@meal-dashboard.local' limit 1
),
inserted as (
  insert into meals (user_id, name, calories, protein_g, carbs_g, fat_g)
  select
    dev.id,
    m.name,
    m.calories,
    m.protein_g,
    m.carbs_g,
    m.fat_g
  from dev
  cross join (values
    ('Nasi Lemak', 644, 14, 71, 33),
    ('Roti Canai with Dhal', 480, 10, 55, 25),
    ('Oatmeal with Banana', 330, 9, 58, 7),
    ('Tomyam Seafood Noodles', 380, 25, 35, 14),
    ('Hainanese Chicken Rice', 620, 32, 70, 23),
    ('Char Kway Teow', 540, 15, 70, 22),
    ('Beef Rendang with Rice', 720, 35, 55, 38),
    ('Asam Laksa', 480, 18, 60, 18),
    ('Nasi Goreng Kampung', 580, 20, 75, 20),
    ('Pisang Goreng', 250, 2, 40, 10),
    ('Cendol', 300, 2, 45, 13)
  ) as m(name, calories, protein_g, carbs_g, fat_g)
  where not exists (
    select 1 from meals e where e.user_id = dev.id and e.name = m.name
  )
  returning id, name
)
insert into meal_ingredients (meal_id, item_name, quantity, unit)
select im.id, ing.item_name, ing.quantity, ing.unit
from inserted im
join (values
  ('Nasi Lemak', 'Coconut rice', 200, 'g'),
  ('Nasi Lemak', 'Sambal', 40, 'g'),
  ('Nasi Lemak', 'Dried anchovies', 15, 'g'),
  ('Nasi Lemak', 'Peanuts', 20, 'g'),
  ('Nasi Lemak', 'Boiled egg', 1, 'piece'),
  ('Nasi Lemak', 'Cucumber', 30, 'g'),
  ('Roti Canai with Dhal', 'Roti canai', 2, 'piece'),
  ('Roti Canai with Dhal', 'Dhal curry', 80, 'ml'),
  ('Oatmeal with Banana', 'Rolled oats', 50, 'g'),
  ('Oatmeal with Banana', 'Milk', 150, 'ml'),
  ('Oatmeal with Banana', 'Banana', 1, 'piece'),
  ('Oatmeal with Banana', 'Honey', 10, 'g'),
  ('Tomyam Seafood Noodles', 'Rice noodles', 100, 'g'),
  ('Tomyam Seafood Noodles', 'Prawns', 80, 'g'),
  ('Tomyam Seafood Noodles', 'Squid', 60, 'g'),
  ('Tomyam Seafood Noodles', 'Tomyam paste', 30, 'g'),
  ('Tomyam Seafood Noodles', 'Mushroom', 50, 'g'),
  ('Tomyam Seafood Noodles', 'Lemongrass', 1, 'piece'),
  ('Hainanese Chicken Rice', 'Chicken', 150, 'g'),
  ('Hainanese Chicken Rice', 'Jasmine rice', 200, 'g'),
  ('Hainanese Chicken Rice', 'Ginger chilli sauce', 30, 'g'),
  ('Hainanese Chicken Rice', 'Cucumber', 30, 'g'),
  ('Hainanese Chicken Rice', 'Dark soy sauce', 10, 'ml'),
  ('Char Kway Teow', 'Rice noodles', 150, 'g'),
  ('Char Kway Teow', 'Prawns', 40, 'g'),
  ('Char Kway Teow', 'Egg', 1, 'piece'),
  ('Char Kway Teow', 'Bean sprouts', 50, 'g'),
  ('Char Kway Teow', 'Chives', 10, 'g'),
  ('Char Kway Teow', 'Soy sauce', 15, 'ml'),
  ('Beef Rendang with Rice', 'Beef', 150, 'g'),
  ('Beef Rendang with Rice', 'Coconut milk', 100, 'ml'),
  ('Beef Rendang with Rice', 'Jasmine rice', 200, 'g'),
  ('Beef Rendang with Rice', 'Rendang paste', 40, 'g'),
  ('Beef Rendang with Rice', 'Kaffir lime leaves', 2, 'piece'),
  ('Asam Laksa', 'Rice noodles', 150, 'g'),
  ('Asam Laksa', 'Mackerel', 80, 'g'),
  ('Asam Laksa', 'Laksa broth', 300, 'ml'),
  ('Asam Laksa', 'Cucumber', 40, 'g'),
  ('Asam Laksa', 'Onion', 20, 'g'),
  ('Asam Laksa', 'Pineapple', 30, 'g'),
  ('Nasi Goreng Kampung', 'Rice', 200, 'g'),
  ('Nasi Goreng Kampung', 'Egg', 1, 'piece'),
  ('Nasi Goreng Kampung', 'Dried anchovies', 10, 'g'),
  ('Nasi Goreng Kampung', 'Long beans', 40, 'g'),
  ('Nasi Goreng Kampung', 'Chilli paste', 20, 'g'),
  ('Pisang Goreng', 'Banana', 100, 'g'),
  ('Pisang Goreng', 'Batter', 50, 'g'),
  ('Pisang Goreng', 'Frying oil', 10, 'ml'),
  ('Cendol', 'Cendol strands', 150, 'g'),
  ('Cendol', 'Coconut milk', 60, 'ml'),
  ('Cendol', 'Gula melaka', 20, 'g'),
  ('Cendol', 'Shaved ice', 100, 'g')
) as ing(meal_name, item_name, quantity, unit)
  on im.name = ing.meal_name;

-- ── 3. Sanity check ───────────────────────────────────────────────────────
select
  count(distinct m.id) as meals,
  count(distinct i.id) as ingredients
from meals m
left join meal_ingredients i on i.meal_id = m.id;
