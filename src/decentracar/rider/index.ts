import { Community, ChainTree, EcdsaKey, CommunityMessenger, setDataTransaction } from "tupelo-wasm-sdk";
import Vector from "../util/vector";
import { EventEmitter } from "events";
import faker from 'faker';
import { ridersTopic, certificationTopic, messageType, offer, riding, deserialize, serialize, didRegistration, offerReject, offerAccept, rideRequest, dcMessage } from "../messages";
import { Envelope } from "tupelo-messages";
import { SimpleSyncher } from "../util/actor";
import { randomGeo } from "../util/locations";
import {emittingLogger} from "../util/emittinglogger";

const log = emittingLogger('decentracar:rider')


interface IRiderOpts {
    community: Promise<Community>
    location: Vector
}

export class Rider extends EventEmitter {
    community: Promise<Community>
    tree?: ChainTree
    key?: EcdsaKey
    id?: string
    name: string
    location: Vector
    destination: Vector
    registered: boolean
    tickCount: number
    stopped:boolean

    acceptedDriver?: string // a DID

    private startPromise?: Promise<Rider>
    private messenger?: CommunityMessenger
    private syncher:SimpleSyncher
    private offers:offer[]
    private subFn:Function
    private firstOfferTick:number

    constructor(opts: IRiderOpts) {
        super();
        this.community = opts.community;
        this.location = opts.location;
        this.destination = randomGeo(this.location, 10000) // anywhere within a 10km radius
        this.name = faker.name.findName();
        this.registered = false;
        this.syncher = new SimpleSyncher();
        this.offers = []
        this.handleSelfMessages = this.handleSelfMessages.bind(this)
        this.subFn = ()=>{}
        this.tickCount = 0
        this.firstOfferTick = 0
        this.stopped = false
    }

    start() {
        if (this.startPromise !== undefined) {
            return this.startPromise
        }
        this.startPromise = new Promise(async (resolve, reject) => {
            const community = await this.community
            this.key = await EcdsaKey.generate()
            this.tree = await ChainTree.newEmptyTree(community.blockservice, this.key)
            const id = await this.tree.id()
            if (id === null) {
                reject(new Error("error getting id"))
                return
            }
            this.id = id
            this.messenger = new CommunityMessenger("integrationtest", 32, this.key, Buffer.from(this.id, 'utf8'), community.node.pubsub)
            this.messenger.subscribe(this.id, this.handleSelfMessages)
            await this.registerAsRider()
            resolve(this)
        })
        return this.startPromise
    }

    stop() {
        log(this.name, " dropped off")
        if (this.messenger !== undefined && this.id !== undefined) {
            this.messenger.unsubscribe(this.id, this.handleSelfMessages)
        }
        this.emit('stopped')
        this.stopped = true
    }

    async registerAsRider() {
        log(this.name, " registering")
        if (this.messenger === undefined || this.tree === undefined) {
            throw new Error("need a tree and messenger to registerAsDriver")
        }
        const c = await this.community
        await this.syncher.send(()=> {
            if (this.tree === undefined) {
                throw new Error("undefined tree")
            }
            log(this.name, " set type to rider")
            return c.playTransactions(this.tree, [setDataTransaction("_decentracar/type", "rider")])
        })
        await c.nextUpdate()
        log(this.name, " publishing did registration")
        this.messenger.publish(certificationTopic, serialize({
            type: messageType.didRegistration,
            did: this.id,
        } as didRegistration))
    }

    // the drivers should send messages directly here
    async handleSelfMessages(env: Envelope) {
        const msg: dcMessage = deserialize(env.getPayload_asU8())
        switch (msg.type) {
            case messageType.didRegistration:
                this.registered = true // for now, for real we'd have to check this
                log(this.name, " registered")
                this.askForRide()
                break;
            case messageType.offer:
                this.possiblyAcceptRide(msg as offer)
                break;
            case messageType.riding:
                const typedMsg = msg as riding
                this.location = new Vector(typedMsg.location[0], typedMsg.location[1])
                break;
            case messageType.dropoff:
                this.stop()
                break;
        }
    }

    possiblyAcceptRide(msg: offer) {
        if (this.acceptedDriver !== undefined) {
            this.rejectRide(msg)
            return
        }

        this.offers.push(msg)

        if (this.offers.length === 1) {
            // after the first offer, we'll wait a tick and then calculate which rider to accept
            this.once('tick', ()=> {
                let closest:offer|undefined = undefined
                let closestDist:number = -1
                for (let offer of this.offers) {
                    let d = this.location.dist(new Vector(offer.driverLocation[0], offer.driverLocation[1]))
                    if (closestDist === -1 || d < closestDist) {
                        closest = offer
                        closestDist = d
                    }
                }

                if (closest === undefined) {
                    throw new Error("no closest offer, this state should never happen, but in the loop")
                }

                // otherwise accept this driver
                this.acceptRide(closest)
            })
        }
    }

    async rejectRide(rideOffer:offer) {
        if (this.messenger === undefined) {
            throw new Error("must have a messenger and an id")
        }
        // log(this.name, " rejecting rider ", rideOffer.driverDid)
        this.messenger.publish(rideOffer.driverDid, serialize({
            type: messageType.offerReject,
            offer: rideOffer,
        } as offerReject))
    }

    async acceptRide(msg:offer) {
        if (this.messenger === undefined || this.id == null) {
            throw new Error("must have a messenger and an id")
        }
        log(this.name, " acceppting ride from: ", msg.driverDid)
        // TODO: there should be a lot more rules and validation here :)
        this.acceptedDriver = msg.driverDid
        const c = await this.community
        await this.syncher.send(() => {
            if (this.tree === undefined) {
                throw new Error("undefined tree")
            }
            return c.playTransactions(this.tree, [setDataTransaction("/_decentracar/accepted", msg.driverDid)])
        })
        this.messenger.publish(msg.driverDid, serialize({
            type: messageType.offerAccept,
            riderDid: this.id,
            location: [this.location.x, this.location.y],
            destination: [this.destination.x, this.destination.y]
        } as offerAccept))
        
        for (let offer of this.offers) {
            if (offer !== msg) {
                this.rejectRide(offer)
            }
        }
        this.offers = []
    }

    tick() {
        this.tickCount++
        this.emit('tick', this.tickCount)
    }

    async askForRide() {
        if (this.messenger === undefined || this.id == null) {
            throw new Error("must have a messenger and an id")
        }
        log(this.name, " asking for ride")

        this.messenger.publish(ridersTopic, serialize({
            type: messageType.rideRequest,
            riderDID: this.id,
            location: [this.location.x, this.location.y]
        } as rideRequest))
    }
}