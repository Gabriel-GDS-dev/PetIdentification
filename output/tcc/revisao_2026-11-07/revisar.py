from pathlib import Path
import re, shutil
root=Path(__file__).parent
src=root/'original'
dst=root/'revisado'
shutil.copytree(src,dst,dirs_exist_ok=True)
p=dst/'TCCFinal.tex'
s=p.read_text(encoding='utf-8')
def paragraph(prefix,new):
    global s
    start=s.index(prefix)
    end=s.index('\n\n',start)
    s=s[:start]+new+s[end:]
paragraph(r'\textbf{Resumo:}',r'''\textbf{Resumo:} A dispersão de dados de identificação, vacinação e documentos clínicos dificulta a organização do histórico de animais de estimação. Este trabalho teve como objetivo desenvolver e avaliar o funcionamento de uma aplicação multiplataforma para cadastrar, organizar e consultar esses registros. A aplicação Registro Digital Animal foi desenvolvida como aplicação web progressiva, com autenticação, sincronização e persistência no PostgreSQL. A avaliação reuniu 15 cenários funcionais de caixa-preta, dois retornos anteriores preservados, sugestões de melhoria de quatro contas e uma nova avaliação funcional de 11 contas, selecionada entre 17 envios da versão 3 do formulário. Os cenários foram registrados como aprovados nas condições avaliadas. As 88 respostas aos oito itens funcionais apresentaram médias descritivas entre 4,55 e 5,00, com uma discordância sobre a identificação da situação vacinal e uma resposta neutra sobre navegação, acompanhada de relato de dificuldade. Os comentários anteriores orientaram avisos internos, síntese de vacinas vencidas e planejamento de viagens com vários pets. A contribuição consiste no artefato e na análise exploratória de funcionamento, necessidades e percepções relatadas. Contas não comprovam participantes independentes, e a nova coleta não constitui comparação controlada das melhorias. Não foram mensurados benefícios clínicos ou redução do uso de documentos físicos.''')
paragraph(r'\textbf{ABSTRACT:}',r'''\textbf{ABSTRACT:} Scattered identification, vaccination and clinical documents make it difficult to organize companion animals' records. This study aimed to develop and evaluate a cross-platform application for registering, organizing and consulting these records. Registro Digital Animal was developed as a progressive web application with authentication, synchronization and PostgreSQL persistence. The evaluation combined 15 black-box functional scenarios, two preserved earlier responses, improvement suggestions from four accounts and a new functional assessment from 11 accounts, selected from 17 submissions of questionnaire version 3. The scenarios were recorded as passed under the evaluated conditions. The 88 responses to eight functional items yielded descriptive means ranging from 4.55 to 5.00, with one disagreement about identifying vaccination status and one neutral navigation response accompanied by a report of difficulty. Earlier comments informed in-app reminders, overdue-vaccination summaries and multi-pet travel planning. The contribution comprises the software artifact and an exploratory analysis of operation, needs and reported perceptions. Accounts do not establish independent participants, and the new collection is not a controlled comparison of improvements. Clinical benefits and reductions in the use of physical documents were not measured.''')
paragraph('Em 4 de novembro de 2026, foi realizada uma extração',r'''As consultas de novembro utilizaram as tabelas de avaliações do Prisma Postgres na Vercel, sem alteração dos registros. A extração inicial, de 4 de novembro, examinou sugestões de melhoria (versão 2). A atualização consultada em 7 de novembro incluiu a versão 3, voltada às funções utilizadas. Selecionou-se o envio mais recente por conta dentro de cada versão, ordenado por data de envio e, em caso de empate, identificador. Essa separação preserva o significado dos enunciados e impede que uma nova avaliação substitua o histórico de outro instrumento. Os itens foram analisados individualmente por frequências, médias descritivas e medianas, sem índice global ou inferência populacional. Zero nos campos gerais foi tratado como ausência; a opção \textit{Não utilizei}, prevista na versão 3, seria contabilizada separadamente e excluída das médias. Os comentários foram agrupados por conteúdo por um único analista. Os conjuntos não foram vinculados nominalmente ao recrutamento inicial nem constituem comparação controlada antes e depois.''')
paragraph('Esta seção apresenta os resultados funcionais,',r'''Esta seção apresenta os resultados dos cenários funcionais, os dois retornos anteriores e as coletas estruturadas de novembro, distinguindo sugestões de melhoria de avaliações das funções utilizadas. As fontes não foram agregadas como uma única amostra de participantes.''')
start=s.index(r'\subsection{Avaliações estruturadas registradas em novembro de 2026}')
end=s.index(r'\subsection{Limitações e ameaças à validade}',start)
old=s[start:end]
table_start=old.index(r'\begin{table}',old.index(r'\label{tab:rastreabilidade_feedbacks}')-200)
# Preserve the traceability table already documented in the source.
table_start=old.rfind(r'\begin{table}',0,old.index(r'\label{tab:rastreabilidade_feedbacks}'))
table_end=old.index(r'\end{table}',table_start)+len(r'\end{table}')
trace=old[table_start:table_end]
new=r'''\subsection{Avaliações estruturadas registradas em novembro de 2026}
\label{sec:feedbacks_novembro}

\subsubsection{Histórico de sugestões e alterações do aplicativo}

A versão 2, registrada em 4 de novembro, reuniu cinco envios de quatro contas. Após manter o envio mais recente de cada conta, restaram quatro avaliações (N1 a N4, em ordem cronológica) e 24 respostas às seis afirmações. Os itens perguntavam sobre necessidade de melhoria e utilidade de sugestões; não avaliam a execução das funções. As médias dos três itens de melhoria foram 2,25 para carteirinha, 1,75 para vacinas e 1,00 para viagens; as dos itens de utilidade foram 3,00 para novos campos, 3,75 para alertas vacinais e 3,75 para checklist por pet. Cada campo geral teve três notas válidas, com média 4,67; o zero de uma conta foi excluído desses campos.

N1 não acrescentou comentários. N2 sugeriu avisos de vencimento e organização antecipada de viagens; N3 pediu a apresentação de todas as vacinas vencidas; N4 propôs síntese das pendências, seleção de vários pets, listas individuais ou compartilhadas e itens adicionais. Três contas concordaram com a utilidade dos alertas e do checklist por pet, enquanto uma discordou. A Tabela~\ref{tab:rastreabilidade_feedbacks} preserva a relação entre essas solicitações e o desenvolvimento.

'''+trace+r'''

Os avisos são calculados ao acessar o app, conforme datas e registros disponíveis; não são notificações do sistema operacional com o aplicativo fechado. Seis testes automatizados com dados fictícios verificaram regras de datas, pendências e checklists compartilhados. Esses testes constituem verificação técnica, sem mensuração de satisfação ou redução de esquecimentos.

\subsubsection{Nova avaliação das funcionalidades utilizadas}

Na consulta de 7 de novembro, a base continha 22 envios: cinco da versão 2 e 17 da versão 3. Nesta última, os 17 envios correspondiam a 11 contas. Foram selecionados os 11 envios mais recentes por conta, desconsiderando seis reenvios na análise, sem apagar registros. As datas de envio selecionadas situam-se em 5 e 6 de novembro no horário de Brasília (UTC-3); a base armazena UTC. Uma conta aparece nas duas versões, reforçando que os grupos não devem ser somados como pessoas distintas. Não se estabeleceu correspondência com os convites anteriores.

O instrumento passou a apresentar afirmações de realização das tarefas: consultar a identificação na carteirinha, registrar vacina, identificar a situação vacinal pelas datas e status, usar o checklist de viagem, cadastrar e editar pet, consultar documento anexado e encontrar funções nos menus. A escala vai de 1 (discordo totalmente) a 5 (concordo totalmente), com 3 como posição neutra e opção \textit{Não utilizei}. As respostas representam percepção declarada de uso; não substituem observação direta da execução.

As 11 avaliações selecionadas forneceram 88 respostas numéricas válidas, sem marcações de \textit{Não utilizei}. A Tabela~\ref{tab:avaliacao_funcional_v3} apresenta cada item com seu próprio denominador; as frequências correspondem às 11 contas e não a 88 participantes. Todas as medianas foram 5.

\begin{table}[htbp]
\centering
\caption{Avaliação funcional da versão 3, com um envio por conta}
\label{tab:avaliacao_funcional_v3}
\small
\setlength{\tabcolsep}{4pt}
\renewcommand{\arraystretch}{1.15}
\begin{tabular}{@{}p{\dimexpr0.61\linewidth-8\tabcolsep\relax}rrrr@{}}
\hline
\textbf{Tarefa avaliada (enunciado resumido)} & \textbf{D} & \textbf{N} & \textbf{C} & \textbf{Média} \\
\hline
Consultar identificação na carteirinha & 0 & 0 & 11 & 5,00 \\
Registrar vacina do pet & 0 & 0 & 11 & 4,82 \\
Identificar situação das vacinas & 1 & 0 & 10 & 4,55 \\
Usar checklist de viagem & 0 & 0 & 11 & 4,82 \\
Cadastrar pet & 0 & 0 & 11 & 4,91 \\
Editar dados do pet & 0 & 0 & 11 & 5,00 \\
Consultar documento anexado & 0 & 0 & 11 & 4,91 \\
Encontrar funções nos menus & 0 & 1 & 10 & 4,73 \\
\hline
\end{tabular}
\par\vspace{2pt}
{\footnotesize\raggedright D: notas 1--2; N: nota 3; C: notas 4--5. Cada item: 11 respostas válidas; mediana 5. Fonte: Elaborado pelo autor.\par}
\end{table}

A consulta da carteirinha e a edição do pet receberam nota 5 nas 11 contas. A situação vacinal teve a menor média (4,55): dez concordâncias e uma discordância parcial (nota 2). Essa mesma conta marcou 3 em navegação e relatou ``só alguns problemas de navegação'', em comentário associado à carteirinha. O relato foi classificado pelo conteúdo, sem presumir a tela ou a causa do problema. Outra conta registrou elogios gerais nos oito comentários; as nove restantes não comentaram. A ausência de comentário não foi interpretada como ausência de dificuldade.

Nos campos gerais de avaliação do aplicativo e de satisfação com as informações da carteira, cada campo teve nove notas válidas: sete notas 5 e duas notas 4, com média 4,78 e mediana 5. Duas contas registraram zero nesses campos, excluído por estar fora da escala, preservando-se seus itens funcionais válidos. Duas das 11 avaliações não possuíam pet vinculado ao envio, embora declarassem uso das funções; essa ausência não prova falta de uso, mas limita a conferência da execução pelo registro de feedback.

O conjunto indica percepções predominantemente favoráveis às tarefas descritas, com pontos a investigar em situação vacinal e navegação. Não se atribuiu severidade de Nielsen às notas nem se calculou satisfação global pela soma dos itens. A versão 3 não replica os enunciados da versão 2, não avalia isoladamente todas as alterações implementadas e não documenta tarefas observadas ou condições equivalentes. Assim, não permite estimar ganho de usabilidade ou demonstrar que as melhorias causaram as notas obtidas.

'''
s=s[:start]+new+s[end:]
paragraph('Na pesquisa de campo, a seleção por conveniência,',r'''Na pesquisa de campo, a seleção por conveniência, os dois retornos preservados, a perda de um retorno e a categorização por um único analista limitam a comparação e introduzem possíveis vieses de seleção e não resposta. Na coleta funcional, 11 contas não comprovam 11 participantes independentes, e sua profissão, município e correspondência com o recrutamento inicial não foram estabelecidos. Reenvios, zeros fora da escala, dois envios sem pet vinculado e a concentração de notas máximas exigem cautela. As respostas autodeclaradas não foram confrontadas com execução observada, tempo ou sucesso em tarefas. A mudança dos enunciados e a ausência de avaliação comparável das alterações impedem atribuir ganho de usabilidade ao desenvolvimento. Não foram demonstrados redução de papel, adesão vacinal, superioridade sobre outras soluções, autenticação de autoria da assinatura ou aceitação do PDF por terceiros.''')
paragraph('Os 15 cenários funcionais foram registrados como aprovados nas condições avaliadas, sem comprovar',r'''Os 15 cenários funcionais foram registrados como aprovados nas condições avaliadas. Os dois retornos anteriores indicaram utilidade e dificuldades de preenchimento; quatro avaliações da versão 2 orientaram avisos, síntese de vacinas vencidas e checklists flexíveis, acompanhados de testes técnicos. Na versão 3, a seleção de 11 avaliações entre 17 envios produziu 88 respostas às oito funções, com médias entre 4,55 e 5,00. A discordância sobre situação vacinal e o relato de navegação delimitam pontos para investigação. Os resultados indicam percepção favorável no recorte, sem demonstrar usabilidade generalizável ou melhoria causal em relação à versão anterior.''')
paragraph('A contribuição é o artefato e a rastreabilidade',r'''A contribuição é o artefato, a rastreabilidade entre necessidades e alterações e a avaliação exploratória das funções utilizadas. O alcance permanece limitado pela seleção não probabilística, pela caracterização incompleta das contas e pela ausência de observação independente e comparação controlada. A redução da dependência do papel permaneceu como benefício pretendido, sem mensuração. A experiência reforçou a necessidade de preservar dados, versões e denominadores e distinguir verificação técnica, sugestões e percepção de uso.''')
p.write_text(s,encoding='utf-8')
print('Fonte revisada:',p)
print('Palavras:',len(s.split()))
