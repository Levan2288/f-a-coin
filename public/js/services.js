import { 
    collection, addDoc, getDocs, doc, updateDoc, 
    deleteDoc, query, where, runTransaction, 
    onSnapshot, setDoc, arrayUnion, increment, getDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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
    constructor(db) {
        this.db = db;
        this.currentUser = null;
        this.userListenerUnsubscribe = null;
    }

    async login(username, password) {
        try {
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

    logout() {
        this.currentUser = null;
        localStorage.removeItem('voentorg_session');
        if(this.userListenerUnsubscribe) this.userListenerUnsubscribe();
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

    async buyItem(userId, item) {
        if (!userId) throw new Error("Unauthorized");
        
        return runTransaction(this.db, async (transaction) => {
            const userRef = doc(this.db, 'users', userId);
            const userDoc = await transaction.get(userRef);
            
            if (!userDoc.exists()) throw "User error";
            
            const currentBalance = userDoc.data().balance || 0;
            if (currentBalance < item.price) throw "Недостаточно средств";

            const newItem = {
                itemId: item.id,
                name: item.name,
                type: item.type,
                description: item.description,
                imageUrl: item.imageUrl || null,
                purchaseDate: new Date().toISOString(),
                uid: crypto.randomUUID()
            };

            transaction.update(userRef, { 
                balance: currentBalance - item.price,
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

    async getUserInventory(userId) {
        const snap = await getDoc(doc(this.db, 'users', userId));
        return snap.exists() ? { inventory: snap.data().inventory || [], username: snap.data().username } : null;
    }

    async removeUserItem(userId, itemIndex) {
        const userRef = doc(this.db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) throw new Error("User not found");
        
        const inventory = userSnap.data().inventory || [];
        if (itemIndex >= 0 && itemIndex < inventory.length) {
            inventory.splice(itemIndex, 1);
            await updateDoc(userRef, { inventory });
        }
        return inventory;
    }

    // МЕТОД ДЛЯ МАССОВОГО ИМПОРТА (ПОЛНЫЙ СПИСОК)
    async importSquadData() {
        const squad = [
            { username: "К-п Біткоїн", position: "Командир роти", unit: "Управління роти", certificate: "Засновник", balance: 185, notes: "Ти йому слово, а він тобі курси" },
            { username: "С-нт Делі", position: "Медик-інструктор", unit: "Управління роти", certificate: "Засновник", balance: 590, notes: "Найгарніший учасник проекту:)" },
            { username: "С-нт Фішер", position: "Командир відділення", unit: "1 відділення 1 взвод", certificate: "Пісочний", balance: 505, notes: "Має здібності в командуванні O\\C" },
            { username: "Ст.солд. Віхрь", position: "Зам.ком.", unit: "2 відділення 1 взвод", certificate: "Пісочний", balance: 0, notes: "Гарно володіє будь якою зброєю" },
            { username: "С-нт Бумер", position: "Командир відділення", unit: "1 відділення 2 взвод", certificate: "Пісочний", balance: 0, notes: "Швидко вчиться, прагне вивчате нове" },
            { username: "С-нт Чех", position: "Командир відділення", unit: "3 відділення 2 взвод", certificate: "Пісочний", balance: 0, notes: "Подяка за допомогу ПВК" },
            { username: "Ст.солд. Ванвей", position: "Зам.ком.", unit: "3 відділення 1 взвод", certificate: "Пісочний", balance: 0, notes: "Має здібність вводити ворога в оману" },
            { username: "Солд. Мусон", position: "Кулеметник", unit: "1 відділення 1 взвод", certificate: "Пісочний", balance: 15, notes: "Любить горіхи з беконом" },
            { username: "Солд. Блендік", position: "Стрілець-санітар", unit: "2 відділення 2 взвод", certificate: "Інт.", balance: 0, notes: "Майбутній офіцер" },
            { username: "Мл.с-нт Коп", position: "Командир бойової машини", unit: "3 відділення 1 взвод", certificate: "Інт.", balance: 0, notes: "" },
            { username: "Ст.солд. Тюр", position: "Зам.ком.", unit: "3 відділення 2 взвод", certificate: "Пісочний", balance: 120, notes: "" },
            { username: "Солд. Колумб", position: "Стрілець-санітар", unit: "1 відділення 2 взвод", certificate: "Червоний", balance: 0, notes: "" },
            { username: "Гол.с-нт Смола", position: "Головний сержант роти", unit: "Управління роти", certificate: "Пісочний", balance: 50, notes: "Має здібності в командуванні O\\C, інструктор" },
            { username: "Ст.солд. Яр", position: "Зам.ком.", unit: "2 відділення 2 взвод", certificate: "Пісочний", balance: 0, notes: "Не панікує, приймає виважені рішення" },
            { username: "Солд. Гоша", position: "Стрілець-санітар", unit: "1 відділення 1 взвод", certificate: "Пісочний", balance: 0, notes: "Має здібності в командуванні O\\C" },
            { username: "Мл.с-нт Тайфун", position: "Командир бойової машини", unit: "2 відділення 1 взвод", certificate: "Пісочний", balance: 55, notes: "" },
            { username: "Солд. Фішерман", position: "Стрілець", unit: "1 відділення 1 взвод", certificate: "Пісочний", balance: 100, notes: "" },
            { username: "Солд. Вова", position: "Стрілець", unit: "2 відділення 2 взвод", certificate: "Пісочний", balance: 0, notes: "" },
            { username: "Л-нт Серб", position: "Командир взводу", unit: "Управління 2 взвод", certificate: "Пісочний", balance: 680, notes: "Вмілий снайпер, спонсор ПВК" },
            { username: "Ст. солд. Аттіла", position: "Зам.ком.", unit: "1 відділення 1 взвод", certificate: "Червоний", balance: 580, notes: "Прагне вчитись новому" },
            { username: "Л-нт Дітто", position: "Командир взводу", unit: "Управління 1 взвод", certificate: "Пісочний", balance: 5, notes: "Має здібності в командуванні O\\C" },
            { username: "Ст.солд. Растіч", position: "Зам.ком.", unit: "1 відділення 2 взвод", certificate: "Пісочний", balance: 0, notes: "" },
            { username: "Солд. Рижий", position: "Снайпер", unit: "3 відділення 2 взвод", certificate: "Пісочний", balance: 115, notes: "" },
            { username: "Мл.с-нт Бродяга", position: "Командир бойової машини", unit: "1 відділення 2 взвод", certificate: "Пісочний", balance: 0, notes: "Любить техніку" },
            { username: "С-нт Віста", position: "Командир відділення БпЛА", unit: "Відділення удар. БпЛА", certificate: "Пісочний", balance: 290, notes: "Вмілий оператор БПЛА" },
            { username: "С-нт Лєвант", position: "Командир відділення", unit: "2 відділення 1 взвод", certificate: "Червоний", balance: 2245, notes: "Дисциплінований, спонсор ПВК" },
            { username: "Мл.с-нт Волинский", position: "Командир бойової машини", unit: "2 відділення 2 взвод", certificate: "Синій", balance: 0, notes: "" },
            { username: "Солд. Костян", position: "Оператор БпЛА", unit: "Відділення удар. БпЛА", certificate: "Синій", balance: 475, notes: "Має здібності в командуванні O\\C" },
            { username: "Солд. Плєбс", position: "Стрілець", unit: "2 відділення 2 взвод", certificate: "Синій", balance: 0, notes: "" },
            { username: "С-нт Калькулятор", position: "Командир відділення", unit: "3 відділення 1 взвод", certificate: "Червоний", balance: 345, notes: "" },
            { username: "Мл.с-нт Осьотр", position: "Командир бойової машини", unit: "3 відділення 2 взвод", certificate: "Синій", balance: 25, notes: "" },
            { username: "Ст.с-нт Азов", position: "Головний сержант взводу", unit: "Управління 1 взвод", certificate: "Червоний", balance: 195, notes: "" },
            { username: "Солд. Стасутка", position: "Гранатометник", unit: "3 відділення 2 взвод", certificate: "Синій", balance: 0, notes: "" },
            { username: "Солд. Алекс", position: "Гранатометник", unit: "2 відділення 1 взвод", certificate: "Синій", balance: 295, notes: "" },
            { username: "Солд. Ересь", position: "Снайпер", unit: "3 відділення 1 взвод", certificate: "Червоний", balance: 50, notes: "" },
            { username: "Солд. Камік", position: "Оператор БпЛА", unit: "Відділення удар. БпЛА", certificate: "Синій", balance: 510, notes: "" },
            { username: "Солд. Фанта", position: "Стрілець", unit: "2 відділення 1 взвод", certificate: "Синій", balance: 0, notes: "" },
            { username: "С-нт Хітбокс", position: "Медик", unit: "Управління 2 взвод", certificate: "Червоний", balance: 780, notes: "" },
            { username: "Ст.с-нт Віто", position: "Головний сержант взводу", unit: "Управління 2 взвод", certificate: "Червоний", balance: 1150, notes: "Думав що попав в еліту НАТО, а тут все по рідному-ху**вому" },
            { username: "Солд. Саламандра", position: "Стрілець-санітар", unit: "2 відділення 1 взвод", certificate: "Червоний", balance: 0, notes: "" },
            { username: "Солд. Студент", position: "Гранатометник", unit: "3 відділення 1 взвод", certificate: "Синій", balance: 0, notes: "" },
            { username: "Солд. Вано", position: "Стрілець-санітар", unit: "3 відділення 1 взвод", certificate: "Синій", balance: 50, notes: "" },
            { username: "С-нт Вервольф", position: "Медик", unit: "Управління 1 взвод", certificate: "Синій", balance: 190, notes: "" },
            { username: "Солд. Зевс", position: "Кулеметник", unit: "3 відділення 1 взвод", certificate: "Синій", balance: 0, notes: "" },
            { username: "Солд. Ікарус", position: "Гранатометник", unit: "2 відділення 2 взвод", certificate: "Синій", balance: 425, notes: "" },
            { username: "Солд. Сталкер", position: "Стрілець-санітар", unit: "3 відділення 2 взвод", certificate: "Синій", balance: 0, notes: "" },
            { username: "Мл.с-нт Аптекарь", position: "Командир бойової машини", unit: "1 відділення 1 взвод", certificate: "Синій", balance: 0, notes: "" },
            { username: "Солд. Путнік", position: "Стрілець", unit: "2 відділення 1 взвод", certificate: "Червоний", balance: 55, notes: "" },
            { username: "Солд. Артік", position: "Кулеметник", unit: "3 відділення 2 взвод", certificate: "Синій", balance: 0, notes: "" },
            { username: "Солд. Лінкер", position: "Стрілець", unit: "1 відділення 1 взвод", certificate: "Синій", balance: 100, notes: "" },
            { username: "С-нт Фенікс", position: "Командир відділення", unit: "2 відділення 2 взвод", certificate: "Синій", balance: 1000, notes: "" },
            { username: "Солд. Малий", position: "Кулеметник", unit: "1 відділення 2 взвод", certificate: "Червоний", balance: 350, notes: "" },
            { username: "Солд. Фрідік", position: "Стрілець", unit: "1 відділення 2 взвод", certificate: "Синій", balance: 25, notes: "" },
            { username: "Солд. Саша", position: "Стрілець", unit: "1 відділення 2 взвод", certificate: "Синій", balance: 25, notes: "" },
            { username: "Солд. Ворон", position: "Стрілець", unit: "Відділення удар. БпЛА", certificate: "Синій", balance: 115, notes: "Так, а коли запуск сервера?" },
            { username: "Солд. Новлс", position: "Водій", unit: "Відділення удар. БпЛА", certificate: "Синій", balance: 1325, notes: "" },
            { username: "Солд. Нюк", position: "Водій", unit: "Управління роти", certificate: "Синій", balance: 0, notes: "" }
        ];

        let count = 0;
        let errors = 0;
        
        console.group("=== Squad Import Logs (Passwords) ===");
        
        for (const u of squad) {
            try {
                // Генерация случайного пароля (6 символов, буквы и цифры)
                const randomPassword = Math.random().toString(36).slice(-6);
                
                await this.createUser({
                    ...u,
                    password: randomPassword, 
                    role: "user"
                });
                
                // Логируем пароль в консоль, чтобы админ мог их видеть
                console.log(`User: ${u.username} | Pass: ${randomPassword}`);
                count++;
            } catch (e) {
                console.warn(`Skipped ${u.username}: ${e.message}`);
                errors++;
            }
        }
        console.groupEnd();
        
        return { count, errors };
    }
}