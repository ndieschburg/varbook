<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opds="http://opds-spec.org/2010/catalog" xmlns:dcterms="http://purl.org/dc/terms/">
<id>{{ $id }}</id>
<updated>{{ $updated }}</updated>
<title>{{ $title }}</title>
<author>
<name>BookShelf</name>
</author>
<link type="application/atom+xml;profile=opds-catalog" rel="self" href="{{ $selfUrl }}"/>
<link type="application/atom+xml;profile=opds-catalog" rel="start" href="{{ route('opds.root') }}"/>
@if ($nextUrl)
<link type="application/atom+xml;profile=opds-catalog" rel="next" href="{{ $nextUrl }}"/>
@endif
@foreach ($books as $book)
<entry>
<updated>{{ $book->updated_at->toAtomString() }}</updated>
<id>bookshelf:book:{{ $book->id }}</id>
<title>{{ htmlspecialchars($book->title, ENT_XML1) }}</title>
@if ($book->author)
<author>
<name>{{ htmlspecialchars($book->author, ENT_XML1) }}</name>
</author>
@endif
@if ($book->description)
<summary type="text">{{ htmlspecialchars($book->description, ENT_XML1) }}</summary>
@endif
@if ($book->language)
<dcterms:language>{{ $book->language }}</dcterms:language>
@endif
@if ($book->publisher)
<dcterms:publisher>{{ htmlspecialchars($book->publisher, ENT_XML1) }}</dcterms:publisher>
@endif
@if ($book->isbn)
<dcterms:identifier>urn:isbn:{{ $book->isbn }}</dcterms:identifier>
@endif
<link type="application/epub+zip" rel="http://opds-spec.org/acquisition" href="{{ route('opds.download', $book) }}"/>
@if ($book->cover_url)
<link type="image/jpeg" rel="http://opds-spec.org/image" href="{{ $book->cover_url }}"/>
<link type="image/jpeg" rel="http://opds-spec.org/image/thumbnail" href="{{ $book->cover_url }}"/>
@endif
</entry>
@endforeach
</feed>
