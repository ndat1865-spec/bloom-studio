# Xay bang JDK 17 roi chay bang JRE 17: anh chay khong keo theo trinh bien dich
# va kho Maven, nho hon dang ke.
FROM eclipse-temurin:17-jdk AS build
WORKDIR /build

# Chep truoc pom va wrapper de Docker cache duoc lop tai thu vien: sua ma nguon
# thi khong phai tai lai toan bo dependency.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
# Goi qua "sh" chu khong chay truc tiep ./mvnw: file chep tu Windows khong co co
# thuc thi, chay thang se bao "permission denied".
RUN sh ./mvnw -B -q dependency:go-offline

COPY src/ src/
RUN sh ./mvnw -B -q clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app

# Khong chay bang root trong container.
RUN useradd --system --create-home --uid 10001 bloom
USER bloom

COPY --from=build --chown=bloom:bloom /build/target/*.jar app.jar

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
