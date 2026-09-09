-- Consultas para analisar os feedbacks do app no TCC.
-- Escala Likert: 1 = Discordo totalmente, 5 = Concordo totalmente.

-- 1. Medias dos dois feedbacks de estrelas.
SELECT
  COUNT(*) AS total_feedbacks,
  ROUND(AVG(NULLIF(veterinary_satisfaction, 0))::NUMERIC, 2) AS media_satisfacao_informacoes_pet,
  ROUND(AVG(NULLIF(app_rating, 0))::NUMERIC, 2) AS media_avaliacao_geral_app
FROM pet_feedback;

-- 2. Medias das secoes Likert: melhorias e sugestoes.
SELECT
  section AS secao,
  section_label AS titulo_secao,
  COUNT(*) AS total_respostas,
  ROUND(AVG(rating)::NUMERIC, 2) AS media_likert
FROM pet_feedback_answers
GROUP BY section, section_label
ORDER BY section;

-- 3. Medias por pergunta/funcionalidade.
SELECT
  section AS secao,
  section_label AS titulo_secao,
  question_key AS funcionalidade,
  question_label AS pergunta,
  COUNT(*) AS total_respostas,
  ROUND(AVG(rating)::NUMERIC, 2) AS media_likert
FROM pet_feedback_answers
GROUP BY section, section_label, question_key, question_label
ORDER BY section, question_key;

-- 4. Medias comparando cada funcionalidade entre melhoria e sugestao.
SELECT
  question_key AS funcionalidade,
  ROUND((AVG(rating) FILTER (WHERE section = 'improvements'))::NUMERIC, 2) AS media_precisa_melhorar,
  ROUND((AVG(rating) FILTER (WHERE section = 'suggestions'))::NUMERIC, 2) AS media_sugestao_util,
  COUNT(*) FILTER (WHERE section = 'improvements') AS respostas_melhoria,
  COUNT(*) FILTER (WHERE section = 'suggestions') AS respostas_sugestao
FROM pet_feedback_answers
GROUP BY question_key
ORDER BY question_key;

-- 5. Textos preenchidos sobre o que pode melhorar.
SELECT
  f.submitted_at AS enviado_em,
  u.name AS tutor,
  p.name AS pet,
  a.question_key AS funcionalidade,
  a.question_label AS pergunta,
  a.rating AS nota_likert,
  a.comment AS texto_o_que_pode_melhorar
FROM pet_feedback_answers a
JOIN pet_feedback f
  ON f.user_id = a.user_id
 AND f.id = a.feedback_id
LEFT JOIN pet_app_users u
  ON u.id = f.user_id
LEFT JOIN pet_pets p
  ON p.user_id = f.user_id
 AND p.id = f.pet_id
WHERE a.section = 'improvements'
  AND NULLIF(TRIM(a.comment), '') IS NOT NULL
ORDER BY f.submitted_at DESC, a.question_key;

-- 6. Textos preenchidos como sugestoes.
SELECT
  f.submitted_at AS enviado_em,
  u.name AS tutor,
  p.name AS pet,
  a.question_key AS funcionalidade,
  a.question_label AS pergunta,
  a.rating AS nota_likert,
  a.comment AS texto_sugestao
FROM pet_feedback_answers a
JOIN pet_feedback f
  ON f.user_id = a.user_id
 AND f.id = a.feedback_id
LEFT JOIN pet_app_users u
  ON u.id = f.user_id
LEFT JOIN pet_pets p
  ON p.user_id = f.user_id
 AND p.id = f.pet_id
WHERE a.section = 'suggestions'
  AND NULLIF(TRIM(a.comment), '') IS NOT NULL
ORDER BY f.submitted_at DESC, a.question_key;

-- 7. Todos os feedbacks, uma linha por pergunta respondida.
SELECT
  f.id AS feedback_id,
  f.submitted_at AS enviado_em,
  u.name AS tutor,
  u.email AS email_tutor,
  p.name AS pet,
  f.veterinary_satisfaction AS nota_estrelas_informacoes_pet,
  f.app_rating AS nota_estrelas_app,
  a.section AS secao,
  a.section_label AS titulo_secao,
  a.question_key AS funcionalidade,
  a.question_label AS pergunta,
  a.rating AS nota_likert,
  a.comment AS comentario
FROM pet_feedback f
LEFT JOIN pet_feedback_answers a
  ON a.user_id = f.user_id
 AND a.feedback_id = f.id
LEFT JOIN pet_app_users u
  ON u.id = f.user_id
LEFT JOIN pet_pets p
  ON p.user_id = f.user_id
 AND p.id = f.pet_id
ORDER BY f.submitted_at DESC, f.id, a.section, a.question_key;
