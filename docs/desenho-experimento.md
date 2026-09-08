# Desenho do Experimento — LAB02
## Assistente de IA vs. Codificação Manual

Este documento formaliza o **Desenho Experimental** do projeto LAB02 para a disciplina de **Laboratório de Experimentação de Software**, detalhando as hipóteses estatísticas, a seleção e validação dos objetos experimentais (katas), as variáveis e a mitigação das ameaças à validade.

---

## 1. Hipóteses Estatísticas (H0 e H1)

O experimento investiga o impacto do uso de assistente de codificação baseado em Inteligência Artificial Generativa frente à codificação manual tradicional sobre três dimensões: tempo/produtividade (RQ1), corretude funcional (RQ2) e qualidade estrutural do código (RQ3).

### RQ1 — Tempo de Desenvolvimento (Produtividade)
Questão: O uso de assistente de IA reduz o tempo necessário para implementar a solução de uma kata dentro do timebox de 35 minutos?

- **Hipótese Nula (H0_tempo):** Não há diferença significativa no tempo de desenvolvimento entre o tratamento com IA e sem IA.
  - Expressão: `Tempo(COM_IA) = Tempo(SEM_IA)`
- **Hipótese Alternativa (H1_tempo):** O tempo de desenvolvimento com assistência de IA é significativamente menor do que sem IA (teste unicaudal à esquerda).
  - Expressão: `Tempo(COM_IA) < Tempo(SEM_IA)`

### RQ2 — Corretude Funcional (Testes de Aceitação)
Questão: O uso de assistente de IA afeta a taxa de sucesso da solução frente aos testes de aceitação automatizados?

- **Hipótese Nula (H0_corretude):** Não há diferença significativa na proporção de testes de aceitação aprovados entre os tratamentos.
  - Expressão: `TaxaTestes(COM_IA) = TaxaTestes(SEM_IA)`
- **Hipótese Alternativa (H1_corretude):** Há diferença significativa na proporção de testes de aceitação aprovados entre os tratamentos (teste bicaudal).
  - Expressão: `TaxaTestes(COM_IA) != TaxaTestes(SEM_IA)`

### RQ3 — Qualidade Estrutural do Código (Complexidade e Duplicação)
Questão: O código gerado com apoio de IA difere estruturalmente daquele produzido manualmente quanto à complexidade ciclomática e duplicação?

#### Sub-hipótese 3.1 — Complexidade Ciclomática (CK WMC):
- **H0_wmc:** A complexidade ciclomática média por método (WMC de McCabe, excluindo construtores) não difere entre COM_IA e SEM_IA.
  - Expressão: `WMC(COM_IA) = WMC(SEM_IA)`
- **H1_wmc:** A complexidade ciclomática média por método difere entre COM_IA e SEM_IA (teste bicaudal).
  - Expressão: `WMC(COM_IA) != WMC(SEM_IA)`

#### Sub-hipótese 3.2 — Duplicação de Código (PMD CPD):
- **H0_cpd:** O percentual de duplicação de linhas físicas (com limiar de 50 tokens) não difere entre COM_IA e SEM_IA.
  - Expressão: `CPD(COM_IA) = CPD(SEM_IA)`
- **H1_cpd:** O percentual de duplicação de linhas físicas difere entre COM_IA e SEM_IA (teste bicaudal).
  - Expressão: `CPD(COM_IA) != CPD(SEM_IA)`

---

## 2. Variáveis e Tratamentos

| Tipo de Variável | Nome | Descrição e Escala | Instrumento de Medição |
| :--- | :--- | :--- | :--- |
| **Independente** | Tratamento | `COM_IA` (com assistente) vs. `SEM_IA` (manual) | Designação experimental |
| **Dependente (RQ1)** | Tempo de conclusão | Tempo total transcorrido até finalização (segundos, máx. 2100s / 35min) | Cronômetro Web do LAB02 |
| **Dependente (RQ2)** | Taxa de testes aprovados | Proporção de asserções atendidas ($0.0$ a $1.0$ ou $0\%$ a $100\%$) | Suíte JUnit 5 |
| **Dependente (RQ3.1)** | Complexidade Ciclomática | Média de McCabe por método (`ck_wmc_mean`) | CK 0.7.0 |
| **Dependente (RQ3.2)** | Duplicação de Código | % de linhas em trechos duplicados (`cpd_duplication_pct_physical`) | PMD CPD 7.26.0 (50 tokens) |
| **Controle** | Tamanho do código | Linhas físicas de código (`loc_physical`) | Coletor do LAB02 |

### Regras dos Tratamentos
- **Tratamento `SEM_IA`:** O participante programa de forma manual na IDE. É permitida apenas a consulta à documentação oficial da linguagem (Java SE 11 API docs). É expressamente proibido o uso de ferramentas de IA generativa (Copilot, ChatGPT, Claude, Gemini, etc.), fóruns com respostas prontas (StackOverflow) ou buscadores que apresentem soluções prontas do problema.
- **Tratamento `COM_IA`:** O participante utiliza a mesma IDE integrada ao assistente de IA padronizado (ex.: GitHub Copilot / ChatGPT). É permitido solicitar geração de código, refatoração e autocompletion. A formulação de prompts e aceitação das sugestões fica a critério do participante.

---

## 3. Objetos Experimentais (Katas)

Para evitar **memorização prévia por modelos de IA** (*data contamination*), foram concebidos **dois katas autorais em português**, com regras de negócio específicas, exigências similares de modelagem e resolução estimada em 15 a 25 minutos dentro do limite de 35 minutos.

### Kata 1: `TarifadorEstacionamento` (SmartPark)
*Domínio:* Gestão e cálculo de permanência em estacionamento urbano com regras de franquia, diária e tipos de veículos.

#### Especificação Técnica
- **Pacote:** `br.ufc.lab02.estacionamento`
- **Assinatura principal:**
  ```java
  public BigDecimal calcularTarifa(LocalDateTime entrada, LocalDateTime saida, TipoVeiculo tipo, boolean possuiConvenio)
  ```
- **Enum `TipoVeiculo`:** `MOTO`, `CARRO_PASSEIO`, `CAMINHONETE`.

#### Regras de Negócio
1. **Validação temporal:** Se `entrada` ou `saida` forem nulas, ou se `saida.isBefore(entrada)`, deve lançar `IllegalArgumentException`.
2. **Franquia de tolerância:** Permanência menor ou igual a 15 minutos é gratuita (`BigDecimal.ZERO`).
3. **Tarifação horária:**
   - Primeira hora (ou fração após a franquia, de 16 a 60 min): valor fixo de **R$ 12,00**.
   - Horas adicionais ou fração: acréscimo de **R$ 6,00** por hora ou fração iniciada (ex.: 1h15 de permanência total = 1ª hora + 1 hora adicional = R$ 18,00).
4. **Teto de Diária:** A cada período completo ou fracionado de 24 horas, o valor máximo cobrado não pode ultrapassar **R$ 60,00** por diária.
5. **Fator por Tipo de Veículo:**
   - `MOTO`: 50% do valor final (fator 0.50).
   - `CARRO_PASSEIO`: 100% do valor final (fator 1.00).
   - `CAMINHONETE`: acréscimo de 25% sobre o valor (fator 1.25).
6. **Desconto de Convênio:** Se `possuiConvenio == true`, aplica-se 15% de desconto sobre o valor final obtido.
7. **Precisão:** Retornar com 2 casas decimais e arredondamento padrão `RoundingMode.HALF_EVEN` (ou `HALF_UP`).

---

### Kata 2: `TarifadorLogistica` (EcoFrete)
*Domínio:* Cálculo de frete e tarifas para entregas urbanas expressas considerando distância, peso, modalidade e manuseio especial.

#### Especificação Técnica
- **Pacote:** `br.ufc.lab02.logistica`
- **Assinatura principal:**
  ```java
  public BigDecimal calcularFrete(double distanciaKm, double pesoKg, ModalidadeEntrega modalidade, TipoCarga tipoCarga, boolean clienteFidelidade)
  ```
- **Enum `ModalidadeEntrega`:** `PADRAO`, `EXPRESSA`, `MESMO_DIA`.
- **Enum `TipoCarga`:** `NORMAL`, `FRAGIL`, `PERECIVEL`.

#### Regras de Negócio
1. **Validação de entradas:** Se `distanciaKm <= 0`, `pesoKg <= 0`, `pesoKg > 50.0` (limite da transportadora) ou enums forem nulos, deve lançar `IllegalArgumentException`.
2. **Tarifa base por distância:**
   - Até 15.0 km: **R$ 10,00**.
   - De 15.01 km até 50.0 km: **R$ 25,00**.
   - Acima de 50.0 km: **R$ 25,00 + R$ 1,50 por km excedente** além dos 50 km.
3. **Adicional por peso:**
   - Primeiros 5.0 kg são isentos de taxa adicional.
   - Cada kg (ou fração) acima de 5.0 kg adiciona **R$ 3,00 por kg excedente**.
4. **Multiplicador da Modalidade:** A soma da tarifa base e do adicional de peso é multiplicada pela modalidade:
   - `PADRAO`: fator 1.00.
   - `EXPRESSA`: fator 1.40 (+40%).
   - `MESMO_DIA`: fator 1.80 (+80%).
5. **Taxa de Manuseio Especial:** Adiciona-se uma taxa fixa conforme o tipo de carga:
   - `NORMAL`: **R$ 0,00**.
   - `FRAGIL`: **R$ 15,00**.
   - `PERECIVEL`: **R$ 25,00**.
6. **Desconto de Fidelidade:** Se `clienteFidelidade == true`, aplica-se desconto de 10% sobre o total da entrega.
7. **Precisão:** Retornar com 2 casas decimais e arredondamento `RoundingMode.HALF_EVEN` (ou `HALF_UP`).

---

### Comparabilidade e Validação de Dificuldade Equivalente

| Critério de Comparação | Kata 1: `TarifadorEstacionamento` | Kata 2: `TarifadorLogistica` |
| :--- | :--- | :--- |
| **Linhas de Código esperadas (LOC)** | 50 a 85 linhas | 50 a 85 linhas |
| **Complexidade ciclomática total estimada** | 8 a 12 | 8 a 12 |
| **Número de regras de negócio** | 6 regras condicionais | 6 regras condicionais |
| **Manipulação de dados** | Datas/horas (`java.time`), Enums, `BigDecimal` | Ponto flutuante, Enums, `BigDecimal` |
| **Validações com Exceção** | `IllegalArgumentException` (tempo inválido) | `IllegalArgumentException` (valores $\le 0$ e peso $> 50$) |
| **Fator multiplicador / Desconto** | Tipo de veículo (3 tipos) + convênio (15%) | Modalidade (3 tipos) + fidelidade (10%) |
| **Taxas escalonadas** | Franquia 15m $\rightarrow$ 1ª hora $\rightarrow$ horas extras | Faixa 15km $\rightarrow$ Faixa 50km $\rightarrow$ excedente |
| **Bateria de testes de aceitação** | 8 casos de teste padronizados | 8 casos de teste padronizados |
| **Grau de indexação em LLMs** | **Nulo** (autoral, nomes e regras em PT-BR) | **Nulo** (autoral, nomes e regras em PT-BR) |

---

## 4. Projeto Experimental e Contrabalanceamento (Crossover)

Para controlar a alta variabilidade individual de habilidade de programação entre os participantes, utiliza-se um **projeto experimental pareado within-subject com contrabalanceamento em Quadrado Latino (2×2 Crossover)**.

Cada participante realiza **2 trials** (um sob o tratamento `COM_IA` e outro sob `SEM_IA`), alternando o kata e a ordem para eliminar viés de aprendizagem.

### Matriz de Crossover

| Grupo de Participantes | Ordem do 1º Trial | Intervalo | Ordem do 2º Trial |
| :--- | :--- | :---: | :--- |
| **Grupo 1 (G1)** | Kata 1 — `COM_IA` | 15 min | Kata 2 — `SEM_IA` |
| **Grupo 2 (G2)** | Kata 1 — `SEM_IA` | 15 min | Kata 2 — `COM_IA` |
| **Grupo 3 (G3)** | Kata 2 — `COM_IA` | 15 min | Kata 1 — `SEM_IA` |
| **Grupo 4 (G4)** | Kata 2 — `SEM_IA` | 15 min | Kata 1 — `COM_IA` |

---

## 5. Ameaças à Validade e Estratégias de Mitigação

### 5.1. Validade Interna
- **Efeito de Aprendizado e Ordem (*Learning Effect*):** O participante pode ter melhor desempenho no segundo exercício por adaptação à rotina do teste.  
  *Mitigação:* Contrabalanceamento completo de ordem dos tratamentos e dos katas (matriz crossover).
- **Memorização e Contaminação da IA (*Data Contamination / Memorization*):** Se o exercício for um problema canônico (ex.: LeetCode, Fibonacci, Roman Numerals), o assistente reproduz a resposta exata do pré-treino sem representar uma assistência real de engenharia.  
  *Mitigação:* Katas 100% autorais com regras de negócio específicas em português, jamais submetidas à internet aberta antes da coleta.
- **Fadiga e Cansaço dos Participantes:** Resolver dois problemas complexos em sequência pode degradar o foco no segundo trial.  
  *Mitigação:* Timebox estrito de 35 minutos por trial e intervalo de descanso obrigatório de 15 minutos entre o 1º e o 2º trial.
- **Familiaridade Heterogênea com Ferramentas de IA:** Participantes com diferentes graus de fluência em *prompt engineering*.  
  *Mitigação:* Questionário prévio de caracterização, padronização da ferramenta de IA (modelo e extensão fixados) e breve instrução inicial de uso.
- **Comunicação entre Participantes:** Risco de vazamento de regras ou dicas de implementação.  
  *Mitigação:* Aplicação em sessões individuais ou síncronas monitoradas.

### 5.2. Validade de Construção
- **Fidelidade da Medição de Tempo:** Distrações ou travamentos de máquina podem inflar o tempo.  
  *Mitigação:* O cronômetro só é iniciado após a leitura da instrução e confirmação explícita (`S` + Enter), com encerramento direto via tecla Enter.
- **Cobertura e Rigor dos Testes Funcionais:** Um participante pode concluir rápido, porém com código incorreto.  
  *Mitigação:* Bateria formal de testes de aceitação unitários automatizados (JUnit), testando casos de sucesso, valores-limite e lançamentos de exceção.
- **Calibração das Métricas de Qualidade:** Diferenças de estilo ou formatação que alterem métricas.  
  *Mitigação:* Uso do CK 0.7.0 congelado excluindo construtores da média, e PMD CPD 7.26.0 com limiar de 50 tokens literais, executados automaticamente pelo script do laboratório.

### 5.3. Validade Externa
- **Generalização para Sistemas Reais:** Katas de 35 minutos não refletem a arquitetura de sistemas corporativos legados com milhares de linhas.  
  *Mitigação:* A generalização do estudo é declarada explicitamente como restrita a *tarefas de implementação algorítmica de regras de negócio em micro-escala*.
- **Representatividade dos Participantes:** Estudantes universitários podem não refletir o comportamento de desenvolvedores seniores.  
  *Mitigação:* Caracterização demográfica documentando anos de experiência com Java e desenvolvimento de software.

### 5.4. Validade de Conclusão Estatística
- **Pressuposto de Normalidade e Tamanho da Amostra:** Amostras de turmas acadêmicas frequentemente não satisfazem a distribuição normal.  
  *Mitigação:* Utilização de testes não paramétricos pareados (**Wilcoxon Signed-Rank Test**) para pares ordenados `COM_IA` vs. `SEM_IA`, complementados por medidas de efeito (Cliff's Delta ou correlação bisserial por postos) e reporte de medianas e IQR em vez de médias e desvios padrão.
