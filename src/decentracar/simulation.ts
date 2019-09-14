import { Driver } from './driver'
import { Community, EcdsaKey, ChainTree } from 'tupelo-wasm-sdk'
import { randomGeo, mapCenter } from './util/locations'
import { EventEmitter } from 'events'
import { DecentraCarService } from './company/service'
import { Rider } from './rider'

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
        if (this.interval === undefined) {
            return
        }
        clearInterval(this.interval)
    }

    async start() {
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
        this.tickCount++
        this.emit('tick', this.tickCount);
    }

    async possiblyCreateRider() {
        if (Math.random() * 100 < this.riderProbability) {
            const r = new Rider({
                community: this.community,
                location: randomGeo(mapCenter, 5000)
            })
            r.start()
            this.riders.push(r)
        }
    }

    async tickEvery(milliseconds:number) {
        setInterval(()=> {
            this.tick()
        }, milliseconds)
    }

}