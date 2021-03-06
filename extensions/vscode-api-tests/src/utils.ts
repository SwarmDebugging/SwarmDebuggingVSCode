/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { MemFS } from './memfs';
import * as assert from 'assert';

export function rndName() {
	return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10);
}

export const testFs = new MemFS();
vscode.workspace.registerFileSystemProvider(testFs.scheme, testFs);

export async function createRandomFile(contents = '', dir: vscode.Uri | undefined = undefined, ext = ''): Promise<vscode.Uri> {
	let fakeFile: vscode.Uri;
	if (dir) {
		assert.equal(dir.scheme, testFs.scheme);
		fakeFile = dir.with({ path: dir.path + '/' + rndName() + ext });
	} else {
		fakeFile = vscode.Uri.parse(`${testFs.scheme}:/${rndName() + ext}`);
	}
	await testFs.writeFile(fakeFile, Buffer.from(contents), { create: true, overwrite: true });
	return fakeFile;
}

export async function deleteFile(file: vscode.Uri): Promise<boolean> {
	try {
		await testFs.delete(file);
		return true;
	} catch {
		return false;
	}
}

export function pathEquals(path1: string, path2: string): boolean {
	if (process.platform !== 'linux') {
		path1 = path1.toLowerCase();
		path2 = path2.toLowerCase();
	}

	return path1 === path2;
}

export function closeAllEditors(): Thenable<any> {
	return vscode.commands.executeCommand('workbench.action.closeAllEditors');

}

export function disposeAll(disposables: vscode.Disposable[]) {
	vscode.Disposable.from(...disposables).dispose();
}

export function conditionalTest(name: string, testCallback: (done: MochaDone) => void | Thenable<any>) {
	if (isTestTypeActive()) {
		const async = !!testCallback.length;
		if (async) {
			test(name, (done) => testCallback(done));
		} else {
			test(name, () => (<() => void | Thenable<any>>testCallback)());
		}
	}
}

function isTestTypeActive(): boolean {
	return !!vscode.extensions.getExtension('vscode-resolver-test');
}
