from pathlib import Path
import re, json
p=Path('output/tcc/revisao_2026-10-28')
t=(p/'TCCFinal.tex').read_text(encoding='utf8')
t=t.replace('O convite à avaliação foi dirigido a clínicas veterinárias e estabelecimentos do setor em Santa Catarina, identificados pelo Google Maps em Criciúma e pela plataforma Casa dos Dados nos demais municípios. A seleção foi não probabilística e relacionada ao domínio da aplicação. O contato ocorreu remotamente pelo WhatsApp, com apresentação do pesquisador, do propósito do trabalho e de orientações para acesso ou observação do sistema. Os registros preservados não permitem informar o total de estabelecimentos contatados nem calcular taxa de resposta.',r'''O convite à avaliação foi dirigido a clínicas, estabelecimentos e profissionais do setor animal, identificados pelo Google Maps em Criciúma e pela plataforma Casa dos Dados nas buscas para outros municípios. A seleção foi não probabilística e relacionada ao domínio da aplicação. A planilha de acompanhamento registrou 96 contatos, com datas de convite entre 11 e 18 de setembro de 2026. Predominaram localidades de Santa Catarina, mas um contato foi cadastrado com município Fortaleza; por isso, o conjunto de convites não foi tratado como exclusivamente catarinense. O contato ocorreu remotamente pelo WhatsApp, com apresentação do pesquisador e convite para conhecer e testar a aplicação. Aos que aceitaram, foram encaminhados o endereço do aplicativo e um vídeo de orientação. As mensagens solicitaram opinião sobre a experiência de uso, informações ausentes e possíveis melhorias.

Para caracterizar o recrutamento, foram considerados o status do convite, a data de envio do material e a marcação de feedback recebido na planilha. Os 96 contatos foram distribuídos em 13 aceites, 80 sem resposta e três sem interesse. Aceitar o convite, receber o material, cadastrar-se e enviar uma avaliação foram tratados como eventos distintos. A planilha indicou dois feedbacks recebidos, nas datas de 21 de setembro e 7 de outubro de 2026. Entre os demais aceites, dez permaneceram pendentes de feedback e um apresentou a observação de cadastro realizado sem avaliação. Esses registros não comprovam experimentação completa do aplicativo por todos os que aceitaram participar.''')
t=t.replace('Foram recebidos três retornos, dos quais dois permaneceram disponíveis para análise. O terceiro ficou armazenado no banco hospedado no Render e não pôde ser recuperado após a indisponibilidade do serviço. O conteúdo desse retorno foi excluído da análise.','Além dos dois retornos assinalados na planilha, o pesquisador informou o recebimento de um terceiro, armazenado no banco hospedado no Render e indisponível para recuperação após a interrupção do serviço. Esse terceiro registro não apareceu como feedback recebido na planilha consultada e seu conteúdo não foi incluído na análise. Assim, o corpus analisado foi composto exclusivamente pelos dois retornos preservados.')
needle='Os dois retornos preservados apresentaram conteúdos distintos e complementares.'
new=r'''O registro de recrutamento apresentou 13 aceites entre 96 contatos, equivalentes a 13,5\% dos convites registrados. Os 80 contatos sem resposta e as três manifestações de desinteresse indicam que a obtenção de participação exigiu alcançar um conjunto maior de potenciais avaliadores. Entre os 13 aceites, somente dois tiveram feedback marcado como recebido. Esses números descrevem o acompanhamento dos convites e não constituem uma medida de satisfação ou de utilização efetiva. A Tabela~\ref{tab:recrutamento} resume as etapas documentadas.

\begin{table}[htbp]
\centering
\caption{Situação dos contatos e disponibilidade dos retornos para análise}
\label{tab:recrutamento}
\small
\setlength{\tabcolsep}{5pt}
\renewcommand{\arraystretch}{1.15}
\begin{tabular}{@{}p{\dimexpr0.84\linewidth-2\tabcolsep\relax} r@{}}
\hline
\textbf{Etapa ou situação registrada} & \textbf{Quantidade} \\
\hline
Contatos com convite registrado & 96 \\
Aceitaram participar & 13 \\
Sem resposta ao convite & 80 \\
Não interessados & 3 \\
Aceites com feedback marcado como recebido & 2 \\
Aceites com feedback pendente & 10 \\
Aceite com cadastro, sem feedback, conforme observação & 1 \\
Retornos preservados incluídos na análise & 2 \\
Retorno adicional informado, indisponível e excluído & 1 \\
\hline
\end{tabular}
\par\vspace{2pt}
{\footnotesize\raggedright Fonte: Elaborado pelo autor a partir da planilha de acompanhamento e dos registros preservados. As linhas representam etapas e subconjuntos; não devem ser somadas como categorias independentes.\par}
\end{table}

'''+needle
assert needle in t
t=t.replace(needle,new)
t=t.replace('Como o total de convites não foi preservado no material analisado, não foi calculada taxa de resposta.','A diferença entre aceites e retornos preservados introduz viés de não resposta: as percepções disponíveis podem não representar os profissionais que não responderam ou que aceitaram sem enviar avaliação. O retorno adicional informado pelo pesquisador não foi incorporado às contagens documentadas na planilha, evitando presumir a atualização desse registro.')
t=t.replace('O alcance dessas contribuições foi limitado pelo conjunto de testes, pela ausência de comparação com registros físicos e pela análise de somente dois dos três retornos recebidos.','O alcance dessas contribuições foi limitado pelo conjunto de testes, pela ausência de comparação com registros físicos e pela análise de somente dois retornos preservados, embora houvesse 13 aceites entre os 96 convites registrados e informação de um retorno adicional indisponível.')
# Avoid long unbreakable mixed case technology strings and identifiers exceeding margins.
t=t.replace(r'\usepackage{adjustbox}',r'''\usepackage{adjustbox}
\setlength{\emergencystretch}{3em}''')
t=t.replace('progressiva; testes funcionais.', 'progressiva; testes funcionais.')
(p/'TCCFinal.tex').write_text(t,encoding='utf8')
cls=(p/'UNESC.cls').read_text(encoding='utf8')
assert '\\def\\@makecaption#1#2{\n\\long\\def' in cls
cls=cls.replace('\\def\\@makecaption#1#2{\n\\long\\def','\\long\\def')
cls=cls.replace('\\geometry{papersize={190mm,290mm},total={160mm,230mm}}','\\geometry{papersize={190mm,290mm}}')
(p/'UNESC.cls').write_text(cls,encoding='utf8')
bst=(p/'abntex2-unesc.bst').read_text(encoding='utf8')
# The custom style consumed a citation label from an empty BibTeX stack.
bst=bst.replace('%calc.simple.label\n      write$', 'calc.simple.label\n      write$')
(p/'abntex2-unesc.bst').write_text(bst,encoding='utf8')
bib=(p/'referencias.bib').read_text(encoding='utf8')
bib=bib.replace('@online{nielsen1994,','@misc{nielsen1994,')
bib=bib.replace('Biotechnology & Biotechnological Equipment','Biotechnology \\& Biotechnological Equipment')
(p/'referencias.bib').write_text(bib,encoding='utf8')
print('Coleta atualizada e três causas de erro de compilação corrigidas.')
