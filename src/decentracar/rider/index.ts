import { Community, ChainTree, EcdsaKey, CommunityMessenger, setDataTransaction } from "tupelo-wasm-sdk";
import Vector from "../util/vector";
import { EventEmitter } from "events";
import faker from 'faker';
import { Driver } from "../driver";
import debug from 'debug';
import Messages, { ridersTopic, certificationTopic, messageType } from "../messages";
import { Envelope } from "tupelo-wasm-sdk/node_modules/tupelo-messages";
import { SimpleSyncher } from "../util/actor";

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
    registered: boolean

    acceptedDriver?: string // a DID

    private startPromise?: Promise<Rider>
    private messenger?: CommunityMessenger
    private syncher:SimpleSyncher

    constructor(opts: IRiderOpts) {
        super();
        this.community = opts.community;
        this.location = opts.location;
        this.name = faker.name.findName();
        this.registered = false;
        this.syncher = new SimpleSyncher();
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
        this.messenger.publish(certificationTopic, Messages.serialize({
            type: messageType.didRegistration,
            did: this.id,
        } as Messages.didRegistration))
    }

    // the drivers should send messages directly here
    async handleSelfMessages(env: Envelope) {
        const msg: Messages.dcMessage = Messages.deserialize(env.getPayload_asU8())
        switch (msg.type) {
            case messageType.didRegistration:
                this.registered = true // for now, for real we'd have to check this
                log(this.name, " registered")
                this.askForRide()
                break;
            case messageType.offer:
                this.possiblyAcceptRide(msg as Messages.offer)
                break;
        }
    }

    possiblyAcceptRide(msg: Messages.offer) {
        if (this.messenger === undefined) {
            throw new Error("must have a messenger and an id")
        }
        if (this.acceptedDriver !== undefined) {
            log(this.name, " rejecting rider ", msg.driverDid)
            this.messenger.publish(msg.driverDid, Messages.serialize({
                type: messageType.offerReject,
                offer: msg,
            } as Messages.offerReject))
            return
        }

         // otherwise accept this driver
        this.acceptRide(msg)
    }

    async acceptRide(msg:Messages.offer) {
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
        this.messenger.publish(msg.driverDid, Messages.serialize({
            type: messageType.offerAccept,
            riderDid: this.id,
            location: [this.location.x, this.location.y]
        } as Messages.offerAccept))
    }

    async askForRide() {
        if (this.messenger === undefined || this.id == null) {
            throw new Error("must have a messenger and an id")
        }
        log(this.name, " asking for ride")

        this.messenger.publish(ridersTopic, Messages.serialize({
            type: messageType.rideRequest,
            riderDID: this.id,
            location: [this.location.x, this.location.y]
        } as Messages.rideRequest))
    }
}