import {
    collection, addDoc, getDocs, query, where, orderBy, limit
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

export class LogsService {
    constructor(db) {
        this.db = db;
    }

    async addLog(eventData) {
        try {
            await addDoc(collection(this.db, 'logs'), {
                ...eventData,
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            console.error("Failed to write log:", e);
        }
    }

    async getAllLogs(maxRecords = 200) {
        const q = query(
            collection(this.db, 'logs'),
            where('type', '==', 'purchase'),
            orderBy('timestamp', 'desc'),
            limit(maxRecords)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
}
