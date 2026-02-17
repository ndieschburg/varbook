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
          href="{{ $selfUrl }}"
          type="application/atom+xml;profile=opds-catalog;kind=acquisition"/>

    <link rel="start"
          href="{{ route('opds.root') }}"
          type="application/atom+xml;profile=opds-catalog;kind=navigation"/>

    @if ($nextUrl)
    <link rel="next"
          href="{{ $nextUrl }}"
          type="application/atom+xml;profile=opds-catalog;kind=acquisition"/>
    @endif

    @foreach ($books as $book)
    <entry>
        <title>{{ htmlspecialchars($book->title, ENT_XML1) }}</title>
        <id>bookshelf:book:{{ $book->id }}</id>
        <updated>{{ $book->updated_at->toAtomString() }}</updated>

        @if ($book->author)
        <author>
            <name>{{ htmlspecialchars($book->author, ENT_XML1) }}</name>
        </author>
        @endif

        @if ($book->description)
        <summary type="text">{{ htmlspecialchars($book->description, ENT_XML1) }}</summary>
        @endif

        @if ($book->language)
        <dc:language>{{ $book->language }}</dc:language>
        @endif

        @if ($book->publisher)
        <dc:publisher>{{ htmlspecialchars($book->publisher, ENT_XML1) }}</dc:publisher>
        @endif

        @if ($book->isbn)
        <dc:identifier>urn:isbn:{{ $book->isbn }}</dc:identifier>
        @endif

        <link rel="http://opds-spec.org/acquisition"
              href="{{ route('opds.download', $book) }}"
              type="application/epub+zip"/>

        @if ($book->cover_url)
        <link rel="http://opds-spec.org/image"
              href="{{ $book->cover_url }}"
              type="image/jpeg"/>
        <link rel="http://opds-spec.org/image/thumbnail"
              href="{{ $book->cover_url }}"
              type="image/jpeg"/>
        @endif
    </entry>
    @endforeach

</feed>
