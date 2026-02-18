<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opds="http://opds-spec.org/2010/catalog" xmlns:dcterms="http://purl.org/dc/terms/">
<id>bookshelf:root</id>
<updated>{{ $updated }}</updated>
<title>BookShelf</title>
<author>
<name>BookShelf</name>
</author>
<link type="application/atom+xml;profile=opds-catalog" rel="self" href="{{ route('opds.root') }}"/>
<link type="application/atom+xml;profile=opds-catalog" rel="start" href="{{ route('opds.root') }}"/>
<link type="application/atom+xml" rel="search" title="Search" href="{{ route('opds.search') }}?q={searchTerms}"/>
<entry>
<updated>{{ $updated }}</updated>
<id>bookshelf:all</id>
<title>All Books</title>
<content type="text">Browse all books in your library</content>
<link type="application/atom+xml;profile=opds-catalog" rel="subsection" href="{{ route('opds.all') }}"/>
</entry>
<entry>
<updated>{{ $updated }}</updated>
<id>bookshelf:authors</id>
<title>By Author</title>
<content type="text">Browse books by author</content>
<link type="application/atom+xml;profile=opds-catalog" rel="subsection" href="{{ route('opds.authors') }}"/>
</entry>
</feed>
