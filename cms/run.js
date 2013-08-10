/*
Librarium
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

Check README as well.
*/

(function(){
	"use strict";

	var CMSPATH = "cms",
	TEMPLATES = "templates",

	fs = (function(){
		var nodeFsAPI = require("fs");

		return {
			exists : nodeFsAPI.existsSync,
			readFile : nodeFsAPI.readFileSync,
			writeFile : nodeFsAPI.writeFileSync
		};
	})(),

	argv = process.argv.slice(1),

	logErr = function(msg){
		process.stderr.write(msg + "\n");
	};

	(function(){
		var config = JSON.parse(fs.readFile(CMSPATH + "/config.json").toString()),

		lriox = {	// Object to handle LRIO smoothly
			raw : {	// LRIO (Lightweight Resource Index Object) structure definition
				url : config.library.url + (config.library.url[config.library.url.length - 1] !== "/" ? "/" : ""),
				title : config.library.title,
				editor : config.user,
				updated : new Date().toISOString(),
				resources : fs.exists("index.json") ? JSON.parse(fs.readFile("index.json")).resources : []
			},
			index : [],	// Index to search the documents quickly
			buildLRIOIndex : function(){	// Index builder
				var index = (this.index = []);

				this.raw.resources.forEach(function(doc){
					index.push(doc.url);
				});

				return;
			},
			add : function(newDoc){
				this.raw.resources.unshift(newDoc);
				this.index = this.buildLRIOIndex(this.raw);
				return;
			},
			del : function(targetURL){
				this.raw.resources.splice(this.index.indexOf(targetURL), 1);
				this.index = this.buildLRIOIndex(this.raw);
				return;
			},
			rpl : function(replacedURL, replaceDoc){
				this.raw.resources.splice(this.index.indexOf(replacedURL), 1, replaceDoc);
				this.index = this.buildLRIOIndex(this.raw);
				return;
			}
		},

		// Function to get the content of the title element
		// @param string htmlText HTML text to parse
		// @return strint
		getHTMLTitle = function(htmlText){
			var titleContentMatch = /<title(?:\s+(?:[^\x00"'>\/=\x00-\x1F\x7F]+(?:=\s*[^\s"'=<>`]+|=\s*'[^']+'|=\s*"[^"]+")?))*\s*>([^\x00-\x08\x0B\x0E-\x0F\x7F<]*)<\/title\s*>/.exec(htmlText);
			return (titleContentMatch !== null) ? titleContentMatch[1] : "";
		},

		// Function to get the content of the body element
		// @param string htmlText HTML text to parse
		// @return string
		getHTMLBody = function(htmlText){
			var getBodyStartPos = function(htmlText){
				var ptr = 0, isDone = false;

				while(ptr < htmlText.length){
					(function(){
						var spaceMch = /\s*/.exec(htmlText.substr(ptr));
						ptr += spaceMch[0].length + spaceMch.index;
					})();

					if(htmlText[ptr] !== "<"){
						break;
					}

					ptr += 1;

					switch(htmlText[ptr]){
						case "!":
							ptr += 1;

							(function(){
								var comEndRegex = (htmlText[ptr] === "-" && htmlText[ptr + 1] === "-") ? /--!?/ : />/,
								comEndMch = comEndRegex.exec(htmlText.substr(ptr));
								ptr = (comEndMch !== null) ? ptr + comEndMch.index + comEndMch.length - 1 : htmlText.length - 1;
							})();

							break;

						case "?":
							(function(){
								var bcEnd = htmlText.substr(ptr).indexOf(">");
								ptr = (bcEnd !== -1) ? ptr + bcEnd : htmlText.length - 1;
							})();
							break;

						case "/":
							ptr += 1;

							isDone = (function(){
								var endTagMch = /([0-9a-zA-Z]+)\s*>/.exec(htmlText.substr(ptr)),
								endTagEnd = htmlText.substr(ptr).indexOf(">");

								if(htmlText[ptr] === ">"){
									ptr += 1;
									return true;
								}

								if(endTagMch === null){
									ptr = (endTagEnd !== -1) ? ptr + endTagEnd : htmlText.length - 1;
									return false;
								}

								if(["head", "noscript", "script", "style", "title"].indexOf(endTagMch[1].toLowerCase()) === -1){
									ptr -= 2;
									return true;
								}

								ptr += endTagEnd;
								return false;
							})();

							break;

						default:
							isDone = (function(){
								var startTagMch = /([0-9a-zA-Z]+)(?:\s+(?:[^\x00"'>\/=\x00-\x1F\x7F]+(?:=\s*[^\s"'=<>`]+|=\s*'[^']+'|=\s*"[^"]+")?))*\s*\/?>/.exec(htmlText.substr(ptr));

								if(startTagMch === null || ["html", "head", "body", "base", "command", "link", "meta", "noscript", "script", "style", "title"].indexOf(startTagMch[1].toLowerCase()) === -1){
									ptr -= 1;
									return true;
								}

								ptr += startTagMch[0].length;

								if(startTagMch[1].toLowerCase() === "body"){
									return true;
								}

								if(["noscript", "script", "style", "title"].indexOf(startTagMch[1].toLowerCase()) !== -1){
									(function(){
										var nextLT = htmlText.substr(ptr).indexOf("<");
										ptr = (nextLT !== -1) ? ptr + nextLT - 1 : htmlText.length - 1;
									})();
								}

								return false;
							})();
					}

					if(isDone){
						break;
					}

					ptr += 1;
				}

				return ptr;
			},

			bodyStartPos = getBodyStartPos(htmlText),
			bodyEndPos = (function(htmlText){
				var rootEndMatch = /<\/(?:body|html)\s*>/i.exec(htmlText);
				return (rootEndMatch !== null) ? rootEndMatch.index : htmlText.length;
			})(htmlText);

			return htmlText.substr(bodyStartPos, bodyEndPos - bodyStartPos);
		},

		// Function to wrap getHTMLBody in order to get the body without the first and last line breaks easily
		// @param string htmlText HTML text to parse
		// @return string
		getHTMLBodyEntity = function(htmlText){
			return getHTMLBody(htmlText).replace(/^(?:\n|\r\n|\r|\n\r)|(?:\n|\r\n|\r|\n\r)$/g, "");
		},

		// Function to decorate a document
		// @param object docMeta information of document
		// @param string docBody body of the document
		// @param string targetPath the directory to save the formatted document
		formatDocument = function(targetPath, docMeta, docBody){
			var docFmtdHTML = fs.readFile(TEMPLATES + "doc").toString();

			docFmtdHTML = docFmtdHTML.replace(/\$PERMALINK\$/g, encodeURI(docMeta.url));
			docFmtdHTML = docFmtdHTML.replace(/\$TITLE\$/g, docMeta.title);
			docFmtdHTML = docFmtdHTML.replace(/\$AUTHOR\$/g, docMeta.author.display_name);
			docFmtdHTML = docFmtdHTML.replace(/\$CONTACT\$/g, encodeURI(docMeta.author.uris[0]));
			docFmtdHTML = docFmtdHTML.replace(/\$BTIME\$/g, new Date(docMeta.published).toISOString());
			docFmtdHTML = docFmtdHTML.replace(/\$PUBLISHED\$/g, new Date(docMeta.published).toUTCString());
			docFmtdHTML = docFmtdHTML.replace(/\$MTIME\$/g, new Date(docMeta.updated).toISOString());
			docFmtdHTML = docFmtdHTML.replace(/\$UPDATED\$/g, new Date(docMeta.updated).toUTCString());
			docFmtdHTML = docFmtdHTML.replace(/\$BODY\$/g, docBody);
			docFmtdHTML = docFmtdHTML.replace(/\$LIBURL\$/g, encodeURI(lriox.raw.url));
			docFmtdHTML = docFmtdHTML.replace(/\$LIBTITLE\$/g, lriox.raw.title);

			fs.writeFile((targetPath !== "" ? targetPath : docMeta.url.replace(new RegExp("^" + lriox.raw.url), "")) + "/index.html", docFmtdHTML);

			return;
		},

		// Function to generate document metadata in order to add a new document to LRIO
		// @param string docId directory which contains the document
		// @param string docPubdate date of publish
		// @param bool metaOnly whether create a formatted document
		// @return object docMeta information of the new document
		createNewItem = function(docId, docPubdate, metaOnly){
			var docHTMLText = fs.readFile(docId + "/source.html").toString(),
			docHTMLTitle = getHTMLTitle(docHTMLText),
			docHTMLBody = getHTMLBodyEntity(docHTMLText),

			docMeta = {	// Elements of LRIO.resources structure definition
				url : lriox.raw.url + docId + "/",
				title : docHTMLTitle,
				type : "text/html",
				author : config.user,
				published : docPubdate !== undefined ? new Date(docPubdate) : new Date(),
				updated : new Date()
			};

			if(docHTMLTitle === ""){
				logErr("Warning: Empty title?");
			}
			if(docHTMLBody === ""){
				logErr("Warning: Empty body?");
			}

			if(metaOnly !== true){
				formatDocument(docId, docMeta, docHTMLBody);
			}

			return docMeta;
		},

		docId = (function(userInput){
			return typeof userInput === typeof "" ? userInput.replace(/\/+$/, "") : "";
		})(argv[2]),
		docURL = lriox.raw.url + docId + "/",
		docIndex = NaN;

		TEMPLATES = CMSPATH + "/" + TEMPLATES + "/";

		lriox.buildLRIOIndex();
		docIndex = lriox.index.indexOf(docURL);

		switch(argv[1]){
			case "add":
			case "index":
				if(!fs.exists(docId)){
					logErr("Document not found.");
					return;
				}
				if(docIndex !== -1){
					logErr("Document already exists.");
					return;
				}
				lriox.add(createNewItem(docId, undefined, (argv[1] === "add" ? false : true)));
				break;

			case "remove":
				if(docIndex === -1){
					logErr("Document not found.");
					return;
				}
				lriox.del(docURL);
				break;

			case "update":
				if(!fs.exists(docId) || docIndex === -1){
					logErr("Document not found.");
					return;
				}
				lriox.rpl(docURL, createNewItem(docId, lriox.raw.resources[docIndex].published));
				break;

			case "popup":
				lriox.raw.resources[docIndex].updated = new Date();
				lriox.raw.resources.unshift(lriox.raw.resources.splice(docIndex, 1)[0]);
				break;

			case "reform":
				if(!fs.exists(docId) || docIndex === -1){
					logErr("Document not found.");
					return;
				}
				formatDocument(docId, lriox.raw.resources[docIndex], getHTMLBodyEntity(fs.readFile(docId + "/source.html").toString()));
				break;

			case "renovate":
				lriox.raw.resources.forEach(function(document){
					var docPath = document.url.replace(new RegExp("^" + lriox.raw.url), "");

					formatDocument(
						docPath,
						document,
						getHTMLBodyEntity(fs.readFile(docPath + "/source.html").toString())
					);

					return;
				});
				break;

			default:
				logErr("Unknown command.");
				return;
		}

		fs.exists("index.json") && fs.writeFile("index.json~", fs.readFile("index.json"));
		fs.writeFile("index.json", JSON.stringify(lriox.raw));

		["html", "rss", "atom"].forEach(function(feedType){	// Create index in traditional formats, i.e. HTML, RSS, and Atom.
			var entire = fs.readFile(TEMPLATES + "indices/" + feedType + "/entire").toString(),
			itemProto = fs.readFile(TEMPLATES + "indices/" + feedType + "/item").toString(),
			entries = [];

			entire = entire.replace(/\$TITLE\$/g, lriox.raw.title);
			entire = entire.replace(/\$URL\$/g, encodeURI(lriox.raw.url));
			entire = entire.replace(/\$EDITOR\$/g, lriox.raw.editor.display_name);
			entire = entire.replace(/\$CONTACT\$/g, encodeURI(lriox.raw.editor.uris[0]));
			entire = entire.replace(/\$MTIME\$/g, new Date(lriox.raw.updated).toISOString());
			entire = entire.replace(/\$UPDATED\$/g, new Date(lriox.raw.updated).toUTCString());

			lriox.raw.resources.forEach(function(doc){
				var item = itemProto.toString();

				item = item.replace(/\$URL\$/g, doc.url);
				item = item.replace(/\$TITLE\$/g, doc.title);
				item = item.replace(/\$AUTHOR\$/g, doc.author.display_name);
				item = item.replace(/\$MTIME\$/g, new Date(doc.updated).toISOString());
				item = item.replace(/\$UPDATED\$/g, new Date(doc.updated).toUTCString());

				entries.push(item);
			});

			fs.writeFile("index." + feedType, entire.replace(/\$ENTRIES\$/, entries.join("\n").trim()));

			return;
		});
	})();
})();
