/**
 * Swarm Debugging Project Addition
 */

// tslint:disable-next-line: import-patterns
import * as vscode from 'vscode';
// tslint:disable-next-line: import-patterns
import { request } from 'graphql-request';
import { SERVERURL } from '../../swarmAdapter';
import { Developer } from '../objects/Developer';

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

		let data = await request(SERVERURL, query, variables);
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

		let data = await request(SERVERURL, query, variables);
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

}
