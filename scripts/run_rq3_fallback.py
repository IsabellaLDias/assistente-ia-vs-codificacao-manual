import os, glob, fitz, re, csv, statistics

PDF_DIR = os.path.abspath('Resultados Katas')
ANALISE_DIR = os.path.abspath('analise-rq3')

def clean_text(text):
    return '\n'.join([line for line in text.split('\n') if not re.match(r'^Pagina \d+ de \d+', line.strip()) and not line.strip().startswith('Registro ')])

def fix_strings(lines):
    new_lines = []; i = 0
    while i < len(lines):
        line = lines[i]
        if line.replace('\\"', '').count('"') % 2 != 0:
            merged_line = line.rstrip('\n')
            j = i + 1
            while j < len(lines):
                merged_line += ' ' + lines[j].strip()
                if merged_line.replace('\\"', '').count('"') % 2 == 0:
                    i = j; line = merged_line + '\n'; break
                j += 1
        new_lines.append(line); i += 1
    return new_lines

def calculate_metrics(code):
    lines = code.split('\n')
    loc = 0; wmc = 0; in_comment = False
    for line in lines:
        s = line.strip()
        if not s: continue
        if s.startswith('/*'): in_comment = True
        if in_comment:
            if '*/' in s: in_comment = False
            continue
        if s.startswith('//'): continue
        loc += 1
        if re.search(r'\b(public|private|protected)\s+[\w\<\>\[\]]+\s+\w+\s*\(', s): wmc += 1
        wmc += len(re.findall(r'\b(if|for|while|case|catch)\b', s))
        wmc += s.count('?') + s.count('&&') + s.count('||')
    return loc, wmc

def extract_and_parse(pdf_path):
    filename = os.path.basename(pdf_path)
    parts = [p.strip() for p in filename.replace('.pdf', '').split('-')]
    if len(parts) < 3: return None
    kata_id = f"kata0{re.search(r'\d+', parts[0]).group()}"
    tratamento = 'COM_IA' if 'IA' in parts[1].upper() else 'SEM_IA'
    participante = parts[2]
    
    doc = fitz.open(pdf_path)
    full_text = clean_text(''.join([page.get_text('text') + '\n' for page in doc]))

    tarifador_match = re.search(r'(public\s+class\s+Tarifador\w+\s*\{.*?\n\})', full_text, re.DOTALL)
    metrics = []
    
    if tarifador_match:
        block = tarifador_match.group(1)
        class_name = re.search(r'public\s+class\s+([A-Za-z0-9_]+)', block).group(1)
        final_code = ''.join(fix_strings([line + '\n' for line in block.split('\n')]))
        loc, wmc = calculate_metrics(final_code)
        metrics.append({'classe': class_name, 'loc': loc, 'wmc': wmc, 'cbo': 'N/A', 'rfc': 'N/A', 'lcom': 'N/A'})
            
    return {
        'participante': participante, 'kata': kata_id, 'condicao': tratamento,
        'origem': filename, 'disponibilidade': 'Disponível' if metrics else 'Não extraído',
        'classes': metrics
    }

os.makedirs(ANALISE_DIR, exist_ok=True)
pdf_files = glob.glob(os.path.join(PDF_DIR, '*.pdf'))

inventario = []
metricas_classe = []
kata_data = {}

for pdf in pdf_files:
    info = extract_and_parse(pdf)
    if info:
        inventario.append(info)
        for cls in info['classes']:
            metricas_classe.append({
                'participante': info['participante'], 'kata': info['kata'],
                'condicao': info['condicao'], 'classe': cls['classe'],
                'loc': cls['loc'], 'wmc': cls['wmc'], 
                'cbo': cls['cbo'], 'rfc': cls['rfc'], 'lcom': cls['lcom']
            })
            k = info['kata']
            t = info['condicao']
            p = info['participante']
            if k not in kata_data: kata_data[k] = {'COM_IA': [], 'SEM_IA': []}
            kata_data[k][t].append({'participante': p, 'wmc': cls['wmc'], 'loc': cls['loc']})

with open(os.path.join(ANALISE_DIR, 'inventario_codigos.csv'), 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['participante', 'kata', 'condicao', 'origem', 'disponibilidade'])
    writer.writeheader()
    writer.writerows([{k: item[k] for k in ['participante', 'kata', 'condicao', 'origem', 'disponibilidade']} for item in inventario])
        
with open(os.path.join(ANALISE_DIR, 'metricas_por_classe.csv'), 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['participante', 'kata', 'condicao', 'classe', 'loc', 'wmc', 'cbo', 'rfc', 'lcom'])
    writer.writeheader()
    writer.writerows(metricas_classe)

comparacao = []
md_rows = ''

for k in sorted(kata_data.keys()):
    com_list = kata_data[k]['COM_IA']
    sem_list = kata_data[k]['SEM_IA']
    if not com_list or not sem_list: continue
    
    wmc_com = statistics.median([x['wmc'] for x in com_list])
    wmc_sem = statistics.median([x['wmc'] for x in sem_list])
    loc_com = statistics.median([x['loc'] for x in com_list])
    loc_sem = statistics.median([x['loc'] for x in sem_list])
    
    diff_wmc = wmc_com - wmc_sem
    diff_loc = loc_com - loc_sem
    
    parts_com = ' & '.join(sorted([x['participante'] for x in com_list]))
    parts_sem = ' & '.join(sorted([x['participante'] for x in sem_list]))
    
    comparacao.append({
        'kata': k, 'participantes_com_ia': parts_com, 'participantes_sem_ia': parts_sem,
        'wmc_mediana_com_ia': wmc_com, 'wmc_mediana_sem_ia': wmc_sem, 'diff_wmc': diff_wmc,
        'loc_mediana_com_ia': loc_com, 'loc_mediana_sem_ia': loc_sem, 'diff_loc': diff_loc
    })
    md_rows += f'| {k} | {parts_com} | {parts_sem} | {wmc_com} | {wmc_sem} | {diff_wmc} | {loc_com} | {loc_sem} | {diff_loc} |\n'

with open(os.path.join(ANALISE_DIR, 'comparacao_rq3.csv'), 'w', newline='', encoding='utf-8') as f:
    fields = ['kata', 'participantes_com_ia', 'participantes_sem_ia', 'wmc_mediana_com_ia', 'wmc_mediana_sem_ia', 'diff_wmc', 'loc_mediana_com_ia', 'loc_mediana_sem_ia', 'diff_loc']
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(comparacao)

md_path = os.path.join(ANALISE_DIR, 'RESULTADOS_RQ3.md')
with open(md_path, 'r', encoding='utf-8') as f: content = f.read()
import re
nova_tabela = f'''## Resultados Comparativos (COM IA vs SEM IA por Kata)
Como o experimento possui um design de Crossover (onde Leandro e Isabella se alternam nas condições para cada Kata), a comparação direta mais fiel para todo o grupo se dá isolando o **Kata** (Problema) e comparando as medianas das soluções geradas COM IA (incluindo as de Luis) contra as geradas SEM IA para aquele mesmo problema.

| Kata | Participantes (COM IA) | Participantes (SEM IA) | Mediana WMC (COM) | Mediana WMC (SEM) | Diff WMC | Mediana LOC (COM) | Mediana LOC (SEM) | Diff LOC |
|---|---|---|---|---|---|---|---|---|
{md_rows}
'''
content = re.sub(r'## Resultados Comparativos.*?(?=## Interpretação)', nova_tabela, content, flags=re.DOTALL)
with open(md_path, 'w', encoding='utf-8') as f: f.write(content)
