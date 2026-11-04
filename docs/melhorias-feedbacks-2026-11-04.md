# Melhorias a partir dos feedbacks

O app passa a reunir pendências de vacinas, documentos e viagens na central **Avisos**, acessível no cabeçalho e no menu lateral. Cada vacina vencida continua disponível individualmente. A carteira, os cards e o PDF resumem a quantidade de vacinas vencidas, dois nomes e a quantidade restante. Pets sem registros vacinais recebem a indicação de ausência de registros.

Os avisos consideram o dia local do dispositivo, com prazo de até 30 dias. Vencimentos de hoje são distinguidos de datas passadas. Vacinas sem data válida têm filtro próprio. Os avisos aparecem dentro do aplicativo; não há envio de push com o aplicativo fechado.

A tela de viagens reúne os documentos do pet, permite acrescentar e remover itens específicos e permite selecionar acompanhantes no plano. O usuário pode manter checklists individuais ou compartilhar as marcações entre os pets selecionados. Ao compartilhar, a lista do pet principal substitui a lista do grupo, conforme a explicação no formulário. Cada pet continua com um plano de viagem; não há histórico de várias viagens simultâneas por pet.

Os dados adicionais do grupo são preservados no estado JSON já sincronizado pelo backend. Os itens adicionais também seguem a persistência de itens de viagem existente. Não é necessária alteração do esquema do banco. Não há alteração dos feedbacks recebidos.

## Validação

- `npm test`: seis testes de regras de datas, resumo/listagem de pendências, seleção de avisos, propagação/remoção no grupo e preservação em JSON.
- `node --check`: frontend, servidor e service worker.
- `npm run build`: verificação de preparação do frontend estático (não é um empacotador ou teste de integração).
- Navegador com dados fictícios em ambiente local isolado: cinco vacinas vencidas, checklist de dois pets, item adicional compartilhado e isolamento do terceiro pet; revisão do layout em largura de 390 pixels.
- A verificação local não comprova a sincronização com o PostgreSQL de produção. A análise do TCC não atribui melhora de usabilidade às alterações sem reavaliação dos participantes.

A versão do cache PWA foi atualizada para 44 e inclui o módulo de lembretes. As consultas de análise sem repetição de contas estão em `backend/db/feedback-analysis-latest.sql`; os dados individuais e os documentos do TCC não fazem parte do código público.
