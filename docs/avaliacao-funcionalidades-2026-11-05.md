# Avaliação das funções do aplicativo

O formulário versão 3 avalia a experiência de uso das funções existentes, em substituição aos enunciados sobre necessidade de melhorias e utilidade de sugestões. São oito itens: consulta da carteirinha, registro de vacinas, interpretação da situação das vacinas, checklist de viagem, cadastro de pet, edição de pet, consulta de documento anexado e navegação.

Cada item usa concordância de 1 a 5 e a opção “Não utilizei”. Os comentários sobre a experiência são opcionais tanto para concordância quanto para discordância. O instrumento coleta percepção relatada; não constitui comprovação observacional de execução das tarefas nem instrumento psicométrico validado.

## Persistência e compatibilidade

Os campos de transporte `improvements` e `suggestions` permanecem para compatibilidade com o backend. Seu JSON identifica `version: 3` e utiliza chaves de perguntas novas. As respostas anteriores mantêm os títulos e significados originais na consulta do último envio e não preenchem as novas perguntas. Os registros históricos não são convertidos em avaliações funcionais.

O esquema PostgreSQL mantém o tratamento antigo e acrescenta os enunciados e chaves da versão 3 ao trigger de `pet_feedback_answers`. “Não utilizei” é persistido como `not_used` no JSON original e não gera uma nota na tabela normalizada, cuja escala aceita somente 1 a 5. Portanto, não entra em médias; contagens de não utilização devem consultar o JSON. As novas chaves também evitam misturar as perguntas antigas e novas na consulta `feedback-analysis-latest.sql`. Outras análises devem separar versões/enunciados e explicitar seus denominadores.

O cache PWA passa à versão 45. A publicação exige distribuir frontend e backend atualizados para que o esquema executado na inicialização inclua o novo tratamento do trigger. A alteração local não comprova atualização do banco de produção. Para avaliar as funções no TCC, é necessária nova coleta com o novo formulário; respostas antigas continuam sendo evidências de sugestões de melhoria.
