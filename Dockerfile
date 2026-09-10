# Stage 1: Build CK com Maven e download do PMD
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build

# Instala unzip para extração dos arquivos
RUN apt-get update && apt-get install -y --no-install-recommends unzip && rm -rf /var/lib/apt/lists/*

# Baixa e compila o CK 0.7.0
ARG CK_VERSION=0.7.0
RUN curl -sSL "https://github.com/mauricioaniche/ck/archive/refs/tags/ck-${CK_VERSION}.tar.gz" | tar -xz && \
    cd "ck-ck-${CK_VERSION}" && \
    mvn -q -Dmaven.test.skip=true -Dmaven.javadoc.skip=true package && \
    mkdir -p /tools/ck && \
    cp target/*-jar-with-dependencies.jar "/tools/ck/ck-${CK_VERSION}-jar-with-dependencies.jar"

# Baixa e extrai o PMD 7.26.0
ARG PMD_VERSION=7.26.0
RUN curl -sSL -o pmd.zip "https://github.com/pmd/pmd/releases/download/pmd_releases%2F${PMD_VERSION}/pmd-dist-${PMD_VERSION}-bin.zip" && \
    mkdir -p /tools/pmd && \
    unzip -q pmd.zip -d /tools/pmd && \
    chmod +x "/tools/pmd/pmd-bin-${PMD_VERSION}/bin/pmd"

# Stage 2: Imagem final de execução (Linux com pwsh, Java e Node.js)
FROM mcr.microsoft.com/powershell:lts-debian-12

# Instala JDK 17 (java e javac) e utilitários
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      openjdk-17-jdk-headless \
      curl \
      ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copia runtime do Node.js v20
COPY --from=node:20-bookworm-slim /usr/local /usr/local

WORKDIR /app

# Copia código do projeto
COPY . /app

# Copia ferramentas compiladas (CK e PMD) da etapa de build
COPY --from=builder /tools/ /app/tools/

# Garante diretórios de trabalho e permissões de execução
RUN mkdir -p /app/data/web-jobs /app/data/metrics && \
    chmod +x /app/tools/pmd/*/bin/pmd

ENV PORT=3010 \
    HOST=0.0.0.0 \
    NODE_ENV=production

EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1:${PORT}/api/config || exit 1

CMD ["npm", "start"]
