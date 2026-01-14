module.exports = {
    manifest: {
        name: 'hot-add-test',
        version: '1.0.0',
        description: 'A plugin for testing hot-add functionality',
        author: 'Test Bot'
    },
    onActivate: async ({ app }) => {
        console.log('🔥 Hot-add-test plugin ACTIVATED!');
        app.get('/api/test/hot-add', (req, res) => {
            res.json({ message: 'Hot-add works!', timestamp: new Date() });
        });
    }
};
