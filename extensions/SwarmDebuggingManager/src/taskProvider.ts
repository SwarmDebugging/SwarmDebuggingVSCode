import * as vscode from 'vscode';
import { request } from 'graphql-request';
import { SERVERURL } from './extension';

export class TaskProvider implements vscode.TreeDataProvider<TreeTask> {

	private _onDidChangeTreeData: vscode.EventEmitter<TreeTask | undefined> = new vscode.EventEmitter<TreeTask | undefined>();
	readonly onDidChangeTreeData: vscode.Event<TreeTask | undefined> = this._onDidChangeTreeData.event;

	private productID: number; //manage -1, -2 productsID errors?

	constructor(productID: number) { this.productID = productID; }

	public async getChildren(task?: TreeTask): Promise<TreeTask[]> {

		let treeTasks = getTasks(this.productID);

		return treeTasks;
	}

	getTreeItem(task: TreeTask): vscode.TreeItem {
		return task;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	setProductID(productID: number) {
		this.productID = productID;
	}

	getProductID() {
		return this.productID;
	}

	updateProductId(productID: number) {
		this.setProductID(productID);
		this.refresh();
	}
}

async function getTasks(productId: number) {

	const query = `query tasks($productId: Long) {
		tasksActive(productId: $productId) {
			id
			title
			url
		}
	}`;
	const variables = {
		productId: productId
	};

	var data = await request(SERVERURL, query, variables);
	console.log(data);

	let tasks: TreeTask[] = [];

	for (let i = 0; i < data.tasksActive.length; i++) {
		tasks[i] = new TreeTask(data.tasksActive[i].url, data.tasksActive[i].id,
			data.tasksActive[i].title, vscode.TreeItemCollapsibleState.None);
	}

	return tasks;
}

export class TreeTask extends vscode.TreeItem {

	url: string;
	taskId: number;

	constructor(
		url: string,
		taskId: number,
		label: string,
		collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
		this.url = url;
		this.taskId = taskId;
	}

	contextValue = 'task';

}