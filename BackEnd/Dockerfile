# ==========================================
# Stage 1: Build the Go file-managed-service
# ==========================================
FROM golang:alpine AS go-builder

WORKDIR /app

# Install git and CA certificates (needed for package fetching)
RUN apk add --no-cache git ca-certificates

# Copy dependency definitions first for caching
COPY file-managed-service/go.mod file-managed-service/go.sum ./
RUN go mod download

# Copy the remaining Go source files
COPY file-managed-service/ ./

# Build statically-linked binary
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o filesphere-api .


# ==========================================
# Stage 2: Build the Java auth-service
# ==========================================
FROM maven:3.9.6-eclipse-temurin-21-alpine AS auth-builder

WORKDIR /app

# Copy the maven settings and dependency file to cache them
COPY auth-service/pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and package jar
COPY auth-service/src ./src
RUN mvn clean package -DskipTests -B


# ==========================================
# Stage 3: Build the Java api-gateway
# ==========================================
FROM maven:3.9.6-eclipse-temurin-21-alpine AS gateway-builder

WORKDIR /app

# Copy the maven settings and dependency file to cache them
COPY api-gateway/pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and package jar
COPY api-gateway/src ./src
RUN mvn clean package -DskipTests -B


# ==========================================
# Stage 4: Create the final unified runtime image
# ==========================================
FROM eclipse-temurin:21-jre-alpine

# Install essential system-level utilities and PostgreSQL
RUN apk --no-cache add ca-certificates tzdata curl postgresql postgresql-contrib postgresql-client

# Setup application working directories
WORKDIR /app
RUN mkdir -p /app/file-managed-service /app/auth-service /app/api-gateway /app/storage

# Copy the Go binary from Stage 1
COPY --from=go-builder /app/filesphere-api /app/file-managed-service/filesphere-api

# Copy the Java Auth JAR from Stage 2
COPY --from=auth-builder /app/target/*.jar /app/auth-service/app.jar

# Copy the Java Gateway JAR from Stage 3
COPY --from=gateway-builder /app/target/*.jar /app/api-gateway/app.jar

# Expose ports:
# - 7000: API Gateway (Main entry point)
# - 7001: Go File Management Service
# - 7002: Java Auth Service
# - 5432: PostgreSQL Database
EXPOSE 7000 7001 7002 5432

# Create a startup script to initialize and launch Postgres + Auth + API + Gateway
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'PGDATA="/var/lib/postgresql/data"' >> /app/start.sh && \
    echo 'mkdir -p "$PGDATA" /run/postgresql' >> /app/start.sh && \
    echo 'chown -R postgres:postgres "$PGDATA" /run/postgresql' >> /app/start.sh && \
    echo 'if [ ! -s "$PGDATA/PG_VERSION" ]; then' >> /app/start.sh && \
    echo '    echo "Initializing database cluster..."' >> /app/start.sh && \
    echo '    su -s /bin/sh postgres -c "initdb -D $PGDATA --auth-local=trust --auth-host=trust"' >> /app/start.sh && \
    echo '    echo "Starting temporary PostgreSQL server..."' >> /app/start.sh && \
    echo '    su -s /bin/sh postgres -c "pg_ctl -D $PGDATA -o '\''-c listen_addresses=localhost'\'' -w start"' >> /app/start.sh && \
    echo '    echo "Configuring database users and schemas..."' >> /app/start.sh && \
    echo '    DB_USER=${DB_USER:-user}' >> /app/start.sh && \
    echo '    DB_PASSWORD=${DB_PASSWORD:-password}' >> /app/start.sh && \
    echo '    DB_NAME=${DB_NAME:-filesphere}' >> /app/start.sh && \
    echo '    psql -U postgres -h localhost -c "CREATE USER \"$DB_USER\" WITH PASSWORD '\''$DB_PASSWORD'\'' SUPERUSER;"' >> /app/start.sh && \
    echo '    psql -U postgres -h localhost -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";"' >> /app/start.sh && \
    echo '    echo "Stopping temporary PostgreSQL server..."' >> /app/start.sh && \
    echo '    su -s /bin/sh postgres -c "pg_ctl -D $PGDATA -m fast -w stop"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'echo "Starting PostgreSQL server..."' >> /app/start.sh && \
    echo 'su -s /bin/sh postgres -c "postgres -D $PGDATA -c listen_addresses='\''*'\''" &' >> /app/start.sh && \
    echo 'echo "Waiting for PostgreSQL to start..."' >> /app/start.sh && \
    echo 'until pg_isready -h localhost -p 5432 -U postgres; do' >> /app/start.sh && \
    echo '  sleep 1' >> /app/start.sh && \
    echo 'done' >> /app/start.sh && \
    echo 'echo "PostgreSQL is ready!"' >> /app/start.sh && \
    echo 'export DB_HOST=localhost' >> /app/start.sh && \
    echo 'export AUTH_SERVICE_URL=http://localhost:7002' >> /app/start.sh && \
    echo 'export FILE_SERVICE_URL=http://localhost:7001' >> /app/start.sh && \
    echo 'echo "Starting Go API Service..."' >> /app/start.sh && \
    echo 'cd /app/file-managed-service' >> /app/start.sh && \
    echo './filesphere-api &' >> /app/start.sh && \
    echo 'echo "Starting Java Auth Service..."' >> /app/start.sh && \
    echo 'cd /app/auth-service' >> /app/start.sh && \
    echo 'java -jar app.jar &' >> /app/start.sh && \
    echo 'echo "Starting Java API Gateway..."' >> /app/start.sh && \
    echo 'cd /app/api-gateway' >> /app/start.sh && \
    echo 'exec java -jar app.jar' >> /app/start.sh && \
    chmod +x /app/start.sh

# Run startup script
CMD ["/app/start.sh"]
