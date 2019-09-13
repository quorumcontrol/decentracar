import { Community, ChainTree, EcdsaKey, CommunityMessenger, setDataTransaction } from "tupelo-wasm-sdk";
import Vector from "../util/vector";
import { EventEmitter } from "events";
import faker from 'faker';
import { Driver } from "../driver";
import debug from 'debug';
import Messages, { ridersTopic, certificationTopic } from "../messages";
import { Envelope } from "tupelo-wasm-sdk/node_modules/tupelo-messages";

const log = debug('decentracar:rider')


interface IRiderOpts {
    community:Promise<Community>
    location: Vector
}

export class Rider extends EventEmitter {
    community:Promise<Community>
    tree?:ChainTree
    key?:EcdsaKey
    id?:string
    name:string
    location:Vector
    registered:boolean

    acceptedDriver?:Driver

    private startPromise?:Promise<Rider>
    private messenger?:CommunityMessenger

    constructor(opts:IRiderOpts) {
        super()
        this.community = opts.community
        this.location = opts.location
        this.name = faker.name.findName();
        this.registered = false;
    }

    start() {
        if (this.startPromise !== undefined) {
            return this.startPromise
        }
        this.startPromise = new Promise(async (resolve,reject)=> {
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
            await this.registerAsRider()
            resolve(this)
            this.askForRide()
        })
        return this.startPromise
    }

    async registerAsRider() {
        log(this.name, " registering")
        if (this.messenger === undefined || this.tree === undefined) {
            throw new Error("need a tree and messenger to registerAsDriver")
        }
        const c = await this.community
        await c.playTransactions(this.tree, [setDataTransaction("_decentracar/type", "rider")])
        await c.nextUpdate()
        this.messenger.publish(certificationTopic, Messages.serialize({
            type: "didRegistration",
            did: this.id,
        } as Messages.didRegistration))
    }

    // the drivers should send messages directly here
    async handleSelfMessages(env:Envelope) {
        const msg: Messages.dcMessage = Messages.deserialize(env.getPayload_asU8())
        switch (msg.type) {
            case "didRegistration":
                this.registered = true // for now, for real we'd have to check this
                log(this.name, " registered")
                this.askForRide()
                break;
        }
    }

    async askForRide() {
        if (this.messenger === undefined || this.id == null) {
            throw new Error("must have a messenger and an id")
        }
        log(this.name, " asking for ride")

        this.messenger.publish(ridersTopic, Messages.serialize({
            type: "rideRequest",
            riderDID: this.id,
            location: [this.location.x, this.location.y]
        } as Messages.rideRequest))
    }
}