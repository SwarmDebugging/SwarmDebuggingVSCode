/**
 * Swarm Debugging Project Addition
 */

// tslint:disable-next-line: import-patterns
import * as vscode from 'vscode';
// tslint:disable-next-line: import-patterns
import { request } from 'graphql-request';
import { SERVERURL } from '../../swarmAdapter';
import { Developer } from '../objects/Developer';
import { Product, ProductQuickPickItem } from '../objects/Product';

export class ProductService {

	product: Product | undefined;

	constructor(product?: Product) {
		this.product = product;
	}

	setProduct(product: Product) {
		this.product = product;
	}

	async getProducts(currentUser: Developer): Promise<vscode.QuickPickItem[]> {
		//Look into multiple graphql queries in one request
		const products: ProductQuickPickItem[] = [];

		const query = `query products($developerId: Long) {
			products(developerId: $developerId) {
				id
				name
			}
		}`;
		const variables = {
			developerId: currentUser.getID()
		};

		let data = await request(SERVERURL, query, variables);
		for (let i = 0; i < data.products.length; i++) {
			products.push({
				label: data.products[i].name,
				productId: data.products[i].id
			});
		}
		return products;
	}

	async createProduct(currentUser: Developer) {
		if (!currentUser.isLoggedIn()) {
			vscode.window.showInformationMessage('You must be logged in to create a new product');
			return -1;
		}

		if (!this.product) {
			return -1;
		}

		let productName: string | undefined = '';
		while (productName === '') {
			productName = await vscode.window.showInputBox({ prompt: 'Enter the product name' });
		}
		if (productName === undefined) {
			return -1;
		}

		const productQuery = `mutation createProduct($productName: String!) {
			productCreate(product: {
				name: $productName
			}) {
				id
			}
		}`;

		const productVariables = {
			productName: productName
		};

		let productData = await request(SERVERURL, productQuery, productVariables);

		//delete this task when a real task is entered to keep link between developer and product
		const taskQuery = `mutation taskCreate($productId: Long!) {
			taskCreate(task: {
				url: "taskUrl"
				title: "productCreation"
				done: true
				product: {
					id: $productId
				}
			}) {
				id
			}
		}`;

		const taskVariables = {
			productId: productData.productCreate.id
		};

		let taskData;
		if (productData.productCreate.id) {
			taskData = await request(SERVERURL, taskQuery, taskVariables);
		}

		let date = new Date().toISOString();

		//create a session
		const sessionQuery = `mutation sessionStart($now: Date, $developerId: Long!, $taskId: Long!) {
			sessionStart(session: {
				developer: {
					id: $developerId
				}
				task: {
					id: $taskId
					done: true
				}
				purpose: "create a link between developer and product, not an actual session"
				finished: $now
			}) {
				id
			}
		}`;

		const sessionVariables = {
			now: date,
			developerId: currentUser.getID(),
			taskId: taskData.taskCreate.id
		};

		//add sessionCreate verification?
		if (taskData.taskCreate.id) {
			let sessionData = await request(SERVERURL, sessionQuery, sessionVariables);
			if (sessionData.sessionStart.id && productData.productCreate.id) {
				//return Number(productData.productCreate.id);
				return new Product(productName, productData.productCreate.id);
			}
		}
		return -1;
	}

}
