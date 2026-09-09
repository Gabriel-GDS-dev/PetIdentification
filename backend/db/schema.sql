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
  address_number TEXT NOT NULL DEFAULT '',
  address_complement TEXT NOT NULL DEFAULT '',
  neighborhood TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  zip_code TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  emergency_name TEXT NOT NULL DEFAULT '',
  emergency_phone TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pet_owners ADD COLUMN IF NOT EXISTS zip_code TEXT NOT NULL DEFAULT '';
ALTER TABLE pet_owners ADD COLUMN IF NOT EXISTS address_number TEXT NOT NULL DEFAULT '';
ALTER TABLE pet_owners ADD COLUMN IF NOT EXISTS address_complement TEXT NOT NULL DEFAULT '';
ALTER TABLE pet_owners ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE pet_owners ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

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
  attachment_name TEXT NOT NULL DEFAULT '',
  attachment_type TEXT NOT NULL DEFAULT '',
  attachment_size INTEGER NOT NULL DEFAULT 0,
  attachment_data TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, pet_id) REFERENCES pet_pets(user_id, id) ON DELETE CASCADE
);

ALTER TABLE pet_documents ADD COLUMN IF NOT EXISTS attachment_name TEXT NOT NULL DEFAULT '';
ALTER TABLE pet_documents ADD COLUMN IF NOT EXISTS attachment_type TEXT NOT NULL DEFAULT '';
ALTER TABLE pet_documents ADD COLUMN IF NOT EXISTS attachment_size INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pet_documents ADD COLUMN IF NOT EXISTS attachment_data TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS pet_travel_plans (
  user_id TEXT NOT NULL REFERENCES pet_app_users(id) ON DELETE CASCADE,
  pet_id TEXT NOT NULL,
  destination TEXT NOT NULL DEFAULT '',
  travel_date DATE,
  transport TEXT NOT NULL DEFAULT '',
  selected_pet_id TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pet_id)
);

ALTER TABLE pet_travel_plans ADD COLUMN IF NOT EXISTS pet_id TEXT NOT NULL DEFAULT '';
ALTER TABLE pet_travel_plans ADD COLUMN IF NOT EXISTS destination TEXT NOT NULL DEFAULT '';
ALTER TABLE pet_travel_plans ADD COLUMN IF NOT EXISTS travel_date DATE;
ALTER TABLE pet_travel_plans ADD COLUMN IF NOT EXISTS transport TEXT NOT NULL DEFAULT '';
ALTER TABLE pet_travel_plans ADD COLUMN IF NOT EXISTS selected_pet_id TEXT NOT NULL DEFAULT '';
ALTER TABLE pet_travel_plans ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
ALTER TABLE pet_travel_plans DROP CONSTRAINT IF EXISTS pet_travel_plans_pkey;
ALTER TABLE pet_travel_plans ADD CONSTRAINT pet_travel_plans_pkey PRIMARY KEY (user_id, pet_id);

CREATE TABLE IF NOT EXISTS pet_travel_items (
  user_id TEXT NOT NULL REFERENCES pet_app_users(id) ON DELETE CASCADE,
  pet_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pet_id, item_key)
);

ALTER TABLE pet_travel_items ADD COLUMN IF NOT EXISTS pet_id TEXT NOT NULL DEFAULT '';
ALTER TABLE pet_travel_items ADD COLUMN IF NOT EXISTS item_key TEXT NOT NULL DEFAULT '';
ALTER TABLE pet_travel_items ADD COLUMN IF NOT EXISTS checked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pet_travel_items DROP CONSTRAINT IF EXISTS pet_travel_items_pkey;
ALTER TABLE pet_travel_items ADD CONSTRAINT pet_travel_items_pkey PRIMARY KEY (user_id, pet_id, item_key);

CREATE TABLE IF NOT EXISTS pet_feedback (
  user_id TEXT NOT NULL REFERENCES pet_app_users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  pet_id TEXT NOT NULL DEFAULT '',
  veterinary_satisfaction INTEGER NOT NULL DEFAULT 0,
  app_rating INTEGER NOT NULL DEFAULT 0,
  improvements TEXT NOT NULL DEFAULT '',
  suggestions TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS pet_feedback_answers (
  user_id TEXT NOT NULL,
  feedback_id TEXT NOT NULL,
  section TEXT NOT NULL,
  section_label TEXT NOT NULL DEFAULT '',
  question_key TEXT NOT NULL,
  question_label TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feedback_id, section, question_key),
  FOREIGN KEY (user_id, feedback_id) REFERENCES pet_feedback(user_id, id) ON DELETE CASCADE
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
CREATE INDEX IF NOT EXISTS pet_feedback_answers_section_idx ON pet_feedback_answers(section, question_key);
CREATE INDEX IF NOT EXISTS pet_feedback_answers_submitted_idx ON pet_feedback_answers(submitted_at DESC);
CREATE INDEX IF NOT EXISTS pet_wallet_states_updated_idx ON pet_wallet_states(updated_at DESC);

CREATE OR REPLACE FUNCTION pet_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pet_feedback_likert_json(value TEXT)
RETURNS JSONB AS $$
DECLARE
  payload JSONB;
BEGIN
  IF COALESCE(value, '') = '' THEN
    RETURN '{}'::JSONB;
  END IF;

  BEGIN
    payload := value::JSONB;
  EXCEPTION WHEN others THEN
    RETURN '{}'::JSONB;
  END;

  IF payload ->> 'type' <> 'likert' THEN
    RETURN '{}'::JSONB;
  END IF;

  RETURN payload;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pet_feedback_sync_answers()
RETURNS TRIGGER AS $$
DECLARE
  section_name TEXT;
  section_label TEXT;
  payload JSONB;
  question_keys TEXT[];
  question_labels TEXT[];
  question_key TEXT;
  question_label TEXT;
  rating_text TEXT;
  rating_value INTEGER;
  comment_text TEXT;
  question_index INTEGER;
BEGIN
  DELETE FROM pet_feedback_answers
  WHERE user_id = NEW.user_id
    AND feedback_id = NEW.id;

  FOREACH section_name IN ARRAY ARRAY['improvements', 'suggestions'] LOOP
    IF section_name = 'improvements' THEN
      section_label := 'O que pode ficar melhor?';
      payload := pet_feedback_likert_json(NEW.improvements);
      question_keys := ARRAY['petWalletInfo', 'vaccines', 'travel'];
      question_labels := ARRAY[
        'As informações do pet na carteirinha precisam ficar mais claras e completas.',
        'A área de vacinas precisa mostrar melhor dose, data de aplicação, vencimento e clínica.',
        'A área de viagens precisa organizar melhor checklist, documentos e dados da viagem do pet.'
      ];
    ELSE
      section_label := 'Sugestões e melhorias';
      payload := pet_feedback_likert_json(NEW.suggestions);
      question_keys := ARRAY['petWalletInfo', 'vaccines', 'travel'];
      question_labels := ARRAY[
        'Mais campos opcionais sobre o pet na carteirinha ajudariam na identificação.',
        'Alertas de vencimento, filtros e destaque para vacinas atrasadas deixariam o controle mais útil.',
        'Um checklist por pet com documentos, destino, transporte e lembretes ajudaria no planejamento.'
      ];
    END IF;

    FOR question_index IN 1..array_length(question_keys, 1) LOOP
      question_key := question_keys[question_index];
      question_label := question_labels[question_index];
      rating_text := payload #>> ARRAY['ratings', question_key];

      IF rating_text ~ '^[1-5]$' THEN
        rating_value := rating_text::INTEGER;
        comment_text := COALESCE(payload #>> ARRAY['comments', question_key], '');

        INSERT INTO pet_feedback_answers (
          user_id,
          feedback_id,
          section,
          section_label,
          question_key,
          question_label,
          rating,
          comment,
          submitted_at
        ) VALUES (
          NEW.user_id,
          NEW.id,
          section_name,
          section_label,
          question_key,
          question_label,
          rating_value,
          comment_text,
          NEW.submitted_at
        );
      END IF;
    END LOOP;
  END LOOP;

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

DROP TRIGGER IF EXISTS pet_feedback_updated_at ON pet_feedback;
CREATE TRIGGER pet_feedback_updated_at
BEFORE UPDATE ON pet_feedback
FOR EACH ROW EXECUTE FUNCTION pet_set_updated_at();

DROP TRIGGER IF EXISTS pet_feedback_sync_answers ON pet_feedback;
CREATE TRIGGER pet_feedback_sync_answers
AFTER INSERT OR UPDATE OF improvements, suggestions, submitted_at ON pet_feedback
FOR EACH ROW EXECUTE FUNCTION pet_feedback_sync_answers();

UPDATE pet_feedback f
SET improvements = f.improvements
WHERE NOT EXISTS (
    SELECT 1
    FROM pet_feedback_answers a
    WHERE a.user_id = f.user_id
      AND a.feedback_id = f.id
  )
  AND (
    pet_feedback_likert_json(f.improvements) <> '{}'::JSONB
    OR pet_feedback_likert_json(f.suggestions) <> '{}'::JSONB
  );

DROP TRIGGER IF EXISTS pet_feedback_answers_updated_at ON pet_feedback_answers;
CREATE TRIGGER pet_feedback_answers_updated_at
BEFORE UPDATE ON pet_feedback_answers
FOR EACH ROW EXECUTE FUNCTION pet_set_updated_at();

DROP TRIGGER IF EXISTS pet_wallet_states_updated_at ON pet_wallet_states;
CREATE TRIGGER pet_wallet_states_updated_at
BEFORE UPDATE ON pet_wallet_states
FOR EACH ROW EXECUTE FUNCTION pet_set_updated_at();
