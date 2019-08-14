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

	// Data to persist
	private vscodeSession: string;
	private invoked: string;
	private invoking: string;
	private rootPathInvoking: string;
	private rootPathInvoked: string;
	private eventKind: string;

	private swarmSession: Session;
	private swarmEvent: Event;

	private swarmMethodInvoking: Method;
	private swarmTypeInvoking: Type;
	private swarmArtefactInvoking: Artefact;

	private swarmMethodInvoked: Method;
	private swarmTypeInvoked: Type;
	private swarmArtefactInvoked: Artefact;

	private swarmInvocation: Invocation;

	private swarmSessionService: SessionService = new SessionService();
	private swarmTypeService: TypeService = new TypeService();
	private swarmMethodService: MethodService = new MethodService();
	private swarmEventService: EventService = new EventService();
	private swarmInvocationService: InvocationService = new InvocationService();



	constructor() { }

	async tryPersist(response: DebugProtocol.Response) {

		if (response.command === 'variables' && this.workspace === false) {
			this.rootPathInvoking = response.body.variables[1].value;
			this.rootPathInvoking = this.rootPathInvoking.slice(1, this.rootPathInvoking.length - 1);
			this.workspace = true;
		}

		if (response.command === 'stepIn') {
			this.steppedIn = true;
			this.eventKind = 'stepIn';
		}

		if (response.command === 'stepOut') {
			//this.steppedOut = true;
			this.eventKind = 'stepOut';


			this.swarmEventService.setEvent(new Event(this.lastSteppedInMethod,
				 this.swarmSession,
				this.lastSteppedInEvent.getLineNumber(),
				 this.eventKind));
			await this.swarmEventService.create();

			/*this.swarmMethodService.setMethod(this.lastSteppedInMethod);
			await this.swarmMethodService.create();*/

		}

		/*if (response.command === 'stackTrace' && this.steppedOut) {

			let result = await this.swarmSessionService.getByVscodeId(
				this.vscodeSession
			);
			if (result instanceof Session && this.lastSteppedInMethod && this.lastSteppedInType) {

				this.swarmSession = result;






			}
			this.steppedOut = false;
		}*/

		if (this.secondStackTrace && response.command === 'stackTrace') {

			let result = await this.swarmSessionService.getByVscodeId(
				this.vscodeSession
			);
			if (result instanceof Session) {
				this.swarmSession = result;

				this.invoking = response.body.stackFrames[0].name;

				let artefact;
				try {
					artefact = await fs.readFileSync(response.body.stackFrames[0].source.path, 'utf8');//error here
				} catch(error){
					artefact = await '***' + response.body.stackFrames[0].source.origin + '***';
					console.log(error);
				}
				this.swarmArtefactInvoking = new Artefact(artefact);

				this.swarmTypeInvoking = new Type(
					getTypeFullname(this.rootPathInvoking, response.body.stackFrames[0].source.path),
					response.body.stackFrames[0].source.path,
					fromPathToTypeName(response.body.stackFrames[0].source.path),
					this.swarmArtefactInvoking,
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
					this.swarmTypeService.setArtefact(this.swarmArtefactInvoking);
					this.swarmTypeService.setType(this.swarmTypeInvoking);
					let response = await this.swarmTypeService.create();
					if (response) {
						createdTypes[createdTypes.length] = this.swarmTypeInvoking;
					}
				}

				this.swarmMethodInvoking = new Method(
					this.invoking,
					this.swarmTypeInvoking);
				this.swarmMethodService.setMethod(this.swarmMethodInvoking);
				await this.swarmMethodService.create();

				this.swarmMethodInvoked = new Method(
					this.invoked,
					this.swarmTypeInvoking);
				this.swarmMethodService.setMethod(this.swarmMethodInvoked);
				await this.swarmMethodService.create();

				let event = new Event(
					//invoked or invoking?
					this.swarmMethodInvoked,
					this.swarmSession,
					response.body.stackFrames[0].line,
					this.eventKind
				);
				this.swarmEvent = event;
				this.swarmEventService.setEvent(this.swarmEvent);
				await this.swarmEventService.create();

				this.swarmInvocation = new Invocation(this.swarmMethodInvoking, this.swarmMethodInvoked, this.swarmSession);
				this.swarmInvocationService.setInvocation(this.swarmInvocation);
				this.swarmInvocationService.create();

				this.lastSteppedInMethod = this.swarmMethodInvoked;
				this.lastSteppedInType = this.swarmTypeInvoked;
				this.lastSteppedInEvent = event;
			}
			this.secondStackTrace = false;
		}

		if (this.steppedIn && response.command === 'stackTrace') {
			this.invoked = response.body.stackFrames[0].name;
			// TO DO: Find the right path to access the file for the reading
			let artefact;
			try {
				artefact = await fs.readFileSync(response.body.stackFrames[0].source.path, 'utf8');//error here
			} catch(error){
				artefact = await '***' + response.body.stackFrames[0].source.origin + '***';
				console.log(error);
			}
			this.swarmArtefactInvoking = new Artefact(artefact);
			this.steppedIn = false;
			this.secondStackTrace = true;
		}
	}

	setSession(vscodeSessionId: string) {
		this.vscodeSession = vscodeSessionId;
	}

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

function getSignature() {

}
