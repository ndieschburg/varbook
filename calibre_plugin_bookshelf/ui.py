#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Bookshelf UI - InterfaceAction for Calibre toolbar.
"""

import sys
from calibre.gui2.actions import InterfaceAction
from calibre.gui2 import error_dialog, info_dialog, warning_dialog

try:
    from qt.core import QMenu, QProgressDialog
except ImportError:
    from PyQt5.Qt import QMenu, QProgressDialog

# load_translations and get_icons are injected by calibre plugin loader
try:
    load_translations()
except NameError:
    pass


def debug_print(*args):
    """Print debug messages to calibre debug console."""
    print('[Bookshelf]', *args, file=sys.stderr)
    sys.stderr.flush()


class BookshelfAction(InterfaceAction):
    """
    Toolbar action for sending books to Bookshelf.
    """

    name = 'Bookshelf'
    action_spec = ('Bookshelf', None, 'Send books to Bookshelf server', None)
    action_type = 'current'
    popup_type = QMenu.MenuButtonPopup if hasattr(QMenu, 'MenuButtonPopup') else 1

    def genesis(self):
        """Called when plugin is loaded."""
        debug_print('genesis() called')

        # Set icon - get_icons is injected by calibre
        try:
            icon = get_icons('images/icon.png', 'Bookshelf')
            self.qaction.setIcon(icon)
        except Exception as e:
            debug_print(f'Could not set icon: {e}')

        # Connect main action
        self.qaction.triggered.connect(self.toolbar_button_clicked)

        # Create dropdown menu
        self.menu = QMenu(self.gui)
        self.menu.addAction('Send selected books', self.send_selected_books)
        self.menu.addAction('Configure...', self.show_configuration)
        self.menu.addSeparator()
        self.menu.addAction('Test connection', self.test_connection)
        self.qaction.setMenu(self.menu)

        debug_print('genesis() complete')

    def toolbar_button_clicked(self):
        """Called when toolbar button is clicked."""
        debug_print('toolbar_button_clicked()')
        self.send_selected_books()

    def send_selected_books(self):
        """Send selected books to Bookshelf."""
        debug_print('send_selected_books() called')

        try:
            from calibre_plugins.bookshelf_plugin.config import BookshelfConfig
            from calibre_plugins.bookshelf_plugin.driver import BookshelfDriver
        except Exception as e:
            debug_print(f'Import error: {e}')
            error_dialog(
                self.gui,
                'Plugin Error',
                f'Could not load plugin modules: {e}',
                show=True
            )
            return

        config = BookshelfConfig()

        if not config.is_configured():
            debug_print('Not configured')
            error_dialog(
                self.gui,
                'Not Configured',
                'Please configure the Bookshelf plugin first.',
                det_msg='Go to Preferences → Plugins → Bookshelf → Customize plugin',
                show=True
            )
            return

        # Get selected book IDs
        rows = self.gui.library_view.selectionModel().selectedRows()
        if not rows:
            debug_print('No selection')
            error_dialog(
                self.gui,
                'No Selection',
                'Please select one or more books to send.',
                show=True
            )
            return

        book_ids = list(map(self.gui.library_view.model().id, rows))
        db = self.gui.current_db.new_api
        debug_print(f'Sending {len(book_ids)} book(s)')

        # Create driver
        driver = BookshelfDriver(config)

        # Test connection first
        if not driver.test_connection():
            debug_print('Connection failed')
            error_dialog(
                self.gui,
                'Connection Failed',
                'Could not connect to Bookshelf server.',
                det_msg='Check your server URL and credentials in plugin settings.',
                show=True
            )
            return

        # Progress dialog
        progress = QProgressDialog(
            'Sending books to Bookshelf...',
            'Cancel',
            0, len(book_ids),
            self.gui
        )
        progress.setWindowTitle('Bookshelf')
        progress.setMinimumDuration(0)
        progress.setValue(0)
        progress.show()

        success_count = 0
        error_messages = []

        for i, book_id in enumerate(book_ids):
            if progress.wasCanceled():
                break

            # Get book info
            mi = db.get_metadata(book_id)
            title = mi.title
            debug_print(f'Processing: {title}')

            progress.setLabelText(f'Sending: {title}')

            # Check if EPUB format exists
            if not db.has_format(book_id, 'EPUB'):
                error_messages.append(f'{title}: No EPUB format available')
                progress.setValue(i + 1)
                continue

            # Get EPUB path
            epub_path = db.format_abspath(book_id, 'EPUB')
            if not epub_path:
                error_messages.append(f'{title}: Could not get EPUB path')
                progress.setValue(i + 1)
                continue

            # Generate filename
            filename = f"{mi.title}"
            if mi.authors:
                author = mi.authors[0] if isinstance(mi.authors, list) else mi.authors
                filename = f"{author} - {mi.title}"
            filename = self._sanitize_filename(filename) + '.epub'

            debug_print(f'Uploading: {filename}')

            # Upload
            try:
                success, result = driver.upload_book(epub_path, filename, mi)
                if success:
                    success_count += 1
                    debug_print(f'Success: {filename}')
                else:
                    error_messages.append(f'{title}: {result}')
                    debug_print(f'Failed: {result}')
            except Exception as e:
                error_messages.append(f'{title}: {str(e)}')
                debug_print(f'Exception: {e}')

            progress.setValue(i + 1)

        progress.close()

        # Show result
        debug_print(f'Complete: {success_count} success, {len(error_messages)} errors')

        if error_messages:
            warning_dialog(
                self.gui,
                'Upload Complete',
                f'Sent {success_count} of {len(book_ids)} books.',
                det_msg='\n'.join(error_messages),
                show=True
            )
        else:
            info_dialog(
                self.gui,
                'Upload Complete',
                f'Successfully sent {success_count} book(s) to Bookshelf!',
                show=True
            )

    def _sanitize_filename(self, filename):
        """Sanitize filename for safe URL usage."""
        invalid_chars = '<>:"/\\|?*'
        result = filename
        for char in invalid_chars:
            result = result.replace(char, '_')
        return result.strip('. ')[:200]

    def test_connection(self):
        """Test connection to Bookshelf server."""
        debug_print('test_connection() called')

        try:
            from calibre_plugins.bookshelf_plugin.config import BookshelfConfig
            from calibre_plugins.bookshelf_plugin.driver import BookshelfDriver
        except Exception as e:
            error_dialog(
                self.gui,
                'Plugin Error',
                f'Could not load plugin modules: {e}',
                show=True
            )
            return

        config = BookshelfConfig()

        if not config.is_configured():
            error_dialog(
                self.gui,
                'Not Configured',
                'Please configure the plugin first.',
                show=True
            )
            return

        driver = BookshelfDriver(config)

        if driver.test_connection():
            info_dialog(
                self.gui,
                'Connection Successful',
                f'Successfully connected to {config.server_url}',
                show=True
            )
        else:
            error_dialog(
                self.gui,
                'Connection Failed',
                'Could not connect to Bookshelf server.',
                det_msg='Check your server URL and credentials.',
                show=True
            )

    def show_configuration(self):
        """Show plugin configuration dialog."""
        debug_print('show_configuration() called')
        self.interface_action_base_plugin.do_user_config(self.gui)
