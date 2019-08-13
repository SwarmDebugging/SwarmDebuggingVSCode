import * as vscode from 'vscode';
import { request } from 'graphql-request';
import { SERVERURL } from '../extension';
import { Task } from '../objects/task';
import { Developer } from '../objects/developer';
import { Product } from 'objects/product';

export class TaskService {

    task: Task | undefined;

    constructor(task?: Task) {
        this.task = task;
    }

    setTask(task: Task) {
        this.task = task;
    }

    async updateTaskTitle(taskId: number): Promise<number> {

        const title = await vscode.window.showInputBox({ prompt: "Enter new title for selected task" });

        if (title === undefined) {
            return -1;
        } else if (!title) {
            vscode.window.showInformationMessage('new title must be valid');
            return await this.updateTaskTitle(taskId);
        }

        const query = `mutation taskUpdateTitle($taskId: Long!, $title: String!){
            taskUpdate(taskId: $taskId, title: $title){
                id
            }
        }`;

        const variables = {
            taskId: taskId,
            title: title
        };

        let data = await request(SERVERURL, query, variables);
        return 1;
    }

    async endTask(taskId: number) {

        //can a developer end a task while in a debugging session?

        const query = `mutation taskDone($taskId: Long!) {
            taskDone(taskId: $taskId){
                done
            }
        }`;

        const variables = {
            taskId: taskId
        };

        let data = await request(SERVERURL, query, variables);

        if (data.taskDone.done === true) {
            vscode.window.showInformationMessage('Task marked as done');
            return taskId;
        }
    }

    async createTask(currentUser: Developer, currentProduct: Product) {

        if (currentProduct.getID() < 1) {
            vscode.window.showInformationMessage('No product selected');
            return -1;
        } else if (!currentUser.isLoggedIn()) {
            vscode.window.showInformationMessage('You must be logged in to create a new task');
            return -2;
        }
    
        var taskName: string | undefined = "";
        while(taskName === "") {
            taskName = await vscode.window.showInputBox({ prompt: 'Enter the name of the new task' });
        }

        if (taskName === undefined) {
            return -3;
        }

        const query = `mutation taskCreate($taskName: String!, $productId: Long!) {
            taskCreate(task: {
                title: $taskName
                done: false
                product: {
                    id: $productId
                }
            }) {
                id
            }
        }`;

        const variables = {
            taskName: taskName,
            productId: currentProduct.getID()
        };

        let data = await request(SERVERURL, query, variables);

        if(data.taskCreate.id){
            return 1;
        }
        return -4;
    }
}