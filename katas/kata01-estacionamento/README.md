# Kata 01 — Tarifador de Estacionamento Rotativo (SmartPark)

## Contexto
Você foi contratado para implementar a lógica de tarifação de um estacionamento inteligente. O sistema precisa calcular o valor cobrado com base no tempo de permanência, tipo de veículo, tetos diários e benefícios de convênio.

## Escopo e Arquivos
- Pacote: `br.ufc.lab02.estacionamento`
- Arquivos de produção:
  - `TipoVeiculo.java` (Enum fornecido)
  - `TarifadorEstacionamento.java` (Classe principal a implementar)
- Assinatura obrigatória:
  ```java
  public BigDecimal calcularTarifa(LocalDateTime entrada, LocalDateTime saida, TipoVeiculo tipo, boolean possuiConvenio)
  ```

## Regras de Negócio
1. **Validação:** Se `entrada` ou `saida` forem nulos, ou se `saida` for anterior à `entrada`, ou se `tipo` for nulo, lance `IllegalArgumentException`.
2. **Franquia de Tolerância:** Permanência menor ou igual a 15 minutos é gratuita (`BigDecimal.ZERO`).
3. **Tarifação Horária:**
   - De 16 a 60 minutos (primeira hora): tarifa fixa de **R$ 12,00**.
   - A cada hora subsequente (ou fração iniciada): acréscimo de **R$ 6,00**. Exemplo: 1h10min = 1ª hora (R$ 12) + 1 hora extra (R$ 6) = R$ 18,00.
4. **Teto da Diária:** Em cada período de 24 horas (completo ou fracionado), o valor máximo cobrado para o período não pode exceder **R$ 60,00**. Exemplo: 10 horas de permanência = R$ 60,00 (teto aplicado).
5. **Multiplicador por Tipo de Veículo:**
   - `MOTO`: fator de 0.50 (50% do valor).
   - `CARRO_PASSEIO`: fator de 1.00 (100% do valor).
   - `CAMINHONETE`: fator de 1.25 (+25% sobre o valor).
6. **Desconto de Convênio:** Se `possuiConvenio` for verdadeiro, aplica-se 15% de desconto sobre o valor calculado.
7. **Formato:** O retorno deve ser um `BigDecimal` com escala de 2 casas decimais e arredondamento `RoundingMode.HALF_EVEN` (ou `HALF_UP`).
