# Build stage
FROM golang:alpine AS builder

WORKDIR /app

# ADDED: Install git and certificates. 
# Alpine does not have git by default, and Go needs it to fetch certain dependencies.
RUN apk add --no-cache git ca-certificates

# Copy dependency definitions
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Build the binary
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o filesphere-api .

# Run stage
FROM alpine:latest

# Add timezone data and CA certificates for secure connections if needed
RUN apk --no-cache add ca-certificates tzdata

# Set working directory to match the relative paths expected by the Go app
# The app expects to run from "file-managed-service" and save to "../storage/"
WORKDIR /app/file-managed-service

# Copy the compiled binary from the builder stage
COPY --from=builder /app/filesphere-api .

# Create the storage directory so the relative path "../storage/" resolves properly
RUN mkdir -p /app/storage

EXPOSE 7001

CMD ["./filesphere-api"]