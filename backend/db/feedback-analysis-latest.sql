-- Somente leitura. Execute cada consulta separadamente no Query da Vercel.
-- A unidade e a conta, nao a pessoa. Nenhum registro e apagado.

-- 1. Quantidade de envios e de contas (delimite o periodo se necessario).
SELECT COUNT(*) AS envios, COUNT(DISTINCT user_id) AS contas
FROM pet_feedback;

-- 2. Itens Likert, considerando apenas o envio mais recente por conta.
WITH ranked AS (
  SELECT f.*, ROW_NUMBER() OVER (
    PARTITION BY user_id ORDER BY submitted_at DESC, id DESC
  ) AS rn
  FROM pet_feedback f
)
SELECT
  a.section,
  a.question_key,
  COUNT(*) AS respostas_validas,
  COUNT(*) FILTER (WHERE a.rating IN (1, 2)) AS discordancias,
  COUNT(*) FILTER (WHERE a.rating = 3) AS neutras,
  COUNT(*) FILTER (WHERE a.rating IN (4, 5)) AS concordancias,
  ROUND(AVG(a.rating)::NUMERIC, 2) AS media_descritiva,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY a.rating) AS mediana
FROM ranked f
JOIN pet_feedback_answers a
  ON a.user_id = f.user_id AND a.feedback_id = f.id
WHERE f.rn = 1 AND a.rating BETWEEN 1 AND 5
GROUP BY a.section, a.question_key
ORDER BY a.section, a.question_key;

-- 3. Notas gerais: zero fica fora da escala e nao entra na media.
WITH ranked AS (
  SELECT f.*, ROW_NUMBER() OVER (
    PARTITION BY user_id ORDER BY submitted_at DESC, id DESC
  ) AS rn
  FROM pet_feedback f
)
SELECT
  COUNT(*) AS avaliacoes_por_conta,
  COUNT(*) FILTER (WHERE app_rating BETWEEN 1 AND 5) AS notas_app_validas,
  ROUND(AVG(CASE WHEN app_rating BETWEEN 1 AND 5 THEN app_rating END)::NUMERIC, 2) AS media_app,
  COUNT(*) FILTER (WHERE veterinary_satisfaction BETWEEN 1 AND 5) AS notas_carteira_validas,
  ROUND(AVG(CASE WHEN veterinary_satisfaction BETWEEN 1 AND 5 THEN veterinary_satisfaction END)::NUMERIC, 2) AS media_carteira
FROM ranked
WHERE rn = 1;
