

interface queuedFunction {
    fn:Function
    res:Function
    rej:Function
}

/**
 * SimpleActor is used to serialize function calls, it is a single threaded
 * actor that does one function after the next. Every send returns a promise
 * that is executed after the serialization
 */
export class SimpleSyncher {
    private queue:queuedFunction[]
    private started:boolean
    constructor() {
        this.started = false
        this.queue = []
    }

    private async run() {
        const queuedFn = this.queue.pop()
        if (queuedFn === undefined) {
            // console.log('stopping syncher')
            this.started = false
            return
        }
        try {
            // console.log('syncer run fn')
            const resp = await queuedFn.fn()
            // console.log('syncer')
            queuedFn.res(resp)
        } catch(err) {
            // console.error('rejecting: ', err)
            queuedFn.rej(err)
        }
        if (this.queue.length > 0) {
            // console.log("syncher queueing another")
            await this.run()
        }
    }

    send(fn:Function) {
        const p = new Promise((resolve,reject) => {
            this.queue.push({
                fn:fn,
                res: resolve,
                rej:reject,
            })
            if (!this.started) {
                this.started = true
                this.run()
            }
        })
       
        return p
    }


}