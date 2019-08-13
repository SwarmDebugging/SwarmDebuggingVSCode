import * as vs from 'vscode';

export class Artefact {

    private id: number = -1;
    private source_code: string = "";
    private type_hash: number = -1; // Generated in the server

    constructor(source_code: string) {
        this.source_code = source_code;
    }

    getID() {
        return this.id;
    }

    setID(id: number) {
        this.id = id;
    }

    getSourceCode() {
        return this.source_code;
    }

    setSourceCode(source_code: string) {
        this.source_code = source_code;
    }

    getTypeHash() {
        return this.type_hash;
    }

    setTypeHash(type_hash: number) {
        this.type_hash = type_hash;
    }

    equals(comparison: Artefact) {
        if (this.source_code === comparison.source_code) {
            return true;
        } else {
            return false;
        }
    }

}