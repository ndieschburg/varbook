# Varbook Plugin for Calibre

A Calibre plugin that enables sending books to your Varbook server via WebDAV.

## Features

- **Toolbar button**: Quick access to send selected books
- **Batch upload**: Send multiple books at once
- **Progress tracking**: Visual progress during upload
- **Auto-import**: Books are automatically imported with metadata on the server

## Requirements

- Calibre 5.0 or later
- A running Varbook server with WebDAV enabled
- Valid Varbook account credentials

## Installation

### From ZIP file

1. Download `varbook_plugin.zip`
2. Open Calibre
3. Go to **Preferences** → **Plugins**
4. Click **Load plugin from file**
5. Select the downloaded ZIP file
6. Restart Calibre
7. **Add the button to toolbar** (see below)

### Adding the button to toolbar

After installation, the button doesn't appear automatically. You need to add it manually:

1. Go to **Preferences** → **Toolbars & menus**
2. In the dropdown at the top, select **The main toolbar**
3. In the left list "Available actions", find **Varbook**
4. Select it and click **→** to add it to the right list
5. Click **Apply** then **OK**

The Varbook button will now appear in your toolbar.

### From source (development)

```bash
cd calibre_plugin_varbook
./build.sh
# Then install via Calibre UI or:
calibre-debug -c "from calibre.customize.ui import add_plugin; add_plugin('varbook_plugin.zip')"
```

## Configuration

1. Open Calibre
2. Go to **Preferences** → **Plugins**
3. Find "Varbook" under "User Interface Action Plugins"
4. Click **Customize plugin**
5. Enter your Varbook server details:
   - **Server URL**: Your Varbook URL (e.g., `https://varbook.example.com`)
   - **Email**: Your login email
   - **Password**: Your password
6. Click **Test Connection** to verify
7. Click **OK** to save

## Usage

### Sending books

1. Select one or more books in your Calibre library
2. Click the **Varbook** button in the toolbar
3. Books will be uploaded with a progress dialog

Books must have an EPUB format available. The plugin will:
- Upload the EPUB to your Varbook server via WebDAV
- The server automatically extracts metadata and cover
- Books appear in your Varbook library immediately

### Menu options

Click the dropdown arrow on the Varbook button for:
- **Send selected books** - Upload selected books
- **Configure...** - Open plugin settings
- **Test connection** - Verify server connectivity

## Technical Details

### Communication

- **Upload**: WebDAV PUT to `/webdav/Apps/Books/{filename}.epub`
- **Authentication**: HTTP Basic Auth (same credentials as web login)

### File naming

Books are uploaded with the filename format: `Author - Title.epub`

## Troubleshooting

### Button not appearing in toolbar

After installation or reinstallation, you must add the button manually:
1. **Preferences** → **Toolbars & menus**
2. Select **The main toolbar** in the dropdown
3. Find **Varbook** in the left list and add it with **→**
4. Click **Apply**

### Nothing happens when clicking the button

Run Calibre in debug mode to see errors:
```bash
calibre-debug -g
```
Then click the button and check the terminal for `[Varbook]` messages.

### "No EPUB format available"

The plugin only sends EPUB files. Convert your books to EPUB first:
1. Select the book
2. Right-click → **Convert books** → **Convert individually**
3. Choose EPUB as output format

### "Connection failed"

- Check that the server URL is correct (include `https://`)
- Verify your email and password
- Enable "Ignore SSL errors" for self-signed certificates

### "Not Configured"

You need to configure the plugin first:
1. **Preferences** → **Plugins**
2. Find "Varbook" → **Customize plugin**
3. Enter server URL, email, and password

## Development

### Project structure

```
calibre_plugin_varbook/
├── __init__.py          # Plugin entry point (InterfaceActionBase)
├── ui.py                # Toolbar action UI (InterfaceAction)
├── driver.py            # WebDAV/OPDS communication
├── config.py            # Configuration storage and UI
├── images/
│   └── icon.png         # Toolbar icon
├── plugin-import-name-varbook_plugin.txt
├── build.sh             # Build script
└── README.md
```

### Building

```bash
cd calibre_plugin_varbook
./build.sh
# Output: varbook_plugin.zip
```

### Testing changes

```bash
# Rebuild
./build.sh

# Reinstall (remove old version first in Calibre UI)
# Then load the new ZIP via Preferences → Plugins → Load plugin from file

# Run Calibre in debug mode to see plugin output
calibre-debug -g 2>&1 | tee ~/calibre_debug.log
```

### Debug output

The plugin prints debug messages prefixed with `[Varbook]` to stderr.
These are visible when running `calibre-debug -g`.

## License

MIT License

## Credits

Developed for use with Varbook - A personal e-book library manager with Moon+ Reader sync support.
