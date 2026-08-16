const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwJz3WCu8C3K-kl9UOThEWztFWv8FhKSAFNQg4InATPOpxHkYr_WnUfeOBCsz8iyh0/exec';
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const TIPOS = {
    'Comida': { color: '#FF6B6B', emoji: '🍔' },
    'Transporte': { color: '#4ECDC4', emoji: '🚌' },
    'Ocio': { color: '#A78BFA', emoji: '🎮' },
    'Mascotas': { color: '#F59E0B', emoji: '🐱' },
    'Salud': { color: '#34D399', emoji: '💊' },
    'Personal': { color: '#F472B6', emoji: '👗' },
    'Regalos': { color: '#60A5FA', emoji: '🎁' },
    'Otros': { color: '#94A3B8', emoji: '💸' },
};
const AHORRO_COLORS = ['#4CAF50', '#2196F3', '#FF5722', '#9C27B0'];

const now = new Date();
let mesActual = MESES[Math.min(now.getMonth() + 1, 11)];
let mesBloque = mesActual; // mes del bloque que se muestra en Control/Ingresos
let gastos = [],
    sobrasteBase = 0,
    donutChart = null,
    modalTipo = 'deuda';