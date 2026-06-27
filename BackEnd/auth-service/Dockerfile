# Build stage
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
# Prefetch dependencies to cache them
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

# Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8081
ENV DB_HOST=db
ENV DB_PORT=5432
ENV DB_NAME=filesphere
ENV DB_USER=user
ENV DB_PASSWORD=password
ENV JWT_SECRET=supersecretjwtkeywithatleast256bitscharacterslengthrequired1234567890!
ENTRYPOINT ["java", "-jar", "app.jar"]
