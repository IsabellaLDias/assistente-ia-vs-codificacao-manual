# Kata 03 — Tarifador de Hospedagem e Pousada (BellaVista)

## Contexto
Você foi contratado para implementar a lógica de tarifação de reservas de uma pousada e rede hoteleira de lazer (*BellaVista*). O sistema precisa calcular o valor total da hospedagem com base nas datas de entrada e saída, número de hóspedes, adicionais por capacidade, categoria da acomodação e benefícios de convênio corporativo.

## Escopo e Arquivos
- Pacote: `br.ufc.lab02.hospedagem`
- Arquivos de produção:
  - `CategoriaQuarto.java` (Enum fornecido)
  - `TarifadorHospedagem.java` (Classe principal a implementar)
- Assinatura obrigatória:
  ```java
  public BigDecimal calcularHospedagem(LocalDate checkIn, LocalDate checkOut, int numeroHospedes, CategoriaQuarto categoria, boolean possuiConvenio)
  ```

## Regras de Negócio
1. **Validação:** Se `checkIn` ou `checkOut` forem nulos, ou se `checkOut` não for estritamente posterior a `checkIn` (estadia mínima de 1 diária/noite), ou se `numeroHospedes <= 0` ou `numeroHospedes > 5` (limite máximo de 5 hóspedes por acomodação), ou se `categoria` for nula, lance `IllegalArgumentException`.
2. **Tarifa Base Escalonada por Diária:**
   A quantidade de diárias é a contagem de pernoites entre `checkIn` e `checkOut`:
   - Curta permanência (1 a 3 diárias): tarifa de **R$ 160,00** por diária.
   - Média permanência (4 a 7 diárias): tarifa de **R$ 130,00** por diária.
   - Longa permanência (8 ou mais diárias): tarifa de **R$ 100,00** por diária.
   O custo base é o total de diárias multiplicado pela tarifa da faixa correspondente.
3. **Adicional por Hóspedes Extras:**
   - A diária base contempla até 2 hóspedes (inclusos).
   - Cada hóspede adicional (acima de 2 hóspedes, ou seja, 3º, 4º ou 5º hóspede) adiciona **R$ 40,00 por diária** por hóspede excedente. Exemplo: 4 hóspedes em 2 diárias = 2 extras * R$ 40,00 * 2 diárias = R$ 160,00 adicionais.
4. **Multiplicador da Categoria de Quarto:**
   - A soma do custo base das diárias com os adicionais de hóspedes extras é multiplicada pelo fator da categoria:
     - `STANDARD`: fator 1.00.
     - `LUXO`: fator 1.30 (+30%).
     - `PRESIDENCIAL`: fator 1.70 (+70%).
5. **Taxa Fixa de Higienização:**
   - Adiciona-se uma taxa fixa única por estadia correspondente à governança da acomodação:
     - `STANDARD`: **R$ 50,00**.
     - `LUXO`: **R$ 80,00**.
     - `PRESIDENCIAL`: **R$ 120,00**.
6. **Desconto de Convênio:**
   - Se `possuiConvenio` for verdadeiro, aplica-se **10% de desconto** sobre o valor final calculado (diárias + taxa de higienização).
7. **Formato:** O retorno deve ser um `BigDecimal` com escala de 2 casas decimais e arredondamento `RoundingMode.HALF_EVEN` (ou `HALF_UP`).
