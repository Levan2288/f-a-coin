export const UI = {
    _getFirstImage(item) {
        if (item.images && item.images.length > 0) return item.images[0];
        if (item.imageUrl && item.imageUrl.trim() !== "") return item.imageUrl;
        return null;
    },

    _getAllImages(item) {
        if (item.images && item.images.length > 0) return item.images;
        if (item.imageUrl && item.imageUrl.trim() !== "") return [item.imageUrl];
        return [];
    },

    renderItem(item) {
        const firstImg = this._getFirstImage(item);
        const img = firstImg
            ? `<img src="${firstImg}" class="w-full h-48 object-contain bg-white rounded-t-xl group-hover:scale-105 transition-transform duration-300" onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');">
               <div class="hidden w-full h-48 bg-gray-50 flex items-center justify-center rounded-t-xl"><i data-lucide="image" class="w-10 h-10 text-gray-300"></i></div>`
            : `<div class="w-full h-48 bg-gray-50 flex items-center justify-center rounded-t-xl"><i data-lucide="box" class="w-10 h-10 text-gray-300"></i></div>`;

        // ИСПРАВЛЕНИЕ: Убран onclick="event.stopPropagation()" у кнопки
        return `
        <div data-action="view-details" data-id="${item.id}" class="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col fade-in group h-full cursor-pointer border border-transparent hover:border-[#c1a270]/20 relative overflow-hidden">
            <div class="relative border-b border-gray-100">
                ${img}
                <div class="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm border border-gray-100 z-10">
                    <span class="font-bold text-[#c1a270] text-sm">${item.price} A</span>
                </div>
            </div>
            <div class="p-4 flex flex-col flex-1">
                <h3 class="font-bold text-lg text-gray-800 leading-tight mb-1 line-clamp-1 group-hover:text-[#c1a270] transition-colors">${item.name}</h3>
                <p class="text-gray-500 text-xs mb-4 flex-1 line-clamp-2">${item.description || 'Нет описания'}</p>
                
                <button data-action="buy" data-id="${item.id}" data-price="${item.price}"
                    class="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-[#c1a270] transition-colors font-bold text-sm active:scale-95 transform shadow-md flex items-center justify-center gap-2">
                    <i data-lucide="shopping-cart" class="w-4 h-4"></i> Купить
                </button>
            </div>
        </div>`;
    },

    renderInventoryItem(item, index, isAdmin = false) {
        const actionBtn = isAdmin 
            ? `<button data-action="delete-user-item" data-index="${index}" class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Изъять предмет"><i data-lucide="trash-2" class="w-5 h-5"></i></button>`
            : `<div class="px-2 py-1 bg-gray-50 rounded text-[10px] font-bold text-gray-400 uppercase tracking-wider">Личное</div>`;

        const firstImg = this._getFirstImage(item);
        let iconOrImg;
        if (firstImg) {
            iconOrImg = `<img src="${firstImg}" class="w-full h-full object-cover rounded-lg" onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');">
                         <i data-lucide="${this.getIcon(item.type)}" class="hidden w-6 h-6"></i>`;
        } else {
            iconOrImg = `<i data-lucide="${this.getIcon(item.type)}" class="w-6 h-6"></i>`;
        }

        return `
        <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between fade-in hover:shadow-md transition-shadow">
            <div class="flex items-center gap-3 overflow-hidden">
                <div class="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 text-[#c1a270] relative">
                    ${iconOrImg}
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

    renderProductDetailsModal(item) {
        const images = this._getAllImages(item);
        const hasImages = images.length > 0;

        const mainImg = hasImages
            ? `<img id="modal-main-img" src="${images[0]}" class="w-full max-h-[40vh] object-contain bg-white rounded-lg mb-2 transition-opacity duration-200" onerror="this.style.display='none'">`
            : `<div class="w-full h-40 bg-gray-100 flex items-center justify-center rounded-lg mb-2"><i data-lucide="image-off" class="w-12 h-12 text-gray-300"></i></div>`;

        const thumbs = images.length > 1
            ? `<div class="flex gap-2 mb-4">${images.map((url, i) =>
                `<img src="${url}" data-action="switch-image" data-src="${url}"
                    class="w-16 h-16 object-cover rounded-lg border-2 cursor-pointer transition-all hover:opacity-80
                    ${i === 0 ? 'border-[#c1a270]' : 'border-transparent opacity-60'}"
                    onerror="this.style.display='none'">`
              ).join('')}</div>`
            : `<div class="mb-4"></div>`;

        return `
        <div class="bg-white md:rounded-2xl rounded-t-2xl shadow-2xl w-full md:max-w-lg max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300 md:animate-in md:fade-in md:zoom-in overflow-hidden relative">

            <button data-action="close-modal" class="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full p-2 z-10 transition-colors">
                <i data-lucide="x" class="w-5 h-5 pointer-events-none"></i>
            </button>

            <div class="p-6 overflow-y-auto no-scrollbar">
                ${mainImg}
                ${thumbs}

                <div class="flex justify-between items-start mb-2">
                    <h2 class="text-2xl font-bold text-gray-900 leading-tight">${item.name}</h2>
                    <span class="bg-[#c1a270]/10 text-[#c1a270] px-3 py-1 rounded-full font-bold whitespace-nowrap ml-2 text-lg">
                        ${item.price} A
                    </span>
                </div>

                <div class="flex items-center gap-2 mb-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <span class="bg-gray-100 px-2 py-1 rounded border border-gray-200">${item.type}</span>
                </div>

                <div class="prose prose-sm text-gray-600 mb-8 leading-relaxed">
                    <p>${item.description || "Описание отсутствует."}</p>
                </div>

                <button data-action="buy" data-id="${item.id}" data-price="${item.price}"
                    class="w-full bg-[#c1a270] text-white py-4 rounded-xl hover:bg-[#a68a5a] transition-all font-bold text-lg shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2 sticky bottom-0">
                    <i data-lucide="shopping-bag" class="w-5 h-5"></i>
                    Приобрести
                </button>
            </div>
        </div>
        `;
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
                    <button data-action="transfer" class="w-full bg-[#c1a270] text-white py-4 rounded-lg font-bold hover:bg-[#a68a5a] shadow-lg transition-transform active:scale-95 text-lg">
                        Отправить
                    </button>
                </div>
            </div>`;
    },

    renderLogs(logs, filterUser = null) {
        // Изменяем логику фильтрации: оставляем только тип 'purchase'
        let displayLogs = logs.filter(l => l.type === 'purchase');

        // Если дополнительно выбран пользователь, фильтруем и по нему
        if (filterUser) {
            displayLogs = displayLogs.filter(l => l.username === filterUser);
        }

        const rows = displayLogs.map(log => {
            let typeColor = 'text-gray-500';
            let icon = 'info';
            if (log.type === 'purchase') { typeColor = 'text-green-600'; icon = 'shopping-cart'; }
            if (log.type === 'admin_grant') { typeColor = 'text-blue-600'; icon = 'gift'; }
            if (log.type === 'admin_revoke') { typeColor = 'text-red-600'; icon = 'trash-2'; }
            if (log.type === 'transfer') { typeColor = 'text-orange-600'; icon = 'arrow-right-left'; }

            const date = new Date(log.timestamp).toLocaleString('ru-RU', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });

            return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="p-4 text-xs text-gray-400 font-mono whitespace-nowrap">${date}</td>
                <td class="p-4">
                    <button data-action="filter-logs-user" data-username="${log.username}" 
                        class="font-bold text-gray-800 hover:text-[#c1a270] hover:underline transition-colors flex items-center gap-1">
                        ${log.username}
                        ${filterUser ? '<i data-lucide="filter" class="w-3 h-3 text-[#c1a270]"></i>' : ''}
                    </button>
                </td>
                <td class="p-4">
                    <div class="flex items-center gap-2">
                        <i data-lucide="${icon}" class="w-4 h-4 ${typeColor}"></i>
                        <span class="text-sm font-medium text-gray-700">${log.itemName || 'Действие с балансом'}</span>
                    </div>
                </td>
                <td class="p-4 text-right">
                    ${log.price 
                        ? `<span class="font-bold text-gray-900">${log.price} A</span>` 
                        : `<span class="text-gray-400 text-xs">-</span>`}
                </td>
            </tr>
            `;
        }).join('');

        return `
        <div class="max-w-4xl mx-auto fade-in pb-20">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <i data-lucide="clipboard-list" class="text-[#c1a270]"></i> Журнал операций
                </h2>
                
                <div class="flex items-center gap-2 w-full md:w-auto">
                    ${filterUser ? `
                        <button data-action="reset-logs" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors">
                            <i data-lucide="x" class="w-3 h-3"></i> ${filterUser}
                        </button>
                    ` : ''}
                    <div class="relative flex-1 md:w-64">
                        <i data-lucide="search" class="absolute left-3 top-2.5 w-4 h-4 text-gray-400"></i>
                        <input id="logs-search" type="text" placeholder="Поиск по позывному..." 
                            class="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#c1a270] outline-none">
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
                                <th class="p-4 font-bold">Время</th>
                                <th class="p-4 font-bold">Боец</th>
                                <th class="p-4 font-bold">Действие / Предмет</th>
                                <th class="p-4 font-bold text-right">Сумма</th>
                            </tr>
                        </thead>
                        <tbody id="logs-table-body">
                            ${rows.length > 0 ? rows : `<tr><td colspan="4" class="p-8 text-center text-gray-400">Записей не найдено</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
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
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
                <h2 class="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <i data-lucide="shield-alert" class="text-red-600"></i> <span class="hidden md:inline">Командный Центр</span><span class="md:hidden">Админка</span>
                </h2>
                <div class="flex items-center gap-2">
                    <button data-action="export-credentials" class="bg-gray-800 hover:bg-[#c1a270] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
                        <i data-lucide="download" class="w-4 h-4"></i> Експорт доступів
                    </button>
                    <button data-action="import-squad" class="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
                        <i data-lucide="upload" class="w-4 h-4"></i> Імпорт штатки
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 pb-24 md:pb-0">
                <div class="bg-white p-4 md:p-6 rounded-xl shadow-sm flex flex-col h-[500px] md:h-[600px]">
                    <h3 class="font-bold text-lg mb-4 border-b pb-2 flex items-center gap-2"><i data-lucide="shopping-bag"></i> Арсенал</h3>
                    
                    <form data-action="create-item" class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 bg-gray-50 p-3 rounded text-sm">
                        <input name="name" placeholder="Название" class="p-2 border rounded" required>
                        <input name="type" placeholder="Тип (weapon/uniform)" class="p-2 border rounded" required>
                        <input name="price" type="number" placeholder="Цена" class="p-2 border rounded" required>
                        <input name="imageFiles" type="file" accept="image/*" multiple class="p-2 border rounded text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-200 file:text-gray-700 file:font-medium file:cursor-pointer md:col-span-2">
                        <input name="desc" placeholder="Описание" class="p-2 border rounded md:col-span-2" required>
                        <button type="submit" class="md:col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700 font-medium shadow-sm">Добавить</button>
                    </form>

                    <div class="overflow-y-auto flex-1 pr-1 space-y-2 no-scrollbar">
                        ${items.map(i => `
                            <div class="flex justify-between items-center p-3 border rounded hover:bg-gray-50 group transition-colors">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 bg-gray-100 rounded flex items-center justify-center shrink-0 overflow-hidden">
                                        ${this._getFirstImage(i) ? `<img src="${this._getFirstImage(i)}" class="w-full h-full object-cover">` : `<i data-lucide="${this.getIcon(i.type)}" class="w-5 h-5 text-gray-500"></i>`}
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
                
                <div class="bg-white p-4 md:p-6 rounded-xl shadow-sm flex flex-col h-[500px] md:h-[600px]">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-2 mb-4 gap-2">
                         <h3 class="font-bold text-lg flex items-center gap-2"><i data-lucide="users"></i> Личный состав</h3>
                         <div class="relative w-full md:w-auto">
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
                        ${users
                            .filter(u => u && u.username) /* <--- ГЛАВНОЕ ИСПРАВЛЕНИЕ: Фильтруем пустых */
                            .map(u => `
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
                                    <span class="text-sm font-bold text-[#c1a270] whitespace-nowrap">${(u.balance || 0).toFixed(0)} A</span>
                                </div>
                                <div class="flex justify-between items-center pt-2 border-t border-dashed">
                                    <span class="text-[10px] text-gray-400 truncate max-w-[120px]">${u.unit || '-'}</span>
                                    <button data-action="manage-user" data-id="${u.id}" class="text-xs text-white bg-gray-800 hover:bg-gray-700 flex items-center gap-1 px-3 py-1.5 rounded shadow-sm transition-all">
                                        <i data-lucide="settings" class="w-3 h-3"></i> Управление
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    renderAdminModal(user, shopItems = []) {
        const inventory = user.inventory || [];
        const shopOptions = shopItems.map(item => 
            `<option value='${JSON.stringify(item)}'>${item.name} (${item.price} A)</option>`
        ).join('');

        return `
            <div class="bg-white md:rounded-xl rounded-t-2xl shadow-2xl w-full md:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 md:animate-in md:fade-in md:zoom-in">
                <!-- HEADER -->
                <div class="p-4 border-b flex justify-between items-center bg-gray-800 text-white rounded-t-2xl md:rounded-t-xl shrink-0">
                    <h3 class="font-bold text-lg flex items-center gap-3">
                        <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs">
                            ${user.username.substring(0,2).toUpperCase()}
                        </div>
                        <span>${user.username}</span>
                    </h3>
                    <button data-action="close-modal" class="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full hover:bg-red-500 transition-colors">
                        <i data-lucide="x" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto bg-gray-100 p-4 space-y-6 safe-area-pb">
                    
                    <!-- 1. РЕДАКТИРОВАНИЕ ПРОФИЛЯ -->
                    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h4 class="font-bold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <i data-lucide="user-cog" class="w-4 h-4"></i> Данные бойца
                        </h4>
                        <form data-action="save-user-profile" data-id="${user.id}" class="grid grid-cols-2 gap-3">
                            <div class="col-span-2 md:col-span-1">
                                <label class="text-[10px] uppercase font-bold text-gray-400">Позывной</label>
                                <input name="username" value="${user.username}" class="w-full p-2 border rounded text-sm bg-gray-50 focus:bg-white transition-colors">
                            </div>
                            <div class="col-span-2 md:col-span-1">
                                <label class="text-[10px] uppercase font-bold text-gray-400">Баланс (A)</label>
                                <input name="balance" type="number" value="${user.balance}" class="w-full p-2 border rounded text-sm bg-gray-50 focus:bg-white transition-colors">
                            </div>
                             <div class="col-span-2 md:col-span-1">
                                <label class="text-[10px] uppercase font-bold text-gray-400">Должность</label>
                                <input name="position" value="${user.position || ''}" class="w-full p-2 border rounded text-sm bg-gray-50 focus:bg-white transition-colors">
                            </div>
                            <div class="col-span-2 md:col-span-1">
                                <label class="text-[10px] uppercase font-bold text-gray-400">Подразделение</label>
                                <input name="unit" value="${user.unit || ''}" class="w-full p-2 border rounded text-sm bg-gray-50 focus:bg-white transition-colors">
                            </div>
                            <div class="col-span-2">
                                <label class="text-[10px] uppercase font-bold text-gray-400">Заметки</label>
                                <textarea name="notes" class="w-full p-2 border rounded text-sm bg-gray-50 focus:bg-white h-16 resize-none">${user.notes || ''}</textarea>
                            </div>
                            <button type="submit" class="col-span-2 bg-gray-800 text-white py-2 rounded font-bold text-xs uppercase hover:bg-[#c1a270] transition-colors mt-2">
                                Сохранить изменения
                            </button>
                        </form>
                    </div>

                    <!-- 2. ИНВЕНТАРЬ И ВЫДАЧА -->
                    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <i data-lucide="backpack" class="w-4 h-4"></i> Инвентарь (${inventory.length})
                            </h4>
                            <button data-action="toggle-grant-form" class="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg font-bold hover:bg-green-200 transition-colors flex items-center gap-1">
                                <i data-lucide="plus" class="w-3 h-3"></i> Выдать
                            </button>
                        </div>

                        <!-- ФОРМА ВЫДАЧИ (Скрыта по умолчанию) -->
                        <div id="grant-item-form" class="hidden mb-4 p-3 bg-green-50 rounded-lg border border-green-100 animate-in fade-in slide-in-from-top-2">
                            <div class="flex gap-2 mb-2 text-xs">
                                <button type="button" onclick="document.getElementById('grant-type-shop').classList.remove('hidden'); document.getElementById('grant-type-custom').classList.add('hidden');" class="flex-1 py-1 bg-white shadow-sm rounded font-bold">Из магазина</button>
                                <button type="button" onclick="document.getElementById('grant-type-shop').classList.add('hidden'); document.getElementById('grant-type-custom').classList.remove('hidden');" class="flex-1 py-1 bg-white/50 text-gray-500 hover:bg-white rounded">Свой предмет</button>
                            </div>
                            
                            <form data-action="grant-item" data-userid="${user.id}">
                                <!-- Вариант А: Из магазина -->
                                <div id="grant-type-shop">
                                    <select name="shopItemData" class="w-full p-2 border rounded text-sm mb-2">
                                        <option value="">-- Выберите предмет --</option>
                                        ${shopOptions}
                                    </select>
                                </div>
                                <!-- Вариант Б: Кастомный -->
                                <div id="grant-type-custom" class="hidden space-y-2">
                                    <input name="customName" placeholder="Название предмета" class="w-full p-2 border rounded text-sm">
                                    <input name="customType" placeholder="Тип (weapon/uniform/acc)" class="w-full p-2 border rounded text-sm">
                                    <input name="customDesc" placeholder="Описание (награда и т.д.)" class="w-full p-2 border rounded text-sm">
                                    <input name="customImageFiles" type="file" accept="image/*" multiple class="w-full p-2 border rounded text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-200 file:text-gray-700 file:font-medium file:cursor-pointer">
                                </div>
                                <button type="submit" class="w-full bg-green-600 text-white py-2 rounded font-bold text-xs uppercase hover:bg-green-700 mt-2">Выдать бойцу</button>
                            </form>
                        </div>

                        <div class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            ${inventory.length > 0 
                                ? inventory.map((item, idx) => UI.renderInventoryItem(item, idx, true)).join('') 
                                : '<p class="text-center text-sm text-gray-400 py-4">Рюкзак пуст</p>'}
                        </div>
                    </div>

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