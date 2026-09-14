package br.ufc.lab02.saude;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class TarifadorPlanoSaude {

    private static final BigDecimal FAIXA_JOVEM = BigDecimal.valueOf(150.00);
    private static final BigDecimal FAIXA_ADULTO_1 = BigDecimal.valueOf(260.00);
    private static final BigDecimal FAIXA_ADULTO_2 = BigDecimal.valueOf(420.00);
    private static final BigDecimal FAIXA_IDOSO = BigDecimal.valueOf(720.00);
    private static final BigDecimal TAXA_ODONTOLOGIA = BigDecimal.valueOf(45.00);
    private static final BigDecimal FATOR_DESCONTO_COPARTICIPACAO = BigDecimal.valueOf(0.85);

    public BigDecimal calcularMensalidade(int idade, CategoriaPlano categoria, TipoAcomodacao acomodacao, boolean incluiOdontologia, boolean possuiCoparticipacao) {
        if (idade < 0 || idade > 120) {
            throw new IllegalArgumentException("Idade deve estar entre 0 e 120 anos.");
        }
        if (categoria == null || acomodacao == null) {
            throw new IllegalArgumentException("Categoria do plano e acomodacao sao obrigatorias.");
        }

        // 1. Mensalidade base por faixa etária
        BigDecimal valorBaseIdade;
        if (idade <= 17) {
            valorBaseIdade = FAIXA_JOVEM;
        } else if (idade <= 39) {
            valorBaseIdade = FAIXA_ADULTO_1;
        } else if (idade <= 59) {
            valorBaseIdade = FAIXA_ADULTO_2;
        } else {
            valorBaseIdade = FAIXA_IDOSO;
        }

        // 2. Multiplicador da categoria do plano
        BigDecimal valorComCategoria = valorBaseIdade.multiply(BigDecimal.valueOf(categoria.getFatorMultiplicador()));

        // 3. Adicional de acomodação hospitalar
        BigDecimal valorComAcomodacao = valorComCategoria.add(acomodacao.getTaxaAcomodacao());

        // 4. Adicional opcional de cobertura odontológica
        BigDecimal subtotal = incluiOdontologia
            ? valorComAcomodacao.add(TAXA_ODONTOLOGIA)
            : valorComAcomodacao;

        // 5. Desconto de coparticipação
        BigDecimal totalFinal = possuiCoparticipacao
            ? subtotal.multiply(FATOR_DESCONTO_COPARTICIPACAO)
            : subtotal;

        return totalFinal.setScale(2, RoundingMode.HALF_EVEN);
    }
}
