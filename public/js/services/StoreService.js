import {
    collection, getDocs, doc, query, where,
    runTransaction, arrayUnion, increment
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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
