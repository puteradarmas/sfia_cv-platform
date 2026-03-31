-- ─────────────────────────────────────────────────────────────────
--  SFIA Skills Intelligence Platform — Seed Data
--  Inserts one sample candidate and profile so the UI is not empty
--  on first launch. Safe to re-run (INSERT ... ON CONFLICT DO NOTHING)
-- ─────────────────────────────────────────────────────────────────

INSERT INTO candidates (id, full_name, email, phone, source_filename, raw_cv_text)
VALUES (
    1,
    'Ahmad Putera (Sample)',
    'putera@example.com',
    '+62 812 0000 0000',
    'sample_cv.pdf',
    'Senior Data Engineer with 6 years experience leading medallion architecture implementations. Proficient in Python, Apache Spark, and Kafka. Led a team of 4 engineers to deliver a government data warehouse integration. Deep expertise in data governance frameworks aligned to Satu Data Indonesia. Strong background in enterprise architecture and TOGAF-aligned solution design.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO skills_profiles (id, candidate_id, status)
VALUES (1, 1, 'PENDING')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sfia_skill_records (profile_id, sfia_code, sfia_skill_name, sfia_category, estimated_level, confidence_score, evidence_text, validation_status)
VALUES
    (1, 'DENG', 'Data Engineering',       'Data and Analytics',            4, 0.83, '["Led a team of 4 engineers to deliver a government data warehouse", "Proficient in Apache Spark and Kafka"]', 'PENDING'),
    (1, 'DGOV', 'Data Governance',        'Data and Analytics',            3, 0.61, '["Deep expertise in data governance frameworks aligned to Satu Data Indonesia"]', 'PENDING'),
    (1, 'EAPL', 'Enterprise Architecture','IT Governance and Management',  4, 0.74, '["Strong background in enterprise architecture and TOGAF-aligned solution design"]', 'PENDING'),
    (1, 'PROG', 'Programming',            'Development and Implementation', 3, 0.71, '["Proficient in Python"]', 'PENDING')
ON CONFLICT DO NOTHING;

-- Reset sequence so next auto-insert starts after seed data
SELECT setval('candidates_id_seq',       (SELECT MAX(id) FROM candidates),       true);
SELECT setval('skills_profiles_id_seq',  (SELECT MAX(id) FROM skills_profiles),  true);
SELECT setval('sfia_skill_records_id_seq',(SELECT MAX(id) FROM sfia_skill_records),true);
