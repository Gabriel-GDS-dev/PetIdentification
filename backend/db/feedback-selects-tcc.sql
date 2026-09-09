-- SELECTs para usar manualmente no TCC.
-- Escala Likert: 1 = Discordo totalmente, 5 = Concordo totalmente.

-- 1. Todos os feedbacks da tabela principal, com usuario e pet.
SELECT
  f.user_id,
  f.id AS feedback_id,
  f.submitted_at AS data_envio,
  f.updated_at AS atualizado_em,
  u.name AS usuario,
  u.email,
  p.id AS pet_id,
  p.name AS pet,
  f.veterinary_satisfaction AS satisfacao_carteira_pet,
  f.app_rating AS avaliacao_app,
  f.improvements AS o_que_pode_melhorar,
  f.suggestions AS sugestoes
FROM pet_feedback f
LEFT JOIN pet_app_users u
  ON u.id = f.user_id
LEFT JOIN pet_pets p
  ON p.user_id = f.user_id
 AND p.id = f.pet_id
ORDER BY f.submitted_at DESC;

-- 2. Media geral dos dois feedbacks de estrelas.
SELECT
  COUNT(*) AS total_feedbacks,
  ROUND(AVG(NULLIF(f.veterinary_satisfaction, 0))::NUMERIC, 2) AS media_satisfacao_carteira_pet,
  ROUND(AVG(NULLIF(f.app_rating, 0))::NUMERIC, 2) AS media_avaliacao_app
FROM pet_feedback f;

-- 3. Todas as respostas Likert normalizadas, uma linha por pergunta.
SELECT
  a.user_id,
  a.feedback_id,
  f.submitted_at AS data_envio,
  u.name AS usuario,
  u.email,
  p.name AS pet,
  a.section AS secao,
  a.section_label AS titulo_secao,
  a.question_key AS funcionalidade,
  a.question_label AS pergunta,
  a.rating AS nota_likert,
  a.comment AS comentario
FROM pet_feedback_answers a
LEFT JOIN pet_feedback f
  ON f.user_id = a.user_id
 AND f.id = a.feedback_id
LEFT JOIN pet_app_users u
  ON u.id = a.user_id
LEFT JOIN pet_pets p
  ON p.user_id = f.user_id
 AND p.id = f.pet_id
ORDER BY f.submitted_at DESC, a.feedback_id, a.section, a.question_key;

-- 4. Media das secoes: "O que pode ficar melhor?" e "Sugestoes e melhorias".
SELECT
  a.section AS secao,
  a.section_label AS titulo_secao,
  COUNT(*) AS total_respostas,
  ROUND(AVG(a.rating)::NUMERIC, 2) AS media_likert
FROM pet_feedback_answers a
GROUP BY a.section, a.section_label
ORDER BY a.section;

-- 5. Media de cada pergunta/funcionalidade.
SELECT
  a.section AS secao,
  a.section_label AS titulo_secao,
  a.question_key AS funcionalidade,
  a.question_label AS pergunta,
  COUNT(*) AS total_respostas,
  ROUND(AVG(a.rating)::NUMERIC, 2) AS media_likert
FROM pet_feedback_answers a
GROUP BY a.section, a.section_label, a.question_key, a.question_label
ORDER BY a.section, a.question_key;

-- 6. Media por funcionalidade, separando melhoria e sugestao na mesma linha.
SELECT
  a.question_key AS funcionalidade,
  ROUND((AVG(a.rating) FILTER (WHERE a.section = 'improvements'))::NUMERIC, 2) AS media_o_que_pode_melhorar,
  ROUND((AVG(a.rating) FILTER (WHERE a.section = 'suggestions'))::NUMERIC, 2) AS media_sugestoes,
  COUNT(*) FILTER (WHERE a.section = 'improvements') AS respostas_melhoria,
  COUNT(*) FILTER (WHERE a.section = 'suggestions') AS respostas_sugestoes
FROM pet_feedback_answers a
GROUP BY a.question_key
ORDER BY a.question_key;

-- 7. Textos preenchidos em "O que pode ficar melhor?".
SELECT
  f.submitted_at AS data_envio,
  u.name AS usuario,
  u.email,
  p.name AS pet,
  a.question_key AS funcionalidade,
  a.question_label AS pergunta,
  a.rating AS nota_likert,
  a.comment AS texto_o_que_pode_melhorar
FROM pet_feedback_answers a
LEFT JOIN pet_feedback f
  ON f.user_id = a.user_id
 AND f.id = a.feedback_id
LEFT JOIN pet_app_users u
  ON u.id = a.user_id
LEFT JOIN pet_pets p
  ON p.user_id = f.user_id
 AND p.id = f.pet_id
WHERE a.section = 'improvements'
  AND NULLIF(TRIM(a.comment), '') IS NOT NULL
ORDER BY f.submitted_at DESC, a.question_key;

-- 8. Textos preenchidos em "Sugestoes e melhorias".
SELECT
  f.submitted_at AS data_envio,
  u.name AS usuario,
  u.email,
  p.name AS pet,
  a.question_key AS funcionalidade,
  a.question_label AS pergunta,
  a.rating AS nota_likert,
  a.comment AS texto_sugestao
FROM pet_feedback_answers a
LEFT JOIN pet_feedback f
  ON f.user_id = a.user_id
 AND f.id = a.feedback_id
LEFT JOIN pet_app_users u
  ON u.id = a.user_id
LEFT JOIN pet_pets p
  ON p.user_id = f.user_id
 AND p.id = f.pet_id
WHERE a.section = 'suggestions'
  AND NULLIF(TRIM(a.comment), '') IS NOT NULL
ORDER BY f.submitted_at DESC, a.question_key;

-- 9. Relatorio completo em colunas, sem precisar ler o JSON manualmente.
SELECT
  f.id AS feedback_id,
  f.submitted_at AS data_envio,
  u.name AS usuario,
  u.email,
  p.name AS pet,
  f.veterinary_satisfaction AS satisfacao_carteira_pet,
  f.app_rating AS avaliacao_app,
  MAX(a.rating) FILTER (WHERE a.section = 'improvements' AND a.question_key = 'petWalletInfo') AS melhoria_carteirinha_pet_nota,
  MAX(a.comment) FILTER (WHERE a.section = 'improvements' AND a.question_key = 'petWalletInfo') AS melhoria_carteirinha_pet_texto,
  MAX(a.rating) FILTER (WHERE a.section = 'improvements' AND a.question_key = 'vaccines') AS melhoria_vacinas_nota,
  MAX(a.comment) FILTER (WHERE a.section = 'improvements' AND a.question_key = 'vaccines') AS melhoria_vacinas_texto,
  MAX(a.rating) FILTER (WHERE a.section = 'improvements' AND a.question_key = 'travel') AS melhoria_viagens_nota,
  MAX(a.comment) FILTER (WHERE a.section = 'improvements' AND a.question_key = 'travel') AS melhoria_viagens_texto,
  MAX(a.rating) FILTER (WHERE a.section = 'suggestions' AND a.question_key = 'petWalletInfo') AS sugestao_carteirinha_pet_nota,
  MAX(a.comment) FILTER (WHERE a.section = 'suggestions' AND a.question_key = 'petWalletInfo') AS sugestao_carteirinha_pet_texto,
  MAX(a.rating) FILTER (WHERE a.section = 'suggestions' AND a.question_key = 'vaccines') AS sugestao_vacinas_nota,
  MAX(a.comment) FILTER (WHERE a.section = 'suggestions' AND a.question_key = 'vaccines') AS sugestao_vacinas_texto,
  MAX(a.rating) FILTER (WHERE a.section = 'suggestions' AND a.question_key = 'travel') AS sugestao_viagens_nota,
  MAX(a.comment) FILTER (WHERE a.section = 'suggestions' AND a.question_key = 'travel') AS sugestao_viagens_texto
FROM pet_feedback f
LEFT JOIN pet_feedback_answers a
  ON a.user_id = f.user_id
 AND a.feedback_id = f.id
LEFT JOIN pet_app_users u
  ON u.id = f.user_id
LEFT JOIN pet_pets p
  ON p.user_id = f.user_id
 AND p.id = f.pet_id
GROUP BY
  f.user_id,
  f.id,
  f.submitted_at,
  u.name,
  u.email,
  p.name,
  f.veterinary_satisfaction,
  f.app_rating
ORDER BY f.submitted_at DESC;

-- 10. Quantidade de respostas por nota Likert, para montar tabela ou grafico.
SELECT
  a.section AS secao,
  a.section_label AS titulo_secao,
  a.question_key AS funcionalidade,
  a.question_label AS pergunta,
  a.rating AS nota_likert,
  COUNT(*) AS quantidade
FROM pet_feedback_answers a
GROUP BY a.section, a.section_label, a.question_key, a.question_label, a.rating
ORDER BY a.section, a.question_key, a.rating;

