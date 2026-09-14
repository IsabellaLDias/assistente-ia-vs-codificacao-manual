package br.ufc.lab02.saude;

public enum CategoriaPlano {
    BASICO(1.00),
    ESPECIAL(1.30),
    PREMIUM(1.60);

    private final double fatorMultiplicador;

    CategoriaPlano(double fatorMultiplicador) {
        this.fatorMultiplicador = fatorMultiplicador;
    }

    public double getFatorMultiplicador() {
        return fatorMultiplicador;
    }
}
