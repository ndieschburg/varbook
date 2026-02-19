#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Bookshelf Device Driver Plugin for Calibre

This plugin enables Calibre to send books to a Bookshelf server via WebDAV.
It also allows browsing and downloading books from the server via OPDS.
"""

from calibre.customize import DevicePlugin


class BookshelfDevicePlugin(DevicePlugin):
    """
    Main plugin class for Bookshelf integration.
    """

    name = 'Bookshelf Device'
    description = 'Send and manage books on your Bookshelf server via WebDAV/OPDS'
    author = 'Bookshelf'
    version = (1, 0, 0)
    minimum_calibre_version = (5, 0, 0)

    supported_platforms = ['windows', 'osx', 'linux']

    # Device identification
    VENDOR_ID = 0xFFFF
    PRODUCT_ID = 0x0001
    BCD = None

    # We manage our own device presence (network device, not USB)
    MANAGES_DEVICE_PRESENCE = True

    # Supported formats (in order of preference)
    FORMATS = ['epub']

    # Metadata we can handle
    CAN_SET_METADATA = ['title', 'authors']

    # We don't need USB detection
    SUPPORTS_SUB_DIRS = False

    # Icon for the device
    icon = 'images/icon.png'

    # Configuration
    EXTRA_CUSTOMIZATION_MESSAGE = None
    EXTRA_CUSTOMIZATION_DEFAULT = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._device_info = None
        self._books_cache = None
        self._connected = False

    @classmethod
    def _config(cls):
        """Get configuration instance."""
        from calibre_plugins.bookshelf_plugin.config import BookshelfConfig
        return BookshelfConfig()

    def genesis(self):
        """Called once when the plugin is loaded."""
        pass

    def startup(self):
        """Called when calibre starts."""
        pass

    def shutdown(self):
        """Called when calibre is about to shutdown."""
        self._connected = False
        self._books_cache = None

    # ========== Device Detection ==========

    def detect_managed_devices(self, devices_on_system, force_refresh=False):
        """
        Called periodically to detect if our device is connected.
        For a network device, we check if the server is reachable.
        """
        config = self._config()
        if not config.server_url:
            return None

        if not config.auto_connect and not force_refresh:
            return None

        # Try to connect to the server
        from calibre_plugins.bookshelf_plugin.driver import BookshelfDriver
        driver = BookshelfDriver(config)

        if driver.test_connection():
            return config.server_url

        return None

    def debug_managed_device_detection(self, devices_on_system, output):
        """Output debug information about device detection."""
        config = self._config()
        output.write(f"Bookshelf server URL: {config.server_url}\n")
        output.write(f"Auto-connect enabled: {config.auto_connect}\n")

        if config.server_url:
            from calibre_plugins.bookshelf_plugin.driver import BookshelfDriver
            driver = BookshelfDriver(config)
            if driver.test_connection():
                output.write("Connection test: SUCCESS\n")
            else:
                output.write("Connection test: FAILED\n")

    # ========== Connection Management ==========

    def reset(self, key='-1', log_packets=False, report_progress=None,
              detected_device=None):
        """Initialize communication with the device."""
        self._connected = False
        self._books_cache = None

        config = self._config()
        from calibre_plugins.bookshelf_plugin.driver import BookshelfDriver
        self._driver = BookshelfDriver(config)

        if self._driver.test_connection():
            self._connected = True
            self._device_info = {
                'server': config.server_url,
                'user': config.email
            }

    def open(self, connected_device, library_uuid):
        """Open connection to the device."""
        self.reset(detected_device=connected_device)

    def eject(self):
        """Disconnect from the device."""
        self._connected = False
        self._books_cache = None
        self._driver = None

    def post_yank_cleanup(self):
        """Cleanup after unexpected disconnection."""
        self.eject()

    def is_usb_connected(self, devices_on_system, debug=False,
                         only_presence=False):
        """Not used for network devices."""
        return False, None

    def can_handle(self, device_info, debug=False):
        """Check if we can handle this device."""
        return True

    # ========== Device Information ==========

    def get_device_information(self, end_session=True):
        """Return device information."""
        config = self._config()
        return (
            'Bookshelf',
            config.server_url or 'Not configured',
            config.server_url or '',
            ''
        )

    def get_device_uid(self):
        """Return unique device identifier."""
        config = self._config()
        return f"bookshelf:{config.server_url}"

    def card_prefix(self, end_session=True):
        """Return card prefixes. We don't support cards."""
        return (None, None)

    def total_space(self, end_session=True):
        """Return total space on device."""
        # Return dummy values since we don't track server space
        return (1024 * 1024 * 1024 * 10, 0, 0)  # 10GB, no cards

    def free_space(self, end_session=True):
        """Return free space on device."""
        return (1024 * 1024 * 1024 * 5, 0, 0)  # 5GB free

    # ========== Book Management ==========

    def books(self, oncard=None, end_session=True):
        """Return list of books on device."""
        if oncard:
            return []

        if not self._connected:
            return []

        if self._books_cache is None:
            self._books_cache = self._driver.get_books()

        return self._books_cache

    def upload_books(self, files, names, on_card=None, end_session=True,
                     metadata=None):
        """Upload books to the device."""
        if not self._connected:
            raise Exception("Not connected to Bookshelf server")

        results = []
        for i, (filepath, name) in enumerate(zip(files, names)):
            meta = metadata[i] if metadata else None
            try:
                result = self._driver.upload_book(filepath, name, meta)
                results.append(result)
            except Exception as e:
                print(f"Error uploading {name}: {e}")
                results.append((False, str(e)))

        # Invalidate cache
        self._books_cache = None

        return results

    def delete_books(self, paths, end_session=True):
        """Delete books from device."""
        if not self._connected:
            raise Exception("Not connected to Bookshelf server")

        for path in paths:
            try:
                self._driver.delete_book(path)
            except Exception as e:
                print(f"Error deleting {path}: {e}")

        # Invalidate cache
        self._books_cache = None

    def remove_books_from_metadata(self, paths, booklists):
        """Update metadata after book removal."""
        for path in paths:
            for bl in booklists:
                for book in list(bl):
                    if book.path == path:
                        bl.remove(book)

    def add_books_to_metadata(self, locations, metadata, booklists):
        """Update metadata after book upload."""
        from calibre.ebooks.metadata.book.base import Metadata

        for location, mi in zip(locations, metadata):
            if location[0]:  # Success
                book = Metadata(mi.title, mi.authors)
                book.path = location[1] if len(location) > 1 else mi.title
                booklists[0].append(book)

    def sync_booklists(self, booklists, end_session=True):
        """Sync book lists with device."""
        # Refresh the cache
        self._books_cache = None
        if self._connected:
            self._books_cache = self._driver.get_books()

    # ========== Configuration ==========

    def is_customizable(self):
        """Allow user configuration."""
        return True

    def config_widget(self):
        """Return configuration widget."""
        from calibre_plugins.bookshelf_plugin.config import ConfigWidget
        return ConfigWidget()

    def save_settings(self, config_widget):
        """Save configuration from widget."""
        config_widget.save_settings()

    @classmethod
    def settings(cls):
        """Get current settings."""
        return cls._config()
