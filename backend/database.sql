SELECT 'CREATE DATABASE pet_identification'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = 'pet_identification'
)\gexec

\connect pet_identification
\i db/schema.sql
