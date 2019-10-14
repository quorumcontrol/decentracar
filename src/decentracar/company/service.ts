import { Community, EcdsaKey, ChainTree, CID, CommunityMessenger, setDataTransaction } from "tupelo-wasm-sdk";
import { Envelope } from "tupelo-messages";
import { messageType, didRegistration, deserialize, serialize } from "../messages";
import { EventEmitter } from "events";
import { certificationTopic } from '../messages'
import { SimpleSyncher } from "../util/actor";
import {emittingLogger} from '../util/emittinglogger';

const log = emittingLogger("decentracar:company")

interface IDecentraCarServiceOptions {
    community: Community
    key: EcdsaKey
    did: string
}

/**
 * The DecentraCarService listens to the certification topic and certifies that a rider/driver is actually
 * part of the community. This is a demo so it just auto certifies anyone that asks, but in a realworld situation
 * this would be an offline process that verifies identity, etc.
 */
export class DecentraCarService extends EventEmitter {
    community: Community
    key: EcdsaKey
    tree?: ChainTree
    private did: string
    private messenger?: CommunityMessenger
    private syncher: SimpleSyncher

    constructor(opts: IDecentraCarServiceOptions) {
        super()
        this.community = opts.community
        this.key = opts.key
        this.did = opts.did
        this.syncher = new SimpleSyncher("company: ")
    }

    async start() {
        await this._findOrCreateTree()
        this.messenger = new CommunityMessenger("integrationtest", 32, this.key, (await this.id()), this.community.node.pubsub)
        return this.messenger.subscribe(certificationTopic, this.handleRegistration.bind(this))
    }

    private async handleRegistration(env: Envelope) {
        if (this.tree === undefined || this.messenger === undefined) {
            throw new Error("handling a message on a service without a tree or messenger")
        }
        const msg: didRegistration = deserialize(env.getPayload_asU8())
        const did = msg.did

        let tryCount = 0

        const getTip = async ()=> {
            let tip

            try {
                tip = await this.community.getTip(did)
            } catch (err) {
                if (tryCount < 10 && err === 'not found') {
                    tryCount++
                    setTimeout(getTip, 1000)
                    return
                }
                log(err, "/ no tip found for ", did)
                return
            }
            this.handleNew(tip, msg)
        }
        getTip()
    }

    private async handleNew(tip:any, msg:didRegistration) {
        if (this.tree === undefined || this.messenger === undefined) {
            throw new Error("handling a message on a service without a tree or messenger")
        }
        
        const did = msg.did
        let tree = new ChainTree({
            tip: new CID(tip),
            store: this.community.blockservice,
        })
        let type = await tree.resolve("/tree/data/_decentracar/type".split("/"))
        switch (type.value as string) {
            case "rider":
                await this.syncher.send(() => {
                    if (this.tree === undefined) {
                        throw new Error("tree must be defined")
                    }
                    return this.community.playTransactions(this.tree, [setDataTransaction("/_decentracar/validatedriders/" + did, true)])
                })
                log("registered new rider: ", did)
                this.messenger.publish(did, serialize({ type: messageType.didRegistration, did: did } as didRegistration))
                this.emit('rider', did)
                break;
            case "driver":
                await this.syncher.send(async () => {
                    if (this.tree === undefined) {
                        throw new Error("tree must be defined")
                    }
                    await this.community.playTransactions(this.tree, [setDataTransaction("/_decentracar/validateddrivers/" + did, true)])
                    return
                })
                log("registered new driver: ", did)
                this.messenger.publish(did, serialize({ type: messageType.didRegistration, did: did } as didRegistration))
                this.emit('driver', did)
                break;
            default:
                log("unknown message type: ", type.value)
        }
    }

    private async id(): Promise<Uint8Array> {
        if (this.tree === undefined) {
            throw new Error("no tree")
        }
        const id = await this.tree.id()
        if (id === null) {
            throw new Error("no id")
        }
        return Buffer.from(id, 'utf8')
    }

    private async _findOrCreateTree() {
        let tip
        try {
            tip = await this.community.getTip(this.did)
        } catch (e) {
            if (e === "not found") {
                // do nothing
            }
        }
        if (CID.isCID(tip)) {
            this.tree = new ChainTree({
                key: this.key,
                tip: tip,
                store: this.community.blockservice,
            })
        } else {
            this.tree = await ChainTree.newEmptyTree(this.community.blockservice, this.key)
        }
    }

}