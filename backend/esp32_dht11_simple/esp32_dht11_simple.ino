#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ── Pin Definitions ──────────────────────────
#define DHTPIN 2
#define DHTTYPE DHT11
#define MQ135_PIN A0
#define LDR_PIN A1

// ── OLED Settings ────────────────────────────
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1       // No reset pin
#define OLED_ADDRESS 0x3C   // Most SSD1306 use 0x3C

DHT dht(DHTPIN, DHTTYPE);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

int screen = 0; // Which screen to show (0 = temp/humi, 1 = co2/light)

void setup() {
  Serial.begin(9600);
  dht.begin();

  // Init OLED
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("ERROR:OLED_FAILED");
  } else {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);

    // Splash screen
    display.setTextSize(1);
    display.setCursor(20, 10);
    display.println("SilkSphere v2.0");
    display.setCursor(30, 28);
    display.println("Initializing...");
    display.setCursor(15, 46);
    display.println("silkworm monitor");
    display.display();
    delay(2000);
  }

  delay(2000); // Wait for DHT11 to stabilize
}

void showScreen0(float temp, float humi) {
  display.clearDisplay();

  // Title bar
  display.fillRect(0, 0, 128, 12, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK);
  display.setTextSize(1);
  display.setCursor(28, 2);
  display.print("SilkSphere");

  display.setTextColor(SSD1306_WHITE);

  // Temperature
  display.setTextSize(1);
  display.setCursor(0, 16);
  display.print("Temp:");
  display.setTextSize(2);
  display.setCursor(0, 26);
  display.print(temp, 1);
  display.setTextSize(1);
  display.setCursor(60, 30);
  display.print(" C");

  // Divider
  display.drawLine(70, 14, 70, 54, SSD1306_WHITE);

  // Humidity
  display.setTextSize(1);
  display.setCursor(75, 16);
  display.print("Humi:");
  display.setTextSize(2);
  display.setCursor(75, 26);
  display.print(humi, 1);
  display.setTextSize(1);
  display.setCursor(118, 30);
  display.print("%");

  // Status bar
  display.setCursor(0, 56);
  if (temp >= 24 && temp <= 28 && humi >= 70 && humi <= 85) {
    display.print("Status: OPTIMAL");
  } else {
    display.print("Status: CHECK ENV");
  }

  display.display();
}

void showScreen1(int co2, int light) {
  display.clearDisplay();

  // Title bar
  display.fillRect(0, 0, 128, 12, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK);
  display.setTextSize(1);
  display.setCursor(28, 2);
  display.print("SilkSphere");

  display.setTextColor(SSD1306_WHITE);

  // CO2
  display.setTextSize(1);
  display.setCursor(0, 16);
  display.print("CO2 (ppm):");
  display.setTextSize(2);
  display.setCursor(0, 28);
  display.print(co2);

  // Divider
  display.drawLine(0, 48, 128, 48, SSD1306_WHITE);

  // Light
  display.setTextSize(1);
  display.setCursor(0, 52);
  display.print("Light: ");
  display.print(light);
  display.print("%");

  display.display();
}

void loop() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  int mq135Raw = analogRead(MQ135_PIN);
  int ldrRaw = analogRead(LDR_PIN);

  int co2_ppm = map(mq135Raw, 0, 1023, 400, 2000);
  int light_percent = map(ldrRaw, 0, 1023, 100, 0);

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("ERROR:DHT11_FAILED");

    // Show error on OLED
    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(10, 20);
    display.println("DHT11 Error!");
    display.setCursor(5, 36);
    display.println("Check wiring");
    display.display();

    delay(2000);
    return;
  }

  // Send data over Serial to Python bridge
  Serial.print("DATA:");
  Serial.print(temperature);
  Serial.print(",");
  Serial.print(humidity);
  Serial.print(",");
  Serial.print(co2_ppm);
  Serial.print(",");
  Serial.println(light_percent);

  // Alternate between screens every 3 seconds
  if (screen == 0) {
    showScreen0(temperature, humidity);
    screen = 1;
  } else {
    showScreen1(co2_ppm, light_percent);
    screen = 0;
  }

  delay(3000);
}
