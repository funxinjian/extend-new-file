// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import path from 'path';
import fs from 'fs';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const configKey = 'extend-new-file.extNames';
	const supportArray = [".txt", ".excalidraw", ".plantuml", ".mts"];

	for (const extName of supportArray) {
		context.subscriptions.push(vscode.commands.registerCommand(`extend-new-file.NewFile-${extName.substring(1)}`, (uri) => {
			checkExtension(uri)
				.then((dirUri) => {
					createEmptyFile(dirUri, "NewFile" + extName, "");
				})
				.catch((error) => vscode.window.showErrorMessage(error.message));
		}));
	}
	context.subscriptions.push(vscode.commands.registerCommand("extend-new-file.NewFile-custom", (uri) => {
		checkExtension(uri)
			.then(async (dirUri) => {
				const extNames = vscode.workspace.getConfiguration().get<string[]>(configKey) as string[];
				if (Array.isArray(extNames) && extNames.length > 0) {
					const items: string[] = extNames.filter(v => v);
					const extName = await vscode.window.showQuickPick(items, {});
					return ({ dirUri, extName });
				} else {
					throw new Error("Please set extend-new-file.extNames in settings.json");
				}
			}).then(async ({ dirUri, extName }) => {
				if (extName) {
					const baseName = await vscode.window.showInputBox({ placeHolder: "Please enter the file name" });
					return { dirUri, baseName: baseName || "NewFile", extName };
				} else {
					throw new Error("Please select a file extension");
				}
			})
			.then(({ dirUri, baseName, extName }) => createEmptyFile(dirUri, baseName + extName, ""))
			.catch((error) => vscode.window.showErrorMessage(error.message));
	}));
}

// This method is called when your extension is deactivated
export function deactivate() { }

function checkExtension(uri: vscode.Uri): Promise<vscode.Uri> {
	return new Promise<vscode.Uri>((resolve, reject) => {
		try {
			if (uri && uri.fsPath) {
				const stat = fs.statSync(uri.fsPath);
				if (stat.isFile()) {
					resolve(vscode.Uri.file(path.dirname(uri.fsPath)));
				} else {
					resolve(uri);
				}
			} else {
				return reject(new Error('No active dir'));
			}
		} catch (error) {
			reject(error);
		}
	});
}


function createEmptyFile(dirUri: vscode.Uri, fileName: string, content: string | number[] = "") {
	const extName = path.extname(fileName);
	const baseName = path.basename(fileName, extName);
	let index = 0;
	let newFileUri = vscode.Uri.joinPath(dirUri, `${baseName}${extName}`);
	while (fs.existsSync(newFileUri.fsPath)) {
		newFileUri = vscode.Uri.joinPath(dirUri, `${baseName}_${++index}${extName}`);
	}
	vscode.workspace.fs.writeFile(newFileUri, Buffer.from(content))
		.then(() => {
			console.log(`New File: ${newFileUri}`);
			vscode.commands.executeCommand('vscode.open', newFileUri);
		});
}