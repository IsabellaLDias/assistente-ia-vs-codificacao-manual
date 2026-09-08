# Kata 02 — Tarifador de Logística Urbana (EcoFrete)

## Contexto
Você foi contratado para implementar o motor de tarifação de entregas de uma transportadora urbana expressa. O sistema precisa calcular o frete com base na distância percorrida, peso da encomenda, modalidade de urgência, tipo de carga e programa de fidelidade do cliente.

## Escopo e Arquivos
- Pacote: `br.ufc.lab02.logistica`
- Arquivos de produção:
  - `ModalidadeEntrega.java` (Enum fornecido)
  - `TipoCarga.java` (Enum fornecido)
  - `TarifadorLogistica.java` (Classe principal a implementar)
- Assinatura obrigatória:
  ```java
  public BigDecimal calcularFrete(double distanciaKm, double pesoKg, ModalidadeEntrega modalidade, TipoCarga tipoCarga, boolean clienteFidelidade)
  ```

## Regras de Negócio
1. **Validação:** Se `distanciaKm <= 0`, `pesoKg <= 0`, `pesoKg > 50.0` (limite da transportadora) ou se `modalidade` ou `tipoCarga` forem nulos, lance `IllegalArgumentException`.
2. **Tarifa Base por Distância:**
   - Até 15.0 km: tarifa fixa de **R$ 10,00**.
   - De 15.01 km até 50.0 km: tarifa fixa de **R$ 25,00**.
   - Acima de 50.0 km: tarifa fixa de **R$ 25,00** + **R$ 1,50 por km adicional** que exceder os 50 km. Exemplo: 70 km = R$ 25,00 + (20 * R$ 1,50) = R$ 55,00.
3. **Adicional por Peso:**
   - Encomendas de até 5.0 kg não pagam taxa de peso (isento).
   - Acima de 5.0 kg: acréscimo de **R$ 3,00 por kg excedente** (ou fração). Exemplo: 8 kg = 3 kg excedentes * R$ 3,00 = R$ 9,00 adicionais.
4. **Multiplicador da Modalidade:** A soma da tarifa de distância com o adicional de peso é multiplicada pelo fator da modalidade:
   - `PADRAO`: fator 1.00.
   - `EXPRESSA`: fator 1.40 (+40%).
   - `MESMO_DIA`: fator 1.80 (+80%).
5. **Taxa de Manuseio Especial:** Adiciona-se uma taxa fixa conforme o tipo de carga:
   - `NORMAL`: **R$ 0,00**.
   - `FRAGIL`: adicional fixo de **R$ 15,00**.
   - `PERECIVEL`: adicional fixo de **R$ 25,00**.
6. **Desconto de Fidelidade:** Se `clienteFidelidade` for verdadeiro, aplica-se 10% de desconto sobre o valor total final.
7. **Formato:** O retorno deve ser um `BigDecimal` com escala de 2 casas decimais e arredondamento `RoundingMode.HALF_EVEN` (ou `HALF_UP`).
