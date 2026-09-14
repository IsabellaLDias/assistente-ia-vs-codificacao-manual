package br.ufc.lab02.saude;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TarifadorPlanoSaudeTest {

    private TarifadorPlanoSaude tarifador;

    @BeforeEach
    void setUp() {
        tarifador = new TarifadorPlanoSaude();
    }

    private BigDecimal valor(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_EVEN);
    }

    @Test
    @DisplayName("Caso 1: Faixa jovem (<= 17 anos) em plano BASICO e ENFERMARIA sem adicionais")
    void testeFaixaJovemBasicoEnfermaria() {
        // Idade 15 (150,00). BASICO (1.0). Enfermaria (0,00). Odonto: false. Coparticipacao: false. Total: R$ 150,00
        BigDecimal mensalidade = tarifador.calcularMensalidade(15, CategoriaPlano.BASICO, TipoAcomodacao.ENFERMARIA, false, false);
        assertEquals(valor(150.00), mensalidade);
    }

    @Test
    @DisplayName("Caso 2: Faixa adulto 1 (18 a 39 anos) com tarifa base de R$ 260,00")
    void testeFaixaAdulto1() {
        // Idade 28 (260,00). BASICO (1.0). Enfermaria (0,00). Total: R$ 260,00
        BigDecimal mensalidade = tarifador.calcularMensalidade(28, CategoriaPlano.BASICO, TipoAcomodacao.ENFERMARIA, false, false);
        assertEquals(valor(260.00), mensalidade);
    }

    @Test
    @DisplayName("Caso 3: Faixa adulto 2 (40 a 59 anos) com tarifa base de R$ 420,00")
    void testeFaixaAdulto2() {
        // Idade 45 (420,00). BASICO (1.0). Enfermaria (0,00). Total: R$ 420,00
        BigDecimal mensalidade = tarifador.calcularMensalidade(45, CategoriaPlano.BASICO, TipoAcomodacao.ENFERMARIA, false, false);
        assertEquals(valor(420.00), mensalidade);
    }

    @Test
    @DisplayName("Caso 4: Faixa idoso (>= 60 anos) com tarifa base de R$ 720,00")
    void testeFaixaIdoso() {
        // Idade 65 (720,00). BASICO (1.0). Enfermaria (0,00). Total: R$ 720,00
        BigDecimal mensalidade = tarifador.calcularMensalidade(65, CategoriaPlano.BASICO, TipoAcomodacao.ENFERMARIA, false, false);
        assertEquals(valor(720.00), mensalidade);
    }

    @Test
    @DisplayName("Caso 5: Categoria ESPECIAL aplica multiplicador de 1.30")
    void testeCategoriaEspecial() {
        // Idade 28 (260,00) * 1.30 = 338,00. Enfermaria (0,00). Total: R$ 338,00
        BigDecimal mensalidade = tarifador.calcularMensalidade(28, CategoriaPlano.ESPECIAL, TipoAcomodacao.ENFERMARIA, false, false);
        assertEquals(valor(338.00), mensalidade);
    }

    @Test
    @DisplayName("Caso 6: Acomodação APARTAMENTO (+ R$ 90,00) e Cobertura Odontológica (+ R$ 45,00)")
    void testeAcomodacaoApartamentoEOdontologia() {
        // Idade 28 (260,00). BASICO (1.0) = 260,00 + APARTAMENTO (90,00) + Odonto (45,00) = R$ 395,00
        BigDecimal mensalidade = tarifador.calcularMensalidade(28, CategoriaPlano.BASICO, TipoAcomodacao.APARTAMENTO, true, false);
        assertEquals(valor(395.00), mensalidade);
    }

    @Test
    @DisplayName("Caso 7: Desconto de coparticipação aplica 15% sobre o valor final")
    void testeDescontoCoparticipacao() {
        // Subtotal R$ 395,00 * 0.85 = R$ 335,75
        BigDecimal mensalidade = tarifador.calcularMensalidade(28, CategoriaPlano.BASICO, TipoAcomodacao.APARTAMENTO, true, true);
        assertEquals(valor(335.75), mensalidade);
    }

    @Test
    @DisplayName("Caso 8: Validações de entradas inválidas lançam IllegalArgumentException")
    void testeValidacaoExcecoes() {
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularMensalidade(-1, CategoriaPlano.BASICO, TipoAcomodacao.ENFERMARIA, false, false)
        );
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularMensalidade(121, CategoriaPlano.BASICO, TipoAcomodacao.ENFERMARIA, false, false)
        );
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularMensalidade(30, null, TipoAcomodacao.ENFERMARIA, false, false)
        );
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularMensalidade(30, CategoriaPlano.BASICO, null, false, false)
        );
    }
}
