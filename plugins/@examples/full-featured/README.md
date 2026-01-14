# Notes Plugin (Full-Featured Example)

A comprehensive example plugin demonstrating all SSBackend plugin capabilities.

## Features

- Complete CRUD operations
- Authentication middleware
- Database with relationships
- Service layer pattern
- Configuration options
- Error handling
- Public/private notes
- Admin UI Dashboard with ActionRegistry integration

## Installation

1. Copy to `plugins/notes/`
2. Add to `config.yml`:

```yaml
plugins:
  notes:
    enabled: true
    type: external
    path: ./plugins/notes
    settings:
      maxNotesPerUser: 100
      allowPublicNotes: true
      maxNoteLength: 5000
```

3. Restart server

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notes` | Yes | List user's notes |
| GET | `/notes/:id` | Yes | Get a specific note |
| POST | `/notes` | Yes | Create a note |
| PUT | `/notes/:id` | Yes | Update a note |
| DELETE | `/notes/:id` | Yes | Delete a note |
| GET | `/notes/public/all` | No | List public notes |

## Request/Response Examples

### Create Note

```bash
curl -X POST http://localhost:3012/notes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Note",
    "content": "This is the content",
    "is_public": false,
    "tags": ["personal", "example"]
  }'
```

Response:
```json
{
  "note": {
    "id": 1,
    "user_id": 1,
    "title": "My First Note",
    "content": "This is the content",
    "is_public": false,
    "created_at": "2026-01-14T10:00:00.000Z",
    "updated_at": "2026-01-14T10:00:00.000Z",
    "tags": ["personal", "example"]
  },
  "message": "Note created successfully"
}
```

### List Notes

```bash
curl http://localhost:3012/notes \
  -H "Authorization: Bearer <token>"
```

### Update Note

```bash
curl -X PUT http://localhost:3012/notes/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'
```

### Delete Note

```bash
curl -X DELETE http://localhost:3012/notes/1 \
  -H "Authorization: Bearer <token>"
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxNotesPerUser` | number | 100 | Maximum notes per user |
| `allowPublicNotes` | boolean | true | Allow public notes |
| `maxNoteLength` | number | 5000 | Max characters per note |

## Database Schema

### plugin_notes

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| user_id | INTEGER | Owner (FK to users) |
| title | TEXT | Note title |
| content | TEXT | Note content |
| is_public | BOOLEAN | Public visibility |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

### plugin_notes_tags

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| note_id | INTEGER | FK to plugin_notes |
| tag | TEXT | Tag name |

## Code Structure

```
full-featured/
├── index.js                 # Plugin entry point
├── services/
│   └── NoteService.js       # Business logic
├── routes/
│   ├── list.js              # GET /notes
│   ├── get.js               # GET /notes/:id
│   ├── create.js            # POST /notes
│   ├── update.js            # PUT /notes/:id
│   ├── delete.js            # DELETE /notes/:id
│   └── public.js            # GET /notes/public/all
└── README.md
```

## Learning Points

This example demonstrates:

1. **Complete Manifest**: All fields including config schema
2. **CRUD Routes**: Full REST API with all HTTP methods
3. **Authentication**: Using `auth` middleware
4. **Database**: Multiple tables with foreign keys
5. **Service Layer**: Business logic separated from handlers
6. **Configuration**: Reading settings from config.yml
7. **Error Handling**: Proper HTTP status codes
8. **Validation**: Input validation in service layer
9. **Indexes**: Database performance optimization

## Error Handling

The plugin returns appropriate HTTP status codes:

- `400` - Bad request (validation errors)
- `403` - Forbidden (authorization errors, limits)
- `404` - Not found
- `500` - Server error

All errors include a message explaining the issue.
