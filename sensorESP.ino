#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "NOMBRE_DE_LA_RED";
const char* password = "CONTRASEÑA_DE_LA_RED";

const char* serverName = "http://192.168.xx.xx:8081/api/esp32";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);

  Serial.print("Conectando a Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n¡Conectado exitosamente!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");

    // Genera una lectura simulada o usa la lectura analógica/sensor del ESP32
    float temperatura = 23.5 + (random(-20, 20) / 10.0);

    String jsonPayload = "{\"temperatura\":" + String(temperatura) + "}";
    int httpResponseCode = http.POST(jsonPayload);

    if (httpResponseCode > 0) {
      Serial.print("Dato enviado al servidor. Codigo HTTP: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("Error al enviar POST: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }
  
  delay(1000); // Envía una lectura cada segundo
}