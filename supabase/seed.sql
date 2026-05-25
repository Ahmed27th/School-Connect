-- School Connect - Local Development Seed Data
-- Two schools with full demo data to test RLS policies

-- ==========================================================
-- SCHOOLS
-- ==========================================================
insert into schools (id, name, slug, address, phone, timezone, academic_year) values
  (1, 'Sunrise Elementary', 'sunrise-elementary', '123 Learning Lane, Springfield', '+1-555-0101', 'America/New_York', '2025-2026'),
  (2, 'Oakridge High School', 'oakridge-high', '456 Knowledge Blvd, Westfield', '+1-555-0202', 'America/Chicago', '2025-2026');

select setval('schools_id_seq', 2);

-- ==========================================================
-- AUTH USERS (password for all: Demo@123)
-- Note: Trigger on_auth_user_created will auto-create profiles
-- ==========================================================
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), 'authenticated', 'authenticated',
  vals.email,
  crypt('Demo@123', gen_salt('bf')),
  now(), now(), '', now(), '', now(), '', '', now(), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('full_name', vals.full_name, 'role', vals.role, 'school_id', vals.school_id),
  false, now(), now(), null, null, '', '', now(), '', 0, null, '', now(), false, null, false
from (values
  ('sarah@sunrise.edu', 'Sarah Mitchell', 'principal', 1),
  ('james@oakridge.edu', 'James Thompson', 'principal', 2),
  ('emily@sunrise.edu', 'Emily Chen', 'teacher', 1),
  ('marcus@sunrise.edu', 'Marcus Johnson', 'teacher', 1),
  ('linda@oakridge.edu', 'Linda Patel', 'teacher', 2),
  ('robert@oakridge.edu', 'Robert Kim', 'teacher', 2),
  ('alice.parent@sunrise.edu', 'Alice Williams', 'parent', 1),
  ('bob.parent@sunrise.edu', 'Bob Davis', 'parent', 1),
  ('carol.parent@sunrise.edu', 'Carol Martinez', 'parent', 1),
  ('david.parent@sunrise.edu', 'David Brown', 'parent', 1),
  ('emma.parent@sunrise.edu', 'Emma Wilson', 'parent', 1),
  ('frank.parent@oakridge.edu', 'Frank Garcia', 'parent', 2),
  ('grace.parent@oakridge.edu', 'Grace Lee', 'parent', 2),
  ('henry.parent@oakridge.edu', 'Henry Taylor', 'parent', 2),
  ('iris.parent@oakridge.edu', 'Iris Anderson', 'parent', 2),
  ('jack.parent@oakridge.edu', 'Jack Thomas', 'parent', 2),
  ('student1@sunrise.edu', 'Liam Williams', 'student', 1),
  ('student2@sunrise.edu', 'Sophia Davis', 'student', 1),
  ('student3@sunrise.edu', 'Noah Martinez', 'student', 1),
  ('student4@sunrise.edu', 'Olivia Brown', 'student', 1),
  ('student5@sunrise.edu', 'Ethan Wilson', 'student', 1),
  ('student6@oakridge.edu', 'Ava Garcia', 'student', 2),
  ('student7@oakridge.edu', 'Mason Lee', 'student', 2),
  ('student8@oakridge.edu', 'Isabella Taylor', 'student', 2),
  ('student9@oakridge.edu', 'Lucas Anderson', 'student', 2),
  ('student10@oakridge.edu', 'Mia Thomas', 'student', 2)
) as vals(email, full_name, role, school_id);

-- ==========================================================
-- PROFILES (view auto-created data)
-- ==========================================================
-- The trigger on_auth_user_created already populated profiles.
-- We'll reference them by joining on email.

-- ==========================================================
-- CLASSES (2 per school)
-- ==========================================================
insert into classes (id, school_id, name, grade, section, teacher_id, academic_year) values
  (1, 1, 'Math 101', '3rd Grade', 'A', (select id from profiles where email = 'emily@sunrise.edu'), '2025-2026'),
  (2, 1, 'Science 101', '4th Grade', 'B', (select id from profiles where email = 'marcus@sunrise.edu'), '2025-2026'),
  (3, 2, 'Algebra I', '9th Grade', 'A', (select id from profiles where email = 'linda@oakridge.edu'), '2025-2026'),
  (4, 2, 'Biology', '10th Grade', 'B', (select id from profiles where email = 'robert@oakridge.edu'), '2025-2026');

select setval('classes_id_seq', 4);

-- ==========================================================
-- ENROLLMENTS
-- ==========================================================
-- School 1: Sunrise Elementary (classes 1, 2)
insert into enrollments (class_id, student_id, parent_id) values
  (1, (select id from profiles where email = 'student1@sunrise.edu'), (select id from profiles where email = 'alice.parent@sunrise.edu')),
  (1, (select id from profiles where email = 'student2@sunrise.edu'), (select id from profiles where email = 'bob.parent@sunrise.edu')),
  (1, (select id from profiles where email = 'student3@sunrise.edu'), (select id from profiles where email = 'carol.parent@sunrise.edu')),
  (2, (select id from profiles where email = 'student4@sunrise.edu'), (select id from profiles where email = 'david.parent@sunrise.edu')),
  (2, (select id from profiles where email = 'student5@sunrise.edu'), (select id from profiles where email = 'emma.parent@sunrise.edu'));

-- School 2: Oakridge High (classes 3, 4)
insert into enrollments (class_id, student_id, parent_id) values
  (3, (select id from profiles where email = 'student6@oakridge.edu'), (select id from profiles where email = 'frank.parent@oakridge.edu')),
  (3, (select id from profiles where email = 'student7@oakridge.edu'), (select id from profiles where email = 'grace.parent@oakridge.edu')),
  (3, (select id from profiles where email = 'student8@oakridge.edu'), (select id from profiles where email = 'henry.parent@oakridge.edu')),
  (4, (select id from profiles where email = 'student9@oakridge.edu'), (select id from profiles where email = 'iris.parent@oakridge.edu')),
  (4, (select id from profiles where email = 'student10@oakridge.edu'), (select id from profiles where email = 'jack.parent@oakridge.edu'));

-- ==========================================================
-- ATTENDANCE RECORDS (last 5 school days)
-- ==========================================================
insert into attendance_records (class_id, student_id, date, status, marked_by) values
  -- Class 1 attendance by Emily Chen
  (1, (select id from profiles where email = 'student1@sunrise.edu'), current_date - 1, 'present', (select id from profiles where email = 'emily@sunrise.edu')),
  (1, (select id from profiles where email = 'student2@sunrise.edu'), current_date - 1, 'present', (select id from profiles where email = 'emily@sunrise.edu')),
  (1, (select id from profiles where email = 'student3@sunrise.edu'), current_date - 1, 'absent', (select id from profiles where email = 'emily@sunrise.edu')),
  (1, (select id from profiles where email = 'student1@sunrise.edu'), current_date - 2, 'present', (select id from profiles where email = 'emily@sunrise.edu')),
  (1, (select id from profiles where email = 'student2@sunrise.edu'), current_date - 2, 'late', (select id from profiles where email = 'emily@sunrise.edu')),
  (1, (select id from profiles where email = 'student3@sunrise.edu'), current_date - 2, 'present', (select id from profiles where email = 'emily@sunrise.edu')),
  -- Class 3 attendance by Linda Patel
  (3, (select id from profiles where email = 'student6@oakridge.edu'), current_date - 1, 'present', (select id from profiles where email = 'linda@oakridge.edu')),
  (3, (select id from profiles where email = 'student7@oakridge.edu'), current_date - 1, 'absent', (select id from profiles where email = 'linda@oakridge.edu')),
  (3, (select id from profiles where email = 'student8@oakridge.edu'), current_date - 1, 'present', (select id from profiles where email = 'linda@oakridge.edu'));

-- ==========================================================
-- ANNOUNCEMENTS
-- ==========================================================
insert into announcements (id, school_id, author_id, title, body, priority, target_roles) values
  (1, 1, (select id from profiles where email = 'sarah@sunrise.edu'), 'Winter Break Reminder', 'School will be closed Dec 23 - Jan 3. Enjoy the holidays!', 'normal', '{all}'),
  (2, 1, (select id from profiles where email = 'sarah@sunrise.edu'), 'Early Dismissal Friday', 'School will close at 1:00 PM this Friday for staff development.', 'high', '{all}'),
  (3, 2, (select id from profiles where email = 'james@oakridge.edu'), 'Snow Day - School Closed', 'Due to severe weather, Oakridge High is closed today. Stay safe!', 'emergency', '{all}'),
  (4, 2, (select id from profiles where email = 'james@oakridge.edu'), 'Parent-Teacher Conference', 'Conferences scheduled for next Thursday. Sign-up link incoming.', 'normal', '{parent,teacher}');

select setval('announcements_id_seq', 4);
