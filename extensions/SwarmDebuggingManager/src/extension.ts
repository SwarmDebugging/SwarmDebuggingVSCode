import * as vscode from 'vscode';
import * as fs from 'fs';
import { TaskProvider, TreeTask } from './taskProvider';
import { Developer } from './objects/developer';
import { Product } from './objects/product';
import { SessionService } from './services/sessionService';
import { ProductService } from './services/productService';
import { TaskService } from './services/taskService';
import { Session } from './objects/session';
import { Task } from './objects/task';
import { BreakpointService } from './services/breakpointService';
import { Artefact } from './objects/artefact';
import { Type } from './objects/type';
import { Breakpoint } from './objects/breakpoint';
import { TypeService } from './services/typeService';

export const SERVERURL = 'http://localhost:8080/graphql?';

var currentlyActiveProduct: Product = new Product(0, '');
var currentlyActiveTask: Task = new Task('', '', '', currentlyActiveProduct);
var currentlyActiveDeveloper: Developer = new Developer(0, '');
var currentlyActiveSession: Session = new Session('', new Date(), '', '', '', currentlyActiveDeveloper, currentlyActiveTask);

var sessionService = new SessionService(currentlyActiveSession);
var productService = new ProductService(currentlyActiveProduct);
var taskService: TaskService = new TaskService(currentlyActiveTask);

export async function activate() {

	console.log('SwarmAccountManager is now active');

	const taskProvider = new TaskProvider(-1); //add -1 case

	vscode.window.registerTreeDataProvider('taskView', taskProvider);

	vscode.commands.registerCommand('extension.swarm-debugging.refreshTasks', () => { taskProvider.refresh(); });

	vscode.commands.registerCommand('extension.swarm-debugging.login', () => {
		currentlyActiveDeveloper.login().then(res => {
			if (res === undefined || typeof res === 'number') {
				return res;
			}
			else if (typeof res === 'object') {
				currentlyActiveProduct.setID(res.getID());
				currentlyActiveProduct.setName(res.getName());
				taskProvider.updateProductId(currentlyActiveProduct.getID());
			}
		});
	});

	vscode.commands.registerCommand('extension.swarm-debugging.logout', () => {
		if(vscode.debug.activeDebugSession !== undefined) {
			return;
		}
		let res = currentlyActiveDeveloper.logout();
		if(res > 0) {
			if (currentlyActiveSession.getID() > 0) {
				sessionService.stopSession();
			}
			clearSet();
			taskProvider.updateProductId(currentlyActiveProduct.getID());
		}
	});

	vscode.commands.registerCommand('extension.swarm-debugging.createProduct', async () => {
		productService.createProduct(currentlyActiveDeveloper).then((res) => {
			if(typeof res === 'number'){
				return;
			}else if (typeof res === 'object') {
				currentlyActiveProduct.setID(res.getID());
				currentlyActiveProduct.setName(res.getName());
				taskProvider.updateProductId(currentlyActiveProduct.getID());
			}
		});
	});

	vscode.commands.registerCommand('extension.swarm-debugging.createTask', () => {
		taskService.createTask(currentlyActiveDeveloper, currentlyActiveProduct).then((res: number) => {
			if(res > 0){
				taskProvider.refresh();
			} else if(res < 0) {
				return;
			}
		});
	});

	vscode.commands.registerCommand('extension.swarm-debugging.startSession', async (task: TreeTask) => {

		if (vscode.debug.activeDebugSession) {
			vscode.window.showErrorMessage('You can not start a SwarmSession while a debugging session is already running');
			return;
		}

		while(!sessionDescription){
			var sessionDescription = await vscode.window.showInputBox({ prompt: 'Enter a description for the session you want to start' });
		}
		if (sessionDescription === undefined) {
			return;
		}

		currentlyActiveTask.setID(task.taskId);

		currentlyActiveSession = new Session(sessionDescription,
			new Date(),
			'',
			'',
			'',
			currentlyActiveDeveloper,
			currentlyActiveTask);

		sessionService.setSession(currentlyActiveSession);
		sessionService.startSession().then((res: number) => {
			if (res > 0) {
				currentlyActiveSession.setID(res);
				vscode.window.showInformationMessage('started a session');
			}
		});
	});

	vscode.commands.registerCommand('extension.swarm-debugging.stopSession', () => {
		if(vscode.debug.activeDebugSession !== undefined) {
			vscode.window.showInformationMessage('Stop the current debug session before stopping a swarm debug session');
			return;
		}
		sessionService.stopSession().then((res: number) => {
			if (res > 0) {
				clearSession();
				vscode.window.showInformationMessage('Stopped session');
			}
		});
	});

	vscode.commands.registerCommand('extension.swarm-debugging.endTask', (task: TreeTask) => {
		if (currentlyActiveSession.getID() < 1) {
			taskService.endTask(task.taskId).then(() => {
				taskProvider.refresh();
			});
		}
	});

	vscode.commands.registerCommand('extension.swarm-debugging.chooseProduct', () => {
		if (!currentlyActiveDeveloper.isLoggedIn()) {
			vscode.window.showInformationMessage('You must be logged in to choose a product');
		} else {
			productService.chooseProduct(currentlyActiveDeveloper).then((res) => {
				if (res === undefined || typeof res === 'number') {
					return res;
				}
				if (typeof res === 'object') {
					currentlyActiveProduct.setID(res.getID());
					currentlyActiveProduct.setName(res.getName());
					taskProvider.updateProductId(currentlyActiveProduct.getID());
					taskProvider.refresh();
				}
			});
		}
	});

	vscode.commands.registerCommand('extension.swarm-debugging.updateTaskTitle', (task: TreeTask) => {
		if (currentlyActiveSession.getID() < 1) {
			taskService.updateTaskTitle(task.taskId).then((res: number) => {
				if (res !== -1) {
					taskProvider.refresh();
				}
			});
		}
	});

	vscode.commands.registerCommand('extension.swarm-debugging.toggleBreakpoints', (task: TreeTask) => {
		currentlyActiveTask.setID(task.taskId);
		if (currentlyActiveTask.getID() > 1) {
				toggleBreakpoints(currentlyActiveTask);
		} else {
			vscode.window.showInformationMessage('There is no task selected.');
		}
	});

	var isFirstTime = true;
	var allBreakpointsActual: any;
	var allBreakpointsPast: any;

	vscode.debug.onDidChangeBreakpoints(async (event: vscode.BreakpointsChangeEvent) => {

		if (currentlyActiveSession.getID() > 0) {

			let breakpointService = new BreakpointService();

			// Management of past and present states of breakpoints
			if (isFirstTime) {
				allBreakpointsActual = vscode.debug.breakpoints;
				allBreakpointsPast = await breakpointService.getAll(currentlyActiveTask);
			} else {
				allBreakpointsPast = allBreakpointsActual;
				allBreakpointsActual = vscode.debug.breakpoints;
			}

			let shouldCreateBreakpoint: boolean;

			// The logic is simple, compare all the past and present breakpoints,
			// find which ones are new and them add them to the database
			// There are some special treatment for the firstime, because in the
			// first time the past state is equivalent to the breakpoints from
			// the database(Breakpoint not vscode.Breakpoint)
			for (var i = 0; i < allBreakpointsActual.length; i++) {
				shouldCreateBreakpoint = true;
				for (var j = 0; j < allBreakpointsPast.length; j++) {
					if (isFirstTime) {
						if (allBreakpointsPast[j].equalsVSBreakpoint(allBreakpointsActual[i] as vscode.SourceBreakpoint)) {
							shouldCreateBreakpoint = false;
							break;
						}
					} else {
						if (allBreakpointsPast[j] === allBreakpointsActual[i]) {
							shouldCreateBreakpoint = false;
							break;
						}
					}
				}

				// If the breakpoint is found new, it is added to database
				if (shouldCreateBreakpoint) {

					let breakpoint = allBreakpointsActual[i] as vscode.SourceBreakpoint;

					let swarmArtefact = new Artefact(fs.readFileSync(breakpoint.location.uri.fsPath, 'utf8'));

					let fullname: string = '';
					if (vscode.workspace.rootPath) {
						fullname = getTypeFullname(vscode.workspace.rootPath, breakpoint.location.uri.fsPath);
					}
					let swarmType = new Type(fullname,
						breakpoint.location.uri.fsPath,
						fromPathToTypeName(breakpoint.location.uri.fsPath),
						swarmArtefact,
						currentlyActiveSession);

					let swarmBreakpoint = new Breakpoint(breakpoint.location.range.start.line, swarmType);

					// Before creating a type, it is needed to verify if it is already in the database
					let typeService = new TypeService();
					let createdTypes = await typeService.getAllBySession(currentlyActiveSession);
					let shouldCreate = true;
					for (let item of createdTypes) {
						if (swarmType.equals(item)) {
							swarmType.setID(item.getID());
							shouldCreate = false;
							break;
						}
					}
					if (shouldCreate) {
						typeService.setArtefact(swarmArtefact);
						typeService.setType(swarmType);
						let response = await typeService.create();
						if (response) {
							createdTypes[createdTypes.length - 1] = swarmType;
						}
					}

					let breakpointService = new BreakpointService(swarmBreakpoint);
					let response = await breakpointService.create();

					if (response) {
						console.log('Breakpoint added!');
					}

				}

				if (isFirstTime) {
					isFirstTime = false;
				}

			}

		}

	});

	vscode.debug.onDidStartDebugSession((e) => {
		if(currentlyActiveSession.getID() > 0){
			vscode.window.showInformationMessage('Storing stepping information.');
			if(vscode.debug.activeDebugSession){
				currentlyActiveSession.setVscodeSession(vscode.debug.activeDebugSession.id);
				sessionService.setSession(currentlyActiveSession);
				sessionService.updateSession();
			}
		} else {
			vscode.window.showInformationMessage('No swarm session active, no stepping information will be stored.');
		}
	});

	vscode.debug.onDidTerminateDebugSession((e) => {
		if(currentlyActiveSession.getID() > 0){
			vscode.commands.executeCommand('extension.swarm-debugging.stopSession');
		}
	});

}

export function deactivate() {
	//stop currently active sessions on logout
	currentlyActiveDeveloper.logout();
}

function clearSet() {
	currentlyActiveProduct = new Product(0, '');
	currentlyActiveTask = new Task('', '', '', currentlyActiveProduct);
	currentlyActiveDeveloper = new Developer(0, '');
	currentlyActiveSession = new Session('', new Date(), '', '', '', currentlyActiveDeveloper, currentlyActiveTask);

	sessionService = new SessionService(currentlyActiveSession);
 	productService = new ProductService(currentlyActiveProduct);
 	taskService = new TaskService(currentlyActiveTask);
}

function clearSession() {
	currentlyActiveSession = new Session('', new Date(), '', '', '', currentlyActiveDeveloper, currentlyActiveTask);
	sessionService.setSession(currentlyActiveSession);
}

function fromPathToTypeName(path: string) {

	let splittedPath = path.split('/');

	return splittedPath[splittedPath.length - 1].split('.', 1)[0];

}

function getTypeFullname(rootPath: string, filePath: string) {

	let splittedRootPath = rootPath.split('/');
	let splittedFilePath = filePath.split('/');

	let fullname = '';
	for (let i = splittedRootPath.length - 1; i < splittedFilePath.length; i++) {
		if (i === splittedRootPath.length - 1) {
			fullname = splittedFilePath[i];
		} else {
			fullname = fullname + '.' + splittedFilePath[i];
		}
	}

	return fullname;

}

async function toggleBreakpoints(task: Task) {

	let breakpointService = new BreakpointService();
	let allBreakpointsPast = await breakpointService.getAll(task);

	let breakpoints: vscode.Breakpoint[] = [];

	for (var i = 0; i < allBreakpointsPast.length; i++) {

		let artefactSourceLines = allBreakpointsPast[i].getType().getArtefact().getSourceCode().split('\n');
		let actualFile = fs.readFileSync(allBreakpointsPast[i].getType().getFullPath(), 'utf8');
		let actualSourceLines = actualFile.split('\n');

		let oldLine = artefactSourceLines[allBreakpointsPast[i].getLineNumber()];
		let actualLine = actualSourceLines[allBreakpointsPast[i].getLineNumber()];

		if (oldLine === actualLine) {

			//@ts-ignore
			let uri = new vscode.Uri('file', '', allBreakpointsPast[i].getType().getFullPath(), '', '');
			let range = new vscode.Range(allBreakpointsPast[i].getLineNumber(), 0, allBreakpointsPast[i].getLineNumber(), 0);
			let location = new vscode.Location(uri, range);
			let breakpointVS = new vscode.SourceBreakpoint(location, true);

			breakpoints[i] = breakpointVS as vscode.Breakpoint;

		}

	}

	vscode.debug.addBreakpoints(breakpoints);

	return true;
}
//
