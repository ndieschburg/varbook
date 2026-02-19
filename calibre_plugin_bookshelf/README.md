# Bookshelf Device Plugin for Calibre

A Calibre device driver plugin that enables sending books to your Bookshelf server via WebDAV.

## Features

- **Send books to Bookshelf**: Use Calibre's "Send to device" functionality to upload EPUBs
- **Browse library**: View books already on your Bookshelf server via OPDS
- **Automatic import**: Books are automatically imported with metadata extraction on the server
- **Secure**: Uses HTTP Basic Authentication over HTTPS

## Requirements

- Calibre 5.0 or later
- A running Bookshelf server with WebDAV enabled
- Valid Bookshelf account credentials

## Installation

### From ZIP file

1. Download the latest `bookshelf_plugin.zip` from releases
2. Open Calibre
3. Go to **Preferences** → **Plugins**
4. Click **Load plugin from file**
5. Select the downloaded ZIP file
6. Restart Calibre

### From source (development)

```bash
# Navigate to plugin directory
cd calibre_plugin_bookshelf

# Install directly from source
calibre-customize -b .

# Or build ZIP first
./build.sh
calibre-customize -a bookshelf_plugin.zip
```

## Configuration

1. Open Calibre
2. Go to **Preferences** → **Plugins**
3. Find "Bookshelf Device" under "Device Interface Plugins"
4. Click **Customize plugin**
5. Enter your Bookshelf server details:
   - **Server URL**: Your Bookshelf URL (e.g., `https://bookshelf.example.com`)
   - **Email**: Your login email
   - **Password**: Your password
6. Click **Test Connection** to verify
7. Optionally enable **Auto-connect on Calibre startup**

## Usage

### Sending books

1. Connect to Bookshelf:
   - If auto-connect is enabled, Calibre will detect the device automatically
   - Otherwise, go to **Connect/Share** → **Connect to Bookshelf**
2. Select books in your Calibre library
3. Right-click → **Send to device** → **Send to main memory**
4. Books will be uploaded and automatically imported into Bookshelf

### Browsing books

Once connected, you can see books on your Bookshelf server in the device view panel.

## Technical Details

### Communication

- **Upload**: WebDAV PUT to `/webdav/Apps/Books/{filename}.epub`
- **List books**: OPDS feed from `/opds/all`
- **Authentication**: HTTP Basic Auth (same credentials as web login)

### Supported formats

- EPUB (primary format)

## Troubleshooting

### "Authentication failed"

- Verify your email and password are correct
- Make sure you're using the same credentials as the Bookshelf web interface

### "Connection failed"

- Check that the server URL is correct and accessible
- Ensure HTTPS is working (or enable "Ignore SSL errors" for self-signed certs)
- Verify the Bookshelf server is running

### Books not appearing after upload

- Check the Bookshelf server logs for import errors
- Ensure the EPUB file is valid
- Try refreshing the Bookshelf library page

## Development

### Project structure

```
calibre_plugin_bookshelf/
├── __init__.py                          # Main plugin class
├── driver.py                            # WebDAV/OPDS driver
├── config.py                            # Configuration UI
├── plugin-import-name-bookshelf_plugin.txt
├── images/
│   └── icon.png                         # Plugin icon
├── build.sh                             # Build script
└── README.md
```

### Testing changes

```bash
# Install from source
calibre-customize -b /path/to/calibre_plugin_bookshelf

# Run Calibre in debug mode
calibre-debug -g
```

### Building a release

```bash
cd calibre_plugin_bookshelf
./build.sh
# Output: bookshelf_plugin.zip
```

## License

MIT License - See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `calibre-debug -g`
5. Submit a pull request

## Credits

Developed for use with [Bookshelf](https://github.com/your/bookshelf) - A personal e-book library manager.
