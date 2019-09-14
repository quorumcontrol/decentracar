import { Community, ChainTree, EcdsaKey, CommunityMessenger, setDataTransaction } from "tupelo-wasm-sdk";
import Vector from "../util/vector";
import { EventEmitter } from "events";
import faker from 'faker';
import { Driver } from "../driver";
import debug from 'debug';
import { ridersTopic, certificationTopic, messageType, offer, riding, deserialize, serialize, didRegistration, offerReject, offerAccept, rideRequest, dcMessage } from "../messages";
import { Envelope } from "tupelo-wasm-sdk/node_modules/tupelo-messages";
import { SimpleSyncher } from "../util/actor";
import { randomGeo } from "../util/locations";

const log = debug('decentracar:rider')


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

    acceptedDriver?: string // a DID

    private startPromise?: Promise<Rider>
    private messenger?: CommunityMessenger
    private syncher:SimpleSyncher
    private offers:offer[]

    constructor(opts: IRiderOpts) {
        super();
        this.community = opts.community;
        this.location = opts.location;
        this.destination = randomGeo(this.location, 10000) // anywhere within a 10km radius
        this.name = faker.name.findName();
        this.registered = false;
        this.syncher = new SimpleSyncher();
        this.offers = []
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
            this.messenger.subscribe(this.id, this.handleSelfMessages.bind(this))
            await this.registerAsRider()
            resolve(this)
        })
        return this.startPromise
    }

    stop() {
        log(this.name, " dropped off")
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
        if (this.messenger === undefined) {
            throw new Error("must have a messenger and an id")
        }
        if (this.acceptedDriver !== undefined) {
            log(this.name, " rejecting rider ", msg.driverDid)
            this.messenger.publish(msg.driverDid, serialize({
                type: messageType.offerReject,
                offer: msg,
            } as offerReject))
            return
        }

        //TODO: accept a few offers and take the closest one        

         // otherwise accept this driver
        this.acceptRide(msg)
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