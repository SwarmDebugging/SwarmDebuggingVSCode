/**
 * Swarm Debugging Project Addition
 */

// tslint:disable-next-line: import-patterns
import * as vscode from 'vscode';

export class Product {

	private id: number = -1;
	private name: string = '';

	constructor(name: string, id: number) {
		this.name = name;
		this.id = id;
	}

	getID() {
		return this.id;
	}

	setID(id: number) {
		this.id = id;
	}

	getName() {
		return this.name;
	}

	setName(name: string) {
		this.name = name;
	}

}

export class ProductQuickPickItem implements vscode.QuickPickItem {

	productId?: number;
	label: string;
	description?: string;
	detail?: string;
	picked?: boolean;
	alwaysShow?: boolean;

	constructor(
		productId: number,
		label: string,
	) {
		this.label = label;
		this.productId = productId;
	}

}
