import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { AuthService, StoreService, AdminService, NotificationService } from './services.js';
import { UI } from './ui.js';

const firebaseConfig = {
    apiKey: "", 
    authDomain: "a-coin-fb077.firebaseapp.com",
    projectId: "a-coin-fb077",
    storageBucket: "a-coin-fb077.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

class AppApplication {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
        
        this.authService = new AuthService(this.db);
        this.storeService = new StoreService(this.db);
        this.adminService = new AdminService(this.db);
        
        // Глобальный доступ для onclick событий в HTML
        window.App = this; 
        
        this.currentRoute = 'shop';
        this.currentAdminTargetUser = null; 
        
        this.init();
    }

    async init() {
        this.setupGlobalListeners();
        const isLoggedIn = await this.authService.restoreSession();
        
        if (isLoggedIn) {
            this.showInterface();
        } else {
            document.getElementById('auth-screen').classList.remove('hidden');
        }
    }

    setupGlobalListeners() {
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const u = document.getElementById('login-username').value;
            const p = document.getElementById('login-password').value;
            try {
                await this.authService.login(u, p);
                this.showInterface();
            } catch (err) {
                const el = document.getElementById('auth-error');
                el.textContent = err.message;
                el.classList.remove('hidden');
            }
        });

        const logoutBtn = document.getElementById('logout-btn');
        if(logoutBtn) logoutBtn.addEventListener('click', () => this.authService.logout());

        // Закрытие модального окна по клику на фон
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if(e.target === e.currentTarget) this.closeModal();
        });
    }

    showInterface() {
        const authScreen = document.getElementById('auth-screen');
        authScreen.classList.add('opacity-0');
        setTimeout(() => authScreen.classList.add('hidden'), 500);

        const appInterface = document.getElementById('app-interface');
        appInterface.classList.remove('hidden');
        requestAnimationFrame(() => appInterface.classList.remove('opacity-0'));

        this.updateSidebar();
        this.renderNav();
        this.navigate('shop');
    }

    renderNav() {
        const menuItems = [
            { id: 'shop', icon: 'shopping-bag', label: 'Военторг' },
            { id: 'inventory', icon: 'backpack', label: 'Инвентарь' },
            { id: 'wallet', icon: 'arrow-right-left', label: 'Переводы' },
            { id: 'profile', icon: 'user', label: 'Профиль' }
        ];

        if (this.authService.isAdmin()) {
            menuItems.push({ id: 'admin', icon: 'settings', label: 'Админ', admin: true });
        }

        // Desktop Nav
        const desktopNavHtml = menuItems.map(item => `
            <li>
                <button onclick="App.navigate('${item.id}')" 
                    class="nav-btn w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors font-medium
                    ${this.currentRoute === item.id ? 'bg-[#c1a270] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}">
                    <i data-lucide="${item.icon}" class="w-5 h-5"></i> ${item.label}
                </button>
            </li>
        `).join('');
        document.getElementById('desktop-nav').innerHTML = desktopNavHtml;

        // Mobile Nav (Bottom Bar)
        const mobileNavHtml = menuItems.map(item => `
            <button onclick="App.navigate('${item.id}')" 
                class="flex flex-col items-center justify-center w-full py-1 transition-all duration-200
                ${this.currentRoute === item.id ? 'text-[#c1a270] -translate-y-1' : 'text-gray-400 hover:text-gray-600'}">
                <i data-lucide="${item.icon}" class="w-6 h-6 mb-1 ${this.currentRoute === item.id ? 'fill-current/20' : ''}"></i>
                <span class="text-[10px] font-bold leading-none tracking-wide">${item.label}</span>
            </button>
        `).join('');
        document.getElementById('mobile-nav').innerHTML = mobileNavHtml;

        lucide.createIcons();
    }

    updateSidebar() {
        const user = this.authService.currentUser;
        if(user) {
            const balanceText = user.balance.toFixed(0);
            document.getElementById('sidebar-balance').textContent = balanceText;
            
            const mobBal = document.getElementById('mobile-balance');
            if(mobBal) mobBal.textContent = balanceText;
        }
    }

    async navigate(route) {
        this.currentRoute = route;
        this.renderNav(); // Перерисовываем меню для обновления активного класса
        
        const container = document.getElementById('content-area');
        UI.showLoader('content-area');
        
        // Скролл вверх при навигации
        document.getElementById('content-scroll-wrapper').scrollTop = 0;

        try {
            let html = '';
            
            if (route === 'profile') {
                // Логика для страницы Профиля
                const user = this.authService.currentUser;
                html = UI.renderUserProfile(user);

            } else if (route === 'shop') {
                const items = await this.storeService.getItems();
                html = `<h2 class="text-2xl font-bold mb-6 text-gray-800">Военторг</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-20 md:pb-0">
                            ${items.map(i => UI.renderItem(i, 'App.handleBuy')).join('')}
                        </div>`;
            
            } else if (route === 'inventory') {
                const inv = this.authService.currentUser.inventory || [];
                html = `<h2 class="text-2xl font-bold mb-6 text-gray-800">Личный Инвентарь</h2>
                        <div class="space-y-3 pb-20 md:pb-0">
                            ${inv.length ? inv.map((item, idx) => UI.renderInventoryItem(item, idx)).join('') : '<div class="text-center py-10 bg-white rounded-xl shadow-sm"><p class="text-gray-400">Рюкзак пуст</p></div>'}
                        </div>`;
            
            } else if (route === 'wallet') {
                html = `
                    <div class="max-w-md mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg mt-4 md:mt-10">
                        <h2 class="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                            <i data-lucide="arrow-right-left" class="text-[#c1a270]"></i> Перевод средств
                        </h2>
                        <div class="space-y-5">
                            <div>
                                <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Кому (Позывной)</label>
                                <input type="text" id="t-user" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c1a270] outline-none transition" placeholder="Например: Маг">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Сумма (A)</label>
                                <input type="number" id="t-amount" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c1a270] outline-none transition" placeholder="0">
                            </div>
                            <button onclick="App.handleTransfer()" class="w-full bg-[#c1a270] text-white py-4 rounded-lg font-bold hover:bg-[#a68a5a] shadow-lg transition-transform active:scale-95 text-lg">
                                Отправить
                            </button>
                        </div>
                    </div>`;
            
            } else if (route === 'admin') {
                if (!this.authService.isAdmin()) throw new Error("Access Denied");
                
                const [users, items] = await Promise.all([
                    this.adminService.getAllUsers(),
                    this.storeService.getItems()
                ]);
                
                html = UI.renderAdminDashboard(users, items);
            }

            container.innerHTML = html;
            lucide.createIcons();
        } catch (e) {
            console.error(e);
            NotificationService.show("Ошибка: " + e.message, "error");
        }
    }

    // --- USER ACTIONS ---

    async handleBuy(id, price) {
        if(!confirm(`Купить предмет за ${price} A?`)) return;
        try {
            const items = await this.storeService.getItems();
            const item = items.find(i => i.id === id);
            await this.storeService.buyItem(this.authService.currentUser.id, item);
            this.updateSidebar(); 
            NotificationService.show(`Приобретено: ${item.name}`, 'success');
        } catch (e) {
            NotificationService.show(e.message || e, 'error');
        }
    }

    async handleTransfer() {
        const user = document.getElementById('t-user').value;
        const amount = document.getElementById('t-amount').value;
        
        if(!user || !amount) {
             NotificationService.show('Заполните все поля', 'error');
             return;
        }

        try {
            await this.storeService.transfer(this.authService.currentUser.id, user, amount);
            this.updateSidebar(); 
            NotificationService.show(`Перевод ${amount} A бойцу ${user} выполнен`, 'success');
            document.getElementById('t-user').value = '';
            document.getElementById('t-amount').value = '';
        } catch (e) {
            NotificationService.show(e.message || e, 'error');
        }
    }

    // --- ADMIN ACTIONS ---
    
    handleUserSearch(query) {
        const term = query.toLowerCase();
        const rows = document.querySelectorAll('.user-row');
        rows.forEach(row => {
            const username = row.dataset.username || "";
            if (username.includes(term)) {
                row.classList.remove('hidden');
                row.classList.add('flex');
            } else {
                row.classList.add('hidden');
                row.classList.remove('flex');
            }
        });
    }

    async handleDeduct() {
        if(!confirm('Списать средства?')) return;
        try {
            await this.adminService.deductBalance(
                document.getElementById('d-user').value,
                document.getElementById('d-amount').value
            );
            NotificationService.show('Средства списаны', 'success');
            this.navigate('admin');
        } catch(e) { NotificationService.show(e.message, 'error'); }
    }

    async handleCreateItem(e) {
        e.preventDefault();
        const f = e.target;
        try {
            await this.adminService.addItem({
                name: f.name.value,
                type: f.type.value,
                price: parseFloat(f.price.value),
                description: f.desc.value,
                imageUrl: f.imageUrl.value
            });
            NotificationService.show('Товар добавлен', 'success');
            this.navigate('admin');
        } catch(err) { NotificationService.show(err.message, 'error'); }
    }

    async handleDeleteItem(id) {
        if(!confirm('Удалить товар навсегда?')) return;
        try {
            await this.adminService.deleteItem(id);
            NotificationService.show('Товар удален', 'success');
            this.navigate('admin');
        } catch(err) { NotificationService.show(err.message, 'error'); }
    }

    async handleCreateUser(e) {
        e.preventDefault();
        const f = e.target;
        try {
            await this.adminService.createUser({
                username: f.username.value,
                password: f.password.value,
                balance: f.balance.value,
                position: f.position.value,
                unit: f.unit.value,
                certificate: f.certificate.value,
                notes: f.notes.value
            });
            NotificationService.show('Боец добавлен', 'success');
            this.navigate('admin');
        } catch(err) { NotificationService.show(err.message, 'error'); }
    }
    
    async handleImportSquad() {
        if(!confirm("Вы уверены? Это добавит около 30 пользователей из таблицы в базу данных.")) return;
        
        NotificationService.show("Начинаем импорт...", "info");
        try {
            const result = await this.adminService.importSquadData();
            NotificationService.show(`Импорт завершен. Добавлено: ${result.count}, Ошибок: ${result.errors}`, "success");
            this.navigate('admin');
        } catch(e) {
            NotificationService.show("Ошибка импорта: " + e.message, "error");
        }
    }

    // --- ADMIN INVENTORY MODAL ---

    async handleOpenAdminInventory(userId) {
        this.currentAdminTargetUser = userId;
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('hidden');
        overlay.innerHTML = '<div class="loader"></div>';
        
        try {
            const data = await this.adminService.getUserInventory(userId);
            this.renderModalContent(data);
        } catch(e) {
            this.closeModal();
            NotificationService.show("Ошибка загрузки инвентаря", "error");
        }
    }

    renderModalContent(data) {
        let invHtml = '';
        if (data.inventory.length === 0) {
            invHtml = '<div class="flex flex-col items-center justify-center h-40 text-gray-400"><i data-lucide="backpack" class="w-10 h-10 mb-2 opacity-50"></i><p>Инвентарь пуст</p></div>';
        } else {
            invHtml = data.inventory.map((item, idx) => UI.renderInventoryItem(item, idx, true)).join('');
        }

        const overlay = document.getElementById('modal-overlay');
        overlay.innerHTML = UI.renderAdminModal(data.username, invHtml);
        lucide.createIcons();
        document.getElementById('close-modal-btn').onclick = () => this.closeModal();
    }

    async handleDeleteUserItem(index) {
        if(!confirm('Изъять этот предмет у бойца?')) return;
        try {
            const newInv = await this.adminService.removeUserItem(this.currentAdminTargetUser, index);
            const data = await this.adminService.getUserInventory(this.currentAdminTargetUser);
            this.renderModalContent(data);
            NotificationService.show('Предмет изъят', 'success');
        } catch(e) {
            NotificationService.show(e.message, 'error');
        }
    }

    closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        this.currentAdminTargetUser = null;
    }
}

new AppApplication();