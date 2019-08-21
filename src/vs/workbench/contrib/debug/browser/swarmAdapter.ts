// tslint:disable-next-line: import-patterns
import * as fs from 'fs';
import { Session } from './swarmClasses/objects/Session';
import { Artefact } from './swarmClasses/objects/Artefact';
import { Type } from './swarmClasses/objects/Type';
import { SessionService } from './swarmClasses/services/sessionService';
import { TypeService } from './swarmClasses/services/typeService';
import { MethodService } from './swarmClasses/services/methodService';
import { Method } from './swarmClasses/objects/Method';
import { Event } from './swarmClasses/objects/Event';
import { EventService } from 'vs/workbench/contrib/debug/browser/swarmClasses/services/eventService';
import { InvocationService } from 'vs/workbench/contrib/debug/browser/swarmClasses/services/invocationService';
import { Invocation } from 'vs/workbench/contrib/debug/browser/swarmClasses/objects/Invocation';

export const SERVERURL = 'http://localhost:8080/graphql?';

export class SwarmAdapter {
	// Control variables
	private steppedIn: boolean = false;
	private secondStackTrace: boolean = false;
	private workspace: boolean = false;
	private steppedOut: boolean = false;
	private lastSteppedInMethod: Method;
	private lastSteppedInType: Type;
	private lastSteppedInEvent: Event;
	private continued: boolean = false;
	private steppedOver: boolean = false;
	private fileInInternalsInvokingOpen = false;
	private fileInInternalsInvokedOpen = false;
	private firstStackTrace: boolean = true;
	private internalFiles: Map<string, string> = new Map();
	private firstVariables: boolean = true;
	private secondVariables: boolean = false;
	//private breakpointsToggles: Map<number>

	// Data to persist
	private vscodeSession: string;
	private nextStackName: string;
	private pastStackName: string;
	private rootPathInvoking: string;
	private eventKind: string;

	private nextLine: number;
	private nextPath: string;
	private pastLine: number;
	private pastPath: string;

	private swarmSession: Session;
	private swarmEvent: Event;

	private swarmMethodInvoking: Method;
	private swarmTypeInvoking: Type;
	private swarmLastArtefact: Artefact;

	private swarmMethodInvoked: Method;
	private swarmTypeInvoked: Type;
	private swarmNextArtefact: Artefact;

	private swarmInvocation: Invocation;

	private swarmSessionService: SessionService = new SessionService();
	private swarmTypeService: TypeService = new TypeService();
	private swarmMethodService: MethodService = new MethodService();
	private swarmEventService: EventService = new EventService();
	private swarmInvocationService: InvocationService = new InvocationService();

	constructor() { }

	async tryPersist(response: DebugProtocol.Response) {

		switch (response.command) {
			case 'variables':
				if (this.firstVariables) {
					this.defineWorkspace(response);
					this.firstVariables = false;
					this.secondVariables = true;
				} else if (this.secondVariables) {
					this.handleSecondVariables();
				}
				break;
			// The main events
			case 'stepIn':
				this.steppedIn = true;
				this.eventKind = 'stepIn';
				break;
			case 'stepOut':
				this.steppedOut = true;
				this.eventKind = 'stepOut';
				break;
			case 'continue':
				this.continued = true;
				this.eventKind = 'continue';
				break;
			case 'next':
				this.steppedOver = true;
				this.eventKind = 'stepOver';
				break;
			//
			case 'stackTrace':
				if (this.secondStackTrace) {
					if (this.steppedIn || this.steppedOver) {
						this.handleSecondStackTrace(response);
					}
				} else if (!this.continued
					&& !this.steppedOver
					&& !this.steppedIn
					&& this.firstStackTrace) {
					this.handleFirstStackTrace(response);
				}
				break;
			case 'source':
				this.handleSourceCommand(response);
				break;
			case 'disconnect':
				this.clearConditions();
				break;
		}

	}

	defineWorkspace(response: DebugProtocol.Response) {
		if (this.workspace === false) {
			this.rootPathInvoking = response.body.variables[1].value.slice(response.body.variables[1].value, response.body.variables[1].value.length - 1);
			this.workspace = true;
		}
	}

	async handleFirstStackTrace(response: DebugProtocol.Response) {
		this.pastLine = response.body.stackFrames[0].line;
		this.pastPath = response.body.stackFrames[0].source.path;
		this.pastStackName = response.body.stackFrames[0].name;
		this.firstStackTrace = false;

		try {
			this.swarmLastArtefact = new Artefact(await fs.readFileSync(response.body.stackFrames[0].source.path, 'utf8'));
		} catch (error) {
			let content = this.internalFiles.get(response.body.stackFrames[0].source.path);
			if (typeof content === 'string') {
				this.swarmLastArtefact = new Artefact(content);
			} else {
				this.fileInInternalsInvokingOpen = true;
			}
		}

		if (this.pastStackName === "(anonymous function)" && typeof this.swarmLastArtefact.getSourceCode() === 'string') {
			this.pastStackName = this.swarmLastArtefact.getSourceCode().split('\n')[this.pastLine - 1];
		}

		this.secondStackTrace = true;
	}

	handleSourceCommand(response: DebugProtocol.Response) {
		if (this.fileInInternalsInvokingOpen || this.fileInInternalsInvokedOpen) {
			//let artefact = response.body.content;
			//this.swarmNextArtefact = new Artefact(artefact);
			if (this.fileInInternalsInvokingOpen) {
				this.internalFiles.set(this.swarmTypeInvoking.getFullPath(), response.body.content);
				this.swarmLastArtefact = new Artefact(response.body.content);
				this.swarmTypeInvoking.setArtefact(this.swarmLastArtefact);
			} else if (this.fileInInternalsInvokedOpen) {
				this.internalFiles.set(this.swarmTypeInvoked.getFullPath(), response.body.content);
				this.swarmNextArtefact = new Artefact(response.body.content);
				this.swarmTypeInvoked.setArtefact(this.swarmNextArtefact);
				this.swarmMethodInvoked.setType(this.swarmTypeInvoked);
			}
		}
	}

	setSession(vscodeSessionId: string) {
		this.vscodeSession = vscodeSessionId;
	}

	async handleSecondStackTrace(response: DebugProtocol.Response) {

		this.nextLine = response.body.stackFrames[0].line;
		this.nextPath = response.body.stackFrames[0].source.path;
		this.nextStackName = response.body.stackFrames[0].name;

		try {
			this.swarmNextArtefact = new Artefact(await fs.readFileSync(this.nextPath, 'utf8'));
		} catch (error) {
			let content = this.internalFiles.get(this.nextPath);
			if (typeof content === 'string') {
				this.swarmNextArtefact = new Artefact(content);
			} else {
				this.fileInInternalsInvokedOpen = true;
			}
		}

	}

	clearConditions() {
		this.steppedIn = false;
		this.secondStackTrace = false;
		this.workspace = false;
		this.steppedOut = false;
		this.continued = false;
		this.steppedOver = false;
		this.firstStackTrace = true;
		this.firstVariables = true;
		this.secondVariables = false;
	}

	async handleSecondVariables() {
		//this.firstVariables = true;
		this.secondVariables = true;
		if (this.steppedIn) {
			let result = await this.swarmSessionService.getByVscodeId(
				this.vscodeSession
			);
			if (result instanceof Session) {
				this.swarmSession = result;

				this.swarmTypeInvoking = new Type(
					getTypeFullname(this.rootPathInvoking, this.pastPath),
					this.pastPath,
					fromPathToTypeName(this.pastPath),
					this.swarmLastArtefact,
					this.swarmSession);

				let createdTypes = await this.swarmTypeService.getAllBySession(this.swarmSession);
				let shouldCreate = true;

				for (let item of createdTypes) {
					if (this.swarmTypeInvoking.equals(item)) {
						this.swarmTypeInvoking.setID(item.getID());
						shouldCreate = false;
						break;
					}
				}
				if (shouldCreate) {
					this.swarmTypeService.setArtefact(this.swarmLastArtefact);
					this.swarmTypeService.setType(this.swarmTypeInvoking);
					let response = await this.swarmTypeService.create();
					if (response) {
						createdTypes[createdTypes.length] = this.swarmTypeInvoking;
					}
				}

				this.swarmTypeInvoked = new Type(
					getTypeFullname(this.rootPathInvoking, this.nextPath),
					this.nextPath,
					fromPathToTypeName(this.nextPath),
					this.swarmNextArtefact,
					this.swarmSession);

				createdTypes = await this.swarmTypeService.getAllBySession(this.swarmSession);
				shouldCreate = true;

				for (let item of createdTypes) {
					if (this.swarmTypeInvoked.equals(item)) {
						this.swarmTypeInvoked.setID(item.getID());
						shouldCreate = false;
						break;
					}
				}
				if (shouldCreate) {
					this.swarmTypeService.setArtefact(this.swarmNextArtefact);
					this.swarmTypeService.setType(this.swarmTypeInvoked);
					let response = await this.swarmTypeService.create();
					if (response) {
						createdTypes[createdTypes.length] = this.swarmTypeInvoked;
					}
				}

				this.swarmMethodInvoking = new Method(
					this.pastStackName,
					this.swarmTypeInvoking);
				this.swarmMethodService.setMethod(this.swarmMethodInvoking);
				await this.swarmMethodService.create();

				this.swarmMethodInvoked = new Method(
					this.nextStackName,
					this.swarmTypeInvoked);
				this.swarmMethodService.setMethod(this.swarmMethodInvoked);
				await this.swarmMethodService.create();

				this.swarmEvent = new Event(
					this.swarmMethodInvoked,
					this.swarmSession,
					this.pastLine,
					this.eventKind
				);
				this.swarmEventService.setEvent(this.swarmEvent);
				await this.swarmEventService.create();

				this.swarmInvocation = new Invocation(this.swarmMethodInvoking, this.swarmMethodInvoked, this.swarmSession);
				this.swarmInvocationService.setInvocation(this.swarmInvocation);
				this.swarmInvocationService.create();

				this.lastSteppedInMethod = this.swarmMethodInvoked;
				this.lastSteppedInType = this.swarmTypeInvoked;
				this.lastSteppedInEvent = this.swarmEvent;

				this.pastLine = this.nextLine;
				this.pastPath = this.nextPath;
				this.pastStackName = this.nextStackName;

			}
		} else if (this.steppedOut) {

			this.swarmEventService.setEvent(new Event(
				this.lastSteppedInMethod,
				this.swarmSession,
				this.lastSteppedInEvent.getLineNumber(),
				this.eventKind));
			this.swarmEventService.setEvent(this.swarmEvent);
			await this.swarmEventService.create();

			this.pastLine = this.lastSteppedInEvent.getLineNumber();
			this.pastPath = this.lastSteppedInMethod.getType().getFullPath();
			this.pastStackName = this.lastSteppedInMethod.getName();

		} else if (this.steppedOver) {

			let result = await this.swarmSessionService.getByVscodeId(
				this.vscodeSession
			);
			if (result instanceof Session) {
				this.swarmSession = result;

				this.swarmTypeInvoking = new Type(
					getTypeFullname(this.rootPathInvoking, this.pastPath),
					this.pastPath,
					fromPathToTypeName(this.pastPath),
					this.swarmLastArtefact,
					this.swarmSession);

				let createdTypes = await this.swarmTypeService.getAllBySession(this.swarmSession);
				let shouldCreate = true;

				for (let item of createdTypes) {
					if (this.swarmTypeInvoking.equals(item)) {
						this.swarmTypeInvoking.setID(item.getID());
						shouldCreate = false;
						break;
					}
				}
				if (shouldCreate) {
					this.swarmTypeService.setArtefact(this.swarmLastArtefact);
					this.swarmTypeService.setType(this.swarmTypeInvoking);
					let response = await this.swarmTypeService.create();
					if (response) {
						createdTypes[createdTypes.length] = this.swarmTypeInvoking;
					}
				}

				this.swarmMethodInvoking = new Method(
					this.swarmLastArtefact.getSourceCode().split('\n')[this.pastLine - 1],
					this.swarmTypeInvoking
				);
				this.swarmMethodService.setMethod(this.swarmMethodInvoking);
				// pegou dados do evento anterior ta errado
				await this.swarmMethodService.create();

				this.swarmEvent = new Event(
					this.swarmMethodInvoking,
					this.swarmSession,
					this.pastLine,
					this.eventKind
				);

				this.swarmEventService.setEvent(this.swarmEvent);
				await this.swarmEventService.create();

			}

			this.pastLine = this.nextLine;
			this.pastPath = this.nextPath;
			this.pastStackName = this.nextStackName;

		} else if (this.continued) {

			let result = await this.swarmSessionService.getByVscodeId(
				this.vscodeSession
			);
			if (result instanceof Session) {
				this.swarmSession = result;

				this.swarmTypeInvoking = new Type(
					getTypeFullname(this.rootPathInvoking, this.pastPath),
					this.pastPath,
					fromPathToTypeName(this.pastPath),
					this.swarmLastArtefact,
					this.swarmSession);

				let createdTypes = await this.swarmTypeService.getAllBySession(this.swarmSession);
				let shouldCreate = true;

				for (let item of createdTypes) {
					if (this.swarmTypeInvoking.equals(item)) {
						this.swarmTypeInvoking.setID(item.getID());
						shouldCreate = false;
						break;
					}
				}
				if (shouldCreate) {
					this.swarmTypeService.setArtefact(this.swarmLastArtefact);
					this.swarmTypeService.setType(this.swarmTypeInvoking);
					let response = await this.swarmTypeService.create();
					if (response) {
						createdTypes[createdTypes.length] = this.swarmTypeInvoking;
					}
				}

				this.swarmMethodInvoking = new Method(
					this.swarmLastArtefact.getSourceCode().split('\n')[this.pastLine - 1],
					this.swarmTypeInvoking
				);
				this.swarmMethodService.setMethod(this.swarmMethodInvoking);
				await this.swarmMethodService.create();

				this.swarmEvent = new Event(
					this.swarmMethodInvoking,
					this.swarmSession,
					this.pastLine,
					this.eventKind
				);

				this.swarmEventService.setEvent(this.swarmEvent);
				await this.swarmEventService.create();


			}


		}

	}

}

function fromPathToTypeName(path: string) {

	let splittedPath = path.split('/');

	return splittedPath[splittedPath.length - 1].split('.', 1)[0];

}

function getTypeFullname(rootPath: string, filePath: string) {

	if (filePath.split('>').length > 1) {
		let splittedFilePath = filePath.split('>');
		let splittedSplittedFilePath = splittedFilePath[0].split('<');
		return splittedSplittedFilePath[1] + '.' + splittedFilePath[1].split('/')[1].split('.')[0];
	}

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
