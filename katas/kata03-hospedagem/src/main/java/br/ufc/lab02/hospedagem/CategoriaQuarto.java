package br.ufc.lab02.hospedagem;

import java.math.BigDecimal;

public enum CategoriaQuarto {
    STANDARD(1.00, BigDecimal.valueOf(50.00)),
    LUXO(1.30, BigDecimal.valueOf(80.00)),
    PRESIDENCIAL(1.70, BigDecimal.valueOf(120.00));

    private final double fatorMultiplicador;
    private final BigDecimal taxaLimpeza;

    CategoriaQuarto(double fatorMultiplicador, BigDecimal taxaLimpeza) {
        this.fatorMultiplicador = fatorMultiplicador;
        this.taxaLimpeza = taxaLimpeza;
    }

    public double getFatorMultiplicador() {
        return fatorMultiplicador;
    }

    public BigDecimal getTaxaLimpeza() {
        return taxaLimpeza;
    }
}
