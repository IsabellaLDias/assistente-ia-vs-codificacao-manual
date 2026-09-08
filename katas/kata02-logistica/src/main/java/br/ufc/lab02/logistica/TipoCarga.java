package br.ufc.lab02.logistica;

import java.math.BigDecimal;

public enum TipoCarga {
    NORMAL(BigDecimal.valueOf(0.00)),
    FRAGIL(BigDecimal.valueOf(15.00)),
    PERECIVEL(BigDecimal.valueOf(25.00));

    private final BigDecimal taxaManuseio;

    TipoCarga(BigDecimal taxaManuseio) {
        this.taxaManuseio = taxaManuseio;
    }

    public BigDecimal getTaxaManuseio() {
        return taxaManuseio;
    }
}
