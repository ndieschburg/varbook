#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Bookshelf Plugin for Calibre

This plugin enables Calibre to send books to a Bookshelf server via WebDAV.
Uses InterfaceAction for a simple toolbar button approach.
"""

from calibre.customize import InterfaceActionBase


class BookshelfPlugin(InterfaceActionBase):
    """
    Main plugin class for Bookshelf integration.
    """

    name = 'Bookshelf'
    description = 'Send books to your Bookshelf server via WebDAV'
    author = 'Bookshelf'
    version = (1, 0, 0)
    minimum_calibre_version = (5, 0, 0)

    supported_platforms = ['windows', 'osx', 'linux']

    # The actual plugin class
    actual_plugin = 'calibre_plugins.bookshelf_plugin.ui:BookshelfAction'

    def is_customizable(self):
        return True

    def config_widget(self):
        from calibre_plugins.bookshelf_plugin.config import ConfigWidget
        return ConfigWidget()

    def save_settings(self, config_widget):
        config_widget.save_settings()
