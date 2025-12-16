import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { AuthService, StoreService, AdminService, NotificationService, LogsService } from './services.js';
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
        this.logsService = new LogsService(this.db); // Инициализация сервиса логов
        
        this.currentRoute = 'shop';
        this.currentAdminTargetUser = null; 
        this.shopItems = []; 
        this.logs = []; // Кэш логов
        this.logsFilterUser = null; // Текущий фильтр по юзеру
        
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
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const data = target.dataset; 

            // Навигация
            if (action === 'navigate') this.navigate(data.route);
            
            // Пользователь
            if (action === 'buy') this.handleBuy(data.id, data.price);
            if (action === 'transfer') this.handleTransfer();
            if (action === 'logout') this.authService.logout();
            
            // НОВОЕ: Просмотр товара
            if (action === 'view-details') this.handleViewDetails(data.id);
            
            // Админ
            if (action === 'deduct') this.handleDeduct();
            if (action === 'delete-item') this.handleDeleteItem(data.id);
            if (action === 'manage-user') this.handleManageUser(data.id); 
            if (action === 'delete-user-item') this.handleDeleteUserItem(data.index);
            if (action === 'import-squad') this.handleImportSquad();
            
            // ЛОГИ
            if (action === 'filter-logs-user') this.handleFilterLogs(data.username);
            if (action === 'reset-logs') this.handleResetLogs();

            // UI Модалки
            if (action === 'close-modal') this.closeModal();
            if (action === 'toggle-grant-form') {
                document.getElementById('grant-item-form').classList.toggle('hidden');
            }
            // Закрытие по клику на фон
            if (action === 'modal-overlay') { 
                if(e.target === target) this.closeModal();
            }
        });

        document.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            
            if (form.id === 'login-form') {
                await this.handleLogin();
                return;
            }

            const action = form.dataset.action;
            if (action === 'create-item') await this.handleCreateItem(form);
            if (action === 'create-user') await this.handleCreateUser(form);
            
            if (action === 'save-user-profile') await this.handleSaveUserProfile(form);
            if (action === 'grant-item') await this.handleGrantItem(form);
        });

        document.addEventListener('input', (e) => {
            if (e.target.dataset.action === 'search-user') {
                this.handleUserSearch(e.target.value);
            }
            if (e.target.id === 'logs-search') {
                this.handleLogsSearch(e.target.value);
            }
        });
    }

    // --- ЛОГИКА ---

    async handleLogin() {
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
            { id: 'profile', icon: 'user', label: 'Профиль' },
        ];

        if (this.authService.isAdmin()) {
            menuItems.push({ id: 'admin', icon: 'settings', label: 'Админ', admin: true });
            menuItems.push({ id: 'logs', icon: 'clipboard-list', label: 'Логи', admin: true }); // Добавлен пункт меню
        }

        document.getElementById('desktop-nav').innerHTML = menuItems.map(item => `
            <li>
                <button data-action="navigate" data-route="${item.id}" 
                    class="nav-btn w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors font-medium
                    ${this.currentRoute === item.id ? 'bg-[#c1a270] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}">
                    <i data-lucide="${item.icon}" class="w-5 h-5"></i> ${item.label}
                </button>
            </li>
        `).join('');

        document.getElementById('mobile-nav').innerHTML = menuItems.map(item => `
            <button data-action="navigate" data-route="${item.id}"
                class="flex flex-col items-center justify-center w-full py-1 transition-all duration-200
                ${this.currentRoute === item.id ? 'text-[#c1a270] -translate-y-1' : 'text-gray-400 hover:text-gray-600'}">
                <i data-lucide="${item.icon}" class="w-6 h-6 mb-1 ${this.currentRoute === item.id ? 'fill-current/20' : ''}"></i>
                <span class="text-[10px] font-bold leading-none tracking-wide">${item.label}</span>
            </button>
        `).join('');

        lucide.createIcons();
    }

    updateSidebar() {
        const user = this.authService.currentUser;
        if(user) {
            const balanceText = user.balance.toFixed(0);
            const sb = document.getElementById('sidebar-balance');
            if(sb) sb.textContent = balanceText;
            
            const mobBal = document.getElementById('mobile-balance');
            if(mobBal) mobBal.textContent = balanceText;
        }
    }

    async navigate(route) {
        this.currentRoute = route;
        this.renderNav();
        
        const container = document.getElementById('content-area');
        UI.showLoader('content-area');
        document.getElementById('content-scroll-wrapper').scrollTop = 0;

        try {
            let html = '';
            
            if (route === 'profile') {
                html = UI.renderUserProfile(this.authService.currentUser);

            } else if (route === 'shop') {
                this.shopItems = await this.storeService.getItems();
                html = `<h2 class="text-2xl font-bold mb-6 text-gray-800">Военторг</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-20 md:pb-0">
                            ${this.shopItems.map(i => UI.renderItem(i)).join('')}
                        </div>`;
            
            } else if (route === 'inventory') {
                const inv = this.authService.currentUser.inventory || [];
                html = `<h2 class="text-2xl font-bold mb-6 text-gray-800">Личный Инвентарь</h2>
                        <div class="space-y-3 pb-20 md:pb-0">
                            ${inv.length ? inv.map((item, idx) => UI.renderInventoryItem(item, idx)).join('') : '<div class="text-center py-10 bg-white rounded-xl shadow-sm"><p class="text-gray-400">Рюкзак пуст</p></div>'}
                        </div>`;
            
            } else if (route === 'wallet') {
                html = UI.renderWallet();
            
            } else if (route === 'admin') {
                if (!this.authService.isAdmin()) throw new Error("Access Denied");
                
                const [users, items] = await Promise.all([
                    this.adminService.getAllUsers(),
                    this.storeService.getItems()
                ]);
                html = UI.renderAdminDashboard(users, items);
            } else if (route === 'logs') {
                if (!this.authService.isAdmin()) throw new Error("Access Denied");
                
                // Сбрасываем фильтр при первом заходе
                if (!this.logsFilterUser) this.logsFilterUser = null; 
                
                this.logs = await this.logsService.getAllLogs();
                html = UI.renderLogs(this.logs, this.logsFilterUser);
            }

            container.innerHTML = html;
            lucide.createIcons();
        } catch (e) {
            console.error(e);
            NotificationService.show("Ошибка: " + e.message, "error");
        }
    }

    // --- USER ACTIONS ---

    handleViewDetails(id) {
        const item = this.shopItems.find(i => i.id === id);
        if (!item) return;

        const overlay = document.getElementById('modal-overlay');
        overlay.dataset.action = "modal-overlay";
        overlay.innerHTML = UI.renderProductDetailsModal(item);
        overlay.classList.remove('hidden');
        lucide.createIcons();
    }

    async handleBuy(id, price) {
        if(!confirm(`Купить предмет за ${price} A?`)) return;
        try {
            const items = await this.storeService.getItems();
            const item = items.find(i => i.id === id);
            const user = this.authService.currentUser;

            await this.storeService.buyItem(user.id, id); 
            
            // ЛОГИРОВАНИЕ ПОКУПКИ
            await this.logsService.addLog({
                type: 'purchase',
                username: user.username,
                itemName: item.name,
                price: parseFloat(price)
            });

            this.updateSidebar(); 
            this.closeModal();
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
            
            // ЛОГИРОВАНИЕ ПЕРЕВОДА (Опционально, но полезно)
            await this.logsService.addLog({
                type: 'transfer',
                username: this.authService.currentUser.username,
                itemName: `Перевод пользователю ${user}`,
                price: parseFloat(amount)
            });

            this.updateSidebar(); 
            NotificationService.show(`Перевод ${amount} A бойцу ${user} выполнен`, 'success');
            document.getElementById('t-user').value = '';
            document.getElementById('t-amount').value = '';
        } catch (e) {
            NotificationService.show(e.message || e, 'error');
        }
    }

    // --- LOGS ACTIONS ---
    
    handleFilterLogs(username) {
        this.logsFilterUser = username;
        this.renderLogsView();
    }

    handleResetLogs() {
        this.logsFilterUser = null;
        this.renderLogsView();
    }

    handleLogsSearch(query) {
        // Живой поиск в таблице логов
        const term = query.toLowerCase();
        const rows = document.querySelectorAll('#logs-table-body tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            if (text.includes(term)) {
                row.classList.remove('hidden');
            } else {
                row.classList.add('hidden');
            }
        });
    }

    renderLogsView() {
        // Перерисовка контента логов без полной перезагрузки
        const container = document.getElementById('content-area');
        container.innerHTML = UI.renderLogs(this.logs, this.logsFilterUser);
        lucide.createIcons();
    }

    // --- ADMIN ACTIONS ---
    
    handleUserSearch(query) {
        if (!this.authService.isAdmin()) return;
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
        if (!this.authService.isAdmin()) return;
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

    async handleCreateItem(form) {
        if (!this.authService.isAdmin()) return;
        const f = form;
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
        if (!this.authService.isAdmin()) return;
        if(!confirm('Удалить товар навсегда?')) return;
        try {
            await this.adminService.deleteItem(id);
            NotificationService.show('Товар удален', 'success');
            this.navigate('admin');
        } catch(err) { NotificationService.show(err.message, 'error'); }
    }

    async handleCreateUser(form) {
        if (!this.authService.isAdmin()) return;
        const f = form;
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
        if (!this.authService.isAdmin()) return;
        if(!confirm("Вы уверены?")) return;
        try {
            const result = await this.adminService.importSquadData();
            NotificationService.show(`Импорт: ${result.count}`, "success");
            this.navigate('admin');
        } catch(e) {
            NotificationService.show("Ошибка: " + e.message, "error");
        }
    }

    // --- ADMIN USER MANAGEMENT & MODAL ---

    async handleManageUser(userId) {
        if (!this.authService.isAdmin()) return;

        this.currentAdminTargetUser = userId;
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('hidden');
        overlay.innerHTML = '<div class="loader"></div>';
        
        try {
            const [userData, shopItems] = await Promise.all([
                this.adminService.getUserData(userId),
                this.storeService.getItems()
            ]);
            
            this.renderModalContent(userData, shopItems);
        } catch(e) {
            this.closeModal();
            NotificationService.show("Ошибка загрузки данных", "error");
            console.error(e);
        }
    }

    renderModalContent(userData, shopItems) {
        const overlay = document.getElementById('modal-overlay');
        overlay.dataset.action = "modal-overlay"; 
        overlay.innerHTML = UI.renderAdminModal(userData, shopItems);
        lucide.createIcons();
    }

    async handleSaveUserProfile(form) {
        if (!this.authService.isAdmin()) return;
        const userId = form.dataset.id;
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            await this.adminService.updateUser(userId, data);
            NotificationService.show("Профиль обновлен", "success");
            
            this.navigate('admin');
            this.handleManageUser(userId);
        } catch (e) {
            NotificationService.show(e.message, "error");
        }
    }

    async handleGrantItem(form) {
        if (!this.authService.isAdmin()) return;
        const userId = form.dataset.userid;
        
        const shopItemJson = form.shopItemData.value;
        const customName = form.customName.value;

        let itemData = null;

        if (shopItemJson) {
            itemData = JSON.parse(shopItemJson);
        } else if (customName) {
            itemData = {
                name: customName,
                type: form.customType.value || 'acc',
                description: form.customDesc.value || '',
                imageUrl: form.customImage.value || null, 
                price: 0 
            };
        } else {
            NotificationService.show("Выберите предмет или заполните данные", "error");
            return;
        }

        try {
            // Получаем данные пользователя для лога
            const targetUser = await this.adminService.getUserData(userId);

            await this.adminService.grantItemToUser(userId, itemData);
            
            // ЛОГИРОВАНИЕ ВЫДАЧИ
            await this.logsService.addLog({
                type: 'admin_grant',
                username: targetUser.username,
                itemName: `Выдан админом: ${itemData.name}`,
                price: itemData.price || 0
            });

            NotificationService.show(`Предмет "${itemData.name}" выдан`, "success");
            this.handleManageUser(userId);
        } catch (e) {
            NotificationService.show(e.message, "error");
        }
    }

    async handleDeleteUserItem(index) {
        if (!this.authService.isAdmin()) return;
        if(!confirm('Изъять этот предмет у бойца?')) return;
        try {
            // Сначала получаем информацию о юзере и предмете
            const targetUser = await this.adminService.getUserData(this.currentAdminTargetUser);
            
            // Удаляем и получаем удаленный предмет обратно
            const { removedItem } = await this.adminService.removeUserItem(this.currentAdminTargetUser, index);
            
            if(removedItem) {
                // ЛОГИРОВАНИЕ УДАЛЕНИЯ
                await this.logsService.addLog({
                    type: 'admin_revoke',
                    username: targetUser.username,
                    itemName: `Изъят админом: ${removedItem.name}`,
                    price: 0
                });
            }

            this.handleManageUser(this.currentAdminTargetUser); 
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