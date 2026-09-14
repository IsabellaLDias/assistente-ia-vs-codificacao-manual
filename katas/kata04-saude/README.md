# Kata 04 — Tarifador de Plano de Saúde (VidaPlus)

## Contexto
Você foi contratado para implementar o motor de tarifação de apólices individuais de uma operadora de planos de saúde (*VidaPlus*). O sistema precisa calcular o valor da mensalidade com base na faixa etária do beneficiário (seguindo faixas de referência da ANS), na categoria de cobertura contratada, no tipo de acomodação hospitalar, na adesão opcional à cobertura odontológica e no regime de coparticipação.

## Escopo e Arquivos
- Pacote: `br.ufc.lab02.saude`
- Arquivos de produção:
  - `CategoriaPlano.java` (Enum fornecido)
  - `TipoAcomodacao.java` (Enum fornecido)
  - `TarifadorPlanoSaude.java` (Classe principal a implementar)
- Assinatura obrigatória:
  ```java
  public BigDecimal calcularMensalidade(int idade, CategoriaPlano categoria, TipoAcomodacao acomodacao, boolean incluiOdontologia, boolean possuiCoparticipacao)
  ```

## Regras de Negócio
1. **Validação:** Se `idade < 0` ou `idade > 120`, ou se `categoria` ou `acomodacao` forem nulos, lance `IllegalArgumentException`.
2. **Mensalidade Base por Faixa Etária (anos completos):**
   - De 0 a 17 anos: tarifa base de **R$ 150,00**.
   - De 18 a 39 anos: tarifa base de **R$ 260,00**.
   - De 40 a 59 anos: tarifa base de **R$ 420,00**.
   - 60 anos ou mais: tarifa base de **R$ 720,00**.
3. **Multiplicador da Categoria do Plano:**
   - A mensalidade base por idade é multiplicada pelo fator da categoria:
     - `BASICO`: fator 1.00.
     - `ESPECIAL`: fator 1.30 (+30%).
     - `PREMIUM`: fator 1.60 (+60%).
4. **Adicional por Tipo de Acomodação:**
   - Adiciona-se a taxa fixa correspondente à acomodação hospitalar:
     - `ENFERMARIA`: adicional de **R$ 0,00**.
     - `APARTAMENTO`: adicional fixo de **R$ 90,00**.
5. **Adicional de Cobertura Odontológica:**
   - Se `incluiOdontologia` for verdadeiro, acrescenta-se uma taxa fixa adicional de **R$ 45,00**.
6. **Desconto de Coparticipação:**
   - Se `possuiCoparticipacao` for verdadeiro, aplica-se **15% de desconto** sobre o valor total acumulado (mensalidade com categoria + acomodação + odontologia).
7. **Formato:** O retorno deve ser um `BigDecimal` com escala de 2 casas decimais e arredondamento `RoundingMode.HALF_EVEN` (ou `HALF_UP`).
