document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    if (!token || !usuario || usuario.rol !== 'RRHH') {
        window.location.href = 'login.html';
        return;
    }

    const lista = document.querySelector('.lista-informacion');
    const buscador = document.querySelector('.form input');

    async function cargarTodo() {
        const res = await fetch('/api/pases/ver', { headers: { 'x-token': token } });
        const data = await res.json();
        if (data.ok) {
            renderizar(data.data);
        }
    }

    function renderizar(pases) {
        lista.innerHTML = "";
        pases.forEach(p => {
            const li = document.createElement('li');
            li.className = p.estado === 'Aprobado' ? 'item-aprobado' : p.estado === 'Pendiente' ? 'item-pendiente' : 'item-rechazado';
            li.textContent = `${p.fecha_uso} - Motivo: ${p.motivo} (${p.estado})`;
            lista.appendChild(li);
        });
    }

    buscador.addEventListener('input', (e) => {
        const busqueda = e.target.value.toLowerCase();
        const items = lista.querySelectorAll('li');
        items.forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(busqueda) ? 'block' : 'none';
        });
    });

    cargarTodo();
});