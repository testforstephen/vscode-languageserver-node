/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	CodeAction, CodeActionKind, Command, CompletionItem, createConnection, CreateFile, DeclarationLink,
	Definition, DefinitionLink, Diagnostic, DocumentHighlight, DocumentHighlightKind, Hover, InitializeError,
	InitializeResult, Location, MarkupKind, MessageActionItem, NotificationType, Position, Range, ResponseError,
	SignatureHelp, SymbolInformation, SymbolKind, TextDocumentEdit, TextDocuments, TextDocumentSyncKind,
	TextEdit, VersionedTextDocumentIdentifier, ProposedFeatures, DiagnosticTag, Proposed, InsertTextFormat,
	SelectionRangeRequest, SelectionRange
} from '../../../server/lib/main';

import {
	TextDocument
} from '../../../textDocument/lib/umd/main';

let connection = createConnection(ProposedFeatures.all);
let documents = new TextDocuments(TextDocument);

documents.listen(connection);

documents.onWillSave((event) => {
	connection.console.log('On Will save received');
});

connection.telemetry.logEvent({
	name: 'my custome event',
	data: {
		foo: 10
	}
});

interface ActionItem extends MessageActionItem {
	id: string;
}

let folder;

connection.onInitialize((params, cancel, progress): Thenable<InitializeResult> | ResponseError<InitializeError> | InitializeResult => {
	progress.begin('Initializing test server');

	for (let folder of params.workspaceFolders) {
		connection.console.log(`${folder.name} ${folder.uri}`);
	}
	if (params.workspaceFolders && params.workspaceFolders.length > 0) {
		folder = params.workspaceFolders[0].uri;
	}

	return new Promise((resolve, reject) => {
		let result: InitializeResult & { capabilities: Proposed.CallHierarchyServerCapabilities } = {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Full,
				hoverProvider: true,
				completionProvider: {
					resolveProvider: true,
					triggerCharacters: ['::']
				},
				signatureHelpProvider: {
				},
				definitionProvider: true,
				referencesProvider: { workDoneProgress: true },
				documentHighlightProvider: true,
				documentSymbolProvider: true,
				workspaceSymbolProvider: true,
				codeActionProvider: {
					codeActionKinds: [CodeActionKind.Refactor, CodeActionKind.Source, CodeActionKind.SourceOrganizeImports]
				},
				codeLensProvider: {
					resolveProvider: true
				},
				documentFormattingProvider: true,
				documentRangeFormattingProvider: true,
				documentOnTypeFormattingProvider: {
					firstTriggerCharacter: ';',
					moreTriggerCharacter: ['}', '\n']
				},
				renameProvider: true,
				workspace: {
					workspaceFolders: {
						supported: true,
						changeNotifications: true
					}
				},
				implementationProvider: {
					id: "mdjdjjdnnnndjjjjddd",
					documentSelector: ["bat"]
				},
				typeDefinitionProvider: true,
				declarationProvider: { workDoneProgress: true },
				executeCommandProvider: {
					commands: ['testbed.helloWorld']
				},
				callHierarchyProvider: true,
				selectionRangeProvider: { workDoneProgress: true }
			}
		};
		setTimeout(() => {
			resolve(result);
		}, 50);
	});
});

connection.onInitialized((params) => {
	connection.workspace.onDidChangeWorkspaceFolders((event) => {
		connection.console.log('Workspace folder changed received');
	});
	connection.workspace.getWorkspaceFolders().then(folders => {
		for (let folder of folders) {
			connection.console.log(`Get workspace folders: ${folder.name} ${folder.uri}`);
		}
	});
});

connection.onShutdown((handler) => {
	connection.console.log("Shutdown received");
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve(undefined);
		}, 3000);
	});
});

documents.onDidChangeContent((event) => {
	let document = event.document;
	connection.sendDiagnostics({ uri: document.uri, diagnostics: validate(document) });
});

documents.onDidSave((event) => {
	connection.console.info(`Document got saved: ${event.document.uri} ${event.document.version}`);
})

connection.onDidChangeWatchedFiles((params) => {
	connection.console.log("File change event received");
	documents.all().forEach(document => {
		connection.sendDiagnostics({ uri: document.uri, diagnostics: validate(document) });
	});
});

connection.onDidChangeConfiguration((params) => {
	documents.all().forEach(document => {
		connection.sendDiagnostics({ uri: document.uri, diagnostics: validate(document) });
	});
	connection.workspace.getConfiguration('testbed').then((value) => {
		connection.console.log("Configuration received");
	})
});

/**
 * Some doc
 * @param document
 */
function validate(document: TextDocument): Diagnostic[] {
	connection.window.createWorkDoneProgress().then((progress) => {
		progress.begin('Validating', 0, 'happy coding', true);
		let counter = 1;
		let interval = setInterval(() => {
			if (counter === 11) {
				clearInterval(interval);
				progress.done();
			} else {
				progress.report(counter++ * 10);
			}
		}, 1000);
		progress.token.onCancellationRequested(() => {
			progress.done();
			clearInterval(interval);
		});
	});
	connection.console.log("Validaing document " + document.uri);
	return [ {
		range: Range.create(0, 0, 0, 10),
		message: "A error message",
		tags: [
			DiagnosticTag.Unnecessary
		]
	}];
}

connection.onHover((textPosition): Hover => {
	// let doc : MarkedString[] = ["# Title","### description"]
	return {
		contents: {
			kind: MarkupKind.PlainText,
			value: 'foo\nbar'
		}
		// contents: {
		// 	kind: MarkupKind.Markdown,
		// 	value: [
		// 		'```typescript',
		// 		'function validate(document: TextDocument): Diagnostic[]',
		// 		'```',
		// 		'___',
		// 		'Some doc',
		// 		'',
		// 		'_@param_ `document` '
		// 	].join('\n')
		// }
		// contents: doc
	};
});

connection.onCompletion((params, token): CompletionItem[] => {
	let item = CompletionItem.create('negate');
	item.insertTextFormat = InsertTextFormat.Snippet;
	item.textEdit = TextEdit.insert(params.position, 'negate ${1:number}');
	return [
		item
	]
});

connection.onCompletionResolve((item): CompletionItem => {
	item.detail = "This is a special hello world function";
	item.documentation =  {
		kind: MarkupKind.Markdown,
		value: [
			'# Heading',
			'```typescript',
			'console.log("Hello World");',
			'```'
		].join('\n')};
	return item;
});

connection.onSignatureHelp((item): SignatureHelp => {
	return { signatures: [{ label: "Hello World Signature" }], activeSignature: 0, activeParameter: 0 }
});

connection.onDefinition((params): DefinitionLink[] => {
	// return { uri: params.textDocument.uri, range: { start: { line: 0, character: 0}, end: {line: 0, character: 10 }}};
	return [{
		targetUri: params.textDocument.uri,
		targetRange: { start: { line: 0, character: 2}, end: {line: 5, character: 45 } },
		targetSelectionRange: { start: { line: 1, character: 5}, end: {line: 1, character: 10 } },
		originSelectionRange: {
			start: { line: params.position.line, character: Math.max(0, params.position.character - 4) },
			end: { line: params.position.line, character: params.position.character + 4 }
		}
	}];
});

connection.onDeclaration((params): DeclarationLink[] => {
	return [{
		targetUri: params.textDocument.uri,
		targetRange: { start: { line: 3, character: 0}, end: {line: 3, character: 10 } },
		targetSelectionRange: { start: { line: 3, character: 0}, end: {line: 3, character: 10 } },
		originSelectionRange: {
			start: { line: params.position.line, character: Math.max(0, params.position.line - 4) },
			end: { line: params.position.line, character: params.position.line + 4 }
		}
	}];
});

connection.onImplementation((params, token): Promise<Definition> => {
	token.onCancellationRequested
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve({ uri: params.textDocument.uri, range: { start: { line: 1, character: 0}, end: {line: 1, character: 10 }}});
		}, 2000);
	});
});

connection.onTypeDefinition((params): Definition => {
	return { uri: params.textDocument.uri, range: { start: { line: 2, character: 0}, end: {line: 2, character: 10 }}};
});

connection.onReferences((params): Location[] => {
	return [
		{ uri: params.textDocument.uri, range: { start: { line: 0, character: 0}, end: {line: 0, character: 10 }}},
		{ uri: params.textDocument.uri, range: { start: { line: 2, character: 0}, end: {line: 2, character: 20 }}},
	]
});

connection.onDocumentHighlight((textPosition) => {
	let position = textPosition.position;
	return [
		DocumentHighlight.create({
			start: { line: position.line + 1, character: position.character },
			end: { line: position.line + 1, character: position.character + 5 }
		}, DocumentHighlightKind.Write)
	];
});

connection.onDocumentSymbol((identifier) => {
	return [
		SymbolInformation.create("Item 1", SymbolKind.Function, {
			start: { line: 0, character: 0 },
			end: { line: 0, character: 10 }
		}),
		SymbolInformation.create("Item 2", SymbolKind.Function, {
			start: { line: 1, character: 0 },
			end: { line: 1, character: 10 }
		})
	];
});

connection.onWorkspaceSymbol((params) => {
	return [
		SymbolInformation.create("Workspace Item 1", SymbolKind.Function, {
			start: { line: 0, character: 0 },
			end: { line: 0, character: 10 }

		}, `${folder}/test.bat`),
		SymbolInformation.create("Workspace Item 2", SymbolKind.Function, {
			start: { line: 1, character: 0 },
			end: { line: 1, character: 10 }
		}, `${folder}/test.bat`)
	];
});

connection.onCodeAction((params) => {
	let document = documents.get(params.textDocument.uri);
	let codeAction: CodeAction = {
		title: "Custom Code Action",
		kind: CodeActionKind.QuickFix,
		edit: {
			documentChanges: [
				TextDocumentEdit.create(
					VersionedTextDocumentIdentifier.create(document.uri, document.version),
					[TextEdit.insert({ line: 0, character: 0}, "Code Action")]
				),
				CreateFile.create(`${folder}/newFile.bat`, { overwrite: true }),
				TextDocumentEdit.create(
					VersionedTextDocumentIdentifier.create(`${folder}/newFile.bat`, null),
					[TextEdit.insert({ line: 0, character: 0 }, 'The initial content')]
				)
			]
		}
	}
	return [
		codeAction
	];
});

connection.onCodeLens((params) => {
	return [
		{
			range: Range.create(2,0,2,10),
			command: Command.create('My Code Lens', 'commandId'),
			data: '1',
		}
	]
});

connection.onDocumentFormatting((params) => {
	return [
		TextEdit.insert(Position.create(1,0), 'A new line\n')
	];
})

connection.onDocumentRangeFormatting((params) => {
	connection.console.log(`Document Range Formatting: ${JSON.stringify(params.range)} ${JSON.stringify(params.options)}`);
	return [];
});

connection.onDocumentOnTypeFormatting((params) => {
	connection.console.log(`Document On Type Formatting: ${JSON.stringify(params.position)} ${params.ch} ${JSON.stringify(params.options)}`);
	return [];
});

connection.onRenameRequest((params) => {
	connection.console.log(`Rename: ${JSON.stringify(params.position)} ${params.newName}`);
	return new ResponseError(20, 'Element can\'t be renaned');
	// let change = new WorkspaceChange();
	// change.getTextEditChange(params.textDocument.uri).insert(Position.create(0,0), 'Raname inserted\n');
	// return change.edit;
});

connection.onExecuteCommand((params) => {
	if (params.command === 'testbed.helloWorld') {
		throw new Error('Command execution failed');
	}
	return undefined;
});

connection.onRequest('addTwenty', (param) => {
	return { value: param.value + 20 };
});

let not: NotificationType<string[], void> = new NotificationType<string[], void>('testbed/notification');
connection.onNotification(not, (arr) => {
	connection.console.log('Is array: ' + Array.isArray(arr));
});

connection.onRequest(SelectionRangeRequest.type, (params) => {
	let result: SelectionRange = {
		range: {
			start: {
				line: params.positions[0].line,
				character: Math.max(0, params.positions[0].character - 10)
			},
			end: {
				line: params.positions[0].line,
				character: params.positions[0].character + 10
			}
		}
	};

	return [result];
});

connection.onRequest(Proposed.CallHierarchyPrepareRequest.type, (params) => {
	return null;
});

connection.listen();