# Librarium. Bibliotheca documentorum electronicorum.

## What is _Librarium_?

**Librarium** is a simple [content management system](http://en.wikipedia.org/wiki/Content_management_system). It is written in JavaScript and runs on [Node.js](http://nodejs.org). Blogs and diaries are main targets of the software. The goal is to **help building pure and flexible document archives**.

The most characteristic point of Librarium is that it is document-oriented. The system of the contents managed by Librarium could be divided into two parts; Documents and Indices. Documents are contents themselves, such as texts, while Indices sort the Documents and provide quick paths to them in multiple ways, including web feeds. Librarium just does read documents, recognize their title and body, reconstruct into a new HTML document to be published using a template, then rebuild a document index. Thus **everything could be served to public by HTTP servers as static files**. As well, there is a strict rule that **every source content managed by Librarium must be an independent HTML document**. However, the philosophy of Librarium is confident that _HTML is more proper format to preserve electronical documents_.

Librarium is also unique as it records indices in the form of JSON. _Lightweight Resource Index Object_ is proposed within Librarium, in accordance of a belief that URI should be a sole pointer of the resource available. Librarium aims to demonstrate how powerful and how computer-friendly the object notation of resource index could be, comparing to XML-based syndication systems. Hence Librarium **keeps the document index in public as `index.json` and provides an aggregation of basic resource information in JSON**, alongside web feeds in other formats, like [RSS](http://en.wikipedia.org/wiki/RSS).

Simplicity is not forgotten, of course. Just create a directory for the document, tell the name to the programme, and find out you have already done!

## Usage - with an attached sample

1. Prepare an HTTP server to serve contents.
2. Edit `cms.js`; modify variables at the beginning of the code accordingly.
3. `$ node cms.js add sample`
4. Modify `sample/source.html` a lot then `$ node cms.js update sample`
5. Modify `sample/source.html` a little then `$ node cms.js reform sample`
6. Modify `templates/doc` then `$ node cms.js renovate`
7. `$ node cms.js remove sample`

## Known issues

* Author valid [HTML5](http://www.w3.org/TR/html5/) documents for `source.html`. Feeding other types of documents or invalid documents is neither supported nor tested.

## Licence

Copyright (C) 2013 Makoto Mizukami. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.

[Makoto Mizukami](http://makotom.org/) &copy; MMXIII
