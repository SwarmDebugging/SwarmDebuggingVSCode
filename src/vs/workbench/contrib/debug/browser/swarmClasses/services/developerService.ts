import * as vscode from 'vscode';
import { request } from 'graphql-request';
import { SERVERURL } from '../extension';
import { Developer } from '../objects/developer';
import { Product } from '../objects/product';
import { ProductService } from './productService';

export class DeveloperService {

	developer: Developer | undefined;

	constructor(developer?: Developer) {
		this.developer = developer;
	}

	setDeveloper(developer: Developer) {
		this.developer = developer;
	}

	async openSwarmAccount(): Promise<number> {
		let username = await vscode.window.showInputBox({ prompt: 'Enter Username to login' });
		if (username === undefined) {
			return -1;
		} else if (!username) {
			vscode.window.showInformationMessage('Please enter a valid username');
			return await this.openSwarmAccount();
		}

		const query = `query findDeveloper($user: String!){
			developer(username: $user) {
				id
			}
		}`;
		const variables = {
			user: username
		};

		var data = await request(SERVERURL, query, variables);
		if (data.developer !== null && this.developer) {
			this.developer.setUsername(username);
			this.developer.setID(data.developer.id);
			vscode.window.showInformationMessage('logged in as ' + username);
			return 1;
		} else {
			vscode.window.showErrorMessage('Wrong Username/Username doesn\'t exist');
			return await this.openSwarmAccount();
		}
	}

	async createSwarmAccount(): Promise<number> {
		let username = (await vscode.window.showInputBox({ prompt: 'Choose a Username' }));
		//add password later
		if (username === undefined) {
			return -1;
		}
		else if (!username) {
			vscode.window.showErrorMessage('You must enter a username');
			return await this.createSwarmAccount();
		}

		const query = `mutation developerCreate($user: String!){
			developerCreate(developer:{
				username: $user
			}) {
				id
			}
		}`;

		const variables = {
			user: username
		};

		var data = await request(SERVERURL, query, variables);
		if (data.developer !== null && this.developer) {
			this.developer.setUsername(username);
			this.developer.setID(data.developerCreate.id);
			vscode.window.showInformationMessage('logged in as ' + username);
			return 1;
		} else {
			vscode.window.showErrorMessage('Error while creating account, try again');
			return await this.createSwarmAccount();
		}
	}

	async login() {
		if (this.developer) {
			if (this.developer.isLoggedIn()) {
				vscode.window.showInformationMessage('Logout before logging in');
				return -4;
			}
		}

		const account = await vscode.window.showQuickPick(['existing account', 'create an account'], { placeHolder: 'Do you have a Swarm Debugging account?' });
		if (account === undefined) {
			return -6;
		}
		if (account === 'create an account') {
			//create a new account before login in
			let res = await this.createSwarmAccount();
			if (res < 1) {
				return -5;
			}
		} else if (account === 'existing account') {
			let res = await this.openSwarmAccount();
			if (res < 1) {
				return -3;
			}
		}

		let productService = new ProductService(new Product(-1, "name"));

		if (this.developer) {
			return await productService.chooseProduct(this.developer);
		}
	}
}