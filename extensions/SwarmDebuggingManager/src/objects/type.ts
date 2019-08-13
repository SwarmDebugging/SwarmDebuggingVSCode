import * as vs from 'vscode';
import { Artefact } from './artefact';
import { Session } from './session';

export class Type {

    id: number = -1;
    full_name: string = "";
    full_path: string = "";
    name: string = "";
    artefact: Artefact;
    session: Session;

    constructor(full_name: string,
        full_path: string,
        name: string,
        artefact: Artefact,
        session: Session) {

        this.full_name = full_name;
        this.full_path = full_path;
        this.name = name;
        this.artefact = artefact;
        this.session = session;

    }

    getID() {
        return this.id;
    }

    setID(id: number) {
        this.id = id;
    }

    getFullName() {
        return this.full_name;
    }

    setFullName(full_name: string) {
        this.full_name = full_name;
    }

    getFullPath() {
        return this.full_path;
    }

    setFullPath(full_path: string) {
        this.full_path = full_path;
    }

    getArtefact() {
        return this.artefact;
    }

    setArtefact(artefact: Artefact) {
        this.artefact = artefact;
    }

    getSession() {
        return this.session;
    }

    setSession(session: Session) {
        this.session = session;
    }

    getName() {
        return this.name;
    }

    setName(name: string) {
        this.name = name;
    }

    equals(comparison: Type) {

        if (this.full_name === comparison.full_name
            && this.full_path === comparison.full_path
            && this.artefact.getSourceCode() === comparison.artefact.getSourceCode()
            && this.session.getID() === comparison.session.getID()) {
            return true;
        } else {
            return false;
        }
    }

}