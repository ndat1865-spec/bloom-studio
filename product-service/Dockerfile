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
#
# Phai TU TAO /var/bloom/uploads va chown TRUOC khi Compose gan volume vao day.
# Docker tao named volume rong voi chu so huu root; neu diem gan khong ton tai san
# trong anh thi container chay bang tai khoan thuong se khong ghi duoc, tai anh len
# tra 500 kem AccessDeniedException. Khi diem gan da co san, Docker chep luon quyen
# so huu cua no sang volume moi.
RUN useradd --system --create-home --uid 10001 bloom && mkdir -p /var/bloom/uploads && chown -R bloom:bloom /var/bloom
USER bloom

COPY --from=build --chown=bloom:bloom /build/target/*.jar app.jar

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
