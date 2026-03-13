export class NotificationService {
    static show(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if(!container) return;

        const el = document.createElement('div');
        const colors = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-600' : 'bg-blue-500';

        el.className = `${colors} text-white px-6 py-4 rounded-lg shadow-xl transform transition-all duration-300 translate-x-full opacity-0 flex items-center gap-3 pointer-events-auto min-w-[300px] z-50`;
        el.innerHTML = `<span class="font-medium">${message}</span>`;

        container.appendChild(el);

        requestAnimationFrame(() => el.classList.remove('translate-x-full', 'opacity-0'));
        setTimeout(() => {
            el.classList.add('opacity-0', 'translate-x-full');
            setTimeout(() => el.remove(), 300);
        }, 3000);
    }
}
