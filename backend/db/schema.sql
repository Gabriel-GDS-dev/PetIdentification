CREATE TABLE IF NOT EXISTS pet_app_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pet_owners (
  user_id TEXT PRIMARY KEY REFERENCES pet_app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  cpf TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  neighborhood TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  zip_code TEXT NOT NULL DEFAULT '',
  emergency_name TEXT NOT NULL DEFAULT '',
  emergency_phone TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pet_owners ADD COLUMN IF NOT EXISTS zip_code TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS pet_pets (
  user_id TEXT NOT NULL REFERENCES pet_app_users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  species TEXT NOT NULL DEFAULT '',
  breed TEXT NOT NULL DEFAULT '',
  sex TEXT NOT NULL DEFAULT '',
  birth_date DATE,
  weight TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  microchip TEXT NOT NULL DEFAULT '',
  registry TEXT NOT NULL DEFAULT '',
  temperament TEXT NOT NULL DEFAULT '',
  allergies TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT '#17716b',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS pet_vaccines (
  user_id TEXT NOT NULL REFERENCES pet_app_users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  pet_id TEXT NOT NULL,
  name TEXT NOT NULL,
  dose TEXT NOT NULL DEFAULT '',
  application_date DATE,
  due_date DATE,
  clinic TEXT NOT NULL DEFAULT '',
  veterinarian TEXT NOT NULL DEFAULT '',
  batch TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, pet_id) REFERENCES pet_pets(user_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pet_documents (
  user_id TEXT NOT NULL REFERENCES pet_app_users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  pet_id TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT '',
  document_date DATE,
  expires_at DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, pet_id) REFERENCES pet_pets(user_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pet_travel_plans (
  user_id TEXT PRIMARY KEY REFERENCES pet_app_users(id) ON DELETE CASCADE,
  destination TEXT NOT NULL DEFAULT '',
  travel_date DATE,
  transport TEXT NOT NULL DEFAULT '',
  selected_pet_id TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pet_travel_items (
  user_id TEXT NOT NULL REFERENCES pet_app_users(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_key)
);

CREATE TABLE IF NOT EXISTS pet_wallet_states (
  user_id TEXT PRIMARY KEY REFERENCES pet_app_users(id) ON DELETE CASCADE,
  state JSONB NOT NULL,
  client_updated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pet_pets_user_idx ON pet_pets(user_id);
CREATE INDEX IF NOT EXISTS pet_vaccines_user_pet_idx ON pet_vaccines(user_id, pet_id);
CREATE INDEX IF NOT EXISTS pet_documents_user_pet_idx ON pet_documents(user_id, pet_id);
CREATE INDEX IF NOT EXISTS pet_wallet_states_updated_idx ON pet_wallet_states(updated_at DESC);

CREATE OR REPLACE FUNCTION pet_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pet_app_users_updated_at ON pet_app_users;
CREATE TRIGGER pet_app_users_updated_at
BEFORE UPDATE ON pet_app_users
FOR EACH ROW EXECUTE FUNCTION pet_set_updated_at();

DROP TRIGGER IF EXISTS pet_owners_updated_at ON pet_owners;
CREATE TRIGGER pet_owners_updated_at
BEFORE UPDATE ON pet_owners
FOR EACH ROW EXECUTE FUNCTION pet_set_updated_at();

DROP TRIGGER IF EXISTS pet_pets_updated_at ON pet_pets;
CREATE TRIGGER pet_pets_updated_at
BEFORE UPDATE ON pet_pets
FOR EACH ROW EXECUTE FUNCTION pet_set_updated_at();

DROP TRIGGER IF EXISTS pet_vaccines_updated_at ON pet_vaccines;
CREATE TRIGGER pet_vaccines_updated_at
BEFORE UPDATE ON pet_vaccines
FOR EACH ROW EXECUTE FUNCTION pet_set_updated_at();

DROP TRIGGER IF EXISTS pet_documents_updated_at ON pet_documents;
CREATE TRIGGER pet_documents_updated_at
BEFORE UPDATE ON pet_documents
FOR EACH ROW EXECUTE FUNCTION pet_set_updated_at();

DROP TRIGGER IF EXISTS pet_travel_plans_updated_at ON pet_travel_plans;
CREATE TRIGGER pet_travel_plans_updated_at
BEFORE UPDATE ON pet_travel_plans
FOR EACH ROW EXECUTE FUNCTION pet_set_updated_at();

DROP TRIGGER IF EXISTS pet_travel_items_updated_at ON pet_travel_items;
CREATE TRIGGER pet_travel_items_updated_at
BEFORE UPDATE ON pet_travel_items
FOR EACH ROW EXECUTE FUNCTION pet_set_updated_at();

DROP TRIGGER IF EXISTS pet_wallet_states_updated_at ON pet_wallet_states;
CREATE TRIGGER pet_wallet_states_updated_at
BEFORE UPDATE ON pet_wallet_states
FOR EACH ROW EXECUTE FUNCTION pet_set_updated_at();
