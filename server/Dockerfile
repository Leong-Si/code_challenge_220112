# syntax=docker/dockerfile:1

# Stage 1: build
FROM openjdk:11-jdk-slim AS build
COPY . /app/
WORKDIR /app
RUN ./gradlew build && mv ./build/libs/server*.jar /app/server.jar

# Stage 2: run service
FROM openjdk:11-jre-slim
WORKDIR /app
COPY --from=build /app/server.jar .
ENTRYPOINT ["java", "-jar", "server.jar"]
