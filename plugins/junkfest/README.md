# Hello World Plugin

A minimal example plugin demonstrating the basic SSBackend plugin structure.

## Features

- Simple GET endpoint
- URL parameter handling
- Basic lifecycle hooks

## Admin UI Integration

SSBackend supports dynamic admin UI discovery. To add a dashboard for your plugin:

1.  **Define `adminUI` in `manifest` (index.js)**:
    ```javascript
    adminUI: {
      enabled: true,
      modulePath: './ui/helloWorld.module.js', // Path relative to plugin root
      navigation: {
        label: 'Hello World',
        icon: '👋',
        group: 'plugins',
        priority: 50
      }
    }
    ```

2.  **Create your UI Module**:
    Export a `PluginView` class from your module. The dashboard will instantiate it and call `render()`.
    ```javascript
    export class PluginView {
        constructor(container) {
            this.container = container;
        }

        async render() {
            this.container.innerHTML = `
                <div class="card-container">
                    <h2>Hello from World!</h2>
                    <p>This UI was loaded dynamically.</p>
                </div>
            `;
        }
    }
    ```

## Installation

This plugin is included in `plugins/@examples/`. To use it:

1. Copy to `plugins/hello-world/` (remove from @examples)
2. Add to `config.yml`:

```yaml
plugins:
  hello-world:
    enabled: true
    type: external
    path: ./plugins/hello-world
```

3. Restart server

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/hello` | Returns a greeting message |
| GET | `/hello/:name` | Returns a personalized greeting |

## Examples

```bash
# Basic greeting
curl http://localhost:3012/hello
# Response: {"message":"Hello from the hello-world plugin!","plugin":"hello-world","timestamp":"..."}

# Personalized greeting
curl http://localhost:3012/hello/John
# Response: {"message":"Hello, John!","greeting":"Welcome to SSBackend, John...","timestamp":"..."}
```

## Code Structure

```
hello-world/
├── index.js           # Plugin entry point with manifest
├── routes/
│   ├── hello.js       # GET /hello handler
│   └── helloName.js   # GET /hello/:name handler
└── README.md
```

## Learning Points

This example demonstrates:

1. **Manifest**: Minimal required fields (name, version, description, author)
2. **Routes**: Array of route definitions with method, path, and handler
3. **Handlers**: Simple functions receiving (req, res) with pluginContext
4. **Lifecycle**: Optional onLoad, onActivate, onDeactivate hooks
