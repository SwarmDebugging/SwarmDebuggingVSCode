/**
 * Swarm Debugging Project Addition
 */

// tslint:disable-next-line: import-patterns
import * as fs from 'fs';
import { Artefact } from './swarmClasses/objects/Artefact';
import { Event } from './swarmClasses/objects/Event';
import { Invocation } from './swarmClasses/objects/Invocation';
import { Method } from './swarmClasses/objects/Method';
import { Session } from './swarmClasses/objects/Session';
import { Type } from './swarmClasses/objects/Type';
import { EventService } from './swarmClasses/services/eventService';
import { InvocationService } from './swarmClasses/services/invocationService';
import { MethodService } from './swarmClasses/services/methodService';
import { SessionService } from './swarmClasses/services/sessionService';
import { TypeService } from './swarmClasses/services/typeService';

export const SERVERURL = 'http://localhost:8080/graphql?';

export class SwarmAdapter {

	private steppedIn: boolean = false;
	private firstStackTrace: boolean = true;
	private secondStackTrace: boolean = false;
	private thirdStackTrace: boolean = false;
	private workspace: boolean = false;
	private steppedOut: boolean = false;
	private lastSteppedInMethod: Method;
	private lastSteppedInEvent: Event;
	private continued: boolean = false;
	private steppedOver: boolean = false;
	private fileInInternalsInvokingOpen = false;
	private fileInInternalsInvokedOpen = false;
	private internalFiles: Map<string, string> = new Map();
	private firstVariables: boolean = true;
	private secondVariables: boolean = false;
	private vscodeSession: string;
	private nextStackName: string;
	private pastStackName: string;
	private rootPathInvoking: string;
	private eventKind: string;
	private nextLine: number;
	private nextPath: string;
	private pastLine: number;
	private pastPath: string;

	// Objects that will hold the information before send them to the server
	private swarmLastArtefact: Artefact;
	private swarmNextArtefact: Artefact;
	private swarmEvent: Event;
	private swarmInvocation: Invocation;
	private swarmMethodInvoking: Method;
	private swarmMethodInvoked: Method;
	private swarmSession: Session;
	private swarmTypeInvoking: Type;
	private swarmTypeInvoked: Type;

	// Services objects that communicate with the GraphQL server
	private swarmMethodService: MethodService = new MethodService();
	private swarmEventService: EventService = new EventService();
	private swarmInvocationService: InvocationService = new InvocationService();
	private swarmSessionService: SessionService = new SessionService();
	private swarmTypeService: TypeService = new TypeService();

	// Empty constructor
	constructor() { }

	/**
	 * This function is used for this adpter to receive the
	 * current VS Code debug session id
	 */
	setSession(vscodeSessionId: string) {
		this.vscodeSession = vscodeSessionId;
	}

	/**
	 * The main function where the response verification will happen
	 * and when the objects are ready, this function will also call
	 * the services to communicate to the server and persist the data
	 */
	async tryPersist(response: DebugProtocol.Response) {

		/**
		 * Here it is verified what command the DebugAdapter response
		 * contains, according to the response that is a behavior that
		 * needs to be done
		 */
		switch (response.command) {
			/**
			 * The variables command appears two times, one only the first
			 * time the debug session starts and it will contain information
			 * about the current workspace
			 * The second variables appear after the completion of a stepping
			 * event, so this command was choosen to be the right moment to
			 * persist the information on the server
			 */
			case 'variables':
				if (this.secondVariables) {
					this.handleSecondVariables();
				} else if (this.firstVariables) {
					this.defineWorkspace(response);
					this.firstVariables = false;
					this.secondVariables = true;
				}
				break;
			/**
			 * The Swarm Debugging will store information about 4
			 * debugging events besides the breakpoints, and they are the
			 * ones below
			 * When these events are sent as command it is possible to
			 * store the event kind
			 */
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
			/**
			 * The stackTrace command is the main one since it will tell us
			 * where the debugger is at the moment and where it will go then
			 * There are four stack traces that are going to be received but
			 * it is needed the information about the first one that is sent
			 * when the debug session begins and the first one that comes
			 * after a debug event is sent
			 * The first stackTrace will give us a first state of where the
			 * debug session started, and the second one (in fact the third)
			 * will tell us which line/file we will be after some event happens
			 */
			case 'stackTrace':
				if (this.thirdStackTrace) {
					if (this.steppedIn || this.steppedOver || this.continued) {
						this.handleSecondStackTrace(response);
					}
					this.secondStackTrace = true;
					this.thirdStackTrace = false;
				} else if (this.secondStackTrace) {
					this.secondStackTrace = false;
					this.thirdStackTrace = true;
				} else if (!this.continued
					&& !this.steppedOver
					&& !this.steppedIn
					&& this.firstStackTrace) {
					this.handleFirstStackTrace(response);
					this.firstStackTrace = false;
					this.secondStackTrace = true;
				}
				break;
			/**
			 * This command tracks the oppened files during the debug session
			 * and it is used to store information about internals files which
			 * path is sent differently
			 */
			case 'source':
				this.handleSourceCommand(response);
				break;
			/**
			 * This command is sent when the stop method is performed or the
			 * debbuger reaches the end of the debug session, so it will clean
			 * all the information in this Swarm Adapter in order to avoid mistakes
			 */
			case 'disconnect':
				this.clearConditions();
				break;
		}

	}

	/**
	 * Given a specfic Debug Adpapter response, this function
	 * stores the information of the current workspace path to
	 * the Swarm Adapter object
	 */
	defineWorkspace(response: DebugProtocol.Response) {
		if (this.workspace === false) {
			this.rootPathInvoking = response.body.variables[1].value.slice(response.body.variables[1].value, response.body.variables[1].value.length - 1);
			this.workspace = true;
		}
	}

	/**
	 * It stores the information that is receveid during the first
	 * stackTrace, it will be the starting point for the past
	 * state
	 */
	async handleFirstStackTrace(response: DebugProtocol.Response) {
		this.pastLine = response.body.stackFrames[0].line;
		this.pastPath = response.body.stackFrames[0].source.path;
		this.pastStackName = response.body.stackFrames[0].name;

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

		if (this.pastStackName === '(anonymous function)' && typeof this.swarmLastArtefact.getSourceCode() === 'string') {
			this.pastStackName = this.swarmLastArtefact.getSourceCode().split('\n')[this.pastLine - 1];
		}

	}

	handleSourceCommand(response: DebugProtocol.Response) {
		if (this.fileInInternalsInvokingOpen || this.fileInInternalsInvokedOpen) {
			if (this.fileInInternalsInvokingOpen) {
				this.internalFiles.set(this.pastPath, response.body.content);
				this.swarmLastArtefact = new Artefact(response.body.content);
				this.swarmTypeInvoking.setArtefact(this.swarmLastArtefact);
			} else if (this.fileInInternalsInvokedOpen) {
				this.internalFiles.set(this.nextPath, response.body.content);
				this.swarmNextArtefact = new Artefact(response.body.content);
			}
		}
	}

	/**
	 * It stores the information that is received during the third
	 * stackTrace, it will be resposible to track the next state of
	 * the debugger
	 */
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

		if (this.nextStackName === '(anonymous function)' && typeof this.swarmNextArtefact.getSourceCode() === 'string') {
			this.nextStackName = this.swarmNextArtefact.getSourceCode().split('\n')[this.nextLine - 1];
		}

	}

	/**
	 * Clear the varibles used in ths adapter
	 */
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

	/**
	 * It will organize the collected data and send it to the server
	 * through the service objects accordingly to the debug event kind
	 */
	async handleSecondVariables() {
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

				/**
				 * Varibles stored in order to correctly persist
				 * a stepOut event that happens after a stepIn
				 */
				this.lastSteppedInMethod = this.swarmMethodInvoked;
				this.lastSteppedInEvent = this.swarmEvent;

				// Past and next state update
				this.pastLine = this.nextLine;
				this.pastPath = this.nextPath;
				this.pastStackName = this.nextStackName;

				this.steppedIn = false;

			}
		} else if (this.steppedOut) {

			this.swarmEventService.setEvent(new Event(
				this.lastSteppedInMethod,
				this.swarmSession,
				this.lastSteppedInEvent.getLineNumber(),
				this.eventKind));
			await this.swarmEventService.create();

			// Past and next state update
			this.pastLine = this.lastSteppedInEvent.getLineNumber();
			this.pastPath = this.lastSteppedInMethod.getType().getFullPath();
			this.pastStackName = this.lastSteppedInMethod.getName();

			this.steppedOut = false;

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

			// Past and next state update
			this.pastLine = this.nextLine;
			this.pastPath = this.nextPath;
			this.pastStackName = this.nextStackName;

			this.steppedOver = false;

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

				// Past and next state update
				this.pastLine = this.nextLine;
				this.pastPath = this.nextPath;
				this.pastStackName = this.nextStackName;

				this.continued = false;

			}


		}

	}

}

// Transforms a standard VS Code path to a Type name
function fromPathToTypeName(path: string) {

	let splittedPath = path.split('/');

	return splittedPath[splittedPath.length - 1].split('.', 1)[0];

}

// Transforms a standard VS Code path to a Type fullname, it requires the workspace path too
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
