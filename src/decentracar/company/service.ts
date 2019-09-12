import { Community, EcdsaKey, ChainTree, CID, CommunityMessenger, setDataTransaction } from "tupelo-wasm-sdk";
import { Envelope } from "tupelo-wasm-sdk/node_modules/tupelo-messages";
import debug from 'debug';
import Messages from "../messages";

const log = debug("decentracar:service")

interface IDecentraCarServiceOptions {
    community:Community
    key:EcdsaKey
    did:string
}

const registrationTopic = 'decentracar-certifications'

/**
 * The DecentraCarService listens to the certification topic and certifies that a passenger/driver is actually
 * part of the community. This is a demo so it just auto certifies anyone that asks, but in a realworld situation
 * this would be an offline process that verifies identity, etc.
 */
export class DecentraCarService {
    community:Community
    key:EcdsaKey
    tree?:ChainTree
    private did:string
    private messenger?:CommunityMessenger

    constructor(opts:IDecentraCarServiceOptions) {
        this.community = opts.community
        this.key = opts.key
        this.did = opts.did
    }

    async start() {
        await this._findOrCreateTree()
        this.messenger = new CommunityMessenger("integrationtest", 32, this.key, (await this.id()), this.community.node.pubsub)
        return this.messenger.subscribe(registrationTopic, this.handleRegistration.bind(this))
    }

    private async handleRegistration(env:Envelope) {
        if (this.tree === undefined || this.messenger == undefined) {
            throw new Error("handling a message on a service without a tree or messenger")
        }
        const payload = env.getPayload_asU8()
        const buf = Buffer.from(payload)
        const did = buf.toString('utf8')
        log("did received: ", did)
        let tip = await this.community.getTip(did)
        let tree = new ChainTree({
            tip: new CID(tip),
            store: this.community.blockservice,
        })
        let type = await tree.resolve("/tree/data/_decentracar/type".split("/"))
        console.log("type: ", type)
        switch (<string>type.value) {
            case "passenger":
                console.log("passenger assertion");
                break;
            case "driver":
                log("new driver registering: ", did)
                await this.community.playTransactions(this.tree, [setDataTransaction("/_decentracar/validateddrivers/" + did, true)])
                log("registered new driver")
                this.messenger.publish(did, Messages.serialize({type:"didRegistration", did: did} as Messages.didRegistration))
                break;
        }
    }

    private async id():Promise<Uint8Array> {
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
        } catch(e) {
            if (e === "not found") {
                tip == null
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