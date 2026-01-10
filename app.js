// ==========================================
// CONFIGURACIÓN
// ==========================================
const AIO_USERNAME = "jara03"; 
const AIO_KEY = "aio_VjPF91YBZdz07JS3hQ5QERQYq0jw"; 

const FEED_KEY_TEMP = "temperatura";
const FEED_KEY_HUM = "humedad";
// ==========================================

let chartTemp, chartHum;
let client;

window.onload = function() {
    // 1. Poner la fecha de hoy en el input
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('historyDate').value = today;

    // 2. Iniciar gráficas vacías
    initCharts();

    // 3. Conectar MQTT para datos en vivo
    connectMQTT();

    // 4. Cargar historial del día actual
    loadHistory();
};

// --- A. GESTIÓN DE GRÁFICAS ---
function initCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { 
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: { color: '#666', maxTicksLimit: 12 } // Mostrar horas
            },
            y: { 
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: { color: '#666' } 
            }
        },
        elements: {
            point: { radius: 0, hitRadius: 10 } // Puntos invisibles para que se vea limpio
        }
    };

    // Temperatura (Estilo cálido)
    chartTemp = new Chart(document.getElementById('tempChart'), {
        type: 'line',
        data: { labels: [], datasets: [{ 
            data: [], 
            borderColor: '#e55039', 
            backgroundColor: 'rgba(229, 80, 57, 0.2)', 
            fill: true, tension: 0.4 
        }]},
        options: commonOptions
    });

    // Humedad (Estilo fresco/agua)
    chartHum = new Chart(document.getElementById('humChart'), {
        type: 'line',
        data: { labels: [], datasets: [{ 
            data: [], 
            borderColor: '#3c6382', 
            backgroundColor: 'rgba(60, 99, 130, 0.2)', 
            fill: true, tension: 0.4 
        }]},
        options: commonOptions
    });
}

// --- B. CARGAR HISTORIAL (API REST) ---
async function loadHistory() {
    const dateInput = document.getElementById('historyDate').value;
    if(!dateInput) return alert("Selecciona una fecha");

    // Definir inicio y fin del día seleccionado en UTC
    const startTime = new Date(dateInput + "T00:00:00").toISOString();
    const endTime = new Date(dateInput + "T23:59:59").toISOString();

    console.log(`Cargando datos del ${dateInput}...`);

    // Pedir datos a Adafruit IO API
    await fetchAndPlot(FEED_KEY_TEMP, chartTemp, startTime, endTime);
    await fetchAndPlot(FEED_KEY_HUM, chartHum, startTime, endTime);
}

async function fetchAndPlot(feedKey, chartInstance, start, end) {
    const url = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${feedKey}/data?start_time=${start}&end_time=${end}`;
    
    try {
        const response = await fetch(url, {
            headers: { "X-AIO-Key": AIO_KEY }
        });
        const data = await response.json();

        // Procesar datos (Adafruit los devuelve del más nuevo al más viejo, hay que invertir)
        const labels = [];
        const values = [];

        data.reverse().forEach(point => {
            // Formatear hora: "14:30"
            const date = new Date(point.created_at);
            const timeStr = date.getHours().toString().padStart(2,'0') + ":" + date.getMinutes().toString().padStart(2,'0');
            
            labels.push(timeStr);
            values.push(parseFloat(point.value));
        });

        // Actualizar gráfica
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = values;
        chartInstance.update();

    } catch (error) {
        console.error("Error cargando historial:", error);
    }
}

// --- C. MQTT (TIEMPO REAL) ---
function connectMQTT() {
    const clientID = "clientID-" + parseInt(Math.random() * 100);
    client = new Paho.MQTT.Client("io.adafruit.com", 443, clientID);
    client.onMessageArrived = onMessageArrived;
    client.connect({
        useSSL: true, userName: AIO_USERNAME, password: AIO_KEY,
        onSuccess: () => {
            console.log("MQTT Conectado");
            client.subscribe(`${AIO_USERNAME}/feeds/${FEED_KEY_TEMP}`);
            client.subscribe(`${AIO_USERNAME}/feeds/${FEED_KEY_HUM}`);
        }
    });
}

function onMessageArrived(message) {
    const topic = message.destinationName;
    const payload = message.payloadString;

    if (topic.includes("temperatura")) {
        document.getElementById("temp-value").innerText = payload;
        // Opcional: Agregar el punto a la gráfica actual en tiempo real
        addRealTimeData(chartTemp, payload);
    } 
    else if (topic.includes("humedad")) {
        document.getElementById("hum-value").innerText = payload;
        addRealTimeData(chartHum, payload);
    }
}

function addRealTimeData(chart, val) {
    const now = new Date();
    const timeLabel = now.getHours().toString().padStart(2,'0') + ":" + now.getMinutes().toString().padStart(2,'0');
    
    chart.data.labels.push(timeLabel);
    chart.data.datasets[0].data.push(val);
    chart.update();
}