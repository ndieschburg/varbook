#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Bookshelf Plugin Configuration

Provides configuration storage and UI for the Bookshelf plugin.
Uses Calibre's JSONConfig for persistent storage.
"""

from calibre.utils.config import JSONConfig

# Configuration storage
PREFS = JSONConfig('plugins/bookshelf_device')

# Default values
PREFS.defaults['server_url'] = ''
PREFS.defaults['email'] = ''
PREFS.defaults['password'] = ''
PREFS.defaults['auto_connect'] = False
PREFS.defaults['ignore_ssl_errors'] = False


class BookshelfConfig:
    """
    Configuration wrapper for Bookshelf plugin settings.
    """

    def __init__(self):
        self._prefs = PREFS

    @property
    def server_url(self):
        """Bookshelf server URL (e.g., https://bookshelf.example.com)"""
        url = self._prefs['server_url']
        # Ensure URL doesn't end with slash
        return url.rstrip('/') if url else ''

    @server_url.setter
    def server_url(self, value):
        self._prefs['server_url'] = value.rstrip('/') if value else ''

    @property
    def email(self):
        """User email for authentication."""
        return self._prefs['email']

    @email.setter
    def email(self, value):
        self._prefs['email'] = value

    @property
    def password(self):
        """User password for authentication."""
        return self._prefs['password']

    @password.setter
    def password(self, value):
        self._prefs['password'] = value

    @property
    def auto_connect(self):
        """Auto-detect device on Calibre startup."""
        return self._prefs['auto_connect']

    @auto_connect.setter
    def auto_connect(self, value):
        self._prefs['auto_connect'] = bool(value)

    @property
    def ignore_ssl_errors(self):
        """Ignore SSL certificate errors (use with caution)."""
        return self._prefs['ignore_ssl_errors']

    @ignore_ssl_errors.setter
    def ignore_ssl_errors(self, value):
        self._prefs['ignore_ssl_errors'] = bool(value)

    def is_configured(self):
        """Check if minimum configuration is present."""
        return bool(self.server_url and self.email and self.password)


# Qt imports for configuration widget
try:
    from qt.core import (
        QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
        QLabel, QLineEdit, QCheckBox, QPushButton, QMessageBox
    )
except ImportError:
    from PyQt5.Qt import (
        QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
        QLabel, QLineEdit, QCheckBox, QPushButton, QMessageBox
    )


class ConfigWidget(QWidget):
    """
    Configuration widget for Calibre's plugin preferences dialog.
    """

    def __init__(self, parent=None):
        super().__init__(parent)
        self.config = BookshelfConfig()
        self._init_ui()
        self._load_settings()

    def _init_ui(self):
        """Initialize the user interface."""
        layout = QVBoxLayout(self)

        # Server configuration group
        grid = QGridLayout()

        # Server URL
        grid.addWidget(QLabel('Server URL:'), 0, 0)
        self.server_url_edit = QLineEdit()
        self.server_url_edit.setPlaceholderText('https://bookshelf.example.com')
        self.server_url_edit.setMinimumWidth(300)
        grid.addWidget(self.server_url_edit, 0, 1)

        # Email
        grid.addWidget(QLabel('Email:'), 1, 0)
        self.email_edit = QLineEdit()
        self.email_edit.setPlaceholderText('your@email.com')
        grid.addWidget(self.email_edit, 1, 1)

        # Password
        grid.addWidget(QLabel('Password:'), 2, 0)
        self.password_edit = QLineEdit()
        self.password_edit.setEchoMode(QLineEdit.EchoMode.Password)
        grid.addWidget(self.password_edit, 2, 1)

        layout.addLayout(grid)

        # Checkboxes
        self.auto_connect_cb = QCheckBox('Auto-connect on Calibre startup')
        layout.addWidget(self.auto_connect_cb)

        self.ignore_ssl_cb = QCheckBox('Ignore SSL certificate errors (insecure)')
        layout.addWidget(self.ignore_ssl_cb)

        # Test connection button
        btn_layout = QHBoxLayout()
        self.test_btn = QPushButton('Test Connection')
        self.test_btn.clicked.connect(self._test_connection)
        btn_layout.addWidget(self.test_btn)
        btn_layout.addStretch()
        layout.addLayout(btn_layout)

        # Instructions
        instructions = QLabel(
            '<p><b>Instructions:</b></p>'
            '<ol>'
            '<li>Enter your Bookshelf server URL (without trailing slash)</li>'
            '<li>Enter your login credentials (same as web login)</li>'
            '<li>Click "Test Connection" to verify settings</li>'
            '<li>Enable auto-connect if you want Calibre to detect the device automatically</li>'
            '</ol>'
            '<p><i>Books will be uploaded via WebDAV and will appear in your Bookshelf library.</i></p>'
        )
        instructions.setWordWrap(True)
        layout.addWidget(instructions)

        layout.addStretch()

    def _load_settings(self):
        """Load current settings into the form."""
        self.server_url_edit.setText(self.config.server_url)
        self.email_edit.setText(self.config.email)
        self.password_edit.setText(self.config.password)
        self.auto_connect_cb.setChecked(self.config.auto_connect)
        self.ignore_ssl_cb.setChecked(self.config.ignore_ssl_errors)

    def save_settings(self):
        """Save settings from the form."""
        self.config.server_url = self.server_url_edit.text().strip()
        self.config.email = self.email_edit.text().strip()
        self.config.password = self.password_edit.text()
        self.config.auto_connect = self.auto_connect_cb.isChecked()
        self.config.ignore_ssl_errors = self.ignore_ssl_cb.isChecked()

    def _test_connection(self):
        """Test the connection with current settings."""
        # Temporarily save settings for testing
        self.save_settings()

        if not self.config.is_configured():
            QMessageBox.warning(
                self,
                'Missing Configuration',
                'Please fill in the server URL, email, and password.'
            )
            return

        # Test connection
        from calibre_plugins.bookshelf_plugin.driver import BookshelfDriver
        driver = BookshelfDriver(self.config)

        try:
            if driver.test_connection():
                QMessageBox.information(
                    self,
                    'Connection Successful',
                    'Successfully connected to Bookshelf server!'
                )
            else:
                QMessageBox.warning(
                    self,
                    'Connection Failed',
                    'Could not connect to the server. Please check your settings.'
                )
        except Exception as e:
            QMessageBox.critical(
                self,
                'Connection Error',
                f'Error connecting to server:\n{str(e)}'
            )
