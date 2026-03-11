<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opds="http://opds-spec.org/2010/catalog" xmlns:dcterms="http://purl.org/dc/terms/">
<id>{{ $id }}</id>
<updated>{{ $updated }}</updated>
<title>{{ $title }}</title>
<author>
<name>Varbook</name>
</author>
<link type="application/atom+xml;profile=opds-catalog" rel="self" href="{{ route('opds.authors') }}"/>
<link type="application/atom+xml;profile=opds-catalog" rel="start" href="{{ route('opds.root') }}"/>
@foreach ($authors as $author)
<entry>
<updated>{{ $updated }}</updated>
<id>varbook:author:{{ urlencode($author) }}</id>
<title>{{ htmlspecialchars($author, ENT_XML1) }}</title>
<content type="text">Books by {{ htmlspecialchars($author, ENT_XML1) }}</content>
<link type="application/atom+xml;profile=opds-catalog" rel="subsection" href="{{ route('opds.by-author', ['author' => $author]) }}"/>
</entry>
@endforeach
</feed>
