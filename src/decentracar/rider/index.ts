import { Community, ChainTree, EcdsaKey, CommunityMessenger } from "tupelo-wasm-sdk";
import Vector from "../util/vector";
import { EventEmitter } from "events";
import faker from 'faker';
import { Driver } from "../driver";
import debug from 'debug';
import Messages, { ridersTopic } from "../messages";
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

    acceptedDriver?:Driver

    private startPromise?:Promise<Rider>
    private messenger?:CommunityMessenger

    constructor(opts:IRiderOpts) {
        super()
        this.community = opts.community
        this.location = opts.location
        this.name = faker.name.findName();
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
            log(this.name, " asking for cars at ", this.location)
            resolve(this)
        })
        return this.startPromise
    }

    // the drivers should send messages directly here
    async handleSelfMessages(env:Envelope) {

    }

    async askForRide() {
        if (this.messenger === undefined || this.id == null) {
            throw new Error("must have a messenger and an id")
        }

        this.messenger.publish(ridersTopic, Messages.serialize({
            type: "rideRequest",
            riderDID: this.id,
            location: [this.location.x, this.location.y]
        } as Messages.rideRequest))
    }
}