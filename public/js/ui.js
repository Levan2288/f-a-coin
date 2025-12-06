export const UI = {
    renderItem(item, onClickAction, btnText = "Купить") {
        const img = item.imageUrl && item.imageUrl.trim() !== ""
            ? `<img src="${item.imageUrl}" class="h-40 w-full object-cover rounded-t-lg" onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');">
               <div class="hidden h-40 w-full bg-gray-100 flex items-center justify-center rounded-t-lg"><i data-lucide="box" class="w-8 h-8 text-gray-400"></i></div>`
            : `<div class="h-40 w-full bg-gray-100 flex items-center justify-center rounded-t-lg"><i data-lucide="box" class="w-8 h-8 text-gray-400"></i></div>`;

        return `
        <div class="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col fade-in">
            ${img}
            <div class="p-5 flex flex-col flex-1">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-lg text-gray-800 leading-tight">${item.name}</h3>
                    <span class="font-bold text-[#c1a270] bg-[#c1a270]/10 px-2 py-1 rounded text-sm whitespace-nowrap">${item.price} A</span>
                </div>
                <p class="text-gray-500 text-sm mb-4 flex-1 line-clamp-2">${item.description || 'Нет описания'}</p>
                <button onclick="${onClickAction}('${item.id}', '${item.price}')" 
                    class="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-[#c1a270] transition-colors font-medium active:scale-95 transform">
                    ${btnText}
                </button>
            </div>
        </div>`;
    },

    renderInventoryItem(item, index, isAdmin = false) {
        const actionBtn = isAdmin 
            ? `<button onclick="App.handleDeleteUserItem(${index})" class="text-red-500 hover:bg-red-50 p-2 rounded transition" title="Изъять предмет"><i data-lucide="trash-2" class="w-5 h-5"></i></button>`
            : `<span class="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">Личное</span>`;

        return `
        <div class="bg-white p-3 rounded-lg shadow-sm border-l-4 border-[#c1a270] flex items-center justify-between fade-in mb-2">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                    <i data-lucide="${this.getIcon(item.type)}" class="text-gray-500 w-5 h-5"></i>
                </div>
                <div class="overflow-hidden">
                    <h4 class="font-bold text-gray-800 text-sm truncate">${item.name}</h4>
                    <p class="text-xs text-gray-400">${item.type}</p>
                </div>
            </div>
            <div class="flex-shrink-0 ml-2">
                ${actionBtn}
            </div>
        </div>`;
    },

    renderAdminDashboard(users, items) {
        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <i data-lucide="shield-alert" class="text-red-600"></i> Командный Центр
                </h2>
                
            </div>

            <!-- 1. Взыскания -->
            <div class="bg-white p-6 rounded-xl shadow-sm border-t-4 border-red-600 mb-8">
                <h3 class="font-bold text-lg mb-4 text-red-700 flex items-center gap-2"><i data-lucide="gavel"></i> Дисциплинарное взыскание</h3>
                <div class="flex flex-col md:flex-row gap-4 items-end bg-red-50 p-4 rounded-lg">
                    <div class="flex-1 w-full">
                        <label class="text-xs font-bold text-red-700 uppercase">Позывной</label>
                        <input id="d-user" class="w-full p-2 border border-red-200 rounded mt-1" placeholder="Введите логин">
                    </div>
                    <div class="w-full md:w-48">
                        <label class="text-xs font-bold text-red-700 uppercase">Сумма штрафа</label>
                        <input id="d-amount" type="number" class="w-full p-2 border border-red-200 rounded mt-1" placeholder="0.00">
                    </div>
                    <button onclick="App.handleDeduct()" class="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 w-full md:w-auto">Списать</button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- 2. Управление Товарами -->
                <div class="bg-white p-6 rounded-xl shadow-sm flex flex-col h-[600px]">
                    <h3 class="font-bold text-lg mb-4 border-b pb-2 flex items-center gap-2"><i data-lucide="shopping-bag"></i> Арсенал (Товары)</h3>
                    
                    <form onsubmit="App.handleCreateItem(event)" class="grid grid-cols-2 gap-2 mb-4 bg-gray-50 p-3 rounded text-sm">
                        <input name="name" placeholder="Название" class="p-2 border rounded" required>
                        <input name="type" placeholder="Тип (weapon/uniform)" class="p-2 border rounded" required>
                        <input name="price" type="number" placeholder="Цена" class="p-2 border rounded" required>
                        <input name="imageUrl" placeholder="URL картинки" class="p-2 border rounded">
                        <input name="desc" placeholder="Описание" class="p-2 border rounded col-span-2" required>
                        <button type="submit" class="col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700 font-medium">Добавить товар</button>
                    </form>

                    <div class="overflow-y-auto flex-1 pr-2 space-y-2 no-scrollbar">
                        ${items.map(i => `
                            <div class="flex justify-between items-center p-3 border rounded hover:bg-gray-50 group">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                        <i data-lucide="${this.getIcon(i.type)}" class="w-5 h-5 text-gray-500"></i>
                                    </div>
                                    <div>
                                        <span class="font-bold block text-sm text-gray-800">${i.name}</span>
                                        <span class="text-xs text-[#c1a270] font-bold">${i.price} A</span>
                                    </div>
                                </div>
                                <button onclick="App.handleDeleteItem('${i.id}')" class="text-gray-400 hover:text-red-500 transition-colors p-2">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- 3. Личный Состав -->
                <div class="bg-white p-6 rounded-xl shadow-sm flex flex-col h-[600px]">
                    <div class="flex justify-between items-center border-b pb-2 mb-4">
                         <h3 class="font-bold text-lg flex items-center gap-2"><i data-lucide="users"></i> Личный состав</h3>
                         <!-- ПОИСК -->
                         <div class="relative">
                            <input onkeyup="App.handleUserSearch(this.value)" placeholder="Поиск по позывному..." class="pl-8 pr-2 py-1 border rounded-lg text-sm w-48 focus:ring-2 focus:ring-[#c1a270] outline-none">
                            <i data-lucide="search" class="w-4 h-4 absolute left-2 top-1.5 text-gray-400"></i>
                         </div>
                    </div>
                    
                    <form onsubmit="App.handleCreateUser(event)" class="grid grid-cols-2 gap-2 mb-4 bg-gray-50 p-3 rounded text-sm">
                        <input name="username" placeholder="Позывной *" class="p-2 border rounded" required>
                        <input name="password" placeholder="Пароль *" class="p-2 border rounded" required>
                        <input name="balance" type="number" placeholder="Баланс *" class="p-2 border rounded" required>
                        <!-- New Fields -->
                        <input name="position" placeholder="Посада" class="p-2 border rounded">
                        <input name="unit" placeholder="Підрозділ" class="p-2 border rounded">
                        <input name="certificate" placeholder="Сертифікат" class="p-2 border rounded">
                        <input name="notes" placeholder="Заметка (Инфо)" class="p-2 border rounded col-span-1">
                        
                        <button type="submit" class="col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700 font-medium mt-2">Зачислить бойца</button>
                    </form>

                    <div id="admin-users-list" class="overflow-y-auto flex-1 pr-2 space-y-2 no-scrollbar">
                        ${users.map(u => `
                            <div class="user-row p-3 border rounded flex flex-col gap-2 hover:bg-gray-50 transition-colors mb-2" data-username="${u.username.toLowerCase()}">
                                <div class="flex justify-between items-center">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                                            ${u.username.substring(0,2).toUpperCase()}
                                        </div>
                                        <div>
                                            <span class="font-bold block text-sm text-gray-800">${u.username}</span>
                                            <span class="text-xs text-gray-500">${u.position || 'Боец'}</span>
                                        </div>
                                    </div>
                                    <span class="text-sm font-bold text-[#c1a270]">${u.balance.toFixed(0)} A</span>
                                </div>
                                <div class="flex justify-between items-center pt-2 border-t border-dashed">
                                    <span class="text-[10px] text-gray-400 truncate max-w-[150px]">${u.unit || '-'}</span>
                                    <button onclick="App.handleOpenAdminInventory('${u.id}')" class="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                        <i data-lucide="backpack" class="w-3 h-3"></i> Инвентарь
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
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div class="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 class="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <i data-lucide="backpack" class="w-5 h-5 text-[#c1a270]"></i>
                        Инвентарь: <span class="text-[#c1a270]">${username}</span>
                    </h3>
                    <button id="close-modal-btn" class="text-gray-400 hover:text-red-600 transition-colors">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>
                <div class="p-4 overflow-y-auto space-y-2 flex-1 bg-gray-100 min-h-[300px]">
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