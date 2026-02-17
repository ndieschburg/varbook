<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:dc="http://purl.org/dc/terms/"
      xmlns:opds="http://opds-spec.org/2010/catalog">

    <id>{{ $id }}</id>
    <title>{{ $title }}</title>
    <updated>{{ $updated }}</updated>
    <author>
        <name>BookShelf</name>
    </author>

    <link rel="self"
          href="{{ route('opds.authors') }}"
          type="application/atom+xml;profile=opds-catalog;kind=navigation"/>

    <link rel="start"
          href="{{ route('opds.root') }}"
          type="application/atom+xml;profile=opds-catalog;kind=navigation"/>

    @foreach ($authors as $author)
    <entry>
        <title>{{ htmlspecialchars($author, ENT_XML1) }}</title>
        <id>bookshelf:author:{{ urlencode($author) }}</id>
        <updated>{{ $updated }}</updated>
        <content type="text">Books by {{ htmlspecialchars($author, ENT_XML1) }}</content>
        <link rel="subsection"
              href="{{ route('opds.by-author', ['author' => $author]) }}"
              type="application/atom+xml;profile=opds-catalog;kind=acquisition"/>
    </entry>
    @endforeach

</feed>
