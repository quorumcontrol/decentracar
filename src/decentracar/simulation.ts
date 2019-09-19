import { Driver } from './driver'
import { Community, EcdsaKey, ChainTree } from 'tupelo-wasm-sdk'
import { randomGeo, mapCenter } from './util/locations'
import { EventEmitter } from 'events'
import { DecentraCarService } from './company/service'
import { Rider } from './rider'
import debug from 'debug'

const log = debug("decentracar:simulation")

interface ISimulationOpts {
    driverCount: number
    riderProbability: number // how many ticks out of 100 will a rider be created?
    community: Promise<Community>
}

export class Simulation extends EventEmitter {
    drivers: Driver[]
    riders: Rider[]
    private interval?: number
    community: Promise<Community>
    tickCount: number
    riderProbability:number

    constructor(opts: ISimulationOpts) {
        super()
        this.tickCount = 0;
        this.community = opts.community
        let drivers: Driver[] = []
        for (let i = 0; i < opts.driverCount; i++) {
            drivers[i] = new Driver({
                community: opts.community,
                location: randomGeo(mapCenter, 5000)
            })
        }
        this.riderProbability = opts.riderProbability
        this.drivers = drivers
        this.riders = []
    }

    stop() {
        log('simulation stopped')
        if (this.interval === undefined) {
            return
        }
        clearInterval(this.interval)
    }

    async start() {
        log('starting simulation')
        const community = await this.community
        let key = await EcdsaKey.generate()
        let tree = await ChainTree.newEmptyTree(community.blockservice, key)
        const id = await tree.id()
        if (id === null) {
            throw new Error("unknown tree id")
        }

        const service = new DecentraCarService({
            community: community,
            key: key,
            did: id,
        })
        await service.start()
        for (let d of this.drivers) {
            d.start()
        }
       
    }

    async tick() {
        for (let d of this.drivers) {
            d.tick()
        }
        this.possiblyCreateRider()
        for (let r of this.riders) {
            r.tick()
        }
        this.tickCount++
        this.emit('tick', this.tickCount);
    }

    async possiblyCreateRider() {
        if (this.tickCount < 5) {
            return // don't do anything until 5 ticks have passed
        }
        if (Math.random() * 100 < this.riderProbability) {
            const r = new Rider({
                community: this.community,
                location: randomGeo(mapCenter, 5000)
            })
            r.start()
            r.once('stopped', ()=> {
                let index = this.riders.indexOf(r)
                this.riders.splice(index, 1)
            })
            this.riders.push(r)
        }
    }

    async tickEvery(milliseconds:number) {
        setInterval(()=> {
            this.tick()
        }, milliseconds)
    }

}