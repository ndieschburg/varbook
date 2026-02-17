<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:dc="http://purl.org/dc/terms/"
      xmlns:opds="http://opds-spec.org/2010/catalog">

    <id>bookshelf:root</id>
    <title>BookShelf</title>
    <updated>{{ $updated }}</updated>
    <author>
        <name>BookShelf</name>
    </author>

    <link rel="self"
          href="{{ route('opds.root') }}"
          type="application/atom+xml;profile=opds-catalog;kind=navigation"/>

    <link rel="start"
          href="{{ route('opds.root') }}"
          type="application/atom+xml;profile=opds-catalog;kind=navigation"/>

    <link rel="search"
          href="{{ route('opds.search') }}?q={searchTerms}"
          type="application/atom+xml"
          title="Search"/>

    <entry>
        <title>All Books</title>
        <id>bookshelf:all</id>
        <updated>{{ $updated }}</updated>
        <content type="text">Browse all books in your library</content>
        <link rel="subsection"
              href="{{ route('opds.all') }}"
              type="application/atom+xml;profile=opds-catalog;kind=acquisition"/>
    </entry>

    <entry>
        <title>By Author</title>
        <id>bookshelf:authors</id>
        <updated>{{ $updated }}</updated>
        <content type="text">Browse books by author</content>
        <link rel="subsection"
              href="{{ route('opds.authors') }}"
              type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
    </entry>

</feed>
