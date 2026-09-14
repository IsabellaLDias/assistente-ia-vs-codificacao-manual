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

### RQ4 — Eficiência Computacional (Recursos, Complexidade Temporal e Espacial)
Questão: O código produzido com suporte de IA difere do manual quanto à eficiência de execução e uso de recursos de máquina?

#### Sub-hipótese 4.1 — Complexidade Temporal de Execução (Latência de CPU):
- **H0_tempo_exec:** O tempo médio de CPU por cálculo (em $\mu s$, medido após warmup JIT) não difere entre COM_IA e SEM_IA.
  - Expressão: `TempoCPU(COM_IA) = TempoCPU(SEM_IA)`
- **H1_tempo_exec:** O tempo médio de CPU difere entre os tratamentos (teste bicaudal).
  - Expressão: `TempoCPU(COM_IA) != TempoCPU(SEM_IA)`

#### Sub-hipótese 4.2 — Complexidade Espacial (Alocação de Memória no Heap):
- **H0_mem:** A quantidade de memória alocada no Heap por cálculo (bytes/op, via `ThreadMXBean`) não difere entre COM_IA e SEM_IA.
  - Expressão: `HeapAlloc(COM_IA) = HeapAlloc(SEM_IA)`
- **H1_mem:** A alocação no Heap difere entre os tratamentos (teste bicaudal).
  - Expressão: `HeapAlloc(COM_IA) != HeapAlloc(SEM_IA)`

---

## 2. Variáveis e Tratamentos

| Tipo de Variável | Nome | Descrição e Escala | Instrumento de Medição |
| :--- | :--- | :--- | :--- |
| **Independente** | Tratamento | `COM_IA` (com assistente) vs. `SEM_IA` (manual) | Designação experimental |
| **Dependente (RQ1)** | Tempo de conclusão | Tempo total transcorrido até finalização (segundos, máx. 2100s / 35min) | Cronômetro Web do LAB02 |
| **Dependente (RQ2)** | Taxa de testes aprovados | Proporção de asserções atendidas ($0.0$ a $1.0$ ou $0\%$ a $100\%$) | Suíte JUnit 5 |
| **Dependente (RQ3.1)** | Complexidade Ciclomática | Média de McCabe por método (`ck_wmc_mean`) | CK 0.7.0 |
| **Dependente (RQ3.2)** | Duplicação de Código | % de linhas em trechos duplicados (`cpd_duplication_pct_physical`) | PMD CPD 7.26.0 (50 tokens) |
| **Dependente (RQ3.3)** | Aninhamento Máximo | Profundidade máxima de blocos aninhados (`ck_max_nested_blocks`) | CK 0.7.0 |
| **Dependente (RQ4.1)** | Tempo de CPU / Latência | Tempo de execução por cálculo em microssegundos (`bench_time_us`) | `KataBenchmarkRunner` (JVM) |
| **Dependente (RQ4.2)** | Alocação no Heap | Bytes alocados por cálculo (`bench_allocated_bytes`) | `ThreadMXBean` (JVM) |
| **Dependente (RQ4.3)** | Violações de Boas Práticas | Contagem de violações de regras de performance e design (`pmd_total_violations`) | PMD 7.26.0 |
| **Controle** | Tamanho do código | Linhas físicas de código (`loc_physical`) | Coletor do LAB02 |

> [!NOTE]
> Todas as métricas estruturais e de eficiência computacional são extraídas **automaticamente no momento do envio do código** pelo servidor de análise, sem impor nenhuma sobrecarga, instrumentação manual ou alteração de rotina aos participantes avaliados.

### Regras dos Tratamentos
- **Tratamento `SEM_IA`:** O participante programa de forma manual na IDE. É permitida apenas a consulta à documentação oficial da linguagem (Java SE 11 API docs). É expressamente proibido o uso de ferramentas de IA generativa (Copilot, ChatGPT, Claude, Gemini, etc.), fóruns com respostas prontas (StackOverflow) ou buscadores que apresentem soluções prontas do problema.
- **Tratamento `COM_IA`:** O participante utiliza a mesma IDE integrada ao assistente de IA padronizado (ex.: GitHub Copilot / ChatGPT). É permitido solicitar geração de código, refatoração e autocompletion. A formulação de prompts e aceitação das sugestões fica a critério do participante.

---

## 3. Objetos Experimentais (Katas)

Para evitar **memorização prévia por modelos de IA** (*data contamination*), foram concebidos **quatro katas autorais em português**, com regras de negócio específicas, exigências similares de modelagem e resolução estimada em 15 a 25 minutos dentro do limite de 35 minutos.

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
1. **Validação temporal:** Se `entrada` ou `saida` forem nulas, ou se `saida.isBefore(entrada)`, ou se `tipo` for nulo, deve lançar `IllegalArgumentException`.
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

### Kata 3: `TarifadorHospedagem` (BellaVista)
*Domínio:* Sistema de reservas e cobrança de diárias para pousadas e redes hoteleiras de lazer considerando permanência, hóspedes extras, categoria e convênios corporativos.

#### Especificação Técnica
- **Pacote:** `br.ufc.lab02.hospedagem`
- **Assinatura principal:**
  ```java
  public BigDecimal calcularHospedagem(LocalDate checkIn, LocalDate checkOut, int numeroHospedes, CategoriaQuarto categoria, boolean possuiConvenio)
  ```
- **Enum `CategoriaQuarto`:** `STANDARD`, `LUXO`, `PRESIDENCIAL`.

#### Regras de Negócio
1. **Validação temporal e de capacidade:** Se `checkIn` ou `checkOut` forem nulos, ou se `!checkOut.isAfter(checkIn)` (mínimo de 1 diária/noite), ou se `numeroHospedes <= 0` ou `numeroHospedes > 5`, ou se `categoria` for nulo, deve lançar `IllegalArgumentException`.
2. **Tarifa base escalonada por diária:**
   - Curta permanência (1 a 3 diárias): **R$ 160,00** por diária.
   - Média permanência (4 a 7 diárias): **R$ 130,00** por diária.
   - Longa permanência (8 ou mais diárias): **R$ 100,00** por diária.
   O custo base é o número de diárias multiplicado pelo valor da faixa correspondente.
3. **Adicional por hóspedes extras:**
   - A tarifa base contempla até 2 hóspedes (inclusos).
   - Para cada hóspede extra (acima de 2), acrescenta-se **R$ 40,00 por diária** por hóspede excedente.
4. **Multiplicador da Categoria de Quarto:** O subtotal das diárias (base + adicionais de hóspedes extras) é multiplicado pelo fator da categoria:
   - `STANDARD`: fator 1.00.
   - `LUXO`: fator 1.30 (+30%).
   - `PRESIDENCIAL`: fator 1.70 (+70%).
5. **Taxa Fixa de Higienização:** Adiciona-se uma taxa fixa única por estadia correspondente à governança da acomodação:
   - `STANDARD`: **R$ 50,00**.
   - `LUXO`: **R$ 80,00**.
   - `PRESIDENCIAL`: **R$ 120,00**.
6. **Desconto de Convênio:** Se `possuiConvenio == true`, aplica-se **10% de desconto** sobre o valor total final da hospedagem.
7. **Precisão:** Retornar com 2 casas decimais e arredondamento `RoundingMode.HALF_EVEN` (ou `HALF_UP`).

---

### Kata 4: `TarifadorPlanoSaude` (VidaPlus)
*Domínio:* Motor de tarifação e precificação de planos de saúde individuais baseado em faixas etárias regulatórias (ANS), categoria do plano, acomodação hospitalar e coparticipação.

#### Especificação Técnica
- **Pacote:** `br.ufc.lab02.saude`
- **Assinatura principal:**
  ```java
  public BigDecimal calcularMensalidade(int idade, CategoriaPlano categoria, TipoAcomodacao acomodacao, boolean incluiOdontologia, boolean possuiCoparticipacao)
  ```
- **Enum `CategoriaPlano`:** `BASICO`, `ESPECIAL`, `PREMIUM`.
- **Enum `TipoAcomodacao`:** `ENFERMARIA`, `APARTAMENTO`.

#### Regras de Negócio
1. **Validação de entradas:** Se `idade < 0` ou `idade > 120`, ou se `categoria` ou `acomodacao` forem nulos, deve lançar `IllegalArgumentException`.
2. **Mensalidade base por faixa etária (anos completos):**
   - 0 a 17 anos: **R$ 150,00**.
   - 18 a 39 anos: **R$ 260,00**.
   - 40 a 59 anos: **R$ 420,00**.
   - 60 anos ou mais: **R$ 720,00**.
3. **Multiplicador da Categoria do Plano:** A mensalidade base por faixa etária é multiplicada pelo fator da categoria:
   - `BASICO`: fator 1.00.
   - `ESPECIAL`: fator 1.30 (+30%).
   - `PREMIUM`: fator 1.60 (+60%).
4. **Adicional por Tipo de Acomodação Hospitalar:** Adiciona-se a taxa fixa correspondente:
   - `ENFERMARIA`: adicional de **R$ 0,00**.
   - `APARTAMENTO`: adicional fixo de **R$ 90,00**.
5. **Adicional de Cobertura Odontológica:** Se `incluiOdontologia == true`, acrescenta-se uma taxa fixa adicional de **R$ 45,00**.
6. **Desconto de Coparticipação:** Se `possuiCoparticipacao == true`, aplica-se **15% de desconto** sobre o valor total acumulado.
7. **Precisão:** Retornar com 2 casas decimais e arredondamento `RoundingMode.HALF_EVEN` (ou `HALF_UP`).

---

### Comparabilidade e Validação de Dificuldade Equivalente

| Critério de Comparação | Kata 1: `TarifadorEstacionamento` | Kata 2: `TarifadorLogistica` | Kata 3: `TarifadorHospedagem` | Kata 4: `TarifadorPlanoSaude` |
| :--- | :--- | :--- | :--- | :--- |
| **Linhas de Código esperadas (LOC)** | 50 a 85 linhas | 50 a 85 linhas | 50 a 85 linhas | 50 a 85 linhas |
| **Complexidade ciclomática total estimada** | 8 a 12 | 8 a 12 | 8 a 12 | 8 a 12 |
| **Número de regras de negócio** | 6 regras condicionais | 6 regras condicionais | 6 regras condicionais | 6 regras condicionais |
| **Manipulação de dados** | Datas/horas (`java.time`), Enums, `BigDecimal` | Ponto flutuante, Enums, `BigDecimal` | Datas (`LocalDate`), Enums, `BigDecimal` | Inteiros, Enums, Booleans, `BigDecimal` |
| **Validações com Exceção** | `IllegalArgumentException` (tempo/nulos) | `IllegalArgumentException` ($\le 0$, peso $> 50$, nulos) | `IllegalArgumentException` (datas, capacidade, nulos) | `IllegalArgumentException` (idade $< 0$ ou $> 120$, nulos) |
| **Fator multiplicador / Desconto** | Tipo de veículo (3) + convênio (15%) | Modalidade (3) + fidelidade (10%) | Categoria (3) + convênio (10%) | Categoria (3) + coparticipação (15%) |
| **Taxas escalonadas / adicionais** | Franquia 15m $\rightarrow$ 1ª hora $\rightarrow$ horas extras | Faixa 15km $\rightarrow$ Faixa 50km $\rightarrow$ excedente | Faixa 1-3d $\rightarrow$ 4-7d $\rightarrow$ 8+d $\rightarrow$ hóspede extra | Faixas etárias 17, 39, 59, 60+ $\rightarrow$ acomodação $\rightarrow$ odonto |
| **Bateria de testes de aceitação** | 8 casos de teste padronizados | 8 casos de teste padronizados | 8 casos de teste padronizados | 8 casos de teste padronizados |
| **Grau de indexação em LLMs** | **Nulo** (autoral, nomes e regras em PT-BR) | **Nulo** (autoral, nomes e regras em PT-BR) | **Nulo** (autoral, nomes e regras em PT-BR) | **Nulo** (autoral, nomes e regras em PT-BR) |

---

## 4. Projeto Experimental e Contrabalanceamento (Crossover)

Para controlar a alta variabilidade individual de habilidade de programação entre os participantes, utiliza-se um **projeto experimental pareado within-subject com contrabalanceamento em Quadrado Latino (2×2 Crossover)** ou extensão para **4×4 Crossover**.

Cada participante realiza **2 trials** (um sob o tratamento `COM_IA` e outro sob `SEM_IA`), alternando o kata e a ordem para eliminar viés de aprendizagem. Com quatro katas disponíveis de complexidade equivalente, é possível alocar participantes em múltiplos pares contrabalanceados (ex.: Par A: Kata 1 vs. Kata 2; Par B: Kata 3 vs. Kata 4) ou aplicar rotação completa de 4 grupos.

### Matriz de Crossover (Exemplo com 4 Grupos - Par A e Par B)

| Grupo de Participantes | Objeto Par | Ordem do 1º Trial | Intervalo | Ordem do 2º Trial |
| :--- | :---: | :--- | :---: | :--- |
| **Grupo 1 (G1)** | Par A | Kata 1 — `COM_IA` | 15 min | Kata 2 — `SEM_IA` |
| **Grupo 2 (G2)** | Par A | Kata 1 — `SEM_IA` | 15 min | Kata 2 — `COM_IA` |
| **Grupo 3 (G3)** | Par A | Kata 2 — `COM_IA` | 15 min | Kata 1 — `SEM_IA` |
| **Grupo 4 (G4)** | Par A | Kata 2 — `SEM_IA` | 15 min | Kata 1 — `COM_IA` |
| **Grupo 5 (G5)** | Par B | Kata 3 — `COM_IA` | 15 min | Kata 4 — `SEM_IA` |
| **Grupo 6 (G6)** | Par B | Kata 3 — `SEM_IA` | 15 min | Kata 4 — `COM_IA` |
| **Grupo 7 (G7)** | Par B | Kata 4 — `COM_IA` | 15 min | Kata 3 — `SEM_IA` |
| **Grupo 8 (G8)** | Par B | Kata 4 — `SEM_IA` | 15 min | Kata 3 — `COM_IA` |

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
