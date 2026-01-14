/**
 * Hello World Plugin
 *
 * A minimal example plugin demonstrating the basic structure.
 * This plugin adds a simple /hello endpoint.
 */

const manifest = {
  name: 'hello-world',
  version: '1.0.0',
  description: 'A minimal example plugin that says hello',
  author: 'SSBackend Examples'
};

const routes = [
  {
    method: 'GET',
    path: '/hello',
    handler: './routes/hello.js'
  },
  {
    method: 'GET',
    path: '/hello/:name',
    handler: './routes/helloName.js'
  }
];

async function onLoad(context) {
  console.log('👋 Hello World plugin loading...');
}

async function onActivate(context) {
  console.log('👋 Hello World plugin activated!');
}

async function onDeactivate(context) {
  console.log('👋 Hello World plugin deactivated. Goodbye!');
}

module.exports = {
  manifest,
  routes,
  onLoad,
  onActivate,
  onDeactivate
};
