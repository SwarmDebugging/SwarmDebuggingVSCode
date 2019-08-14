import { Type } from './Type';

export class Method {

	id: number = -1;
	name: string;
	type: Type;
	//signature: string;

	constructor(name: string, type: Type) {
		this.name = name;
		this.type = type;
		//this.signature = signature;
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
	/*
	getSignature() {
		return this.signature;
	}
	*/

	getType() {
		return this.type;
	}

}
