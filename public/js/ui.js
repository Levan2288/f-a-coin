export const UI = {
    renderItem(item) {
        const img = item.imageUrl && item.imageUrl.trim() !== ""
            ? `<img src="${item.imageUrl}" class="h-40 w-full object-cover rounded-t-xl" onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');">
               <div class="hidden h-40 w-full bg-gray-100 flex items-center justify-center rounded-t-xl"><i data-lucide="box" class="w-10 h-10 text-gray-300"></i></div>`
            : `<div class="h-40 w-full bg-gray-100 flex items-center justify-center rounded-t-xl"><i data-lucide="box" class="w-10 h-10 text-gray-300"></i></div>`;

        // ЗАМЕНА onclick на data-action и data-атрибуты
        return `
        <div class="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col fade-in group h-full">
            <div class="relative">
                ${img}
                <div class="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                    <span class="font-bold text-[#c1a270] text-sm">${item.price} A</span>
                </div>
            </div>
            <div class="p-4 flex flex-col flex-1">
                <h3 class="font-bold text-lg text-gray-800 leading-tight mb-1 line-clamp-1">${item.name}</h3>
                <p class="text-gray-500 text-xs mb-4 flex-1 line-clamp-2">${item.description || 'Нет описания'}</p>
                <button data-action="buy" data-id="${item.id}" data-price="${item.price}"
                    class="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-[#c1a270] transition-colors font-bold text-sm active:scale-95 transform shadow-md">
                    Купить
                </button>
            </div>
        </div>`;
    },

    renderInventoryItem(item, index, isAdmin = false) {
        // ЗАМЕНА onclick на data-action
        const actionBtn = isAdmin 
            ? `<button data-action="delete-user-item" data-index="${index}" class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Изъять предмет"><i data-lucide="trash-2" class="w-5 h-5"></i></button>`
            : `<div class="px-2 py-1 bg-gray-50 rounded text-[10px] font-bold text-gray-400 uppercase tracking-wider">Личное</div>`;

        return `
        <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between fade-in hover:shadow-md transition-shadow">
            <div class="flex items-center gap-3 overflow-hidden">
                <div class="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 text-[#c1a270]">
                    <i data-lucide="${this.getIcon(item.type)}" class="w-6 h-6"></i>
                </div>
                <div class="min-w-0">
                    <h4 class="font-bold text-gray-800 text-sm truncate">${item.name}</h4>
                    <p class="text-xs text-gray-500 truncate">${item.type}</p>
                </div>
            </div>
            <div class="flex-shrink-0 ml-2">
                ${actionBtn}
            </div>
        </div>`;
    },

    renderWallet() {
        return `
            <div class="max-w-md mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg mt-4 md:mt-10 fade-in">
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
                    <!-- ЗАМЕНА onclick на data-action -->
                    <button data-action="transfer" class="w-full bg-[#c1a270] text-white py-4 rounded-lg font-bold hover:bg-[#a68a5a] shadow-lg transition-transform active:scale-95 text-lg">
                        Отправить
                    </button>
                </div>
            </div>`;
    },

    renderUserProfile(user) {
        return `
            <div class="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-lg fade-in mt-4 md:mt-10">
                <div class="flex items-center gap-6 border-b border-gray-100 pb-6 mb-6">
                    <div class="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-full flex items-center justify-center text-3xl md:text-4xl font-bold text-[#c1a270] shadow-inner">
                        ${user.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800 leading-none mb-1">${user.username}</h2>
                        <p class="text-gray-500 text-sm mb-2">${user.position || 'Боец'}</p>
                        <div class="inline-flex items-center gap-2 bg-[#c1a270]/10 text-[#c1a270] px-3 py-1 rounded-full text-sm font-bold">
                            <i data-lucide="coins" class="w-4 h-4"></i>
                            ${user.balance.toFixed(0)} AC
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div class="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                            <i data-lucide="flag" class="w-3 h-3"></i> Подразделение
                        </span>
                        <span class="font-bold text-gray-800">${user.unit || 'Не указано'}</span>
                    </div>
                    <div class="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                            <i data-lucide="award" class="w-3 h-3"></i> Сертификат
                        </span>
                        <span class="font-bold text-gray-800">${user.certificate || 'Нет'}</span>
                    </div>
                    <div class="col-span-1 md:col-span-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
                            <i data-lucide="file-text" class="w-3 h-3"></i> Личное дело / Заметки
                        </span>
                        <p class="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">${user.notes || 'Нет дополнительных заметок'}</p>
                    </div>
                </div>
            </div>
        `;
    },

    renderAdminDashboard(users, items) {
        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <i data-lucide="shield-alert" class="text-red-600"></i> <span class="hidden md:inline">Командный Центр</span><span class="md:hidden">Админка</span>
                </h2>
                <!-- Утилита импорта -->
                <button data-action="import-squad" class="text-xs text-gray-400 hover:text-gray-600">Import</button>
            </div>

            <!-- 1. Взыскания -->
            <div class="bg-white p-4 md:p-6 rounded-xl shadow-sm border-t-4 border-red-600 mb-6 md:mb-8">
                <h3 class="font-bold text-lg mb-4 text-red-700 flex items-center gap-2"><i data-lucide="gavel"></i> Взыскание</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 bg-red-50 p-4 rounded-lg">
                    <div>
                        <input id="d-user" class="w-full p-2 border border-red-200 rounded text-sm focus:ring-1 focus:ring-red-500 outline-none" placeholder="Позывной">
                    </div>
                    <div>
                        <input id="d-amount" type="number" class="w-full p-2 border border-red-200 rounded text-sm focus:ring-1 focus:ring-red-500 outline-none" placeholder="Сумма (A)">
                    </div>
                    <!-- data-action="deduct" -->
                    <button data-action="deduct" class="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 active:scale-95 text-sm">Списать</button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 pb-24 md:pb-0">
                <!-- 2. Управление Товарами -->
                <div class="bg-white p-4 md:p-6 rounded-xl shadow-sm flex flex-col h-[500px] md:h-[600px]">
                    <h3 class="font-bold text-lg mb-4 border-b pb-2 flex items-center gap-2"><i data-lucide="shopping-bag"></i> Арсенал</h3>
                    
                    <!-- data-action для формы -->
                    <form data-action="create-item" class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 bg-gray-50 p-3 rounded text-sm">
                        <input name="name" placeholder="Название" class="p-2 border rounded" required>
                        <input name="type" placeholder="Тип (weapon/uniform)" class="p-2 border rounded" required>
                        <input name="price" type="number" placeholder="Цена" class="p-2 border rounded" required>
                        <input name="imageUrl" placeholder="URL картинки" class="p-2 border rounded">
                        <input name="desc" placeholder="Описание" class="p-2 border rounded md:col-span-2" required>
                        <button type="submit" class="md:col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700 font-medium shadow-sm">Добавить</button>
                    </form>

                    <div class="overflow-y-auto flex-1 pr-1 space-y-2 no-scrollbar">
                        ${items.map(i => `
                            <div class="flex justify-between items-center p-3 border rounded hover:bg-gray-50 group transition-colors">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 bg-gray-100 rounded flex items-center justify-center shrink-0">
                                        <i data-lucide="${this.getIcon(i.type)}" class="w-5 h-5 text-gray-500"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <span class="font-bold block text-sm text-gray-800 truncate">${i.name}</span>
                                        <span class="text-xs text-[#c1a270] font-bold">${i.price} A</span>
                                    </div>
                                </div>
                                <button data-action="delete-item" data-id="${i.id}" class="text-gray-300 hover:text-red-500 transition-colors p-2">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- 3. Личный Состав -->
                <div class="bg-white p-4 md:p-6 rounded-xl shadow-sm flex flex-col h-[500px] md:h-[600px]">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-2 mb-4 gap-2">
                         <h3 class="font-bold text-lg flex items-center gap-2"><i data-lucide="users"></i> Личный состав</h3>
                         <div class="relative w-full md:w-auto">
                            <!-- data-action="search-user" для инпута -->
                            <input data-action="search-user" placeholder="Поиск..." class="pl-8 pr-2 py-1 border rounded-lg text-sm w-full md:w-48 focus:ring-2 focus:ring-[#c1a270] outline-none">
                            <i data-lucide="search" class="w-4 h-4 absolute left-2 top-1.5 text-gray-400"></i>
                         </div>
                    </div>
                    
                    <form data-action="create-user" class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 bg-gray-50 p-3 rounded text-sm hidden md:grid">
                        <input name="username" placeholder="Позывной *" class="p-2 border rounded" required>
                        <input name="password" placeholder="Пароль *" class="p-2 border rounded" required>
                        <input name="balance" type="number" placeholder="Баланс *" class="p-2 border rounded" required>
                        <button type="submit" class="md:col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700 font-medium mt-1">Зачислить бойца</button>
                    </form>
                    
                    <button onclick="alert('Добавление бойцов доступно только с ПК версии')" class="md:hidden w-full py-2 bg-gray-100 text-gray-500 rounded text-xs mb-2">Форма добавления скрыта (Mobile)</button>

                    <div id="admin-users-list" class="overflow-y-auto flex-1 pr-1 space-y-2 no-scrollbar">
                        ${users.map(u => `
                            <div class="user-row p-3 border rounded flex flex-col gap-2 hover:bg-gray-50 transition-colors mb-2" data-username="${u.username.toLowerCase()}">
                                <div class="flex justify-between items-center">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                                            ${u.username.substring(0,2).toUpperCase()}
                                        </div>
                                        <div class="min-w-0">
                                            <span class="font-bold block text-sm text-gray-800 truncate">${u.username}</span>
                                            <span class="text-xs text-gray-500 truncate">${u.position || 'Боец'}</span>
                                        </div>
                                    </div>
                                    <span class="text-sm font-bold text-[#c1a270] whitespace-nowrap">${u.balance.toFixed(0)} A</span>
                                </div>
                                <div class="flex justify-between items-center pt-2 border-t border-dashed">
                                    <span class="text-[10px] text-gray-400 truncate max-w-[120px]">${u.unit || '-'}</span>
                                    <button data-action="open-admin-inventory" data-id="${u.id}" class="text-xs text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                                        <i data-lucide="backpack" class="w-3 h-3"></i> Инв
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    renderAdminModal(username, inventoryHtml) {
        return `
            <div class="bg-white md:rounded-xl rounded-t-2xl shadow-2xl w-full md:max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 md:animate-in md:fade-in md:zoom-in" onclick="event.stopPropagation()">
                <div class="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl md:rounded-t-xl">
                    <h3 class="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <i data-lucide="backpack" class="w-5 h-5 text-[#c1a270]"></i>
                        <span class="truncate max-w-[200px]">${username}</span>
                    </h3>
                    <button data-action="close-modal" class="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors">
                        <i data-lucide="x" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                </div>
                <div class="p-4 overflow-y-auto space-y-2 flex-1 bg-gray-100 min-h-[300px] safe-area-pb">
                    ${inventoryHtml}
                </div>
            </div>
        `;
    },

    getIcon(type) {
        const icons = { 'weapon': 'crosshair', 'uniform': 'shirt', 'acc': 'glasses' };
        return icons[type] || 'box';
    },

    showLoader(containerId) {
        document.getElementById(containerId).innerHTML = '<div class="flex justify-center mt-10"><div class="loader"></div></div>';
    }
};