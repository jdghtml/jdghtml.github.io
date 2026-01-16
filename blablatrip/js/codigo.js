// Datos de ejemplo mezclando viajes y estancias
const mockData = [
    { type: "viaje", from: "Madrid", to: "Barcelona", time: "08:30", info: "6h 20m", price: "32,50", user: "Carlos", rating: 4.8 },
    { type: "estancia", from: "Málaga", to: "Centro Histórico", time: "Check-in 14:00", info: "Hab. Individual", price: "45,00", user: "Elena", rating: 4.9 },
    { type: "viaje", from: "Valencia", to: "Alicante", time: "15:00", info: "1h 50m", price: "8,50", user: "Marcos", rating: 4.5 },
    { type: "estancia", from: "Granada", to: "Vistas Alhambra", time: "Disponibilidad Inmediata", info: "Apartamento entero", price: "65,00", user: "Lucía", rating: 5.0 },
    { type: "viaje", from: "Sevilla", to: "Lisboa", time: "07:45", info: "5h 30m", price: "28,00", user: "Pablo", rating: 4.7 },
    { type: "estancia", from: "Madrid", to: "Barrio Salamanca", time: "Mín. 2 noches", info: "Hab. Doble", price: "35,00", user: "Sofía", rating: 4.6 },
    { type: "viaje", from: "Bilbao", to: "Santander", time: "10:00", info: "1h 30m", price: "6,00", user: "Iker", rating: 4.4 },
    { type: "estancia", from: "Barcelona", to: "Barrio de Gràcia", time: "Check-in 15:00", info: "Loft moderno", price: "55,00", user: "Jordi", rating: 4.7 },
    { type: "viaje", from: "Valencia", to: "Madrid", time: "16:20", info: "3h 50m", price: "21,00", user: "Ana", rating: 4.9 }
];

// Función para renderizar los elementos
function renderItems(items) {
    const container = document.getElementById('ridesContainer');
    container.innerHTML = '';

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = `ride-card type-${item.type}`;
        card.innerHTML = `
            <span class="badge">${item.type}</span>
            <div class="ride-time-line">
                <div class="ride-time-small">${item.time}</div>
                <div class="ride-location">${item.from}</div>
                <div class="ride-info-text">${item.info}</div>
                <div class="ride-location">${item.to}</div>
            </div>
            <div class="ride-info">
                <div class="driver">
                    <div class="driver-img">
                        <img src="https://i.pravatar.cc/40?u=${item.user}" alt="${item.user}">
                    </div>
                    <div>
                        <div class="driver-name">${item.user}</div>
                        <div class="driver-rating">★ ${item.rating}</div>
                    </div>
                </div>
                <div class="price">${item.price} €${item.type === 'estancia' ? '/noche' : ''}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Manejador de búsqueda
function handleSearch() {
    const origin = document.getElementById('origin').value;
    const destination = document.getElementById('destination').value;
    
    if(!origin && !destination) {
        alert("Introduce un destino para encontrar viajes o estancias.");
        return;
    }

    const filtered = mockData.filter(r => 
        r.from.toLowerCase().includes(origin.toLowerCase()) || 
        r.to.toLowerCase().includes(destination.toLowerCase())
    );

    renderItems(filtered.length > 0 ? filtered : mockData);
    document.querySelector('.recent-rides').scrollIntoView({ behavior: 'smooth' });
}

// Inicializar
window.onload = () => {
    renderItems(mockData);
};
