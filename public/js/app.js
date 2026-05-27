import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { AuthService, StoreService, AdminService, NotificationService, LogsService, StorageService } from './services/index.js';
import { UI } from './ui.js';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBQbeYu7QMrm2C5tQNehzlFaIK1iMm6ZfI",
  authDomain: "a-coin-fb077.firebaseapp.com",
  databaseURL: "https://a-coin-fb077-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "a-coin-fb077",
  storageBucket: "a-coin-fb077.firebasestorage.app",
  messagingSenderId: "190102987448",
  appId: "1:190102987448:web:f7c363053d732817baca4d",
  measurementId: "G-F1QSGEK6N5"
};

class AppApplication {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.db = initializeFirestore(this.app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
        this.auth = getAuth(this.app);

        this.authService = new AuthService(this.db, this.auth);
        this.storeService = new StoreService(this.db);
        this.adminService = new AdminService(this.db);
        this.logsService = new LogsService(this.db);
        this.storageService = new StorageService();
        
        this.currentRoute = 'shop';
        this.currentAdminTargetUser = null;
        this.shopItems = [];
        this.walletUsernames = null;
        this.adminUsers = null;
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
            // Dropdown типов магазина (кнопка без data-action)
            if (e.target.closest('#shop-type-toggle')) {
                const dd = document.getElementById('shop-type-dropdown');
                if (dd) dd.classList.toggle('hidden');
                return;
            }

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
            if (action === 'edit-item') this.handleEditItem(data.id);
            if (action === 'manage-user') this.handleManageUser(data.id); 
            if (action === 'delete-user-item') this.handleDeleteUserItem(data.index);
            if (action === 'import-squad') this.handleImportSquad();
            if (action === 'export-credentials') this.handleExportCredentials();
            
            // ЛОГИ
            if (action === 'filter-shop-type') this.handleShopTypeFilter(data.type);
            if (action === 'reset-shop-filters') this.resetShopFilters();
            if (action === 'filter-logs-user') this.handleFilterLogs(data.username);
            if (action === 'reset-logs') this.handleResetLogs();

            // Галерея
            if (action === 'switch-image') {
                const mainImg = document.getElementById('modal-main-img');
                if (mainImg) {
                    mainImg.src = data.src;
                    target.closest('.flex').querySelectorAll('img').forEach(t => {
                        t.classList.remove('border-[#c1a270]');
                        t.classList.add('border-transparent', 'opacity-60');
                    });
                    target.classList.add('border-[#c1a270]');
                    target.classList.remove('border-transparent', 'opacity-60');
                }
            }

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
            if (action === 'update-item') await this.handleSaveItem(form);
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
            if (e.target.id === 'shop-search') {
                this.shopFilterSearch = e.target.value;
                this.applyShopFilters();
            }
            if (e.target.id === 'shop-price-min') {
                this.shopFilterPriceMin = e.target.value;
                this.applyShopFilters();
            }
            if (e.target.id === 'shop-price-max') {
                this.shopFilterPriceMax = e.target.value;
                this.applyShopFilters();
            }
        });

        // Закрытие dropdown типов при клике вне
        document.addEventListener('click', (e) => {
            const dd = document.getElementById('shop-type-dropdown');
            if (dd && !dd.classList.contains('hidden') && !e.target.closest('#shop-type-toggle') && !e.target.closest('#shop-type-dropdown')) {
                dd.classList.add('hidden');
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
                if (!this.shopItems.length) {
                    this.shopItems = await this.storeService.getItems();
                }
                this.shopFilterType = 'all';
                this.shopFilterSearch = '';
                this.shopFilterPriceMin = '';
                this.shopFilterPriceMax = '';
                const types = [...new Set(this.shopItems.map(i => i.type).filter(Boolean))].sort();
                html = `<h2 class="text-2xl font-bold mb-6 text-gray-800">Военторг</h2>
                        ${UI.renderShopFilters(types, 'all', '', '', '')}
                        <div id="shop-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-20 md:pb-0">
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
                if (!this.walletUsernames) {
                    this.walletUsernames = await this.storeService.getUsernamesFromMeta(
                        this.authService.currentUser.username
                    );
                }

            } else if (route === 'admin') {
                if (!this.authService.isAdmin()) throw new Error("Access Denied");

                if (!this.shopItems.length) {
                    this.shopItems = await this.storeService.getItems();
                }
                if (!this.adminUsers) {
                    this.adminUsers = await this.adminService.getAllUsers();
                }
                html = UI.renderAdminDashboard(this.adminUsers, this.shopItems);
            } else if (route === 'logs') {
                if (!this.authService.isAdmin()) throw new Error("Access Denied");
                
                // Сбрасываем фильтр при первом заходе
                if (!this.logsFilterUser) this.logsFilterUser = null; 
                
                this.logs = await this.logsService.getAllLogs();
                html = UI.renderLogs(this.logs, this.logsFilterUser);
            }

            container.innerHTML = html;
            lucide.createIcons();

            if (route === 'wallet') this.setupWalletDropdown();
        } catch (e) {
            console.error(e);
            NotificationService.show("Ошибка: " + e.message, "error");
        }
    }

    // --- USER ACTIONS ---

    handleShopTypeFilter(type) {
        this.shopFilterType = type;
        // Закрыть dropdown
        const dd = document.getElementById('shop-type-dropdown');
        if (dd) dd.classList.add('hidden');
        this.applyShopFilters(true);
    }

    resetShopFilters() {
        this.shopFilterType = 'all';
        this.shopFilterSearch = '';
        this.shopFilterPriceMin = '';
        this.shopFilterPriceMax = '';
        this.applyShopFilters(true);
    }

    applyShopFilters(rebuildToolbar = false) {
        let filtered = this.shopItems;

        if (this.shopFilterType && this.shopFilterType !== 'all') {
            filtered = filtered.filter(i => i.type === this.shopFilterType);
        }
        if (this.shopFilterSearch) {
            const term = this.shopFilterSearch.toLowerCase();
            filtered = filtered.filter(i => (i.name || '').toLowerCase().includes(term));
        }
        if (this.shopFilterPriceMin !== '' && this.shopFilterPriceMin !== undefined) {
            const min = parseFloat(this.shopFilterPriceMin);
            if (!isNaN(min)) filtered = filtered.filter(i => i.price >= min);
        }
        if (this.shopFilterPriceMax !== '' && this.shopFilterPriceMax !== undefined) {
            const max = parseFloat(this.shopFilterPriceMax);
            if (!isNaN(max)) filtered = filtered.filter(i => i.price <= max);
        }

        const grid = document.getElementById('shop-grid');
        if (grid) {
            grid.innerHTML = filtered.length
                ? filtered.map(i => UI.renderItem(i)).join('')
                : '<div class="col-span-full text-center py-10 bg-white rounded-xl shadow-sm"><p class="text-gray-400">Товары не найдены</p></div>';
        }

        if (rebuildToolbar) {
            const types = [...new Set(this.shopItems.map(i => i.type).filter(Boolean))].sort();
            const filtersEl = document.getElementById('shop-filters');
            if (filtersEl) {
                filtersEl.outerHTML = UI.renderShopFilters(types, this.shopFilterType, this.shopFilterSearch, this.shopFilterPriceMin, this.shopFilterPriceMax);
            }
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

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
            const item = this.shopItems.find(i => i.id === id);
            if (!item) throw new Error("Товар не найден");
            const user = this.authService.currentUser;

            const { newItem, realPrice } = await this.storeService.buyItem(user.id, id);

            user.balance = (user.balance || 0) - realPrice;
            user.inventory = [...(user.inventory || []), newItem];

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

    setupWalletDropdown() {
        const input = document.getElementById('t-user');
        const dropdown = document.getElementById('t-user-dropdown');
        if (!input || !dropdown) return;

        const renderList = (filter = '') => {
            const term = filter.toLowerCase();
            const filtered = (this.walletUsernames || []).filter(u => u.toLowerCase().includes(term));
            if (!filtered.length) {
                dropdown.classList.add('hidden');
                return;
            }
            dropdown.innerHTML = filtered.map(u =>
                `<div class="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-700 transition" data-username="${u}">${u}</div>`
            ).join('');
            dropdown.classList.remove('hidden');
        };

        input.addEventListener('focus', () => renderList(input.value));
        input.addEventListener('input', () => renderList(input.value));

        dropdown.addEventListener('mousedown', (e) => {
            const item = e.target.closest('[data-username]');
            if (item) {
                input.value = item.dataset.username;
                dropdown.classList.add('hidden');
            }
        });

        input.addEventListener('blur', () => {
            setTimeout(() => dropdown.classList.add('hidden'), 150);
        });
    }

    async handleTransfer() {
        const user = document.getElementById('t-user').value;
        const amount = document.getElementById('t-amount').value;
        
        if(!user || !amount) {
             NotificationService.show('Заполните все поля', 'error');
             return;
        }

        try {
            const value = await this.storeService.transfer(this.authService.currentUser.id, user, amount);

            this.authService.currentUser.balance = (this.authService.currentUser.balance || 0) - value;

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
            this.adminUsers = null;
            NotificationService.show('Средства списаны', 'success');
            this.navigate('admin');
        } catch(e) { NotificationService.show(e.message, 'error'); }
    }

    async handleCreateItem(form) {
        if (!this.authService.isAdmin()) return;
        const f = form;
        try {
            const files = Array.from(f.imageFiles?.files || []).slice(0, 3);
            const images = [];
            for (const file of files) {
                images.push(await this.storageService.uploadImage(file));
            }

            await this.adminService.addItem({
                name: f.name.value,
                type: f.type.value,
                price: parseFloat(f.price.value),
                description: f.desc.value,
                images: images,
                imageUrl: images[0] || null
            });
            this.shopItems = [];
            NotificationService.show('Товар добавлен', 'success');
            this.navigate('admin');
        } catch(err) { NotificationService.show(err.message, 'error'); }
    }

    async handleDeleteItem(id) {
        if (!this.authService.isAdmin()) return;
        if(!confirm('Удалить товар навсегда?')) return;
        try {
            await this.adminService.deleteItem(id);
            this.shopItems = [];
            NotificationService.show('Товар удален', 'success');
            this.navigate('admin');
        } catch(err) { NotificationService.show(err.message, 'error'); }
    }

    async handleEditItem(itemId) {
        if (!this.authService.isAdmin()) return;
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('hidden');
        overlay.dataset.action = "modal-overlay";
        overlay.innerHTML = '<div class="loader"></div>';
        try {
            const item = await this.adminService.getItem(itemId);
            if (!item) throw new Error("Товар не найден");
            overlay.innerHTML = UI.renderEditItemModal(item);
            lucide.createIcons();
        } catch (e) {
            this.closeModal();
            NotificationService.show(e.message || "Ошибка загрузки", "error");
        }
    }

    async handleSaveItem(form) {
        if (!this.authService.isAdmin()) return;
        const itemId = form.dataset.id;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        try {
            await this.adminService.updateItem(itemId, data);
            this.shopItems = [];
            NotificationService.show("Товар обновлен", "success");
            this.closeModal();
            this.navigate('admin');
        } catch (e) {
            NotificationService.show(e.message, "error");
        }
    }

    async handleCreateUser(form) {
        if (!this.authService.isAdmin()) return;
        const f = form;
        try {
            await this.adminService.createUser({
                username: f.username.value,
                password: f.password.value,
                balance: f.balance.value,
                position: f.position?.value || '',
                unit: f.unit?.value || '',
                certificate: f.certificate?.value || '',
                notes: f.notes?.value || ''
            });
            this.walletUsernames = null;
            this.adminUsers = null;
            NotificationService.show('Боец добавлен', 'success');
            this.navigate('admin');
        } catch(err) { NotificationService.show(err.message, 'error'); }
    }
    
    async handleExportCredentials() {
        if (!this.authService.isAdmin()) return;
        if (!confirm('Усі паролі бійців будуть перегенеровані. Продовжити?')) return;
        try {
            const count = await this.adminService.exportCredentials();
            NotificationService.show(`Згенеровано нові паролі для ${count} бійців`, 'success');
        } catch (e) {
            NotificationService.show('Помилка експорту: ' + e.message, 'error');
        }
    }

    async handleImportSquad() {
        if (!this.authService.isAdmin()) return;
        if(!confirm("Вы уверены?")) return;
        try {
            const result = await this.adminService.importSquadData();
            this.walletUsernames = null;
            this.adminUsers = null;
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
            if (!this.shopItems.length) {
                this.shopItems = await this.storeService.getItems();
            }
            const userData = await this.adminService.getUserData(userId);

            this.renderModalContent(userData, this.shopItems);
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
            if (data.username) this.walletUsernames = null;
            this.adminUsers = null;
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
            const files = Array.from(form.customImageFiles?.files || []).slice(0, 3);
            const images = [];
            for (const file of files) {
                images.push(await this.storageService.uploadImage(file));
            }

            itemData = {
                name: customName,
                type: form.customType.value || 'acc',
                description: form.customDesc.value || '',
                images: images,
                imageUrl: images[0] || null,
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
            this.adminUsers = null;

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
            this.adminUsers = null;

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