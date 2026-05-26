import {
    collection, query, where, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

import { signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

export class AuthService {
    constructor(db, auth) {
        this.db = db;
        this.auth = auth;
        this.currentUser = null;
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

            const snap = await getDoc(doc(this.db, 'users', uid));
            if (!snap.exists()) {
                this.logout();
                return false;
            }
            this.currentUser = { id: snap.id, ...snap.data() };
            return true;
        } catch (e) {
            return false;
        }
    }
}
