#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Varbook Driver - WebDAV and OPDS communication layer.

Handles all network communication with the Varbook server:
- WebDAV for uploading books
- OPDS for browsing and listing books
"""

import os
import ssl
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, quote
from urllib.request import Request, urlopen, HTTPBasicAuthHandler, build_opener
from urllib.error import URLError, HTTPError


class Book:
    """Represents a book on the Varbook server."""

    def __init__(self, title, authors=None, path=None, size=0, mime='application/epub+zip'):
        self.title = title
        self.authors = authors or []
        self.path = path or title
        self.size = size
        self.mime = mime
        self.datetime = None

    def __repr__(self):
        return f"Book({self.title!r}, {self.authors!r})"


class VarbookDriver:
    """
    Driver for communicating with Varbook server.
    """

    WEBDAV_PATH = '/webdav/Apps/Books/'
    OPDS_PATH = '/opds/all'

    def __init__(self, config):
        """
        Initialize driver with configuration.

        Args:
            config: VarbookConfig instance with server_url, email, password
        """
        self.config = config
        self._ssl_context = self._create_ssl_context()

    def _create_ssl_context(self):
        """Create SSL context, optionally ignoring certificate errors."""
        ctx = ssl.create_default_context()
        if self.config.ignore_ssl_errors:
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
        return ctx

    def _get_auth_handler(self):
        """Create HTTP Basic Auth handler."""
        password_mgr = HTTPBasicAuthHandler()
        password_mgr.add_password(
            realm=None,
            uri=self.config.server_url,
            user=self.config.email,
            passwd=self.config.password
        )
        return password_mgr

    def _make_request(self, url, method='GET', data=None, headers=None):
        """
        Make an authenticated HTTP request.

        Args:
            url: Full URL to request
            method: HTTP method (GET, PUT, DELETE, etc.)
            data: Request body (bytes or file-like object)
            headers: Additional headers dict

        Returns:
            Response body as bytes

        Raises:
            Exception on HTTP errors
        """
        import base64

        req_headers = headers or {}

        # Add Basic Auth header manually for better compatibility
        credentials = f"{self.config.email}:{self.config.password}"
        encoded = base64.b64encode(credentials.encode('utf-8')).decode('ascii')
        req_headers['Authorization'] = f'Basic {encoded}'

        request = Request(url, data=data, headers=req_headers, method=method)

        try:
            response = urlopen(request, context=self._ssl_context, timeout=30)
            return response.read()
        except HTTPError as e:
            if e.code == 401:
                raise Exception("Authentication failed. Check your email and password.")
            elif e.code == 404:
                raise Exception(f"Resource not found: {url}")
            else:
                raise Exception(f"HTTP Error {e.code}: {e.reason}")
        except URLError as e:
            raise Exception(f"Connection failed: {e.reason}")

    def test_connection(self):
        """
        Test if we can connect to the Varbook server.

        Returns:
            True if connection successful, False otherwise
        """
        if not self.config.server_url or not self.config.email:
            return False

        try:
            url = urljoin(self.config.server_url, '/opds')
            self._make_request(url)
            return True
        except Exception as e:
            print(f"Varbook connection test failed: {e}")
            return False

    def get_books(self):
        """
        Fetch list of books from OPDS catalog.

        Returns:
            List of Book objects
        """
        books = []

        try:
            # Fetch all books via OPDS
            url = urljoin(self.config.server_url, self.OPDS_PATH)
            response = self._make_request(url)

            # Parse OPDS (Atom) feed
            books = self._parse_opds_feed(response)

        except Exception as e:
            print(f"Error fetching books from Varbook: {e}")

        return books

    def _parse_opds_feed(self, xml_data):
        """
        Parse OPDS Atom feed and extract book information.

        Args:
            xml_data: Raw XML bytes from OPDS endpoint

        Returns:
            List of Book objects
        """
        books = []

        try:
            root = ET.fromstring(xml_data)

            # OPDS uses Atom namespace
            ns = {
                'atom': 'http://www.w3.org/2005/Atom',
                'dc': 'http://purl.org/dc/elements/1.1/',
                'opds': 'http://opds-spec.org/2010/catalog'
            }

            for entry in root.findall('atom:entry', ns):
                title_elem = entry.find('atom:title', ns)
                title = title_elem.text if title_elem is not None else 'Unknown'

                # Get authors
                authors = []
                for author_elem in entry.findall('atom:author', ns):
                    name_elem = author_elem.find('atom:name', ns)
                    if name_elem is not None and name_elem.text:
                        authors.append(name_elem.text)

                # Get download link
                path = None
                size = 0
                for link in entry.findall('atom:link', ns):
                    rel = link.get('rel', '')
                    if 'acquisition' in rel:
                        path = link.get('href', '')
                        size = int(link.get('length', 0) or 0)
                        break

                book = Book(
                    title=title,
                    authors=authors,
                    path=path,
                    size=size
                )

                # Get updated date
                updated = entry.find('atom:updated', ns)
                if updated is not None:
                    book.datetime = updated.text

                books.append(book)

        except ET.ParseError as e:
            print(f"Error parsing OPDS feed: {e}")

        return books

    def upload_book(self, filepath, filename, metadata=None):
        """
        Upload a book to Varbook via WebDAV.

        Args:
            filepath: Local path to the book file
            filename: Filename to use on server
            metadata: Optional Calibre metadata object

        Returns:
            Tuple of (success: bool, path_or_error: str)
        """
        if not os.path.exists(filepath):
            return (False, f"File not found: {filepath}")

        # Ensure filename is safe for URLs
        safe_filename = self._sanitize_filename(filename)
        if not safe_filename.lower().endswith('.epub'):
            safe_filename += '.epub'

        # Build WebDAV URL
        webdav_url = urljoin(
            self.config.server_url,
            self.WEBDAV_PATH + quote(safe_filename)
        )

        try:
            # Read file content
            with open(filepath, 'rb') as f:
                file_data = f.read()

            # Upload via PUT
            headers = {
                'Content-Type': 'application/epub+zip',
                'Content-Length': str(len(file_data))
            }

            self._make_request(webdav_url, method='PUT', data=file_data, headers=headers)

            print(f"Successfully uploaded: {safe_filename}")
            return (True, safe_filename)

        except Exception as e:
            print(f"Error uploading {filename}: {e}")
            return (False, str(e))

    def delete_book(self, path):
        """
        Delete a book from Varbook via WebDAV.

        Args:
            path: Path/filename of book to delete

        Note: This may not be fully implemented on the server side.
        """
        # Build WebDAV URL
        safe_path = quote(path) if not path.startswith('/') else path
        webdav_url = urljoin(
            self.config.server_url,
            self.WEBDAV_PATH + safe_path
        )

        try:
            self._make_request(webdav_url, method='DELETE')
            print(f"Successfully deleted: {path}")
        except Exception as e:
            print(f"Error deleting {path}: {e}")
            raise

    def _sanitize_filename(self, filename):
        """
        Sanitize filename for safe URL usage.

        Args:
            filename: Original filename

        Returns:
            Sanitized filename
        """
        # Remove or replace problematic characters
        invalid_chars = '<>:"/\\|?*'
        result = filename
        for char in invalid_chars:
            result = result.replace(char, '_')

        # Remove leading/trailing spaces and dots
        result = result.strip('. ')

        # Limit length
        if len(result) > 200:
            name, ext = os.path.splitext(result)
            result = name[:200 - len(ext)] + ext

        return result
