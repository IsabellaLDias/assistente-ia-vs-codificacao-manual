package br.ufc.lab02.hospedagem;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TarifadorHospedagemTest {

    private TarifadorHospedagem tarifador;
    private final LocalDate base = LocalDate.of(2026, 10, 1);

    @BeforeEach
    void setUp() {
        tarifador = new TarifadorHospedagem();
    }

    private BigDecimal valor(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_EVEN);
    }

    @Test
    @DisplayName("Caso 1: Estadia curta (<= 3 diárias) até 2 hóspedes em quarto STANDARD")
    void testeEstadiaCurtaSemAdicional() {
        // 2 diárias * 160 = 320. STANDARD (1.0). Limpeza 50 = 370.00
        LocalDate saida = base.plusDays(2);
        BigDecimal total = tarifador.calcularHospedagem(base, saida, 2, CategoriaQuarto.STANDARD, false);
        assertEquals(valor(370.00), total);
    }

    @Test
    @DisplayName("Caso 2: Estadia média (4 a 7 diárias) com tarifa reduzida de R$ 130,00 por diária")
    void testeEstadiaMedia() {
        // 5 diárias * 130 = 650. STANDARD (1.0). Limpeza 50 = 700.00
        LocalDate saida = base.plusDays(5);
        BigDecimal total = tarifador.calcularHospedagem(base, saida, 2, CategoriaQuarto.STANDARD, false);
        assertEquals(valor(700.00), total);
    }

    @Test
    @DisplayName("Caso 3: Estadia longa (>= 8 diárias) com tarifa promocional de R$ 100,00 por diária")
    void testeEstadiaLonga() {
        // 10 diárias * 100 = 1000. STANDARD (1.0). Limpeza 50 = 1050.00
        LocalDate saida = base.plusDays(10);
        BigDecimal total = tarifador.calcularHospedagem(base, saida, 2, CategoriaQuarto.STANDARD, false);
        assertEquals(valor(1050.00), total);
    }

    @Test
    @DisplayName("Caso 4: Adicional por hóspedes extras acima de 2 a R$ 40,00 por diária cada")
    void testeAdicionalHospedesExtras() {
        // 2 diárias * 160 = 320. 2 extras * 40 * 2 = 160. Subtotal: 480. STANDARD (1.0). Limpeza: 50. Total: 530.00
        LocalDate saida = base.plusDays(2);
        BigDecimal total = tarifador.calcularHospedagem(base, saida, 4, CategoriaQuarto.STANDARD, false);
        assertEquals(valor(530.00), total);
    }

    @Test
    @DisplayName("Caso 5: Categoria LUXO aplica multiplicador de 1.30 e limpeza de R$ 80,00")
    void testeCategoriaLuxo() {
        // 2 diárias * 160 = 320 * 1.30 = 416. Limpeza: 80. Total: 496.00
        LocalDate saida = base.plusDays(2);
        BigDecimal total = tarifador.calcularHospedagem(base, saida, 2, CategoriaQuarto.LUXO, false);
        assertEquals(valor(496.00), total);
    }

    @Test
    @DisplayName("Caso 6: Categoria PRESIDENCIAL aplica multiplicador de 1.70 e limpeza de R$ 120,00")
    void testeCategoriaPresidencial() {
        // 2 diárias * 160 = 320 * 1.70 = 544. Limpeza: 120. Total: 664.00
        LocalDate saida = base.plusDays(2);
        BigDecimal total = tarifador.calcularHospedagem(base, saida, 2, CategoriaQuarto.PRESIDENCIAL, false);
        assertEquals(valor(664.00), total);
    }

    @Test
    @DisplayName("Caso 7: Desconto de convênio aplica 10% sobre o valor final da hospedagem")
    void testeDescontoConvenio() {
        // Total sem convênio: 370.00 * 0.90 = 333.00
        LocalDate saida = base.plusDays(2);
        BigDecimal total = tarifador.calcularHospedagem(base, saida, 2, CategoriaQuarto.STANDARD, true);
        assertEquals(valor(333.00), total);
    }

    @Test
    @DisplayName("Caso 8: Validações de entradas inválidas lançam IllegalArgumentException")
    void testeValidacaoExcecoes() {
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularHospedagem(null, base.plusDays(1), 2, CategoriaQuarto.STANDARD, false)
        );
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularHospedagem(base, null, 2, CategoriaQuarto.STANDARD, false)
        );
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularHospedagem(base, base.minusDays(1), 2, CategoriaQuarto.STANDARD, false)
        );
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularHospedagem(base, base, 2, CategoriaQuarto.STANDARD, false)
        );
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularHospedagem(base, base.plusDays(1), 0, CategoriaQuarto.STANDARD, false)
        );
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularHospedagem(base, base.plusDays(1), 6, CategoriaQuarto.STANDARD, false)
        );
        assertThrows(IllegalArgumentException.class, () ->
            tarifador.calcularHospedagem(base, base.plusDays(1), 2, null, false)
        );
    }
}
