from pathlib import Path
root=Path(__file__).parent/'revisado'
p=root/'TCCFinal.tex';s=p.read_text(encoding='utf-8')
s=s.replace(r'\usepackage{float}',r'''\usepackage{float}
\usepackage{placeins}
\renewcommand{\topfraction}{0.95}
\renewcommand{\bottomfraction}{0.90}
\renewcommand{\textfraction}{0.05}
\renewcommand{\floatpagefraction}{0.90}
\setcounter{topnumber}{3}
\setcounter{bottomnumber}{3}
\setcounter{totalnumber}{4}''')
s=s.replace(r'\begin{figure}[H]',r'\begin{figure}[!htb]')
s=s.replace(r'\subsubsection{Banco de Dados}',r'\FloatBarrier'+'\n'+r'\subsubsection{Banco de Dados}')
s=s.replace(r'\subsection{Metodologia de Avaliação}',r'\FloatBarrier'+'\n'+r'\subsection{Metodologia de Avaliação}')
# Keep each results table within the subsection that introduces it.
s=s.replace(r'\subsection{Análise dos retornos anteriores',r'\FloatBarrier'+'\n'+r'\subsection{Análise dos retornos anteriores')
s=s.replace(r'\subsection{Avaliações estruturadas',r'\FloatBarrier'+'\n'+r'\subsection{Avaliações estruturadas')
s=s.replace(r'\subsubsection{Nova avaliação',r'\FloatBarrier'+'\n'+r'\subsubsection{Nova avaliação')
s=s.replace(r'\subsection{Limitações',r'\FloatBarrier'+'\n'+r'\subsection{Limitações')
p.write_text(s,encoding='utf-8')
b=root/'abntex2-unesc.bst';t=b.read_text(encoding='utf-8')
start=t.index('FUNCTION {article}');end=t.index('FUNCTION {book}',start)
article=t[start:end].replace('  format.year output\n  format.url','  format.year output new.sentence\n  format.url')
t=t[:start]+article+t[end:]
start=t.index('FUNCTION {inproceedings}');end=t.index('FUNCTION {journalpart}',start)
proc=t[start:end].replace('  format.year output new.sentence\n  iso.date.place','  % Year is emitted once by the conditional below.\n  iso.date.place',1)
t=t[:start]+proc+t[end:]
b.write_text(t,encoding='utf-8')
