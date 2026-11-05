from pathlib import Path
import re, shutil, json

base=Path('tmp/tcc_original_20261028')
out=Path('output/tcc/revisao_2026-10-28')
shutil.copytree(base,out,dirs_exist_ok=True)
t=(base/'TCCFinal.tex').read_text(encoding='utf8')
# Remove instructional and abandoned template comments, preserving active source.
t='\n'.join(l for l in t.splitlines() if not l.lstrip().startswith('%'))
t=re.sub(r'\n[ \t]*\n(?:[ \t]*\n)+','\n\n',t)
resumo='A dispersão de informações de identificação, vacinação e documentos clínicos dificulta a organização e a consulta ao histórico dos animais de estimação. Este trabalho teve como objetivo desenvolver e avaliar o funcionamento de uma aplicação multiplataforma para cadastro, organização e consulta desses registros. Foi desenvolvida a aplicação Registro Digital Animal, com interface web progressiva, serviços de autenticação e sincronização e persistência no PostgreSQL. A avaliação reuniu 15 cenários funcionais de caixa-preta descritos no estudo e a análise qualitativa de dois retornos preservados de participantes do setor veterinário. Os cenários funcionais foram registrados como aprovados nas condições avaliadas, incluindo consulta a dados previamente armazenados e sincronização posterior. Os retornos apontaram utilidade na organização das informações e no planejamento de viagens, mas também identificaram dificuldade no preenchimento de peso decimal e oportunidades de aprimoramento dos campos de vacinação e da localização de clínicas. A pesquisa apresenta um artefato computacional e evidências exploratórias sobre sua adequação ao contexto de uso. A avaliação não mensurou redução do emprego de documentos físicos nem permite generalizar a usabilidade, devido ao alcance dos testes e ao conjunto reduzido de retornos disponíveis.'
abstract='Scattered identification, vaccination, and clinical documents make it difficult to organize and consult the records of companion animals. This study aimed to develop and evaluate the operation of a cross-platform application for registering, organizing, and consulting these records. The Registro Digital Animal application was developed with a progressive web interface, authentication and synchronization services, and PostgreSQL persistence. The evaluation combined 15 black-box functional scenarios described in the study with a qualitative analysis of two preserved responses from participants in the veterinary sector. The functional scenarios were recorded as passed under the evaluated conditions, including access to previously stored data and subsequent synchronization. The responses indicated usefulness in organizing information and planning trips, while also identifying difficulty entering decimal weight values and opportunities to improve vaccination fields and clinic location features. The research provides a computational artifact and exploratory evidence of its suitability for the intended context. The evaluation did not measure a reduction in the use of physical documents and does not support generalizing usability findings, given the scope of the tests and the small set of available responses.'
start=t.index('\\textbf{Resumo:}')
end=t.index('\\section{INTRODUÇÃO}',start)
t=t[:start]+r'\textbf{Resumo:} '+resumo+'\n\n'+r'''\vspace{0.5em}
\noindent
\textbf{Palavras-chave:} animais de estimação; registro digital; vacinação animal; aplicação web progressiva; testes funcionais.

\vspace{1.0em}
\noindent
\textbf{ABSTRACT:} '''+abstract+'\n\n'+r'''\vspace{0.5em}
\noindent
\textbf{Keywords:} companion animals; digital records; animal vaccination; progressive web application; functional testing.

'''+t[end:]
t=t.replace('O objetivo geral deste trabalho foi avaliar uma aplicação multiplataforma para registro digital de vacinação e identificação animal, buscando reduzir a dependência de registros físicos e facilitar o acesso às informações de saúde dos animais.','O objetivo geral deste trabalho foi desenvolver e avaliar o funcionamento de uma aplicação multiplataforma para cadastro, organização e consulta de registros de identificação, vacinação e documentos clínicos de animais de estimação. A redução da dependência de registros físicos constitui um benefício pretendido, cuja ocorrência não foi mensurada neste estudo.')
# Remove an unsupported attribution to a paper about animal rights, rather than digital human vaccination.
t=t.replace(' A experiência com registros digitais de vacinação em saúde humana também evidencia possibilidades de organização e acesso às informações, servindo como referência para sua adaptação ao contexto animal \\cite{MARTINS2024}.','')
t=t.replace('A digitalização dos registros surge como uma alternativa para reduzir essas limitações, possibilitando o armazenamento estruturado e a consulta das informações por meio de dispositivos digitais. No contexto da saúde animal, essa abordagem permite organizar dados clínicos e vacinais e facilitar seu acesso em diferentes ambientes \\cite{VIEIRA2020}. A utilização de dispositivos móveis também amplia a disponibilidade dessas informações, tornando possível consultar os registros sem depender exclusivamente da posse de documentos físicos \\cite{RODRIGUES2022}.','A digitalização dos registros foi adotada neste trabalho como alternativa para reunir dados de identificação, vacinação e documentos clínicos em um ambiente consultável pelo tutor. A proposta se insere no contexto de utilização de aplicativos e softwares na medicina veterinária \\cite{MORAES2024}. A disponibilidade por dispositivos móveis e a consulta local foram requisitos de desenvolvimento para permitir o acesso aos registros sem depender exclusivamente da posse de documentos físicos.')
t=t.replace('A digitalização oferece uma alternativa às limitações de conservação e consulta dos documentos físicos, enquanto o uso de dispositivos móveis favorece o acesso às informações em diferentes situações do cotidiano \\cite{VIEIRA2020,RODRIGUES2022}.','Neste trabalho, a digitalização foi proposta para reunir os registros em um ambiente acessível em diferentes situações do cotidiano. A preocupação com a saúde e o bem-estar dos animais integra o contexto da família multiespécie \\cite{VIEIRA2020}.')
old='O método adotado foi fundamentado na \\textit{Design Science Research} (DSR), abordagem voltada à concepção, construção e avaliação de artefatos tecnológicos destinados à solução de problemas reais e relevantes. Neste estudo, o artefato resultante foi uma aplicação multiplataforma denominada Registro Digital Animal, projetada para o cadastro, armazenamento e consulta eficiente de informações vacinais, clínicas e de identificação de animais de estimação.'
new=r'''O estudo foi orientado pela construção e avaliação de um artefato computacional, em aproximação à \textit{Design Science Research} (DSR). Essa abordagem relaciona a identificação de um problema à definição de objetivos, ao desenvolvimento e à avaliação de uma solução \cite{peffers2007}. Neste trabalho, o problema foi delimitado pela organização e consulta dos registros dos animais; os requisitos foram materializados nos módulos de cadastro, carteira, vacinação, documentos e acesso local; o artefato foi implementado como aplicação multiplataforma; e sua avaliação foi apresentada por cenários funcionais e retornos de participantes do setor veterinário. Esse encadeamento descreve as atividades documentadas no projeto, sem pressupor a execução de etapas adicionais ou de ciclos experimentais não registrados.'''
assert old in t
t=t.replace(old,new)
a=t.index('\\subsection{Desenvolvimento do Sistema}')
b=t.index('\\subsubsection{Arquitetura e Tecnologias do Sistema}',a)
t=t[:a]+r'''\subsection{Desenvolvimento do Sistema}

O desenvolvimento produziu a aplicação Registro Digital Animal, voltada ao uso cotidiano do tutor. Os requisitos contemplaram cadastro de usuários e animais, organização de vacinas e documentos, carteira digital, planejamento de viagens e consulta de estabelecimentos veterinários. A interface foi organizada para computadores e dispositivos móveis, com persistência local e sincronização com o servidor. O código-fonte e os scripts do projeto estão disponíveis em repositório público\footnote{Disponível em: \url{https://github.com/Gabriel-GDS-dev/PetIdentification}. Acesso em: 28 out. 2026.}. A arquitetura e as tecnologias empregadas são descritas a seguir.

'''+t[b:]
t=t.replace('A persistência das informações foi realizada no PostgreSQL 18, hospedado no Render Postgres, e a aplicação foi disponibilizada por meio de um Render Web Service.','A persistência das informações foi implementada no PostgreSQL 18. A infraestrutura descrita para a etapa de avaliação utilizou Render Postgres e Render Web Service. O projeto também contém configuração para publicação na Vercel e execução local. A comunicação com o banco foi parametrizada por variáveis de ambiente. A indisponibilidade posterior do banco hospedado limitou a recuperação de parte dos retornos da pesquisa de campo, conforme descrito na avaliação.')
t=t.replace('O banco de dados foi organizado conforme as seis tabelas apresentadas na Figura~\\ref{fig:diagrama_banco_dados}. A descrição de cada estrutura e de sua finalidade na aplicação é apresentada a seguir.','A Figura~\\ref{fig:diagrama_banco_dados} apresenta um recorte de seis tabelas do núcleo cadastral da aplicação. A implementação contém também estruturas auxiliares para itens de viagem, avaliações, estado sincronizado, anexos, sincronizações em partes e eventos de uso. Portanto, o diagrama não representa a totalidade do esquema. A descrição das seis estruturas representadas é apresentada a seguir.')
t=t.replace('A Figura~\\ref{fig:diagrama_banco_dados} apresenta o diagrama do banco de dados utilizado pela aplicação, incluindo as tabelas, os campos armazenados, os tipos de dados, as chaves e os relacionamentos existentes entre as estruturas.','A Figura~\\ref{fig:diagrama_banco_dados} apresenta as tabelas do recorte descrito, com os campos, tipos de dados, chaves e relacionamentos representados.')
t=t.replace('\\caption{Diagrama relacional do banco de dados PostgreSQL da aplicação Registro Digital Animal}','\\caption{Recorte do núcleo cadastral do banco PostgreSQL da aplicação Registro Digital Animal}')
t=t.replace('A avaliação foi organizada em testes funcionais de caixa-preta, com observação de aspectos de usabilidade, e pesquisa de campo com profissionais veterinários. Os testes verificaram as respostas da aplicação às ações do usuário, enquanto a pesquisa reuniu percepções sobre a utilidade da solução.','A avaliação compreendeu a verificação funcional de caixa-preta apresentada no desenvolvimento e a análise exploratória de retornos do setor veterinário. A verificação funcional comparou ações e resultados esperados. As observações sobre clareza das telas e navegação foram consideradas descritivas e não constituíram uma avaliação padronizada de usabilidade com usuários. A análise de retornos examinou utilidades percebidas e dificuldades relatadas, sem estimar aceitação populacional.')
t=t.replace('Os 15 cenários foram identificados de F01 a F15, mantendo a correspondência com os resultados apresentados na Tabela~\\ref{tab:testes_funcionais}:','O conjunto de avaliação técnica descrito no estudo foi organizado em 15 cenários, identificados de F01 a F15 e relacionados aos resultados da Tabela~\\ref{tab:testes_funcionais}. A classificação funcional se refere à tarefa prevista em cada cenário. Os registros não constituem uma bateria exaustiva de casos negativos, concorrência ou indisponibilidade de serviços, nem documentam medições de tempo, número de tentativas ou avaliações independentes de usabilidade. Os cenários foram:')
t=t.replace('Para registrar os problemas de usabilidade observados, adotou-se a escala de severidade de Nielsen: 0 (não é problema), 1 (problema cosmético), 2 (problema menor), 3 (problema maior) e 4 (problema catastrófico). Os resultados funcionais e as classificações de severidade são apresentados na seção de Resultados e Discussão.','A escala de severidade de Nielsen se destina à classificação de problemas de usabilidade identificados, considerando frequência, impacto e persistência \\cite{nielsen1994}. Como não foi preservado um protocolo de julgamento independente desses fatores para cada cenário, não foram atribuídas notas de severidade nesta apresentação. A aprovação funcional foi mantida separada dos problemas e sugestões relatados pelos participantes.')
a=t.index('\\subsubsection{Procedimento da pesquisa de campo}')
b=t.index('\\begingroup',a)
t=t[:a]+r'''\subsubsection{Procedimento da pesquisa de campo}

O convite à avaliação foi dirigido a clínicas veterinárias e estabelecimentos do setor em Santa Catarina, identificados pelo Google Maps em Criciúma e pela plataforma Casa dos Dados nos demais municípios. A seleção foi não probabilística e relacionada ao domínio da aplicação. O contato ocorreu remotamente pelo WhatsApp, com apresentação do pesquisador, do propósito do trabalho e de orientações para acesso ou observação do sistema. Os registros preservados não permitem informar o total de estabelecimentos contatados nem calcular taxa de resposta.

Foram recebidos três retornos, dos quais dois permaneceram disponíveis para análise. O terceiro ficou armazenado no banco hospedado no Render e não pôde ser recuperado após a indisponibilidade do serviço. O conteúdo desse retorno foi excluído da análise. Os dois registros preservados foram identificados como R1 e R2, sem divulgação de nomes ou estabelecimentos. R1 correspondeu a uma avaliação estruturada salva pela aplicação, com notas e comentários; R2 correspondeu a um relato textual livre de uma participante que se referiu à rotina da medicina veterinária e informou ter cadastrado seus animais. O papel profissional específico de R1 não foi detalhado no registro disponível.

No formulário, os campos gerais registraram satisfação com as informações da carteira e avaliação do aplicativo. Os itens de concordância foram organizados em necessidade de melhoria da carteira, vacinação e viagens, além de utilidade de possíveis aprimoramentos nesses mesmos módulos. A concordância com a necessidade de melhoria não foi interpretada como satisfação. O relato livre foi examinado como percepção individual, sem conversão em pontuação.

A análise dos dois registros agrupou os comentários por conteúdo: organização e identificação do animal; preenchimento e informação vacinal; planejamento de viagens; localização de clínicas; e integração com a atuação veterinária. As menções foram associadas a R1 ou R2, permitindo rastrear cada interpretação ao registro correspondente. Não foram produzidas estimativas estatísticas ou frequências de aceitação. Os resultados apresentados limitam-se ao conteúdo preservado, e a categorização não foi submetida à concordância entre avaliadores independentes.

'''+t[b:]
t=t.replace('Nesta seção são apresentados e discutidos os resultados obtidos na avaliação da aplicação \\textbf{Registro Digital Animal}. A validação foi organizada em duas frentes complementares: a execução de testes funcionais de caixa-preta, com observação de aspectos de usabilidade, e a análise qualitativa das percepções coletadas junto a estabelecimentos e profissionais da área veterinária do estado de Santa Catarina. Dessa forma, buscou-se verificar não apenas o funcionamento técnico da solução, mas também sua aderência a necessidades reais do contexto de acompanhamento e identificação de animais.','Esta seção apresenta os resultados funcionais registrados para a aplicação \\textbf{Registro Digital Animal} e a análise exploratória dos dois retornos preservados da pesquisa de campo. Os resultados são discutidos conforme o alcance de cada fonte: conclusão de tarefas nos cenários definidos e percepções individuais sobre utilidade e dificuldades de uso.')
t=t.replace('\\subsection{Testes funcionais e avaliação de usabilidade}','\\subsection{Resultados dos cenários funcionais}')
t=t.replace('A Tabela~\\ref{tab:testes_funcionais} apresenta os resultados dos 15 cenários definidos na seção de Materiais e Métodos, mantendo seus identificadores e as respectivas classificações de severidade.','A Tabela~\\ref{tab:testes_funcionais} apresenta os resultados dos 15 cenários definidos na seção de Materiais e Métodos. A classificação expressa o resultado funcional registrado, sem equivalência com uma medida de usabilidade.')
t=t.replace('\\caption{Resultados dos testes funcionais e de usabilidade do sistema}','\\caption{Resultados registrados para os cenários funcionais do sistema}')
t=t.replace(r'\begin{tabular}{@{}p{0.07\linewidth} p{\dimexpr0.64\linewidth-6\tabcolsep\relax} p{0.13\linewidth} p{0.16\linewidth}@{}}',r'\begin{tabular}{@{}p{0.08\linewidth} p{\dimexpr0.76\linewidth-4\tabcolsep\relax} p{0.16\linewidth}@{}}')
t=t.replace(r'\textbf{ID} & \textbf{Cenário de teste avaliado} & \textbf{Resultado} & \textbf{Severidade}',r'\textbf{ID} & \textbf{Cenário de teste avaliado} & \textbf{Resultado}')
t=t.replace(r'& Passou & 0 \\',r'& Passou \\')
start=t.index('Conforme apresentado na Tabela~\\ref{tab:testes_funcionais}')
end=t.index('Nos cenários F01 e F02',start)
t=t[:start]+'Os 15 cenários funcionais definidos foram registrados como aprovados nas condições de teste descritas. Esse resultado se restringe às tarefas previstas e não caracteriza ausência de falhas em outros cenários, nem substitui uma avaliação de usabilidade com usuários. O conjunto não permite estimar confiabilidade em produção ou taxas de sucesso para uma população de tutores.\n\n'+t[end:]
t=t.replace('armazenando as senhas em formato de \\textit{hash}, sem persistência de credenciais em texto puro.','armazenando as senhas em formato de \\textit{hash}, conforme a implementação de autenticação do servidor.')
t=t.replace('garantindo a consulta às informações essenciais','permitindo, nos cenários descritos, a consulta às informações essenciais')
a=t.index('\\subsection{Pesquisa de campo com profissionais veterinários}')
b=t.index('\\endgroup',a)
t=t[:a]+r'''\subsection{Análise dos retornos preservados da pesquisa de campo}

Os dois retornos preservados apresentaram conteúdos distintos e complementares. R1 reuniu notas e comentários específicos sobre campos da aplicação; R2 apresentou um relato livre sobre sua utilidade e possíveis ampliações. A Tabela~\ref{tab:resumo_qualitativo} relaciona os aspectos analisados aos registros que os sustentam. As descrições correspondem a menções individuais, sem indicação de prevalência entre profissionais veterinários.

\begin{table}[htbp]
\centering
\caption{Síntese dos comentários presentes nos dois retornos preservados}
\label{tab:resumo_qualitativo}
\small
\setlength{\tabcolsep}{4pt}
\renewcommand{\arraystretch}{1.15}
\begin{tabular}{@{}p{0.24\linewidth} p{\dimexpr0.66\linewidth-4\tabcolsep\relax} p{0.10\linewidth}@{}}
\hline
\textbf{Aspecto} & \textbf{Comentário ou sugestão registrada} & \textbf{Fonte} \\
\hline
Identificação e preenchimento & Dificuldade para informar o peso de 16,3; valorização de informações mais detalhadas sobre o animal. & R1 \\
Registro de vacinas & Questionamento sobre a necessidade do campo de quantidade de aplicação, considerado assunto de análise veterinária. & R1 \\
Organização e consulta & Utilidade dos dados para preenchimento pelo tutor e comunicação das informações durante o atendimento; navegação descrita como fácil. & R2 \\
Identificação por microchip & Valorização do registro de microchip como informação útil em situações de resgate. & R2 \\
Planejamento de viagens & Área descrita como completa e útil para organização antecipada de documentos. & R2 \\
Localização de clínicas & Utilidade da busca de estabelecimentos próximos e sugestão de destacar os que atendem 24 horas. & R2 \\
Atuação veterinária & Sugestão de área profissional com identificação pelo registro de conselho, consulta por microchip e registros de atendimento. & R2 \\
\hline
\end{tabular}
\par\vspace{2pt}
{\footnotesize\raggedright Fonte: Elaborado pelo autor a partir dos retornos preservados.\par}
\end{table}

Em R1, os campos gerais apresentaram nota 5 para as informações da carteira e nota 4 para a avaliação do aplicativo, em escala de 1 a 5. Essas duas notas pertencem a um único retorno e não foram tratadas como média de satisfação da amostra. Os itens adicionais de concordância avaliaram necessidade de melhoria e utilidade de aprimoramentos; por isso, suas notas não foram agregadas às avaliações gerais. A leitura dos comentários foi necessária para compreender as dificuldades concretas relatadas.

A dificuldade com peso decimal apareceu no exemplo de um animal com 16,3, cujo peso foi registrado como 16 porque o valor exato não foi aceito na interação descrita por R1. Esse achado evidencia uma limitação percebida no preenchimento, sem permitir atribuir sua causa ao navegador, à versão do aplicativo ou à validação de um campo específico. O comentário sobre quantidade de aplicação também indica a necessidade de revisar a clareza e a pertinência dos dados solicitados no módulo de vacinação, considerando a distinção entre registro pelo tutor e avaliação profissional.

R2 destacou a organização das informações e a facilidade para localizá-las na interface. A participante afirmou ter cadastrado seus animais e considerou úteis os dados de identificação, o registro de microchip, o planejamento de viagens e a busca de clínicas próximas. A observação sobre destacar estabelecimentos com atendimento 24 horas indica que a proximidade geográfica, isoladamente, pode ser insuficiente para orientar uma busca em situação de urgência. Trata-se de uma necessidade identificada no relato, sem comprovação de redução de tempo de atendimento ou melhoria de desfechos clínicos.

A sugestão de uma área veterinária, com consulta por microchip e registros de atendimento, amplia o problema para o compartilhamento de informações entre tutores e profissionais. Sua implementação exigiria investigar responsabilidades, autorização de acesso e verificação de identidade profissional. A menção a um número de conselho, por si só, não demonstra um mecanismo suficiente de validação de identidade. A sugestão foi mantida como possibilidade de investigação e não como funcionalidade já entregue.

R2 relacionou a organização digital ao acompanhamento das datas de revacinação. Esse comentário permite discutir a relevância percebida de acompanhar prazos, mas não demonstra que notificações automáticas tenham sido implementadas ou avaliadas. Da mesma forma, não foram identificados nos dois retornos comentários específicos que comprovem aceitação do funcionamento offline ou da exportação em PDF. Esses recursos foram descritos na avaliação técnica; sua apreciação pelos participantes não foi presumida.

\subsection{Limitações e ameaças à validade}

A avaliação funcional se limitou aos cenários e ambientes descritos, sem cobertura exaustiva de entradas inválidas, falhas de serviços externos, conflitos entre dispositivos ou perda de conexão durante o envio de anexos. A ausência de medidas de tempo, repetição e comparação com outra solução restringe conclusões sobre desempenho e facilidade de uso. A observação realizada no contexto de desenvolvimento também pode favorecer familiaridade com os fluxos, reduzindo a identificação de dificuldades enfrentadas por novos usuários.

Na pesquisa de campo, a seleção por conveniência, a análise de apenas dois retornos preservados, a caracterização incompleta dos respondentes e a combinação de formulário estruturado com relato livre limitam a comparação entre participantes. A indisponibilidade do terceiro retorno introduziu perda de dados, cujo efeito sobre o conjunto de opiniões não pôde ser avaliado. Como o total de convites não foi preservado no material analisado, não foi calculada taxa de resposta. A categorização por um único analista também admite viés de interpretação.

Os resultados não demonstram redução efetiva do uso de registros físicos, aumento de adesão à vacinação ou superioridade em relação a aplicativos existentes. A assinatura capturada no aplicativo e o documento exportado constituem recursos de registro e apresentação; a pesquisa não avaliou autenticação da autoria ou aceitação documental por terceiros. Essas limitações delimitam a contribuição como desenvolvimento de um artefato e avaliação exploratória de seu funcionamento e de necessidades percebidas.

'''+t[b:]
a=t.index('\\section{Conclusão}')
b=t.index('\\bibliographystyle',a)
t=t[:a]+r'''\section{CONCLUSÃO}

Este trabalho abordou a organização de informações de identificação, vacinação e documentos clínicos de animais de estimação por meio da aplicação multiplataforma Registro Digital Animal. O objetivo de desenvolver e avaliar o funcionamento da solução foi atendido no âmbito dos módulos implementados e dos cenários funcionais descritos. A aplicação reuniu cadastro de tutores e animais, carteira digital, registros vacinais, documentos e recursos de consulta em computadores e dispositivos móveis, incluindo acesso a informações previamente armazenadas e sincronização posterior.

Os 15 cenários funcionais foram registrados como aprovados nas condições avaliadas. Esse resultado indica atendimento às tarefas previstas, mas não comprova ausência de falhas nem usabilidade generalizável. Os dois retornos preservados complementaram a avaliação técnica ao apontarem utilidade na organização dos dados e no planejamento de viagens, juntamente com dificuldades e necessidades específicas: preenchimento de peso decimal, pertinência dos campos vacinais, identificação de clínicas com atendimento 24 horas e possibilidades de participação profissional.

A contribuição prática foi a construção de um artefato que reuniu diferentes registros do animal em uma interface acessível ao tutor. Como contribuição ao conhecimento no contexto estudado, a avaliação exploratória mostrou a necessidade de considerar conjuntamente a disponibilidade da informação, a precisão do preenchimento e sua adequação ao uso profissional. A aprovação de fluxos funcionais não eliminou dificuldades relatadas por participantes, o que reforça a importância de complementar testes técnicos com observação do uso. O estudo oferece, assim, requisitos e questões para novas avaliações, sem afirmar uma generalização teórica ou superioridade da solução.

O alcance dessas contribuições foi limitado pelo conjunto de testes, pela ausência de comparação com registros físicos e pela análise de somente dois dos três retornos recebidos. A perda de acesso ao terceiro retorno restringiu a rastreabilidade da coleta. Além disso, a seleção não probabilística e a caracterização parcial dos participantes impedem estender suas percepções a todos os tutores ou profissionais. A redução da dependência de documentos físicos permaneceu como benefício pretendido, sem mensuração de sua ocorrência.

Uma lição do estudo foi que o armazenamento remoto não dispensa procedimentos de preservação dos dados de avaliação. A indisponibilidade de um registro evidenciou a necessidade de cópias independentes e de documentação do processo de coleta. Outra lição foi distinguir correção de uma operação, clareza da interface e utilidade percebida: essas dimensões podem apresentar resultados diferentes e exigem evidências próprias. Tais cuidados são aplicáveis a outros projetos que associem desenvolvimento de software e avaliação exploratória com participantes.

Como trabalhos futuros, propõe-se investigar, com tutores e veterinários de perfis distintos, se a carteira digital altera o tempo de localização das informações, a completude dos registros e a frequência de consulta quando comparada à documentação física. Estudos de uso ao longo do tempo poderão examinar a manutenção do histórico e o acompanhamento de prazos vacinais. Também se recomenda avaliar cenários de conectividade intermitente, edições concorrentes e recuperação de dados para compreender em quais condições a sincronização mantém informações consistentes. A participação veterinária e a busca de clínicas em situações de urgência constituem outras questões de pesquisa, envolvendo qualidade dos dados, autorização de acesso e confiabilidade da informação apresentada.

Conclui-se que a aplicação constituiu uma alternativa tecnicamente implementada para centralizar os registros no contexto delimitado, acompanhada de evidências iniciais de funcionamento e de necessidades de aprimoramento. A continuidade da pesquisa deverá verificar seus efeitos no uso cotidiano e ampliar a base empírica necessária para avaliar sua contribuição à organização das informações dos animais.

'''+t[b:]
t=re.sub(r'\n[ \t]*\n(?:[ \t]*\n)+','\n\n',t)
(out/'TCCFinal.tex').write_text(t+'\n',encoding='utf8')
bib=(base/'referencias.bib').read_text(encoding='utf8')
bib+=r'''

@article{peffers2007,
  author = {Peffers, Ken and Tuunanen, Tuure and Rothenberger, Marcus A. and Chatterjee, Samir},
  title = {A Design Science Research Methodology for Information Systems Research},
  journal = {Journal of Management Information Systems},
  year = {2007},
  volume = {24},
  number = {3},
  pages = {45--77},
  doi = {10.2753/MIS0742-1222240302},
  url = {https://doi.org/10.2753/MIS0742-1222240302},
  note = {Acesso em: 28 out. 2026}
}

@online{nielsen1994,
  author = {Nielsen, Jakob},
  title = {Severity Ratings for Usability Problems},
  year = {1994},
  organization = {Nielsen Norman Group},
  url = {https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/},
  note = {Acesso em: 28 out. 2026}
}
'''
(out/'referencias.bib').write_text(bib,encoding='utf8')
print(json.dumps({'resumo_palavras':len(resumo.split()),'abstract_palavras':len(abstract.split()),'source':str(out/'TCCFinal.tex'),'chars':len(t)},ensure_ascii=False))
