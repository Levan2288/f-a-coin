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

    // --- НОВОЕ: Обновление данных пользователя ---
    async updateUser(userId, data) {
        const userRef = doc(this.db, 'users', userId);
        // Фильтруем undefined поля
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
        if (itemIndex >= 0 && itemIndex < inventory.length) {
            inventory.splice(itemIndex, 1);
            await updateDoc(userRef, { inventory });
        }
        return inventory;
    }

    // --- НОВОЕ: Выдача предмета (из магазина или кастомного) ---
    async grantItemToUser(userId, itemData) {
        const userRef = doc(this.db, 'users', userId);
        
        const newItem = {
            itemId: itemData.id || 'custom_admin_gift',
            name: itemData.name,
            type: itemData.type,
            description: itemData.description || 'Выдано командованием',
            imageUrl: itemData.imageUrl || null,
            purchaseDate: new Date().toISOString(),
            uid: crypto.randomUUID()
        };

        await updateDoc(userRef, {
            inventory: arrayUnion(newItem)
        });
    }

    async importSquadData() {
        const squad = []; 
        let count = 0;
        let errors = 0;
        return { count, errors };
    }
}