import * as vscode from 'vscode';

export class Developer {

    private id: number = - 1;
    private color: string = ""; // Is it still used?
    private name: string = "";

    constructor(color: string,
        name: string) {

        this.color = color;
        this.name = name;
    }

    getID() {
        return this.id;
    }

    setID(id: number) {
        this.id = id;
    }

    getColor() {
        return this.color;
    }

    setColor(color: string) {
        this.color = color;
    }

    getName() {
        return this.name;
    }

    setName(name: string) {
        this.name = name;
    }

}