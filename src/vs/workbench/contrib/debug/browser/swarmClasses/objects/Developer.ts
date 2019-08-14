export class Developer {

    private id: number = - 1;
    private color: string = ''; // Is it still used?
    private username: string = '';

    constructor(color: string,
        username: string) {

        this.color = color;
        this.username = username;
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

    getUsername() {
        return this.username;
    }

    setUsername(name: string) {
        this.username = name;
    }

    isLoggedIn() {
        if (this.id === 0 || this.username === '') {
			return false;
		} else {
			return true;
		}
    }
}
