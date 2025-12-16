// ==========================================
// CONFIGURACIÓN (¡PON TUS DATOS AQUÍ!)
// ==========================================
const AIO_USERNAME = "jara03"; 
const AIO_KEY = "aio_vlIF47ZwKYfQfF18ZhAlTcPpXQUd";           

const FEED_TEMP = AIO_USERNAME + "/feeds/temperatura";
const FEED_HUM = AIO_USERNAME + "/feeds/humedad";
// ==========================================

// Variables para las dos gráficas
let chartTemp;
let chartHum;

// Inicializar
window.onload = function() {
    initCharts();
    connectMQTT();
};

// 1. Configuración de las DOS Gráficas
function initCharts() {
    // --- Configuración Gráfica Temperatura (Roja) ---
    const ctxTemp = document.getElementById('tempChart').getContext('2d');
    chartTemp = new Chart(ctxTemp, {
        type: 'line',
        data: {
            labels: [], // Se llenará con las horas
            datasets: [{
                label: 'Temperatura (°C)',
                data: [],
                borderColor: '#ff6b6b', // Rojo
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#a0a0a0' }, grid: { color: '#333' } },
                y: { ticks: { color: '#ff6b6b' }, grid: { color: '#333' } }
            },
            plugins: { legend: { display: false } } // Ocultamos leyenda para limpiar
        }
    });

    // --- Configuración Gráfica Humedad (Azul/Verde) ---
    const ctxHum = document.getElementById('humChart').getContext('2d');
    chartHum = new Chart(ctxHum, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Humedad (%)',
                data: [],
                borderColor: '#4ecdc4', // Turquesa
                backgroundColor: 'rgba(78, 205, 196, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#a0a0a0' }, grid: { color: '#333' } },
                y: { ticks: { color: '#4ecdc4' }, grid: { color: '#333' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// 2. Conexión MQTT (Igual que antes)
function connectMQTT() {
    console.log("Conectando a Adafruit IO...");
    let clientID = "clientID-" + parseInt(Math.random() * 100);
    client = new Paho.MQTT.Client("io.adafruit.com", 443, clientID);

    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    let options = {
        useSSL: true,
        userName: AIO_USERNAME,
        password: AIO_KEY,
        onSuccess: onConnect,
        onFailure: doFail
    }
    client.connect(options);
}

function onConnect() {
    console.log("¡Conectado!");
    client.subscribe(FEED_TEMP);
    client.subscribe(FEED_HUM);
}

function doFail(e){ console.log("Fallo conexión", e); }
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) console.log("Conexión perdida: " + responseObject.errorMessage);
}

// 3. Recibir datos y actualizar la gráfica correcta
function onMessageArrived(message) {
    let topic = message.destinationName;
    let payload = message.payloadString;
    
    // Crear la etiqueta de hora
    let now = new Date();
    let timeLabel = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0') + ":" + now.getSeconds().toString().padStart(2, '0');

    if (topic === FEED_TEMP) {
        document.getElementById("temp-value").innerText = payload;
        // Actualizamos SOLO la gráfica de temperatura
        updateSpecificChart(chartTemp, timeLabel, payload);
    }
    else if (topic === FEED_HUM) {
        document.getElementById("hum-value").innerText = payload;
        // Actualizamos SOLO la gráfica de humedad
        updateSpecificChart(chartHum, timeLabel, payload);
    }
}

// Función auxiliar simplificada para actualizar cualquier gráfica
function updateSpecificChart(chartInstance, label, dataPoint) {
    // Agregar datos
    chartInstance.data.labels.push(label);
    chartInstance.data.datasets[0].data.push(dataPoint);

    // Mantener solo los últimos 20 puntos para que no se sature
    if (chartInstance.data.labels.length > 20) {
        chartInstance.data.labels.shift();
        chartInstance.data.datasets[0].data.shift();
    }

    chartInstance.update();
}