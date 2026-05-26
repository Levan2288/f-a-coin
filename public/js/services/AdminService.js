import {
    collection, addDoc, getDocs, doc, updateDoc,
    deleteDoc, query, where, setDoc, arrayUnion,
    increment, getDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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

    async updateItem(itemId, data) {
        const itemRef = doc(this.db, 'items', itemId);
        const cleanData = Object.fromEntries(
            Object.entries(data).filter(([_, v]) => v !== undefined && v !== '')
        );
        if (cleanData.price !== undefined) cleanData.price = parseFloat(cleanData.price);

        await updateDoc(itemRef, cleanData);
    }

    async getItem(itemId) {
        const snap = await getDoc(doc(this.db, 'items', itemId));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
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

            const file = await this._pickFile();
            const text = await file.text();

            const rows = this._parseCSV(text);
            if (rows.length < 2) return { count: 0, errors: "Пустой файл" };

            const existingUsersSnap = await getDocs(collection(this.db, 'users'));
            const userMap = new Map();
            existingUsersSnap.forEach(doc => userMap.set(doc.data().username, doc.ref));

            let batch = writeBatch(this.db);
            let operationsCount = 0;
            let importCount = 0;

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 2) continue;

                const username = row[0];
                const position = row[1];
                const unit = row[2];
                const certificate = row[3];
                const balanceStr = row[4];
                const notes = row[6];

                if (!username) continue;

                const cleanUsername = username.trim();

                const userData = {
                    username: cleanUsername,
                    password: "12345",
                    balance: balanceStr ? Number(balanceStr.replace(/\s/g, '')) : 0,
                    role: "user",
                    position: position ? position.trim() : "",
                    unit: unit ? unit.trim() : "",
                    certificate: certificate ? certificate.trim() : "",
                    notes: notes ? notes.trim() : "",
                    updatedAt: new Date().toISOString()
                };

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

                if (operationsCount >= 450) {
                    await batch.commit();
                    batch = writeBatch(this.db);
                    operationsCount = 0;
                }
            }

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
