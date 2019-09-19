import debug from 'debug'
import { EventEmitter } from 'events'

export const logs = new EventEmitter()

class EmittingLogger {
    private debugger:Function
    private name:string

    constructor(name:string) {
        this.name = name
        this.debugger = debug(name)
        this.log = this.log.bind(this)
    }

    log(...args: any[]) {
        logs.emit(this.name, ...args)
        this.debugger(...args)
    }
    
}

export function emittingLogger(name:string):Function {
    return new EmittingLogger(name).log
}