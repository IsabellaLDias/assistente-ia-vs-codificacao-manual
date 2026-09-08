package br.ufc.lab02.logistica;

public enum ModalidadeEntrega {
    PADRAO(1.00),
    EXPRESSA(1.40),
    MESMO_DIA(1.80);

    private final double fatorMultiplicador;

    ModalidadeEntrega(double fatorMultiplicador) {
        this.fatorMultiplicador = fatorMultiplicador;
    }

    public double getFatorMultiplicador() {
        return fatorMultiplicador;
    }
}
