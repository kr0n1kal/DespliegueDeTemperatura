const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const five = require('johnny-five');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server);
const port = 8081;

app.get('/', (req, res) => {
  res.sendFile('C:/Users/jalop/node_modules/johnny-five/main.html');
});

const board = new five.Board({ port: 'COM7', repl: false });

board.on('ready', () => {
  console.log('Placa Arduino Uno lista');

  // Inicializar LED en Pin 13 y LCD
  const led = new five.Led(13);
  const lcd = new five.LCD({ pins: [7, 8, 9, 10, 11, 12] });

  let modoLCD = 'LM35';
  let ultimaTempESP32 = null;

  lcd.clear().cursor(0, 0).print("Sistema Listo");

  // 1. SENSOR LM35
  const lm35 = new five.Thermometer({ controller: "LM35", pin: "A0", freq: 1000 });
  lm35.on("data", function() {
    const temp = this.celsius;
    io.emit('datos_lm35', temp);

    if (modoLCD === 'LM35') {
      lcd.clear().cursor(0, 0).print("Sensor LM35:");
      lcd.cursor(1, 0).print(`${temp.toFixed(1)} C`);
    }
  });

  // 2. SENSOR LM75
  board.i2cConfig();
  const LM75_ADDRESS = 0x48;
  const TEMP_REGISTER = 0x00;

  board.i2cRead(LM75_ADDRESS, TEMP_REGISTER, 2, (bytes) => {
    let raw = (bytes[0] << 8) | bytes[1];
    let temp = (raw >> 5) * 0.125;
    io.emit('datos_lm75', temp);

    if (modoLCD === 'LM75') {
      lcd.clear().cursor(0, 0).print("Sensor LM75:");
      lcd.cursor(1, 0).print(`${temp.toFixed(1)} C`);
    }
  });

  // 3. RECEPCIÓN HTTP POST DESDE ESP32
  app.post('/api/esp32', (req, res) => {
    const { temperatura } = req.body;
    if (temperatura !== undefined) {
      ultimaTempESP32 = parseFloat(temperatura);
      io.emit('datos_esp32', ultimaTempESP32);

      if (modoLCD === 'ESP32') {
        lcd.clear().cursor(0, 0).print("Nodo ESP32:");
        lcd.cursor(1, 0).print(`${ultimaTempESP32.toFixed(1)} C`);
      }

      res.status(200).json({ status: 'ok' });
    } else {
      res.status(400).json({ error: 'Falta el parametro temperatura' });
    }
  });

  // 4. WEBSOCKETS (Comandos desde la web)
  io.on('connection', (socket) => {
    console.log('Cliente web conectado');

    socket.on('encender', () => {
      led.on();
      console.log('LED encendido');
    });

    socket.on('apagar', () => {
      led.off();
      console.log('LED apagado');
    });

    socket.on('modo_lcd', (modo) => {
      modoLCD = modo;
      console.log(`LCD configurado en modo: ${modo}`);
    });

    socket.on('mensaje', (texto) => {
      modoLCD = 'MENSAJE';
      lcd.clear().cursor(0, 0).print(texto.substring(0, 16));
      if (texto.length > 16) {
        lcd.cursor(1, 0).print(texto.substring(16, 32));
      }
    });
  });
});

server.listen(port, () => {
  console.log(`Servidor en ejecución en http://localhost:${port}`);
});