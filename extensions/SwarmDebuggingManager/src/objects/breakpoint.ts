import * as vs from 'vscode';
import * as fs from 'fs';
import { Type } from './type';

export class Breakpoint {

    // Char_start and char_end removed because there was no use
    private id: number = -1;
    private line_number: number = -1;
    private type: Type;

    constructor(line_number: number,
        type: Type) {

        this.line_number = line_number;
        this.type = type;
    }

    getID() {
        return this.id;
    }

    setID(id: number) {
        this.id = id;
    }

    getLineNumber() {
        return this.line_number;
    }

    setLineNumber(line_number: number) {
        this.line_number = line_number;
    }

    getType() {
        return this.type;
    }

    setType(type: Type) {
        this.type = type;
    }

    // This  function is used to compare a breakpoint as it comes straight from the VSCode
    equalsVSBreakpoint(comparison: vs.SourceBreakpoint) {

        let vsSourceCode = fs.readFileSync(comparison.location.uri.fsPath, 'utf8');

        if (this.line_number === comparison.location.range.start.line
            && this.type.getFullPath() === comparison.location.uri.fsPath
            && this.type.getArtefact().getSourceCode() === vsSourceCode) {
            return true;
        } else {
            return false;
        }
    }

}