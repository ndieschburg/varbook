#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Varbook Plugin for Calibre

This plugin enables Calibre to send books to a Varbook server via WebDAV.
Uses InterfaceAction for a simple toolbar button approach.
"""

from calibre.customize import InterfaceActionBase


class VarbookPlugin(InterfaceActionBase):
    """
    Main plugin class for Varbook integration.
    """

    name = 'Varbook'
    description = 'Send books to your Varbook server via WebDAV'
    author = 'Varbook'
    version = (1, 0, 0)
    minimum_calibre_version = (5, 0, 0)

    supported_platforms = ['windows', 'osx', 'linux']

    # The actual plugin class
    actual_plugin = 'calibre_plugins.varbook_plugin.ui:VarbookAction'

    def is_customizable(self):
        return True

    def config_widget(self):
        from calibre_plugins.varbook_plugin.config import ConfigWidget
        return ConfigWidget()

    def save_settings(self, config_widget):
        config_widget.save_settings()
