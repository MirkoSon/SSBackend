export const achievementsApi = {
    async getAll() {
        const res = await fetch('/admin/api/plugins/achievements/achievements');
        if (!res.ok) throw new Error('Failed to fetch achievements');
        return res.json();
    },

    async create(data) {
        const res = await fetch('/admin/api/plugins/achievements/achievements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create achievement');
        return res.json();
    },

    async update(id, data) {
        const res = await fetch(`/admin/api/plugins/achievements/achievements/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update achievement');
        return res.json();
    },

    async delete(id) {
        const res = await fetch(`/admin/api/plugins/achievements/achievements/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete achievement');
        return res.json();
    }
};
