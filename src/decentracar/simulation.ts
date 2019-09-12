import {Driver} from './driver'
import { Community } from 'tupelo-wasm-sdk'
import { randomGeo, mapCenter } from './util/locations'
import { EventEmitter } from 'events'

interface ISimulationOpts {
    driverCount:number
    community:Promise<Community>
}

export class Simulation extends EventEmitter {
    drivers:Driver[]
    private interval?:number
    community:Promise<Community>
    tick:number

    constructor(opts:ISimulationOpts) {
        super()
        this.tick = 0;
        this.community = opts.community
        let drivers:Driver[] = []
        for (let i = 0; i < opts.driverCount; i++) {
            drivers[i] = new Driver({
                community: opts.community,
                location: randomGeo(mapCenter, 5000)
            })
        }
        this.drivers = drivers
    }

    stop() {
        if (this.interval === undefined) {
            return
        }
        clearInterval(this.interval)
    }

    async start() {
        for (let d of this.drivers) {
            d.start()
        }
        setInterval(()=> {
            for (let d of this.drivers) {
                d.tick()
            }
            this.tick++
            this.emit('tick', this.tick);
        }, 1000)
    }

}