from pathlib import Path
from shutil import copytree

root = Path(__file__).resolve().parents[1]
source = root / 'output/tcc/revisao_2026-11-04/revisado'
target = root / 'output/tcc/limite_20pag_2026-11-04/revisado'
copytree(source, target, dirs_exist_ok=True)
p = target / 'TCCFinal.tex'
s = p.read_text(encoding='utf-8')

def replace_between(start, end, replacement):
    global s
    a = s.index(start)
    b = s.index(end, a)
    s = s[:a] + replacement + '\n\n' + s[b:]

replace_between(r'\section{INTRODUÇÃO}', r'\section{MATERIAIS E MÉTODOS}', r'''\section{INTRODUÇÃO}

A consolidação da família multiespécie ampliou a importância dos animais de estimação no núcleo familiar e a preocupação dos tutores com sua saúde e bem-estar \cite{BOLSON2022,VIEIRA2020}. Esse contexto exige organizar informações de identificação e saúde, para as quais aplicativos e sistemas veterinários oferecem alternativas de registro e consulta \cite{MORAES2024}. A identificação individual também contribui para o acompanhamento do comportamento e das condições dos animais \cite{vidal2021}.

Dados de vacinação, exames, consultas e medicamentos compõem o histórico de saúde. A identificação e a rastreabilidade auxiliam o monitoramento e o controle de doenças infecciosas e zoonoses \cite{murphy2008}, enquanto a vacinação constitui medida preventiva relevante, inclusive contra a raiva \cite{MOUTINHO2017}. Entretanto, cadernetas e fichas em papel estão sujeitas a perdas, danos e deterioração \cite{BOLSON2022}, dificultando a consulta em atendimentos, viagens ou emergências. A digitalização foi adotada neste trabalho para reunir esses registros em um ambiente consultável pelo tutor.

Soluções existentes apresentam focos distintos. Prontuários eletrônicos veterinários demonstram a viabilidade da informatização, mas se dirigem principalmente às clínicas \cite{iskandar2023}. Plataformas de cadastro e controle de vacinação centralizam serviços, mantendo oportunidades relacionadas à mobilidade e ao acesso sem internet \cite{vieira2025}. A comunicação por aproximação complementa métodos tradicionais de identificação \cite{sartori2018}, e a rastreabilidade permite acompanhar origem, movimentações e registros sanitários \cite{zhao2020}. Isoladamente, essas tecnologias não reúnem necessariamente os documentos utilizados pelo tutor no cotidiano.

Essa diversidade de propostas permite delimitar o problema: informações de identificação, vacinação e documentos clínicos podem permanecer distribuídas entre papéis, estabelecimentos e sistemas. A proposta se justifica pela necessidade de organizá-las em uma interface acessível ao tutor, considerando mobilidade, consulta local e continuidade do acesso. No domínio computacional, o trabalho aplica desenvolvimento multiplataforma, modelagem relacional e mecanismos de persistência e sincronização.

Apresenta-se, assim, a aplicação \textbf{Registro Digital Animal}, com arquitetura de \textit{Progressive Web App} (PWA), acesso pelo navegador e instalação no dispositivo. O \textit{cache} e a persistência local permitem consultar dados previamente armazenados sem conexão. O objetivo geral foi desenvolver e avaliar o funcionamento de uma aplicação multiplataforma para cadastrar, organizar e consultar registros de identificação, vacinação e documentos clínicos de animais de estimação. A redução da dependência de documentos físicos é um benefício pretendido, não mensurado neste estudo.''')

# Os detalhes dos cenários permanecem na tabela completa F01--F15.
replace_between('O conjunto foi organizado em 15 cenários', 'A escala de severidade de Nielsen', r'''Foram organizados 15 cenários (F01 a F15), descritos na Tabela~\ref{tab:testes_funcionais}, abrangendo cadastro e autenticação, edição do animal, carteira e documentos, geolocalização, acesso móvel, consulta offline e sincronização. Em cada tarefa, verificaram-se o resultado esperado e a manutenção dos dados envolvidos, como vinculação de anexos ao pet, legibilidade da assinatura, consulta aos registros locais e persistência após restabelecer a conexão. Os registros não constituem bateria exaustiva de casos negativos, concorrência ou indisponibilidade de serviços, nem documentam tempos, número de tentativas ou avaliações independentes de usabilidade.''')

replace_between('Os 15 cenários foram registrados como aprovados nas condições descritas.', r'\subsection{Análise dos retornos anteriores', r'''Os 15 cenários foram registrados como aprovados nas condições descritas. Os resultados abrangem os fluxos de cadastro, carteira e documentos (F01--F08), mobilidade e localização de clínicas (F09--F12), consulta offline e sincronização dos registros (F13--F15). A aprovação se restringe às tarefas previstas e aos ambientes avaliados: não demonstra ausência de falhas em outros cenários, confiabilidade em produção ou usabilidade generalizável. A consulta offline depende de dados previamente armazenados; serviços externos e envio ao servidor exigem conectividade.''')

replace_between('Uma coleta complementar foi consultada em 4 de novembro de 2026', r'\subsubsection{Escalas e tratamento das respostas}', r'''A consulta complementar de 4 de novembro de 2026 relacionou as avaliações do Prisma Postgres na Vercel às respostas de cada pergunta pela chave composta de usuário e avaliação. Foram encontrados cinco envios de quatro contas. Dois eram idênticos, pertenciam à mesma conta e foram registrados com aproximadamente 15 segundos de diferença. Manteve-se apenas o mais recente dessa conta na análise, sem excluir registros do banco. O recorte contém quatro avaliações, uma por conta, identificadas como N1 a N4 em ordem cronológica, totalizando 24 respostas às seis afirmações de concordância.

Os envios selecionados ocorreram entre 15h15 e 15h29, no horário de Brasília; a base registra UTC. Essa proximidade não demonstra duração ou condições equivalentes de uso. Conta distinta não comprova participante independente: não foram estabelecidos profissão, município ou vínculo com os 13 aceites anteriores. Os novos registros não foram somados aos dois retornos preservados para anunciar seis participantes ou recalcular a taxa de resposta. Nomes, e-mails e identificadores técnicos foram omitidos.''')

replace_between('O formulário contém dois campos gerais de avaliação', r'\begin{table}[htbp]'+'\n'+r'\centering'+'\n'+r'\caption{Respostas às afirmações', r'''O formulário possui dois campos gerais e seis afirmações, com concordância de 1 (discordo totalmente) a 5 (concordo totalmente), sendo 3 a posição neutra. Discordar de uma necessidade de melhoria difere de discordar da utilidade de uma sugestão; portanto, os itens não foram somados em um índice de satisfação ou usabilidade.

Nos dois campos gerais, N1 e N2 atribuíram nota 5, N4 atribuiu 4 e N3 apresentou zero. Como zero está fora da escala, foi tratado como resposta ausente nesses campos, mantendo-se os itens válidos de N3. Cada campo geral teve três notas válidas, com média descritiva 4,67 e mediana 5. A Tabela~\ref{tab:likert_novembro} apresenta as respostas de concordância individualmente, com médias descritivas e medianas, sem inferência populacional.''')

replace_between('A Tabela~\\ref{tab:likert_novembro} mostra discordância total', r'\subsubsection{Comentários e transformação em requisitos}', r'''Os quatro registros discordaram totalmente de que a organização de viagens precisava melhorar, mas três concordaram parcial ou totalmente com a utilidade de checklist por pet; uma conta discordou totalmente dessa sugestão. O mesmo padrão ocorreu para alertas de vacinas, com notas 4, 5 e 5 nos registros favoráveis e nota 1 no restante. Assim, baixa concordância com uma deficiência geral pode coexistir com interesse em incrementos. Para campos opcionais da carteira, houve duas discordâncias parciais e duas concordâncias parciais. Não foram realizados testes de significância ou avaliação psicométrica, nem atribuída severidade de Nielsen às notas: concordância com uma sugestão e severidade observada são medidas distintas.''')

replace_between('N1 não acrescentou comentários textuais.', r'\begin{table}[htbp]'+'\n'+r'\centering'+'\n'+r'\caption{Rastreabilidade entre comentários', r'''N1 não acrescentou comentários. N2 solicitou alertas de vencimento e valorizou a preparação antecipada de viagens. N3 pediu que todas as vacinas vencidas fossem apresentadas; nos demais campos, informou não ter sugestões. N4 propôs resumir as pendências com dois nomes e a quantidade restante, selecionar vários pets para viajar, escolher entre checklist geral ou individual e acrescentar itens para necessidades específicas. Considerou úteis os alertas e avaliou novos campos de identificação como uma possibilidade sem necessidade extrema.

A categorização considerou o conteúdo, mesmo quando preenchido em campo associado a outro assunto: a solicitação de N3 sobre vacinas, por exemplo, estava em comentário da carteirinha. A priorização relacionou pedidos específicos às tarefas existentes, nas frentes de visibilidade dos prazos, síntese de pendências e flexibilidade de viagens. A Tabela~\ref{tab:rastreabilidade_feedbacks} apresenta essa relação, sem pressupor que todos os usuários tenham as mesmas necessidades.''')

replace_between('Os avisos foram implementados no interior da aplicação', r'\subsection{Limitações e ameaças à validade}', r'''Os avisos são calculados dentro do app a partir das datas e dos dados disponíveis no dispositivo; não há envio ao sistema operacional com o aplicativo fechado. Dependem da completude dos registros, da data do aparelho e da sincronização entre dispositivos.

Seis testes automatizados com dados fictícios verificaram regras de datas, contagem e listagem de vacinas vencidas, seleção de avisos de documentos e viagens, propagação de marcações e remoções no grupo e preservação das listas em JSON. Esses testes verificam regras técnicas; não equivalem a reavaliação por participantes nem comprovam satisfação com a versão modificada, aumento da adesão vacinal ou redução de esquecimentos.''')

replace_between(r'\section{CONCLUSÃO}', r'\bibliographystyle', r'''\section{CONCLUSÃO}

O trabalho desenvolveu a aplicação multiplataforma Registro Digital Animal para organizar e consultar identificação, vacinação e documentos clínicos de animais de estimação. O objetivo foi atendido no âmbito dos módulos e cenários descritos: cadastro de tutores e pets, carteira digital, documentos, registros vacinais e consulta em computadores e dispositivos móveis, com acesso a dados previamente armazenados e sincronização posterior.

Os 15 cenários funcionais foram registrados como aprovados nas condições avaliadas, sem comprovar ausência de falhas ou usabilidade generalizável. Os dois retornos anteriores indicaram utilidade na organização dos dados e dificuldades de preenchimento. A coleta complementar reuniu quatro avaliações, uma por conta, após desconsiderar um envio repetido. Os comentários orientaram avisos internos, resumo de vacinas vencidas, documentos na tela de viagens e checklists individuais ou compartilhados com itens adicionais. Seis testes automatizados verificaram regras dessas alterações; sua satisfação e facilidade de uso não foram reavaliadas por participantes.

A contribuição é o artefato e a rastreabilidade entre necessidades relatadas e alterações implementadas. O alcance é limitado pela seleção não probabilística, pelo conjunto reduzido de registros, pela caracterização incompleta das contas, pela perda de um retorno anterior e pela ausência de comparação com documentos físicos. A redução da dependência do papel permaneceu como benefício pretendido, sem mensuração. A experiência reforçou a necessidade de preservar os dados de avaliação e distinguir funcionamento técnico, clareza da interface e utilidade percebida.

Como trabalhos futuros, propõem-se avaliações com tutores e veterinários de diferentes perfis, comparação do tempo de localização e da completude dos registros com a documentação física e acompanhamento longitudinal dos prazos vacinais. Também devem ser investigados conectividade intermitente, edições concorrentes, recuperação de dados e participação profissional, considerando autorização de acesso e confiabilidade das informações.''')

# Regra do projeto documentada no fonte e verificada no PDF exportado.
s = s.replace(r'\begin{document}', '% Limite obrigatório: PDF completo com 20 páginas ou menos, incluindo referências.\n'+r'\begin{document}', 1)
p.write_text(s, encoding='utf-8')
print('Fonte compacto:', p)
print('Palavras aproximadas:', len(s.split()))
