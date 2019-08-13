import * as vscode from 'vscode';
import { request } from 'graphql-request';
import { Developer } from './developer';
import { ProductService } from '../services/productService';
import { SERVERURL } from '../extension';

export class Product {

	private id: number;
	private name: string;

	constructor(id: number,
		name: string) {

		this.id = id;
		this.name = name;
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