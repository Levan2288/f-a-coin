import {
    collection, addDoc, getDocs
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

    async getAllLogs() {
        const snap = await getDocs(collection(this.db, 'logs'));
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(log => log.type === 'purchase')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
}
