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
