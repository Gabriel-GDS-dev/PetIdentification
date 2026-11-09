from pathlib import Path
import shutil,re,math
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor,white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

root=Path(__file__).parent
dst=root/'revisado'
shutil.copytree(root/'original',dst,dirs_exist_ok=True)
pdfmetrics.registerFont(TTFont('Arial',r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialBold',r'C:\Windows\Fonts\arialbd.ttf'))
ink=HexColor('#243B4A'); edge=HexColor('#617D8A'); pale=HexColor('#EAF2F5')
W=397
def start(name,h):
    c=canvas.Canvas(str(dst/name),pagesize=(W,h));c.setTitle(name);c.setFillColor(white);c.rect(0,0,W,h,fill=1,stroke=0);return c
def txt(c,x,y,text,size=9,bold=False):
    c.setFillColor(ink);c.setFont('ArialBold' if bold else 'Arial',size);c.drawString(x,y,text)
def box(c,x,y,w,h,title,lines,size=9):
    c.setStrokeColor(edge);c.setFillColor(white);c.setLineWidth(.65);c.roundRect(x,y,w,h,4,stroke=1,fill=1)
    c.setFillColor(pale);c.rect(x+.5,y+h-23,w-1,22.5,fill=1,stroke=0)
    txt(c,x+7,y+h-15,title,size,True)
    for i,line in enumerate(lines):txt(c,x+7,y+h-37-i*12,line,size)
def arrow(c,points,color=edge):
    c.setStrokeColor(color);c.setFillColor(color);c.setLineWidth(.8);p=c.beginPath();p.moveTo(*points[0])
    for q in points[1:]:p.lineTo(*q)
    c.drawPath(p)
    a,b=points[-2:];ang=math.atan2(b[1]-a[1],b[0]-a[0]);p=c.beginPath();p.moveTo(*b)
    p.lineTo(b[0]-4*math.cos(ang-.4),b[1]-4*math.sin(ang-.4));p.lineTo(b[0]-4*math.cos(ang+.4),b[1]-4*math.sin(ang+.4));p.close();c.drawPath(p,fill=1,stroke=0)

# Compact flow: local consultation remains available independently of server access.
c=start('figura-fluxo.pdf',158)
box(c,1,100,86,54,'Tutor',['Acessa o app'],9)
box(c,105,100,128,54,'Interface PWA',['Consulta e edita dados'],9)
box(c,252,100,144,54,'API e PostgreSQL',['Autentica e sincroniza'],9)
arrow(c,[(87,127),(105,127)]);arrow(c,[(233,127),(252,127)])
box(c,105,10,128,62,'Armazenamento local',['Cache e registros salvos','Consulta sem conexão'],9)
arrow(c,[(169,100),(169,72)])
txt(c,242,80,'Com internet',8)
txt(c,1,43,'No dispositivo',8,True)
c.showPage();c.save()

c=start('figura-arquitetura.pdf',176)
box(c,1,90,120,82,'Interface e dados locais',['HTML5, CSS3, JavaScript','PWA e service worker','Cache e persistência local'],8.6)
box(c,139,90,120,82,'API REST',['Node.js e JavaScript','Autenticação e regras','Sincronização de dados'],8.6)
box(c,277,90,119,82,'Persistência',['PostgreSQL','Dados relacionais','Prisma Postgres / Vercel'],8.6)
arrow(c,[(121,131),(139,131)]);arrow(c,[(259,131),(277,131)])
box(c,1,1,395,59,'Recursos externos e do dispositivo',['ViaCEP: endereço por CEP  |  GPS: coordenadas do tutor','OpenStreetMap: estabelecimentos veterinários próximos'],9)
arrow(c,[(61,90),(61,60)])
c.showPage();c.save()

# Native vector schema drawn from backend/db/schema.sql. Abbreviated fields are explicit.
c=start('figura-banco.pdf',294)
xs=[1,139,277];bw=119
box(c,xs[0],178,bw,115,'pet_owners',['PK/FK  user_id','name, cpf, phone','email, address, city','state, zip_code','latitude, longitude','emergency_name, ...'],8.5)
box(c,xs[1],178,bw,115,'pet_app_users',['PK  id','name, email','email_normalized','phone, password_hash','created_at','updated_at'],8.5)
box(c,xs[2],178,bw,115,'pet_pets',['PK  (user_id, id)','FK  user_id','name, species, breed','birth_date, weight','microchip, allergies','notes, ...'],8.5)
arrow(c,[(139,236),(120,236)]);txt(c,123,243,'1:1',7)
arrow(c,[(258,236),(277,236)]);txt(c,260,243,'1:N',7)
box(c,xs[0],25,bw,116,'pet_vaccines',['PK  (user_id, id)','FK  (user_id, pet_id)','name, application_date','due_date, clinic','veterinarian, batch','notes, ...'],8.5)
box(c,xs[1],25,bw,116,'pet_documents',['PK  (user_id, id)','FK  (user_id, pet_id)','title, kind','document_date','expires_at','attachment_*, ...'],8.5)
box(c,xs[2],25,bw,116,'pet_travel_plans',['PK  (user_id, pet_id)','FK  user_id','destination, travel_date','transport','selected_pet_id','notes, updated_at'],8.5)
arrow(c,[(337,178),(337,164),(61,164),(61,141)])
arrow(c,[(337,164),(199,164),(199,141)])
txt(c,65,150,'1:N por pet',7.5);txt(c,203,150,'1:N por pet',7.5)
txt(c,1,10,'PK: chave primária. FK: chave estrangeira. Campos resumidos; “...” indica omissões.',8)
c.showPage();c.save()

p=dst/'TCCFinal.tex';s=p.read_text(encoding='utf-8')
a=s.index(r'\usepackage[labelsep=none]{caption}');b=s.index(r'\usepackage{enumitem}',a)
s=s[:a]+r'''\usepackage{caption}
\DeclareCaptionLabelFormat{comtraco}{#1~#2 -}
\captionsetup{labelformat=comtraco,labelsep=space,format=plain,
  justification=raggedright,singlelinecheck=false,font=footnotesize,
  labelfont=normalfont,textfont=normalfont,skip=3pt}
\captionsetup[figure]{position=top}
\captionsetup[table]{position=top}
'''+s[b:]
s=s.replace(r'\usepackage{array}',r'''\usepackage{array}
\usepackage{tabularx,ragged2e}
\newcolumntype{L}[1]{>{\RaggedRight\arraybackslash}p{#1}}
\newcolumntype{Y}{>{\RaggedRight\arraybackslash}X}
\newcommand{\fonte}[1]{\par\noindent{\footnotesize\normalfont\raggedright Fonte: #1\par}}
\setlength{\intextsep}{6pt}
\setlength{\textfloatsep}{6pt}
\setlength{\floatsep}{6pt}
\raggedbottom
''')
s=s.replace('urlcolor     = blue','urlcolor     = black')
def figure(label,caption,file):
    return '\n'.join([r'\begin{figure}[H]',r'\caption{'+caption+'}',r'\label{'+label+'}',r'\noindent\includegraphics[width=\linewidth]{'+file+'}',r'\fonte{Elaborado pelo autor.}',r'\end{figure}'])
for lab,cap,file in [
 ('fig:fluxograma_sistema','Fluxo de consulta local e sincronização dos registros','figura-fluxo.pdf'),
 ('fig:arquitetura_tecnologias_sistema','Arquitetura e tecnologias do sistema Registro Digital Animal','figura-arquitetura.pdf'),
 ('fig:diagrama_banco_dados','Recorte do núcleo cadastral do banco PostgreSQL','figura-banco.pdf')]:
    patt=r'\\begin\{figure\}.*?\\end\{figure\}'
    for m in list(re.finditer(patt,s,re.S)):
        if r'\label{'+lab+'}' in m.group():s=s[:m.start()]+figure(lab,cap,file)+s[m.end():];break

# Equal left and right edges for all tables, captions and source lines.
specs=[r'@{}L{.08\linewidth}Y L{.16\linewidth}@{}',r'@{}Y r@{}',
       r'@{}L{.24\linewidth}Y L{.10\linewidth}@{}',
       r'@{}L{.27\linewidth}Y L{.12\linewidth}@{}',r'@{}Y rrrr@{}']
idx=0
def table(m):
    global idx
    block=m.group(); spec=specs[idx];idx+=1
    block=block.replace(r'\small',r'\footnotesize')
    block=re.sub(r'\\begin\{tabular\}\{[^\n]*\}',lambda m:r'\begin{tabularx}{\linewidth}{'+spec+'}',block)
    block=block.replace(r'\end{tabular}',r'\end{tabularx}')
    block=re.sub(r'\\par\\vspace\{(?:2|4)pt\}\n','',block)
    block=block.replace(r'{\footnotesize\raggedright Fonte: Elaborado pelo autor.\par}',r'\fonte{Elaborado pelo autor.}')
    block=block.replace(r'{\footnotesize\raggedright D: notas 1--2; N: nota 3; C: notas 4--5. Cada item: 11 respostas válidas; mediana 5. Fonte: Elaborado pelo autor.\par}',r'\par\noindent{\footnotesize\raggedright D: notas 1--2; N: nota 3; C: notas 4--5. Cada item: 11 respostas válidas; mediana 5.\par}\fonte{Elaborado pelo autor.}')
    return block
s=re.sub(r'\\begin\{table\}.*?\\end\{table\}',table,s,flags=re.S)
assert idx==5
s=s.replace(r'\bibliographystyle{abntex2-alf}',r'\bibliographystyle{abntex2-unesc}')
# Language-specific hyphenation for English text, preserving original wording.
s=s.replace(r'\usepackage[brazilian]{babel}',r'\usepackage[english,brazilian]{babel}')
s=s.replace(r'\newpage'+'\n'+r'\textbf{ABSTRACT:}',r'\newpage'+'\n'+r'\begin{otherlanguage}{english}'+'\n'+r'\noindent\textbf{ABSTRACT:}')
s=s.replace(r'\section{INTRODUÇÃO}',r'\end{otherlanguage}'+'\n\n'+r'\section{INTRODUÇÃO}',1)
p.write_text(s,encoding='utf-8')

bib=dst/'referencias.bib';t=bib.read_text(encoding='utf-8')
t,n=re.subn(r'note\s*=\s*\{Acesso em:\s*([^}]+)\}',r'urlaccessdate = {\1}',t)
bib.write_text(t,encoding='utf-8')
print('Datas de acesso migradas:',n)
print('Fonte revisada:',p)
