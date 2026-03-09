import {
    collection, addDoc, getDocs, doc, updateDoc,
    deleteDoc, query, where, runTransaction,
    onSnapshot, setDoc, arrayUnion, increment, getDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

import { signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

export class StorageService {
    constructor() {
        this.cloudName = 'dtpzbqegx';
        this.apiKey = '294712554283684';
        this.apiSecret = 'VBtBJN_Uaa20qI9OjOTp2T9Gb2E';
        this.uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
    }

    async uploadImage(file) {
        const timestamp = Math.round(Date.now() / 1000);
        const signature = await this._generateSignature(timestamp);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', this.apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);

        const response = await fetch(this.uploadUrl, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || 'Помилка завантаження зображення');
        }

        const data = await response.json();
        return data.secure_url;
    }

    async _generateSignature(timestamp) {
        const str = `timestamp=${timestamp}${this.apiSecret}`;
        const data = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
}

// --- НОВЫЙ СЕРВИС ЛОГОВ ---
export class LogsService {
    constructor(db) {
        this.db = db;
    }

    // Запись события в лог
    async addLog(eventData) {
        // eventData: { type, username, targetUser?, itemName, price?, details? }
        try {
            await addDoc(collection(this.db, 'logs'), {
                ...eventData,
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            console.error("Failed to write log:", e);
        }
    }

    // Получение всех логов (сортировка будет на клиенте для гибкости)
    async getAllLogs() {
    const snap = await getDocs(collection(this.db, 'logs'));
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        // Добавляем фильтрацию по типу purchase
        .filter(log => log.type === 'purchase')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
}

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

export class AuthService {
    constructor(db, auth) {
        this.db = db;
        this.auth = auth;
        this.currentUser = null;
        this.userListenerUnsubscribe = null;
    }

    async login(username, password) {
        try {
            await signInAnonymously(this.auth);

            const q = query(collection(this.db, 'users'), where('username', '==', username));
            const snapshot = await getDocs(q);

            if (snapshot.empty) throw new Error('Пользователь не найден');

            const userData = snapshot.docs[0].data();

            if (userData.password !== password) throw new Error('Неверный пароль');

            this.currentUser = { id: snapshot.docs[0].id, ...userData };
            this._saveSession();
            return this.currentUser;
        } catch (e) {
            console.error("Auth Error:", e);
            throw e;
        }
    }

    async logout() {
        this.currentUser = null;
        localStorage.removeItem('voentorg_session');
        if(this.userListenerUnsubscribe) this.userListenerUnsubscribe();
        await signOut(this.auth);
        window.location.reload();
    }

    isAdmin() {
        return this.currentUser?.role === 'admin';
    }

    _saveSession() {
        localStorage.setItem('voentorg_session', JSON.stringify({
            uid: this.currentUser.id,
            role: this.currentUser.role
        }));
    }

    async restoreSession() {
        const stored = localStorage.getItem('voentorg_session');
        if (!stored) return false;

        try {
            const { uid } = JSON.parse(stored);

            if (!this.auth.currentUser) {
                await signInAnonymously(this.auth);
            }

            return new Promise((resolve) => {
                this.userListenerUnsubscribe = onSnapshot(doc(this.db, 'users', uid), (docSnap) => {
                    if(docSnap.exists()) {
                        this.currentUser = { id: docSnap.id, ...docSnap.data() };
                        resolve(true);
                    } else {
                        this.logout();
                        resolve(false);
                    }
                }, () => resolve(false));
            });
        } catch (e) {
            return false;
        }
    }
}

export class StoreService {
    constructor(db) {
        this.db = db;
    }

    async getItems() {
        const snapshot = await getDocs(collection(this.db, 'items'));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async buyItem(userId, itemId) {
        if (!userId) throw new Error("Unauthorized");
        
        return runTransaction(this.db, async (transaction) => {
            const userRef = doc(this.db, 'users', userId);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw "User error";

            const itemRef = doc(this.db, 'items', itemId);
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists()) throw "Товар не найден или удален";
            
            const itemData = itemDoc.data();
            const realPrice = itemData.price; 

            const currentBalance = userDoc.data().balance || 0;
            if (currentBalance < realPrice) throw "Недостаточно средств";

            const newItem = {
                itemId: itemId,
                name: itemData.name,
                type: itemData.type,
                description: itemData.description,
                images: itemData.images || [],
                imageUrl: itemData.imageUrl || null,
                purchaseDate: new Date().toISOString(),
                uid: crypto.randomUUID()
            };

            transaction.update(userRef, { 
                balance: currentBalance - realPrice,
                inventory: arrayUnion(newItem)
            });
        });
    }

    async transfer(senderId, receiverUsername, amount) {
        const value = parseFloat(amount);
        if (isNaN(value) || value <= 0) throw new Error("Некорректная сумма");

        await runTransaction(this.db, async (transaction) => {
            const q = query(collection(this.db, 'users'), where('username', '==', receiverUsername));
            const receiverSnap = await getDocs(q);
            
            if (receiverSnap.empty) throw "Боец с таким позывным не найден";
            
            const receiverRef = receiverSnap.docs[0].ref;
            const senderRef = doc(this.db, 'users', senderId);
            const senderDoc = await transaction.get(senderRef);
            
            if (senderDoc.data().balance < value) throw "Недостаточно средств";

            transaction.update(senderRef, { balance: increment(-value) });
            transaction.update(receiverRef, { balance: increment(value) });
        });
    }
}

export class AdminService {
    constructor(db) {
        this.db = db;
    }

    async getAllUsers() {
        const snap = await getDocs(collection(this.db, 'users'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async createUser(userData) {
        const { username, password, balance, role = 'user', position = '', unit = '', certificate = '', notes = '' } = userData;
        
        const q = query(collection(this.db, 'users'), where('username', '==', username));
        if (!(await getDocs(q)).empty) throw new Error(`Пользователь ${username} уже существует`);
        
        await addDoc(collection(this.db, 'users'), { 
                username, 
                password, 
                balance: parseFloat(balance), 
                role, 
                position,
                unit,
                certificate,
                notes,
                inventory: [] 
        });
    }

    async updateUser(userId, data) {
        const userRef = doc(this.db, 'users', userId);
        const cleanData = Object.fromEntries(
            Object.entries(data).filter(([_, v]) => v !== undefined && v !== '')
        );
        if(cleanData.balance) cleanData.balance = parseFloat(cleanData.balance);
        
        await updateDoc(userRef, cleanData);
    }

    async addItem(itemData) {
        if(!itemData.name || !itemData.price) throw new Error("Invalid item data");
        await addDoc(collection(this.db, 'items'), itemData);
    }

    async deleteItem(itemId) {
        await deleteDoc(doc(this.db, 'items', itemId));
    }

    async deductBalance(username, amount) {
        const q = query(collection(this.db, 'users'), where('username', '==', username));
        const snapshot = await getDocs(q);
        if (snapshot.empty) throw new Error("Пользователь не найден");
        
        await updateDoc(snapshot.docs[0].ref, { 
            balance: increment(-parseFloat(amount)) 
        });
    }

    async getUserData(userId) {
        const snap = await getDoc(doc(this.db, 'users', userId));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    }

    async removeUserItem(userId, itemIndex) {
        const userRef = doc(this.db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) throw new Error("User not found");
        
        const inventory = userSnap.data().inventory || [];
        let removedItem = null;

        if (itemIndex >= 0 && itemIndex < inventory.length) {
            removedItem = inventory[itemIndex];
            inventory.splice(itemIndex, 1);
            await updateDoc(userRef, { inventory });
        }
        return { inventory, removedItem };
    }

    async grantItemToUser(userId, itemData) {
        const userRef = doc(this.db, 'users', userId);
        
        const newItem = {
            itemId: itemData.id || 'custom_admin_gift',
            name: itemData.name,
            type: itemData.type,
            description: itemData.description || 'Выдано командованием',
            images: itemData.images || [],
            imageUrl: itemData.imageUrl || null,
            purchaseDate: new Date().toISOString(),
            uid: crypto.randomUUID()
        };

        await updateDoc(userRef, {
            inventory: arrayUnion(newItem)
        });
    }

    async importSquadData() {
        try {
            // 1. Создание админа (если нет)
            const adminQuery = query(collection(this.db, 'users'), where('role', '==', 'admin'));
            const adminSnap = await getDocs(adminQuery);
            
            if (adminSnap.empty) {
                console.log("Создаем дефолтного админа...");
                await setDoc(doc(this.db, 'users', 'admin_user'), {
                    username: "admin", password: "admin", balance: 999999,
                    role: "admin", position: "Commander", unit: "HQ",
                    certificate: "ROOT", notes: "System Admin",
                    inventory: [], createdAt: new Date().toISOString()
                });
            }

            // 2. Выбор файла (метод теперь внутри класса!)
            const file = await this._pickFile(); 
            const text = await file.text();
            
            // 3. Парсинг
            const rows = this._parseCSV(text);
            if (rows.length < 2) return { count: 0, errors: "Пустой файл" };

            // 4. Подготовка к записи
            const existingUsersSnap = await getDocs(collection(this.db, 'users'));
            const userMap = new Map();
            existingUsersSnap.forEach(doc => userMap.set(doc.data().username, doc.ref));

            let batch = writeBatch(this.db);
            let operationsCount = 0;
            let importCount = 0;

            // Начинаем с 1, пропуская заголовок (Позивний, Посада...)
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 2) continue;

                // === ВАЖНО: МАППИНГ ПОД ВАШ CSV ===
                // Индексы колонок согласно файлу "штатка - Лист1.csv":
                // 0: Позивний (Username)
                // 1: Посада (Position)
                // 2: Підрозділ (Unit)
                // 3: Сертифікат (Certificate)
                // 4: Баланс (Balance)
                // 6: Примітка (Notes) - в CSV она в колонке G
                
                const username = row[0];      // Позивний
                const position = row[1];      // Посада
                const unit = row[2];          // Підрозділ
                const certificate = row[3];   // Сертифікат
                const balanceStr = row[4];    // Баланс
                const notes = row[6];         // Примітка (текст в кавычках)

                if (!username) continue;

                const cleanUsername = username.trim();
                
                // Формируем данные
                const userData = {
                    username: cleanUsername,
                    password: "12345", // Дефолтный пароль, т.к. в CSV его нет
                    balance: balanceStr ? Number(balanceStr.replace(/\s/g, '')) : 0, // Удаляем пробелы если есть
                    role: "user",      // Всем ставим user
                    position: position ? position.trim() : "",
                    unit: unit ? unit.trim() : "",
                    certificate: certificate ? certificate.trim() : "",
                    notes: notes ? notes.trim() : "",
                    updatedAt: new Date().toISOString()
                };

                // Добавляем в батч
                if (userMap.has(cleanUsername)) {
                    const userRef = userMap.get(cleanUsername);
                    batch.update(userRef, userData);
                } else {
                    const newUserRef = doc(collection(this.db, 'users'));
                    userData.createdAt = new Date().toISOString();
                    userData.inventory = [];
                    batch.set(newUserRef, userData);
                }

                importCount++;
                operationsCount++;

                // Отправляем пакетами по 450
                if (operationsCount >= 450) {
                    await batch.commit();
                    batch = writeBatch(this.db);
                    operationsCount = 0;
                }
            }

            // Финальная отправка остатков
            if (operationsCount > 0) {
                await batch.commit();
            }

            console.log(`Импорт завершен: ${importCount} бойцов.`);
            return { count: importCount, errors: 0 };

        } catch (e) {
            console.error("Import error:", e);
            throw e;
        }
    }

    // --- ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ (Теперь корректно внутри класса) ---

    _pickFile() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) resolve(file);
                else reject(new Error("Файл не выбран"));
            };
            input.click();
        });
    }

    _generatePassword(length = 6) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async exportCredentials() {
        const snap = await getDocs(collection(this.db, 'users'));
        const userDocs = snap.docs
            .filter(d => {
                const data = d.data();
                return data.username && data.role !== 'admin';
            })
            .sort((a, b) => a.data().username.localeCompare(b.data().username));

        const results = [];

        for (const userDoc of userDocs) {
            const newPassword = this._generatePassword();
            await updateDoc(doc(this.db, 'users', userDoc.id), { password: newPassword });
            results.push({ username: userDoc.data().username, password: newPassword });
        }

        const header = 'Позивний,Пароль';
        const rows = results.map(u => `${u.username},${u.password}`);
        const csv = [header, ...rows].join('\n');

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `credentials_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        return results.length;
    }

    _parseCSV(text) {
        const rows = [];
        let currentRow = [];
        let currentCell = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentCell += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
                if (currentCell || currentRow.length > 0) {
                    currentRow.push(currentCell.trim());
                    rows.push(currentRow);
                }
                currentRow = [];
                currentCell = '';
                if (char === '\r' && nextChar === '\n') i++;
            } else {
                currentCell += char;
            }
        }
        if (currentCell || currentRow.length > 0) {
            currentRow.push(currentCell.trim());
            rows.push(currentRow);
        }
        return rows;
    }
}

