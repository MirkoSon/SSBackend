module.exports = {
    manifest: {
        name: 'dynamic-plugin',
        version: '1.0.0',
        description: 'A plugin added while the server was running',
        author: 'Hot Add Bot'
    },
    onActivate: async ({ app }) => {
        console.log('🚀 DYNAMIC PLUGIN ACTIVATED IN REAL-TIME!');
        app.get('/api/test/dynamic', (req, res) => {
            res.json({ message: 'Dynamic hot-add works!', time: new Date().toLocaleTimeString() });
        });
    }
};
